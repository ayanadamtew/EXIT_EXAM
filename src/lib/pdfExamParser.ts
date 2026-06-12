/**
 * Client-side PDF exam parser.
 * Extracts text from a PDF using pdfjs-dist, then uses regex heuristics
 * to find MCQ question blocks and return structured Question objects.
 *
 * Ported from raw_exam_data/parse_questions_v2.py
 */

export interface ParsedQuestion {
  id: number;
  originalId: number;
  question: string;
  options: Record<string, string>;
  answer: string;
  category: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  totalExtractedText: number;
  warnings: string[];
}

/**
 * Extract text from a PDF file using pdfjs-dist.
 * Uses multiple strategies and picks whichever yields the most parsed questions.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Strategy 1: Use pdfjs's native hasEOL line-break detection
  const pages1: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!item || !("str" in item)) continue;
      const str = (item as any).str as string;
      const hasEOL = (item as any).hasEOL as boolean;
      pageText += str;
      if (hasEOL) {
        pageText += "\n";
      }
    }
    pages1.push(pageText);
  }
  const text1 = pages1.join("\n");

  // Strategy 2: Y-coordinate based line reconstruction
  const pages2: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!item || !("str" in item)) continue;
      const str = (item as any).str as string;
      const transform = (item as any).transform;
      const y = transform ? transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        pageText += "\n" + str;
      } else {
        pageText +=
          pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")
            ? " " + str
            : str;
      }
      if (y !== null) lastY = y;
    }
    pages2.push(pageText);
  }
  const text2 = pages2.join("\n");

  // Count ANSWER markers in each extraction to pick the better one
  const count1 = (text1.match(/\banswer\s*:\s*[A-Da-d]\b/gi) || []).length;
  const count2 = (text2.match(/\banswer\s*:\s*[A-Da-d]\b/gi) || []).length;

  console.log(
    `[PDF Parser] Strategy 1 (hasEOL): ${count1} ANSWER markers | Strategy 2 (Y-coord): ${count2} ANSWER markers`
  );

  const bestText = count1 >= count2 ? text1 : text2;

  // Log first 2000 chars for debugging
  console.log("[PDF Parser] Extracted text preview:", bestText.substring(0, 2000));

  return bestText;
}

/**
 * Parse extracted text into structured questions.
 *
 * Strategy: Split the entire text by ANSWER markers. Each segment between
 * two consecutive ANSWER markers contains exactly one question block.
 * This is more robust than trying to match the full pattern in one regex.
 */
export function parseQuestionsFromText(rawText: string): ParseResult {
  const warnings: string[] = [];

  // Clean up: remove standalone page numbers
  const lines = rawText.split("\n");
  const cleanedLines = lines.filter((line) => {
    const stripped = line.trim();
    if (/^\d{1,2}$/.test(stripped) && parseInt(stripped) < 80) return false;
    return true;
  });
  const text = cleanedLines.join("\n");

  // Find all ANSWER: X positions (case-insensitive)
  // Accommodates optional colons/periods (e.g. "ANSWER B", "Answer D.")
  const answerRegex = /\banswer\s*[:.]?\s*([A-Da-d])\b/gi;
  const answerMatches: { index: number; answer: string; fullLength: number }[] =
    [];
  let am;
  while ((am = answerRegex.exec(text)) !== null) {
    answerMatches.push({
      index: am.index,
      answer: am[1].toUpperCase(),
      fullLength: am[0].length,
    });
  }

  const questions: ParsedQuestion[] = [];
  const seenNums = new Set<number>();

  for (let i = 0; i < answerMatches.length; i++) {
    const { index: answerIdx, answer } = answerMatches[i];

    // The question block is the text BEFORE this ANSWER marker,
    // going back to the previous ANSWER marker (or start of text)
    const blockStart =
      i === 0 ? 0 : answerMatches[i - 1].index + answerMatches[i - 1].fullLength;
    const block = text.substring(blockStart, answerIdx);

    // Find the question number — look for "N." pattern (a number followed by a period)
    // We want the LAST question number in the block, as earlier numbers might be
    // leftover from a previous answer's surrounding text
    const qNumRegex = /(?:^|\n)\s*(\d+)\.\s/g;
    let lastQNumMatch: RegExpExecArray | null = null;
    let qm;
    while ((qm = qNumRegex.exec(block)) !== null) {
      lastQNumMatch = qm;
    }

    if (!lastQNumMatch) {
      // No question number found in this block
      continue;
    }

    const qNum = parseInt(lastQNumMatch[1], 10);
    if (seenNums.has(qNum)) continue;

    // The actual question content starts from this question number
    const contentStart = lastQNumMatch.index + lastQNumMatch[0].length;
    const content = block.substring(contentStart).trim();

    if (!content) continue;

    // Find options: look for A./A) B./B) C./C) D./D) patterns
    // Options can appear on their own line OR inline separated by spaces
    const optionSplitRegex =
      /\b([A-D])\s*[.)]\s*/gi;
    const optPositions: { letter: string; index: number; matchLen: number }[] =
      [];
    let om;
    while ((om = optionSplitRegex.exec(content)) !== null) {
      optPositions.push({
        letter: om[1].toUpperCase(),
        index: om.index,
        matchLen: om[0].length,
      });
    }

    // We need at least options A and one more to form a valid question
    if (optPositions.length < 2) {
      warnings.push(`Question ${qNum}: Less than 2 options found, skipped.`);
      continue;
    }

    // Find option A to determine where question text ends
    const optAPos = optPositions.find((o) => o.letter === "A");
    if (!optAPos) {
      warnings.push(`Question ${qNum}: Could not find option A, skipped.`);
      continue;
    }

    let qText = content.substring(0, optAPos.index).trim();
    qText = qText.replace(/\s+/g, " ").trim();
    // Remove citation markers
    qText = qText.replace(/\s*\[cite:[\s\d,]*\]/g, "").trim();

    if (!qText) {
      warnings.push(`Question ${qNum}: Empty question text, skipped.`);
      continue;
    }

    // Extract each option's text
    const options: Record<string, string> = {};
    for (let j = 0; j < optPositions.length; j++) {
      const opt = optPositions[j];
      const textStart = opt.index + opt.matchLen;
      const textEnd =
        j < optPositions.length - 1 ? optPositions[j + 1].index : content.length;
      let optText = content.substring(textStart, textEnd).trim();
      optText = optText.replace(/\s+/g, " ").trim();
      // Remove citation markers
      optText = optText.replace(/\s*\[cite:[\s\d,]*\]/g, "").trim();
      if (optText) {
        options[opt.letter] = optText;
      }
    }

    if (Object.keys(options).length < 2) {
      warnings.push(
        `Question ${qNum}: Less than 2 valid options found, skipped.`
      );
      continue;
    }

    seenNums.add(qNum);
    questions.push({
      id: qNum,
      originalId: qNum,
      question: qText,
      options,
      answer,
      category: "General",
    });
  }

  // Sort by original question number
  questions.sort((a, b) => a.id - b.id);

  // Re-index sequentially
  questions.forEach((q, idx) => {
    q.originalId = q.id;
    q.id = idx + 1;
  });

  if (questions.length === 0 && text.length > 100) {
    warnings.push(
      "No questions could be parsed. The PDF may use a format without 'ANSWER: X' markers. Try a PDF where each question ends with 'ANSWER: A/B/C/D'."
    );
  }

  return {
    questions,
    totalExtractedText: text.length,
    warnings,
  };
}

/**
 * Full pipeline: PDF File → ParseResult
 */
export async function parsePdfExam(file: File): Promise<ParseResult> {
  const text = await extractTextFromPdf(file);
  return parseQuestionsFromText(text);
}

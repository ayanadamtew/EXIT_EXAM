const fs = require('fs');

if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix { constructor() {} };
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D { constructor() {} };
}

const pdfjsLib = require('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

function parseQuestionsFromText(rawText) {
  const warnings = [];

  const lines = rawText.split("\n");
  const cleanedLines = lines.filter((line) => {
    const stripped = line.trim();
    if (/^\d{1,2}$/.test(stripped) && parseInt(stripped) < 80) return false;
    return true;
  });
  const text = cleanedLines.join("\n");

  const answerRegex = /\banswer\s*:\s*([A-Da-d])\b/gi;
  const answerMatches = [];
  let am;
  while ((am = answerRegex.exec(text)) !== null) {
    answerMatches.push({
      index: am.index,
      answer: am[1].toUpperCase(),
      fullLength: am[0].length,
    });
  }

  const questions = [];
  const seenNums = new Set();

  for (let i = 0; i < answerMatches.length; i++) {
    const { index: answerIdx, answer } = answerMatches[i];

    const blockStart =
      i === 0 ? 0 : answerMatches[i - 1].index + answerMatches[i - 1].fullLength;
    const block = text.substring(blockStart, answerIdx);

    const qNumRegex = /(?:^|\n)\s*(\d+)\.\s/g;
    let lastQNumMatch = null;
    let qm;
    while ((qm = qNumRegex.exec(block)) !== null) {
      lastQNumMatch = qm;
    }

    if (!lastQNumMatch) {
      continue;
    }

    const qNum = parseInt(lastQNumMatch[1], 10);
    if (seenNums.has(qNum)) continue;

    const contentStart = lastQNumMatch.index + lastQNumMatch[0].length;
    const content = block.substring(contentStart).trim();

    if (!content) continue;

    const optionSplitRegex = /\b([A-D])\s*[.)]\s*/gi;
    const optPositions = [];
    let om;
    while ((om = optionSplitRegex.exec(content)) !== null) {
      optPositions.push({
        letter: om[1].toUpperCase(),
        index: om.index,
        matchLen: om[0].length,
      });
    }

    if (optPositions.length < 2) {
      warnings.push(`Question ${qNum}: Less than 2 options found, skipped.`);
      continue;
    }

    const optAPos = optPositions.find((o) => o.letter === "A");
    if (!optAPos) {
      warnings.push(`Question ${qNum}: Could not find option A, skipped.`);
      continue;
    }

    let qText = content.substring(0, optAPos.index).trim();
    qText = qText.replace(/\s+/g, " ").trim();
    qText = qText.replace(/\s*\[cite:[\s\d,]*\]/g, "").trim();

    if (!qText) {
      warnings.push(`Question ${qNum}: Empty question text, skipped.`);
      continue;
    }

    const options = {};
    for (let j = 0; j < optPositions.length; j++) {
      const opt = optPositions[j];
      const textStart = opt.index + opt.matchLen;
      const textEnd =
        j < optPositions.length - 1 ? optPositions[j + 1].index : content.length;
      let optText = content.substring(textStart, textEnd).trim();
      optText = optText.replace(/\s+/g, " ").trim();
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

  questions.sort((a, b) => a.id - b.id);

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

async function extractTextNode(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ 
    data: new Uint8Array(dataBuffer),
    disableWorker: true
  }).promise;

  const pages1 = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!item || !("str" in item)) continue;
      const str = item.str;
      const hasEOL = item.hasEOL;
      pageText += str;
      if (hasEOL) {
        pageText += "\n";
      }
    }
    pages1.push(pageText);
  }
  const text1 = pages1.join("\n");

  const pages2 = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = "";
    let lastY = null;
    for (const item of content.items) {
      if (!item || !("str" in item)) continue;
      const str = item.str;
      const transform = item.transform;
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

  const count1 = (text1.match(/\banswer\s*:\s*[A-Da-d]\b/gi) || []).length;
  const count2 = (text2.match(/\banswer\s*:\s*[A-Da-d]\b/gi) || []).length;

  console.log(`[PDF Parser] Strategy 1 (hasEOL): ${count1} ANSWER markers | Strategy 2 (Y-coord): ${count2} ANSWER markers`);
  return count1 >= count2 ? text1 : text2;
}

async function runTest() {
  const pdfPath = './raw_exam_data/Plan-A _Software Engineering Program_JU-Mock Exam_2026_.pdf';
  
  console.log('Extracting text from PDF...');
  const text = await extractTextNode(pdfPath);
  
  fs.writeFileSync('./scratch/extracted_test_plan_a.txt', text, 'utf-8');
  console.log('Saved extracted text to ./scratch/extracted_test_plan_a.txt');

  console.log('Parsing extracted text...');
  const result = parseQuestionsFromText(text);

  console.log('Total questions found:', result.questions.length);
  console.log('Warnings count:', result.warnings.length);
  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((w) => console.log(' -', w));
  }

  const origNums = result.questions.map((q) => q.originalId).sort((a, b) => a - b);
  console.log('\nOriginal question numbers:', origNums.join(', '));

  const allNums = new Set(Array.from({ length: 100 }, (_, i) => i + 1));
  const foundNums = new Set(origNums);
  const missing = [...allNums].filter((n) => !foundNums.has(n)).sort((a, b) => a - b);
  if (missing.length > 0) {
    console.log(`\nMissing ${missing.length} question numbers: ${missing.join(', ')}`);
  }
}

runTest().catch(console.error);

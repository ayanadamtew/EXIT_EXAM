import * as fs from 'fs';
import { parseQuestionsFromText } from './src/lib/pdfExamParser';
import * as pdfjsLib from 'pdfjs-dist';

// Polyfill for DOMMatrix in Node.js
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  } as any;
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {
    constructor() {}
  } as any;
}

// Disable worker for Node.js testing
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

async function extractTextNode(pdfPath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ 
    data: new Uint8Array(dataBuffer)
  }).promise;

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

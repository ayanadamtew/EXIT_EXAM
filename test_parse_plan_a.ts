import * as fs from 'fs';
import { parseQuestionsFromText } from './src/lib/pdfExamParser';

const text = fs.readFileSync('./scratch/plan_a_text.txt', 'utf-8');

const result = parseQuestionsFromText(text);

console.log('Total questions found:', result.questions.length);
console.log('Warnings count:', result.warnings.length);

const origNums = result.questions.map((q) => q.originalId).sort((a, b) => a - b);
const allNums = new Set(Array.from({ length: 100 }, (_, i) => i + 1));
const foundNums = new Set(origNums);
const missing = [...allNums].filter((n) => !foundNums.has(n)).sort((a, b) => a - b);

if (missing.length > 0) {
  console.log(`\nMissing ${missing.length} question numbers: ${missing.join(', ')}`);
}

if (result.warnings.length > 0) {
  console.log('\nWarnings:');
  result.warnings.forEach((w) => console.log(' -', w));
}

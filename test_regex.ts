import * as fs from 'fs';

const text = fs.readFileSync('./scratch/plan_a_text.txt', 'utf-8');

// The new regex: optional colon or period
const answerRegex = /\banswer\s*[:.]?\s*([A-Da-d])\b/gi;

let am;
let matchCount = 0;
while ((am = answerRegex.exec(text)) !== null) {
  matchCount++;
}

console.log(`Found ${matchCount} answer markers with new regex.`);

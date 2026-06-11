import React from 'react';

/**
 * Dynamically detects if a question contains inline source code,
 * splits the narrative instructions from the code part,
 * and formats the code with proper indentation and line breaks.
 */
export function renderQuestion(text: string): React.ReactNode {
  // Common markers where a code block starts
  const markers = [
    "class Parent",
    "public class",
    "class B",
    "class Test",
    "class Child",
    "#include",
    "int main()",
    "class A ",
    "struct Node",
    "class Stack",
    "class Queue",
    "class Node",
    "void add(",
    "public int number"
  ];
  
  let splitIndex = -1;
  
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
      splitIndex = idx;
    }
  }
  
  // Generic pattern for java/c++ class [Name] {
  if (splitIndex === -1) {
    const match = text.match(/\bclass\s+[A-Z]\w*\b/);
    if (match && match.index !== undefined) {
      splitIndex = match.index;
    }
  }

  // If no code is detected, return the question paragraph normally
  if (splitIndex === -1) {
    return <p className="text-slate-900 text-base md:text-lg leading-relaxed font-semibold">{text}</p>;
  }

  const instruction = text.substring(0, splitIndex).trim();
  const rawCode = text.substring(splitIndex).trim();
  
  // Beautify code with a simple scanner that respects strings and character literals
  let formattedCode = "";
  let indentLevel = 0;
  let inString = false;
  let stringChar = "";
  let i = 0;
  
  const getIndent = (level: number) => "  ".repeat(level);

  while (i < rawCode.length) {
    const char = rawCode[i];
    
    // Handle double backslash escapes inside strings
    if (inString && char === '\\' && i + 1 < rawCode.length) {
      formattedCode += char + rawCode[i + 1];
      i += 2;
      continue;
    }

    // Track string literals
    if ((char === '"' || char === "'") && (i === 0 || rawCode[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      formattedCode += char;
      i++;
      continue;
    }
    
    if (inString) {
      formattedCode += char;
      i++;
      continue;
    }
    
    // Curly braces formatting
    if (char === "{") {
      indentLevel++;
      formattedCode += " {\n" + getIndent(indentLevel);
      // Skip following spaces to avoid awkward indent spacing
      while (i + 1 < rawCode.length && rawCode[i + 1] === " ") i++;
    } else if (char === "}") {
      indentLevel = Math.max(0, indentLevel - 1);
      formattedCode = formattedCode.trimEnd();
      formattedCode += "\n" + getIndent(indentLevel) + "}\n" + getIndent(indentLevel);
      while (i + 1 < rawCode.length && rawCode[i + 1] === " ") i++;
    } else if (char === ";") {
      // Semicolon starts new indented line
      formattedCode += ";\n" + getIndent(indentLevel);
      while (i + 1 < rawCode.length && rawCode[i + 1] === " ") i++;
    } else {
      formattedCode += char;
    }
    i++;
  }
  
  // Post-processing to clean up trailing lines and double empty lines
  const cleanCode = formattedCode
    .split("\n")
    .map(line => line.trimEnd())
    .filter((line, idx, arr) => line.trim() !== "" || (idx > 0 && arr[idx-1].trim() !== ""))
    .join("\n")
    .trim();

  return (
    <div className="space-y-4">
      {instruction && (
        <p className="text-slate-900 text-base md:text-lg leading-relaxed font-semibold">
          {instruction}
        </p>
      )}
      <div className="relative group">
        <div className="absolute top-3 right-3 bg-slate-800 text-slate-350 text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-lg select-none opacity-90 border border-slate-700">
          Source Code
        </div>
        <pre className="bg-slate-950 text-slate-100 p-5 rounded-2xl font-mono text-xs md:text-sm leading-relaxed overflow-x-auto shadow-inner border border-slate-900 max-h-[350px] overflow-y-auto">
          <code>{cleanCode}</code>
        </pre>
      </div>
    </div>
  );
}

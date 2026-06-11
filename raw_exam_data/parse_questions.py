#!/usr/bin/env python3
"""Parse the extracted exam text into structured JSON format."""
import json
import re

def parse_exam():
    with open('/home/ayuda/Documents/EXIT EXAM/MOCK-2/extracted_text.txt', 'r') as f:
        text = f.read()

    questions = []
    
    # Split text into lines for processing
    lines = text.split('\n')
    
    i = 0
    current_q_num = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Try to match a question number at the start of a line
        q_match = re.match(r'^(\d+)\.\s+(.+)', line)
        
        if q_match:
            q_num = int(q_match.group(1))
            
            # Skip duplicate question numbers or out of range
            if q_num < 1 or q_num > 304:
                i += 1
                continue
            
            # Collect the question text
            q_text = q_match.group(2)
            i += 1
            
            # Continue collecting question text until we hit an option or answer
            while i < len(lines):
                line = lines[i].strip()
                if not line:
                    i += 1
                    continue
                # Check if this is an option line
                if re.match(r'^[A-D][\.\)]\s', line) or re.match(r'^[a-d][\.\)]\s', line):
                    break
                # Check if this is an answer line
                if line.startswith('ANSWER:') or line.startswith('Answer:'):
                    break
                # Check if this is a new question
                if re.match(r'^\d+\.\s', line):
                    break
                # Check for code blocks or special content
                q_text += ' ' + line
                i += 1
            
            # Now collect options
            options = {}
            while i < len(lines):
                line = lines[i].strip()
                if not line:
                    i += 1
                    continue
                
                # Match option lines: A. text, B. text, etc.
                opt_match = re.match(r'^([A-Da-d])[\.\)]\s*(.+)', line)
                if opt_match:
                    opt_letter = opt_match.group(1).upper()
                    opt_text = opt_match.group(2).strip()
                    i += 1
                    # Continue collecting multi-line option text
                    while i < len(lines):
                        next_line = lines[i].strip()
                        if not next_line:
                            i += 1
                            continue
                        if re.match(r'^[A-Da-d][\.\)]\s', next_line):
                            break
                        if next_line.startswith('ANSWER:') or next_line.startswith('Answer:'):
                            break
                        if re.match(r'^\d+\.\s', next_line):
                            break
                        opt_text += ' ' + next_line
                        i += 1
                    options[opt_letter] = opt_text.strip()
                elif line.startswith('ANSWER:') or line.startswith('Answer:'):
                    break
                elif re.match(r'^\d+\.\s', line):
                    break
                else:
                    i += 1
            
            # Find the answer
            answer = ''
            while i < len(lines):
                line = lines[i].strip()
                if not line:
                    i += 1
                    continue
                ans_match = re.match(r'^ANSWER:\s*([A-Da-d])', line, re.IGNORECASE)
                if ans_match:
                    answer = ans_match.group(1).upper()
                    i += 1
                    break
                elif re.match(r'^\d+\.\s', line):
                    break
                else:
                    i += 1
            
            # Clean up question text
            q_text = re.sub(r'\s+', ' ', q_text).strip()
            
            # Only add if we have valid data
            if options and answer:
                # Determine category based on question number
                if q_num <= 30:
                    category = "Artificial Intelligence & Machine Learning"
                elif q_num <= 70:
                    category = "Object-Oriented Programming (Java/C++)"
                elif q_num <= 111:
                    category = "Fundamentals of Programming (C++)"
                elif q_num <= 140:
                    category = "Database Systems"
                elif q_num <= 145:
                    category = "Mobile Application Development"
                elif q_num <= 167:
                    category = "Web Development"
                elif q_num <= 172:
                    category = "Cybersecurity"
                elif q_num <= 212:
                    category = "Data Structures & Algorithms"
                elif q_num <= 243:
                    category = "Software Engineering & Project Management"
                elif q_num <= 267:
                    category = "Operating Systems"
                elif q_num <= 295:
                    category = "Computer Networks"
                else:
                    category = "Software Quality & Maintenance"
                
                question = {
                    "id": q_num,
                    "question": q_text,
                    "options": options,
                    "answer": answer,
                    "category": category
                }
                questions.append(question)
        else:
            i += 1
    
    # De-duplicate by question number (keep first occurrence)
    seen = set()
    unique_questions = []
    for q in questions:
        if q['id'] not in seen:
            seen.add(q['id'])
            unique_questions.append(q)
    
    # Sort by id
    unique_questions.sort(key=lambda x: x['id'])
    
    # Re-index from 1
    for idx, q in enumerate(unique_questions):
        q['id'] = idx + 1
    
    print(f"Parsed {len(unique_questions)} unique questions")
    
    # Save to JSON
    with open('/home/ayuda/Documents/EXIT EXAM/MOCK-2/questions.json', 'w') as f:
        json.dump(unique_questions, f, indent=2, ensure_ascii=False)
    
    print("Saved to questions.json")
    
    # Print categories summary
    cats = {}
    for q in unique_questions:
        cats[q['category']] = cats.get(q['category'], 0) + 1
    print("\nCategories:")
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count} questions")

if __name__ == '__main__':
    parse_exam()

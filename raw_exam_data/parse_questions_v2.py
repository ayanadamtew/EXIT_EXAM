#!/usr/bin/env python3
"""Parse the extracted exam text into structured JSON format - improved version."""
import json
import re

def parse_exam():
    with open('/home/ayuda/Documents/EXIT EXAM/MOCK-2/extracted_text.txt', 'r') as f:
        text = f.read()
    
    # Use regex to find all question blocks
    # Pattern: number followed by period, then question text, then options A-D, then ANSWER
    
    # First, let's normalize the text - remove page numbers like "44", "45", etc. on their own lines
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Skip standalone page numbers
        if re.match(r'^\d{1,2}$', stripped) and int(stripped) < 80:
            continue
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    # Pattern to find question numbers
    # Match lines that start with a number followed by a period
    pattern = r'(?:^|\n)\s*(\d+)\.\s*\n?(.*?)(?=ANSWER\s*:\s*([A-Da-d]))'
    
    matches = re.findall(pattern, text, re.DOTALL)
    
    questions = []
    seen_nums = set()
    
    for match in matches:
        q_num = int(match[0])
        content = match[1].strip()
        answer = match[2].upper()
        
        if q_num in seen_nums:
            continue
        seen_nums.add(q_num)
        
        # Split content into question text and options
        # Find options A, B, C, D
        # Options can start with A. or A) or a. or a)
        opt_pattern = r'(?:^|\n)\s*([A-Da-d])[\.\)]\s*(.*?)(?=(?:\n\s*[A-Da-d][\.\)]\s)|\Z)'
        opt_matches = re.findall(opt_pattern, content, re.DOTALL)
        
        if not opt_matches:
            continue
        
        # The question text is everything before the first option
        first_opt_pattern = r'(?:^|\n)\s*[Aa][\.\)]\s'
        first_opt_match = re.search(first_opt_pattern, content)
        
        if first_opt_match:
            q_text = content[:first_opt_match.start()].strip()
        else:
            continue
        
        # Clean up question text
        q_text = re.sub(r'\s+', ' ', q_text).strip()
        
        # Process options
        options = {}
        for opt_letter, opt_text in opt_matches:
            letter = opt_letter.upper()
            text_clean = re.sub(r'\s+', ' ', opt_text).strip()
            if text_clean:
                options[letter] = text_clean
        
        if len(options) < 2 or not answer:
            continue
        
        # Determine category
        if q_num <= 30:
            category = "Artificial Intelligence & Machine Learning"
        elif q_num <= 65:
            category = "Object-Oriented Programming (Java/C++)"
        elif q_num <= 70:
            category = "Fundamentals of Programming (C++)"
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
        
        questions.append({
            "id": q_num,
            "question": q_text,
            "options": options,
            "answer": answer,
            "category": category
        })
    
    # Sort by original question number
    questions.sort(key=lambda x: x['id'])
    
    # Re-index 
    for idx, q in enumerate(questions):
        q['originalId'] = q['id']
        q['id'] = idx + 1
    
    print(f"Parsed {len(questions)} unique questions")
    
    with open('/home/ayuda/Documents/EXIT EXAM/MOCK-2/questions.json', 'w') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print("Saved to questions.json")
    
    # Print categories summary
    cats = {}
    for q in questions:
        cats[q['category']] = cats.get(q['category'], 0) + 1
    print("\nCategories:")
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count} questions")
    
    # Show which question numbers we got
    orig_nums = sorted([q['originalId'] for q in questions])
    print(f"\nQuestion numbers found: {orig_nums[:20]}... to {orig_nums[-5:]}")
    print(f"Total range: {orig_nums[0]} to {orig_nums[-1]}")
    
    # Find missing
    all_nums = set(range(1, 305))
    found_nums = set(orig_nums)
    missing = sorted(all_nums - found_nums)
    if missing:
        print(f"\nMissing {len(missing)} question numbers: {missing}")

if __name__ == '__main__':
    parse_exam()

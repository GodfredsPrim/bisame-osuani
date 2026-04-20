import requests
import json

url = 'http://127.0.0.1:8000/api/questions/generate'
data = {
    'subject': 'social_studies',
    'year': 'Year 1',
    'question_type': 'standard',
    'num_questions': 5,
    'difficulty_level': 'medium'
}

try:
    response = requests.post(url, json=data, timeout=30)
    result = response.json()
    print(f"Source: {result.get('source_used')}")
    print(f"Questions: {len(result.get('questions', []))}")
    if result.get('questions'):
        q = result['questions'][0]
        print(f"Question: {q.get('question_text')[:100]}...")
        print(f"Marking scheme: {q.get('marking_scheme', 'None')[:200]}...")
except Exception as e:
    print(f"Error: {e}")
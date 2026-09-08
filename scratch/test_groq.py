import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv("C:\\Users\\Asus\\.gemini\\antigravity-ide\\scratch\\nivesh-ai\\backend\\.env")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
print("Key found:", bool(GROQ_API_KEY))

client = Groq(api_key=GROQ_API_KEY)
prompt = "Output strict JSON: {\"test\": 123}"
try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="qwen/qwen3.8-27b",
        temperature=0,
        response_format={"type": "json_object"}
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")

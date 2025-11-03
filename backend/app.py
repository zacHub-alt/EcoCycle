from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import base64
import json
import os
import re

# Load environment variables from .env if present (best-effort)
# This allows running `uvicorn main:app` from the backend folder where a .env file lives.
try:
    # Prefer python-dotenv if available
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    # Fallback: simple .env parser (KEY=VALUE) — sets values only if not already present
    try:
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Missing GROQ_API_KEY environment variable")

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Models & pricing
VISION_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"]
PRICING = {
    "Plastic": 30,
    "Paper": 10,
    "Metal": 50,
    "Glass": 20,
    "Organic": 0,
    "Other": 0
}

# Utilities
def encode_image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

def create_waste_classification_prompt():
    return """You are a waste classification expert. Analyze this image and classify the waste item into one of these categories:
CATEGORIES: Plastic, Paper, Metal, Glass, Organic, Other
Provide confidence and reasoning in JSON format.
"""

def parse_classification_response(response_text):
    """Extract category, confidence, and reasoning from Groq response"""
    try:
        json_match = re.search(r'\{[^}]*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            category = result.get("category") or result.get("class", "Other")
            confidence = float(result.get("confidence", 0.5))
            reasoning = result.get("reasoning", "")
            return category, confidence, reasoning

        # Fallback heuristic
        response_lower = response_text.lower()
        for cat in ["Plastic","Paper","Metal","Glass","Organic"]:
            if cat.lower() in response_lower:
                return cat, 0.7, f"Detected {cat}"
        return "Other", 0.5, "Could not determine category"
    except Exception:
        return "Other", 0.3, "Failed to parse response"

# Endpoints
@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        for model in VISION_MODELS:
            try:
                base64_image = encode_image_to_base64(image_bytes)
                chat_completion = client.chat.completions.create(
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": create_waste_classification_prompt()},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                        ]
                    }],
                    model=model,
                    temperature=0.1,
                    max_tokens=1024
                )
                response_text = chat_completion.choices[0].message.content
                predicted_class, confidence, reasoning = parse_classification_response(response_text)
                is_recyclable = PRICING.get(predicted_class,0) > 0
                price_per_kg = PRICING.get(predicted_class,0)
                return {
                    "class": predicted_class if is_recyclable else "Non-recyclable",
                    "confidence": confidence,
                    "recyclable": is_recyclable,
                    "price_per_kg": price_per_kg if is_recyclable else 0,
                    "debug_info": {
                        "model_used": model,
                        "reasoning": reasoning,
                        "raw_response": response_text[:200]
                    }
                }
            except Exception as e:
                if model == VISION_MODELS[-1]:
                    return {"error": f"All models failed. Last error: {str(e)}"}
                continue
    except Exception as e:
        return {"error": f"Classification failed: {str(e)}"}

@app.post("/analyze-detailed")
async def analyze_detailed(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        base64_image = encode_image_to_base64(image_bytes)
        detailed_prompt = """Analyze this image in detail and provide:
1. What objects do you see?
2. What materials are they made of?
3. Are they recyclable?
4. What condition are they in?
5. Any identifying text or brands?

Be thorough and descriptive."""

        chat_completion = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": detailed_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }],
            model="llava-v1.5-7b-4096-preview",
            temperature=0.3,
            max_tokens=1024
        )

        return {
            "detailed_analysis": chat_completion.choices[0].message.content,
            "model_used": "llava-v1.5-7b-4096-preview"
        }
    except Exception as e:
        return {"error": f"Detailed analysis failed: {str(e)}"}

@app.get("/test-connection")
async def test_connection():
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hello, just testing the connection."}],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            max_tokens=50
        )
        return {
            "status": "SUCCESS! Groq API is working",
            "test_response": chat_completion.choices[0].message.content,
            "available_models": VISION_MODELS
        }
    except Exception as e:
        return {"error": f"Groq API test failed: {str(e)}"}

@app.get("/")
async def root():
    return {"status": "EcoCycle backend is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

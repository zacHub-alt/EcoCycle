from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import base64
import json
import os
import re
import httpx

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

async def classify_with_httpx(image_bytes, model_name="meta-llama/llama-4-scout-17b-16e-instruct"):
    """Call Groq REST API for classification"""
    base64_image = encode_image_to_base64(image_bytes)
    url = f"https://api.groq.com/v1/models/{model_name}/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": create_waste_classification_prompt()},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 1024
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

def parse_classification_response(response_text):
    """Extract class, confidence, and reasoning from Groq response"""
    try:
        json_match = re.search(r'\{[^}]*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result.get("class", "Other"), float(result.get("confidence", 0.5)), result.get("reasoning", "")
        # Fallback heuristic
        response_lower = response_text.lower()
        for cat in ["Plastic","Paper","Metal","Glass","Organic"]:
            if cat.lower() in response_lower:
                return cat, 0.7, f"Detected {cat}"
        return "Other", 0.5, "Could not determine category"
    except:
        return "Other", 0.3, "Failed to parse response"

# Endpoints
@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        for model in VISION_MODELS:
            try:
                response_text = await classify_with_httpx(image_bytes, model)
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
        url = "https://api.groq.com/v1/models/llava-v1.5-7b-4096-preview/completions"
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": detailed_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            "temperature": 0.3,
            "max_tokens": 1024
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            detailed_analysis = response.json()["choices"][0]["message"]["content"]

        return {
            "detailed_analysis": detailed_analysis,
            "model_used": "llava-v1.5-7b-4096-preview"
        }
    except Exception as e:
        return {"error": f"Detailed analysis failed: {str(e)}"}

@app.get("/test-connection")
async def test_connection():
    try:
        url = "https://api.groq.com/v1/models/meta-llama/llama-4-scout-17b-16e-instruct/completions"
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "messages": [{"role": "user", "content": "Hello, just testing the connection."}],
            "max_tokens": 50
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            test_response = response.json()["choices"][0]["message"]["content"]

        return {
            "status": "SUCCESS! Groq API is working",
            "test_response": test_response,
            "available_models": VISION_MODELS
        }
    except Exception as e:
        return {"error": f"Groq API test failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

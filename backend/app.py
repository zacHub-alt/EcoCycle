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

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("⚠️ Missing GROQ_API_KEY environment variable")

VISION_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"]

PRICING = {
    "Plastic": 30,
    "Paper": 10,
    "Metal": 50,
    "Glass": 20,
    "Organic": 0,
    "Other": 0
}

def encode_image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

def create_waste_classification_prompt():
    return """You are a waste classification expert. Analyze this image and classify the waste item into one of these categories:
CATEGORIES: Plastic, Paper, Metal, Glass, Organic, Other
Provide confidence and reasoning in JSON format.
"""

async def classify_with_httpx(image_bytes, model_name="meta-llama/llama-4-scout-17b-16e-instruct"):
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
    try:
        json_match = re.search(r'\{[^}]*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result.get("class", "Other"), float(result.get("confidence", 0.5)), result.get("reasoning", "")
        # Fallback
        response_lower = response_text.lower()
        for cat in ["Plastic","Paper","Metal","Glass","Organic"]:
            if cat.lower() in response_lower:
                return cat, 0.7, f"Detected {cat}"
        return "Other", 0.5, "Could not determine category"
    except:
        return "Other", 0.3, "Failed to parse response"

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

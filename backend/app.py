from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
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

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SANITY_PROJECT_ID = os.getenv("SANITY_PROJECT_ID")
SANITY_DATASET = os.getenv("SANITY_DATASET")

if not GROQ_API_KEY or not SANITY_PROJECT_ID or not SANITY_DATASET:
    raise ValueError("⚠️ Missing GROQ_API_KEY, SANITY_PROJECT_ID or SANITY_DATASET environment variables")

VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct"
]

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

CATEGORIES:
- Plastic: bottles, containers, bags, packaging, toys
- Paper: newspapers, cardboard, books, documents
- Metal: cans, foil, appliances, tools
- Glass: bottles, jars, windows, mirrors
- Organic: food waste, plant matter, biodegradable items
- Other: items that don't fit the above categories

INSTRUCTIONS:
1. Look carefully at the image
2. Identify the main waste item(s)
3. Classify based on the material composition
4. Provide your confidence level (0.0 to 1.0)

RESPONSE FORMAT (JSON only):
{
    "class": "category_name",
    "confidence": 0.85,
    "reasoning": "brief explanation of why you classified it this way"
}

Analyze the image now:"""

async def classify_with_httpx(image_bytes, model_name="meta-llama/llama-4-scout-17b-16e-instruct"):
    """Classify waste using Groq REST API via httpx"""
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
        data = response.json()
        # Groq REST API returns message content similarly
        return data["choices"][0]["message"]["content"]

def parse_classification_response(response_text):
    try:
        json_match = re.search(r'\{[^}]*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            if "class" in result and "confidence" in result:
                return result["class"], float(result["confidence"]), result.get("reasoning", "")
        # Fallback heuristic
        response_lower = response_text.lower()
        for category in ["Plastic", "Paper", "Metal", "Glass", "Organic"]:
            if category.lower() in response_lower:
                return category, 0.7, f"Detected {category.lower()} in response"
        return "Other", 0.5, "Could not determine category"
    except Exception as e:
        return "Other", 0.3, f"Failed to parse response: {str(e)}"

@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        for model in VISION_MODELS:
            try:
                response_text = await classify_with_httpx(image_bytes, model)
                predicted_class, confidence, reasoning = parse_classification_response(response_text)
                is_recyclable = predicted_class in PRICING and PRICING[predicted_class] > 0
                price_per_kg = PRICING.get(predicted_class, 0)
                if not is_recyclable or predicted_class in ["Organic", "Other"]:
                    return {
                        "class": "Non-recyclable",
                        "confidence": confidence,
                        "recyclable": False,
                        "price_per_kg": 0,
                        "debug_info": {
                            "original_class": predicted_class,
                            "model_used": model,
                            "reasoning": reasoning,
                            "raw_response": response_text[:200]
                        }
                    }
                else:
                    return {
                        "class": predicted_class,
                        "confidence": confidence,
                        "recyclable": True,
                        "price_per_kg": price_per_kg,
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

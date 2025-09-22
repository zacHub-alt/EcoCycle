from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import base64
import io
import json
import os
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("⚠️ Missing GROQ_API_KEY environment variable")

client = Groq(api_key=GROQ_API_KEY)

# Available Groq vision models (updated with correct model names)
VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct"  # Your tested model
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
    """Convert image bytes to base64 string"""
    return base64.b64encode(image_bytes).decode('utf-8')

def create_waste_classification_prompt():
    """Create a detailed prompt for waste classification"""
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

async def classify_with_groq(image_bytes, model_name="meta-llama/llama-4-scout-17b-16e-instruct"):
    """Classify waste using Groq vision model"""
    try:
        # Encode image
        base64_image = encode_image_to_base64(image_bytes)
        
        # Create the chat completion
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": create_waste_classification_prompt()},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            model=model_name,
            temperature=0.1,
            max_tokens=1024,
        )
        
        response_text = chat_completion.choices[0].message.content
        return response_text
        
    except Exception as e:
        raise Exception(f"Groq API call failed: {str(e)}")

def parse_classification_response(response_text):
    """Parse the JSON response from Groq"""
    try:
        # Try to extract JSON from the response
        json_match = re.search(r'\{[^}]*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            result = json.loads(json_str)
            
            # Validate required fields
            if "class" in result and "confidence" in result:
                return result["class"], float(result["confidence"]), result.get("reasoning", "")
        
        # Fallback: try to extract class from text
        response_lower = response_text.lower()
        if "plastic" in response_lower:
            return "Plastic", 0.7, "Detected plastic in response"
        elif "paper" in response_lower or "cardboard" in response_lower:
            return "Paper", 0.7, "Detected paper in response"
        elif "metal" in response_lower:
            return "Metal", 0.7, "Detected metal in response"
        elif "glass" in response_lower:
            return "Glass", 0.7, "Detected glass in response"
        elif "organic" in response_lower:
            return "Organic", 0.7, "Detected organic waste in response"
        else:
            return "Other", 0.5, "Could not determine category"
            
    except Exception as e:
        return "Other", 0.3, f"Failed to parse response: {str(e)}"

@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    if GROQ_API_KEY == "your_groq_api_key_here":
        return {"error": "Please set your Groq API key. Get one free at console.groq.com"}
    
    try:
        # Read image
        image_bytes = await file.read()
        
        # Try classification with different models
        for model in VISION_MODELS:
            try:
                response_text = await classify_with_groq(image_bytes, model)
                predicted_class, confidence, reasoning = parse_classification_response(response_text)
                
                # Determine pricing
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
                            "raw_response": response_text[:200]  # First 200 chars
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
                if model == VISION_MODELS[-1]:  # Last model
                    return {"error": f"All Groq models failed. Last error: {str(e)}"}
                continue
                
    except Exception as e:
        return {"error": f"Classification failed: {str(e)}"}

@app.post("/analyze-detailed")
async def analyze_detailed(file: UploadFile = File(...)):
    """Get detailed analysis of the waste item"""
    if GROQ_API_KEY == "your_groq_api_key_here":
        return {"error": "Please set your Groq API key"}
    
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
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": detailed_prompt},
                        {
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            model="llava-v1.5-7b-4096-preview",
            temperature=0.3,
            max_tokens=1024,
        )
        
        return {
            "detailed_analysis": chat_completion.choices[0].message.content,
            "model_used": "llava-v1.5-7b-4096-preview"
        }
        
    except Exception as e:
        return {"error": f"Detailed analysis failed: {str(e)}"}

@app.get("/setup")
async def setup_guide():
    return {
        "title": "Groq Vision API Setup",
        "steps": [
            "1. Go to https://console.groq.com",
            "2. Create a FREE account",
            "3. Navigate to API Keys section",
            "4. Create a new API key",
            "5. Copy the API key",
            "6. Replace 'your_groq_api_key_here' in the code",
            "7. Install: pip install groq fastapi uvicorn",
            "8. Run: python app.py"
        ],
        "models_available": [
            {
                "name": "llava-v1.5-7b-4096-preview",
                "description": "Primary vision model, fast and accurate",
                "use_case": "General image understanding"
            },
            {
                "name": "llama-3.2-11b-vision-preview", 
                "description": "Medium model with good accuracy",
                "use_case": "Balanced performance"
            },
            {
                "name": "llama-3.2-90b-vision-preview",
                "description": "Largest model, highest accuracy",
                "use_case": "Complex image analysis"
            }
        ],
        "pricing": "FREE with generous limits",
        "advantages": [
            "State-of-the-art vision models",
            "Extremely fast inference (thanks to Groq chips)",
            "Free tier with high limits", 
            "OpenAI-compatible API",
            "No model hosting required",
            "Multiple fallback models"
        ]
    }

@app.get("/test-connection")
async def test_connection():
    """Test if Groq API key is working"""
    if GROQ_API_KEY == "your_groq_api_key_here":
        return {"error": "API key not set"}
    
    try:
        # Test with a simple text completion
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hello, just testing the connection."}],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            max_tokens=50,
        )
        
        return {
            "status": "SUCCESS! Groq API is working",
            "test_response": chat_completion.choices[0].message.content,
            "available_models": VISION_MODELS
        }
        
    except Exception as e:
        return {"error": f"Groq API test failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
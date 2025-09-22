# Use Python 3.11 slim image to avoid Rust build issues
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy all project files into the container
COPY . .

# Upgrade pip, setuptools, wheel
RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies
RUN pip install -r requirements.txt

# Command to start FastAPI
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]

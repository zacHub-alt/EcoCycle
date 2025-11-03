# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements first for caching
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Copy the rest of the project
COPY . .

# Expose port for FastAPI
EXPOSE 8080

# Start FastAPI with uvicorn
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]

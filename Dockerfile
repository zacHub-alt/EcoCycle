# Use Python 3.13 slim image
FROM python:3.13-slim

# Install system dependencies and Rust
RUN apt-get update && apt-get install -y curl build-essential
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Add Cargo to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

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

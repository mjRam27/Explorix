FROM python:3.10-slim

# Set working directory inside container
WORKDIR /app

# Copy code from backend_vbb folder to /app
COPY . .

# Install system dependencies (for Redis TLS if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libnss3 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 👇 This assumes your file is called main.py and contains `app = FastAPI()`
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Ensure data directories exist
RUN mkdir -p data model

# Expose FastAPI port
EXPOSE 8000

# Generate data, train model, and start Uvicorn
CMD ["sh", "-c", "python -m app.training.generate_dataset && python -m app.training.train_model && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

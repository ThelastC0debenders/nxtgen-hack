#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting NxtGen Hack Full-Stack Initialization..."

# 1. Check Requirements
echo "Checking dependencies..."
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

COMPOSE_COMMAND="docker compose"
if ! docker compose version &> /dev/null; then
  COMPOSE_COMMAND="docker-compose"
fi

# 2. Setup Environment Variables
echo "Configuring environment variables..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo "Creating backend/.env from example..."
        cp backend/.env.example backend/.env
    else
        echo "Creating default backend/.env..."
        cat <<EOF > backend/.env
PORT=5001
JWT_SECRET=super-secret-key-for-testing
DB_USER=saaj376
DB_PASSWORD=saaj376
DB_NAME=nextgen
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379
AI_SERVICE_URL=http://backend-ai:8000
AI_TIMEOUT_MS=5000
EOF
    fi
else
    echo "backend/.env already exists. Skipping."
fi

# 3. Boot Infrastructure
echo "Building and starting Docker containers..."
$COMPOSE_COMMAND up -d --build

# 4. Wait for Node.js Backend to be fully ready
# We wait for the backend container because it depends on the DB, Redis, and AI being healthy.
echo "Waiting for services to become healthy (this may take 1-2 minutes for AI training)..."
attempt_counter=0
max_attempts=30

until [ "$(docker inspect -f '{{.State.Health.Status}}' nxtgen-db)" == "healthy" ]; do
    if [ \${attempt_counter} -eq \${max_attempts} ]; then
      echo "❌ Error: Database healthcheck timed out."
      $COMPOSE_COMMAND logs db
      exit 1
    fi
    printf '.'
    attempt_counter=$(($attempt_counter + 1))
    sleep 5
done

# Wait for backend container to be running
sleep 15 

# 5. Initialize Database Tables
echo ""
echo "Initializing PostgreSQL tables..."
docker exec -it nxtgen-backend npx ts-node init-db.ts

echo "✅ Setup Complete!"
echo "---"
echo "🌐 Frontend: http://localhost:5173"
echo "⚙️  Backend: http://localhost:5001"
echo "🧠 AI Service: http://localhost:8000/docs"
echo "---"
echo "To view logs: $COMPOSE_COMMAND logs -f"
echo "To shut down: $COMPOSE_COMMAND down"

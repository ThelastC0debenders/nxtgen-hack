FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Start the development server using ts-node
CMD ["npm", "run", "dev"]

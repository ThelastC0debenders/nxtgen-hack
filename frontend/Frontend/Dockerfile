FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start Vite dev server binding to 0.0.0.0 to allow external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

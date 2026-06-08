FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_URL=http://engine:3000

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev

COPY agent.ts ./agent.ts
COPY src ./src

EXPOSE 8000

CMD ["npx", "adk", "web", "agent.ts", "--host", "0.0.0.0", "--port", "8000", "--file_type", "esm"]

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY config ./config
COPY prompts ./prompts
COPY policies ./policies

EXPOSE 3000

CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=development

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY angular.json ./
COPY tsconfig*.json ./
COPY tailwind.config.cjs ./

EXPOSE 4200

CMD ["npm", "start"]

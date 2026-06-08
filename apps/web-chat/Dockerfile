FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY angular.json ./
COPY tsconfig*.json ./
COPY tailwind.config.cjs ./
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200
ENV ENGINE_URL=http://localhost:3000

RUN npm install -g http-server@14.1.1
COPY --from=build /app/dist/web-chat/browser ./public

EXPOSE 4200

CMD sh -c 'printf "{\"engineUrl\":\"%s\"}\n" "$ENGINE_URL" > ./public/runtime-config.json && http-server ./public -a 0.0.0.0 -p "$PORT"'

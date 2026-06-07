FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/product-scope.md ./product-scope.md
COPY --from=build /app/features ./features
COPY --from=build /app/solution ./solution

EXPOSE 4321

CMD ["npm", "start"]

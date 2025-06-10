FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install
RUN npm run build
RUN npm prune --omit=dev

ENV PORT=8080

CMD ["node", "dist/index.js"]

FROM node:20-alpine

WORKDIR /app

# only production deps
COPY package.json .
RUN npm install --omit=dev

# app source
COPY index.js .

ENV PORT=8080

CMD ["node", "index.js"]

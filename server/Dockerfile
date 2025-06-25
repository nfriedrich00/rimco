FROM node:20-alpine
RUN apk add --no-cache docker-cli
# hopefully a TEMPORARY fix see docker-compose.yml

WORKDIR /app

# only production deps
COPY package.json .
RUN npm install --omit=dev

# app source
COPY index.js .

ENV PORT=8080

CMD ["node", "index.js"]

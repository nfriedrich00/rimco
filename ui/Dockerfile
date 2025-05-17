FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

USER node

# ---------- dev ----------
CMD ["npm", "run", "dev", "--", "--host"]


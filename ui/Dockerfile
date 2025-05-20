FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# ---------- dev ----------
CMD ["npm", "run", "dev", "--", "--host"]

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://user:password@db:5432/altuai

RUN npx prisma generate
RUN npm run build

EXPOSE 3215
CMD ["npm", "start"]

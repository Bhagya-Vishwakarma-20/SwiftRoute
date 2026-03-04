FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate


#  prod 
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/package*.json ./

COPY index.js newrelic.js ./
COPY config ./config
COPY controlllers ./controlllers
COPY lib ./lib
COPY middlewares ./middlewares
COPY prisma ./prisma
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY docs ./docs
COPY Readme.md ./Readme.md
EXPOSE 3000

CMD ["node", "-r", "newrelic", "index.js"]

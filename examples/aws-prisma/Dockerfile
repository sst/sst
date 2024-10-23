FROM node:18-bullseye-slim

WORKDIR /app/

COPY package.json index.mjs prisma /app/
RUN npm install

RUN npx prisma generate

ENTRYPOINT ["node", "index.mjs"]

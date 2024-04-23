FROM node:18-bullseye-slim

WORKDIR /app/

COPY package.json /app
RUN npm install

COPY app.mjs /app

ENTRYPOINT ["node", "app.mjs"]
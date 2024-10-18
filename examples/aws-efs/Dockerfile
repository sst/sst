FROM node:18-bullseye-slim
WORKDIR /app/

COPY package.json /app
RUN npm install

COPY service.mjs /app
COPY common.mjs /app

ENTRYPOINT ["node", "service.mjs"]
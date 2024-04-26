FROM oven/bun
WORKDIR /usr/src/app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY src .
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.ts" ]

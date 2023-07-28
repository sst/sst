FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl
RUN curl -LO https://github.com/railwayapp/nixpacks/releases/download/v1.11.0/nixpacks-v1.11.0-amd64.deb
RUN dpkg -i nixpacks-v1.11.0-amd64.deb

ENTRYPOINT ["nixpacks"]
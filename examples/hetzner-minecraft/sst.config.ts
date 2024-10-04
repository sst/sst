/// <reference path="./.sst/platform/config.d.ts" />

// Note this will error on the first deploy because the docker provider is not ready
// waiting a minute and running deploy again should work
import { writeFileSync } from "fs";
import { resolve } from "path";
export default $config({
  app(input) {
    return {
      name: "hetzner-minecraft",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "local",
      providers: {
        docker: "4.5.6",
        tls: "5.0.7",
        hcloud: "1.20.4",
        command: "1.0.1",
      },
    };
  },
  async run() {
    const privateKey = new tls.PrivateKey("PrivateKey", {
      algorithm: "RSA",
      rsaBits: 4096,
    });
    const publicKey = new hcloud.SshKey("PublicKey", {
      publicKey: privateKey.publicKeyOpenssh,
    });
    const server = new hcloud.Server("Server", {
      image: "debian-12",
      serverType: "cx11",
      sshKeys: [publicKey.id],
      userData: [
        `#!/bin/bash`,
        `apt-get update`,
        `apt-get install -y docker.io apparmor`,
        `systemctl enable --now docker`,
        `usermod -aG docker debian`,
      ].join("\n"),
    });
    const keyPath = privateKey.privateKeyOpenssh.apply((key) => {
      const path = "key_rsa";
      writeFileSync(path, key, { mode: 0o600 });
      return resolve(path);
    });
    const dockerProvider = new docker.Provider("DockerProvider", {
      host: $interpolate`ssh://root@${server.ipv4Address}`,
      sshOpts: ["-i", keyPath, "-o", "StrictHostKeyChecking=no"],
    });
    const minecraft = new docker.Container(
      "Minecraft",
      {
        image: "itzg/minecraft-server",
        ports: [
          {
            internal: 25565,
            external: 25565,
          },
        ],
        envs: ["EULA=TRUE"],
        volumes: [
          {
            hostPath: "/docker/minecraft/data",
            containerPath: "/data",
          },
        ],
        restart: "always",
      },
      {
        provider: dockerProvider,
        dependsOn: [server],
      },
    );
    return {
      url: $interpolate`${server.ipv4Address}:25565`,
    };
  },
});

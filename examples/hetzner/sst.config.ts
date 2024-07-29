/// <reference path="./.sst/platform/config.d.ts" />

import { writeFileSync } from "fs";
import { resolve } from "path";

export default $config({
  app(input) {
    return {
      name: "hetzner",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { hcloud: true, tls: true, docker: true },
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

    const nginx = new docker.Container(
      "Nginx",
      {
        image: "nginx:latest",
        ports: [
          {
            internal: 80,
            external: 80,
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
      url: $interpolate`http://${server.ipv4Address}`,
    };
  },
});

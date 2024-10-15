/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "fly",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "local",
      providers: { fly: "0.1.17" },
    };
  },
  async run() {
    const app = new fly.App("App", {
      name: "sst-demo",
    });
    const machine = new fly.Machine("Machine", {
      app: app.name,
      image: "nginx:latest",
      region: "mia",
      services: [
        {
          protocol: "tcp",
          internalPort: 80,
          ports: [{ port: 80, handlers: ["http"] }],
        },
      ],
    });
  },
});

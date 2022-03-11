import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const bus = new sst.EventBus(this, "Ordered", {
      rules: {
        rule1: {
          eventPattern: {
            source: ["myevent"],
            detailType: ["Order"],
          },
          targets: ["src/receipt.handler", "src/shipping.handler"],
        },
      },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          busName: bus.eventBusName,
        },
      },
      routes: {
        "POST /order": "src/order.handler",
      },
    });

    api.attachPermissions([bus]);

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "aws-python",
			removal: input?.stage === "production" ? "retain" : "remove",
			home: "local",
			providers: {
				aws: true,
			},
		};
	},
	async run() {
		const linkableValue = new sst.Linkable("MyLinkableValue", {
			properties: {
				foo: "Hello World",
			},
		});

		const python = new sst.aws.Function("MyPythonFunction", {
			handler: "src/python.handler",
			runtime: "python3.11",
			url: true,
			link: [linkableValue],
		});

		return {
			python: python.url,
		};
	},
});

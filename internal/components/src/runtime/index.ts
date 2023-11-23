import { LocalWorkspace } from "@pulumi/pulumi/automation";

const stack = await LocalWorkspace.createStack({});

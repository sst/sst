import iot from "aws-iot-device-sdk";

const FUNCTION_ID = "test";
const PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/${FUNCTION_ID}`;

const ENVIRONMENT_IGNORE: Record<string, true> = {
  SST_DEBUG_ENDPOINT: true,
  SST_DEBUG_SRC_HANDLER: true,
  SST_DEBUG_SRC_PATH: true,
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: true,
  AWS_LAMBDA_LOG_GROUP_NAME: true,
  AWS_LAMBDA_LOG_STREAM_NAME: true,
  LD_LIBRARY_PATH: true,
  LAMBDA_TASK_ROOT: true,
  AWS_LAMBDA_RUNTIME_API: true,
  AWS_EXECUTION_ENV: true,
  AWS_XRAY_DAEMON_ADDRESS: true,
  AWS_LAMBDA_INITIALIZATION_TYPE: true,
  PATH: true,
  PWD: true,
  LAMBDA_RUNTIME_DIR: true,
  LANG: true,
  NODE_PATH: true,
  TZ: true,
  SHLVL: true,
  _AWS_XRAY_DAEMON_ADDRESS: true,
  _AWS_XRAY_DAEMON_PORT: true,
  AWS_XRAY_CONTEXT_MISSING: true,
  _HANDLER: true,
  _LAMBDA_CONSOLE_SOCKET: true,
  _LAMBDA_CONTROL_SOCKET: true,
  _LAMBDA_LOG_FD: true,
  _LAMBDA_RUNTIME_LOAD_TIME: true,
  _LAMBDA_SB_ID: true,
  _LAMBDA_SERVER_PORT: true,
  _LAMBDA_SHARED_MEM_FD: true,
};

const ENVIRONMENT = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, _]) => ENVIRONMENT_IGNORE[key] !== true
  )
);

const endpoint = "a38npzxl5ie9zp-ats.iot.us-east-1.amazonaws.com";
const device = new iot.device({
  protocol: "wss",
  host: endpoint,
});
device.on("error", console.log);
device.on("connect", console.log);
device.subscribe(`${PREFIX}/response`);

interface Fragment {
  id: string;
  index: number;
  count: number;
  data: string;
}

const fragments = new Map<string, Map<number, Fragment>>();

let onMessage: (evt: any) => void;

device.on("message", (_topic, buffer: Buffer) => {
  const fragment = JSON.parse(buffer.toString()) as Fragment;
  let pending = fragments.get(fragment.id);
  if (!pending) {
    pending = new Map();
    fragments.set(fragment.id, pending);
  }
  pending.set(fragment.index, fragment);

  if (pending.size === fragment.count) {
    const data = [...pending.values()]
      .sort((a, b) => a.index - b.index)
      .map((item) => item.data)
      .join("");

    const evt = JSON.parse(data);
    onMessage(evt);
  }
});

export async function handler(event: any, context: any) {
  for (const fragment of encode({
    type: "function.invocation",
    properties: {
      functionID: FUNCTION_ID,
      event,
      context,
      env: ENVIRONMENT,
    },
  })) {
    device.publish(`${PREFIX}/invocation`, JSON.stringify(fragment));
  }
  const result = await new Promise<any>((r) => {
    onMessage = (evt) => {
      if ((evt.type = "function.responded")) r(evt.properties);
    };
  });

  if (result.type === "success") {
    return result.body;
  }

  if (result.type === "failure") {
    throw result.body;
  }
}

function encode(input: any) {
  const json = JSON.stringify(input);
  const parts = json.match(/.{1,100000}/g);
  if (!parts) return [];
  const id = Math.random().toString();
  return parts.map((part, index) => ({
    id,
    index,
    count: parts?.length,
    data: part,
  }));
}

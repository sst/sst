import Conf from "conf";
import chalk from "chalk";
import { BinaryLike, createHash, randomBytes } from "crypto";
import { postPayload } from "./post-payload";
import { getRawProjectId } from "./project-id";
import { getEnvironmentData } from "./environment";

const TELEMETRY_API = "https://telemetry.serverless-stack.com/events";
const TELEMETRY_KEY_ENABLED = "telemetry.enabled";
const TELEMETRY_KEY_NOTIFY_DATE = 'telemetry.notifiedAt'
const TELEMETRY_KEY_ID = `telemetry.anonymousId`;
const TELEMETRY_KEY_SALT = `telemetry.salt`;

type EventContext = {
  anonymousId: string;
  projectId: string;
  sessionId: string;
};

const conf = initializeConf();
const salt = getSalt();
const sessionId = randomBytes(32).toString("hex");
const projectId = oneWayHash(getRawProjectId());
const anonymousId = getAnonymousId();

notify();

export function enable(): void {
  conf && conf.set(TELEMETRY_KEY_ENABLED, true);
}

export function disable(): void {
  conf && conf.set(TELEMETRY_KEY_ENABLED, false);
}

export function isEnabled(): boolean {
  if (!conf) {
    return false;
  }

  return conf.get(TELEMETRY_KEY_ENABLED, true) !== false;
}

export function trackCli(command: string): void {
  record("CLI_COMMAND", {
    command,
  });
}

function initializeConf() {
  try {
    return new Conf({ projectName: "sst" });
  } catch (_) {
    return null;
  }
}

function notify() {
  if (!conf || willNotRecord()) {
    return
  }

  // Do not notify if user has been notified before.
  if (conf.get(TELEMETRY_KEY_NOTIFY_DATE) !== undefined) {
    return
  }
  conf.set(TELEMETRY_KEY_NOTIFY_DATE, Date.now().toString())

  console.log(
    `${chalk.cyan.bold(
      'Attention'
    )}: SST now collects completely anonymous telemetry regarding usage. This is used to guide SST's roadmap.`
  )
  console.log(
    `You can learn more, including how to opt-out of this anonymous program, by heading over to:`
  )
  console.log('https://docs.serverless-stack.com/anonymous-telemetry')
  console.log()
}

function willNotRecord() {
  return !isEnabled() || !!process.env.SST_TELEMETRY_DISABLED;
}

function record(name: string, properties: any): Promise<any> {
  if (willNotRecord()) {
    return Promise.resolve();
  }

  const context: EventContext = {
    anonymousId,
    projectId,
    sessionId,
  };

  return postPayload(TELEMETRY_API, {
    context,
    environment: getEnvironmentData(),
    events: [
      {
        name,
        properties,
      },
    ],
  });
}

function getSalt(): string {
  const val = conf && conf.get(TELEMETRY_KEY_SALT);
  if (val) {
    return val as string;
  }

  const generated = randomBytes(16).toString("hex");
  conf && conf.set(TELEMETRY_KEY_SALT, generated);
  return generated;
}

function getAnonymousId(): string {
  const val = conf && conf.get(TELEMETRY_KEY_ID);
  if (val) {
    return val as string;
  }

  const generated = randomBytes(32).toString("hex");
  conf && conf.set(TELEMETRY_KEY_ID, generated);
  return generated;
}

function oneWayHash(payload: BinaryLike): string {
  const hash = createHash("sha256");

  // Always prepend the payload value with salt. This ensures the hash is truly
  // one-way.
  hash.update(salt);

  // Update is an append operation, not a replacement. The salt from the prior
  // update is still present!
  hash.update(payload);
  return hash.digest("hex");
}

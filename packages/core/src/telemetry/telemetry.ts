import Conf from "conf";
import { BinaryLike, createHash, randomBytes } from "crypto";
import { postPayload } from "./post-payload";
import { getRawProjectId } from "./project-id";
import { getEnvironmentData } from "./environment";

const TELEMETRY_API = "https://telemetry.serverless-stack.com/events";
const TELEMETRY_KEY_ENABLED = "telemetry.enabled";
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

function record(name: string, properties: any): Promise<any> {
  if (!isEnabled() || !!process.env.SST_TELEMETRY_DISABLED) {
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

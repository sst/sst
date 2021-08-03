// Utilities for handling XRay scoping within bootstrap
const AWSXRay = require("aws-xray-sdk");
const { getChildLogger } = require("@serverless-stack/core");
const { XRayClient, PutTraceSegmentsCommand } = require("@aws-sdk/client-xray");

const XRAY_REGEX = /^Root=(?<root>.*);Parent=(?<parent>.*);Sampled=(?<sampled>\d{1})/u;
const logger = getChildLogger("xray");

let SEGMENT;
let SUB_SEGMENT;
let XRAY_NAME_SPACE;
let SAMPLED;

const xrayFlushSegments = async () => {
  // When no XRay support, there is no segment, exit early
  if (!SEGMENT) return;

  // When not sampling we will not drain segments
  if (!SAMPLED) return;

  try {
    const client = new XRayClient({});

    SUB_SEGMENT && SUB_SEGMENT.close();
    SUB_SEGMENT && SUB_SEGMENT.flush();
    SEGMENT && SEGMENT.close();
    SEGMENT && SEGMENT.flush();

    return client.send(
      new PutTraceSegmentsCommand({
        TraceSegmentDocuments: [SEGMENT.format()],
      })
    );
  } catch (e) {
    logger.error("Failed to send XRay Segments", e);
  }
};

const wrapWithLocalXray = async (functionName, runner) => {
  let result;

  configureXray();
  constructLocalSegment(functionName);

  // If segment construction fails and there is no cls-hooked namespace ignore
  // errors raised by xray
  if (!SEGMENT || !XRAY_NAME_SPACE) {
    AWSXRay.setContextMissingStrategy("IGNORE_ERROR");
    return runner();
  }

  // Execute the full lambda runner within cls-hooked namespace create by XRay
  // to capture exit codes and errors
  await XRAY_NAME_SPACE.runAndReturn(async () => {
    AWSXRay.setSegment(SEGMENT);
    AWSXRay.captureFunc(
      functionName,
      (subsegment) => {
        SUB_SEGMENT = subsegment;
        runner();
      },
      SEGMENT
    );
  });

  return result;
};

module.exports = {
  xrayFlushSegments,
  wrapWithLocalXray,
};

// Private Utilities

const configureXray = () => {
  // Currently a single bootstrap.js is launched per lambda invocation, should
  // that change (support hot lambda like behaviour), then these resets will
  // prevent bleed across invocations
  SEGMENT = undefined;
  SUB_SEGMENT = undefined;
  XRAY_NAME_SPACE = undefined;
  SAMPLED = undefined;

  try {
    AWSXRay.enableAutomaticMode();
    XRAY_NAME_SPACE = AWSXRay.getNamespace();
  } catch (e) {
    logger.error("Error initializing the XRay namespace", e);
  }
};

const getParentTrace = () => {
  const trace = XRAY_REGEX.exec(process.env._X_AMZN_TRACE_ID);

  if (trace === null) {
    logger.warn(
      `Provided trace '${process.env._X_AMZN_TRACE_ID}' was not valid for Xray`
    );
    return {
      root: undefined,
      parent: undefined,
      sampled: undefined,
    };
  }

  const {
    groups: { root, parent, sampled },
  } = trace;

  return {
    root,
    parent,
    sampled,
  };
};

const constructLocalSegment = (ORIG_HANDLER_PATH) => {
  // There is one root segment per invocation of the start instance, if it is
  // already set, then return early
  if (SEGMENT) return;

  // If there is no forwarded x-amzn-trace-id header, the trace cannot be
  // constructed, return early assuming xray is not configured for the lambda
  if (!process.env._X_AMZN_TRACE_ID) return;

  try {
    const { root, parent, sampled } = getParentTrace();

    SAMPLED = sampled;

    if (SAMPLED) {
      SEGMENT = new AWSXRay.Segment(ORIG_HANDLER_PATH, root, parent);
    }
  } catch (e) {
    logger.error("Failed to construct local XRay segment", e);
  }
};

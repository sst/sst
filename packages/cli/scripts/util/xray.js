// Utilities for handling XRay scoping within bootstrap

const AWSXRay = require("aws-xray-sdk");
const { getChildLogger } = require("@serverless-stack/core");
const { XRayClient, PutTraceSegmentsCommand } = require("@aws-sdk/client-xray");

const XRAY_REGEX = /^Root=(?<root>.*);Parent=(?<parent>.*);Sampled=(?<sampled>\d{1})/u;
const logger = getChildLogger("xray");

let SEGMENT;
let SUB_SEGMENT;
let XRAY_NAME_SPACE;

const xrayFlushSegments = async () => {
  // When no XRay support, there is no segment, exit early
  if (!SEGMENT) return;

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
    logger.debug("Failed to send XRay Segments");
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
  try {
    AWSXRay.enableAutomaticMode();
    XRAY_NAME_SPACE = AWSXRay.getNamespace();
  } catch (e) {
    logger.error("Error initializing the XRay ");
  }
};

const getParentTrace = () => {
  const {
    groups: { root, parent },
  } =
    process.env._X_AMZN_TRACE_ID &&
    XRAY_REGEX.exec(process.env._X_AMZN_TRACE_ID);
  return {
    root,
    parent,
  };
};

// There is one root segment per invocation of the start instance
const constructLocalSegment = (ORIG_HANDLER_PATH) => {
  if (SEGMENT) return;

  try {
    const { root, parent } = getParentTrace();
    SEGMENT = new AWSXRay.Segment(ORIG_HANDLER_PATH, root, parent);
  } catch {
    logger.error("Failed to construct local XRay segment");
  }
};

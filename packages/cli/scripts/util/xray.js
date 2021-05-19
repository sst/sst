// Utilities for handling XRay scoping within bootstrap

const AWSXRay = require("aws-xray-sdk");
const { getChildLogger } = require("@serverless-stack/core");
const { XRayClient, PutTraceSegmentsCommand } = require("@aws-sdk/client-xray");
const client = new XRayClient({});

const XRAY_REGEX = /^Root=(?<root>.*);Parent=(?<parent>.*);Sampled=(?<sampled>\d{1})/u;
const logger = getChildLogger("xray");

let SEGMENT;
let SUB_SEGMENT;

const configureXray = () => {
  AWSXRay.enableAutomaticMode();
  return AWSXRay.getNamespace();
};

const xrayEnabled = () => {
  if (process.env._X_AMZN_TRACE_ID) return true;

  logger.debug("XRay is not enabled");
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

const constructLocalSegment = (ORIG_HANDLER_PATH) => {
  let segment;

  try {
    const { root, parent } = getParentTrace();
    segment = new AWSXRay.Segment(ORIG_HANDLER_PATH, root, parent);
  } catch {
    logger.error("Failed to construct local XRay segment");
  }

  return segment;
};

const drain = async () => {
  SEGMENT && SEGMENT.close();
  SUB_SEGMENT && SUB_SEGMENT.close();

  console.info(SEGMENT.format());
  console.info(SEGMENT.format());

  const res = await client.send(
    new PutTraceSegmentsCommand({
      TraceSegmentDocuments: SEGMENT.format(),
    })
  );

  console.info("sent segments", res);
};

const wrapWithLocalXray = async (functionName, runner) => {
  let result;

  const nameSpace = configureXray();
  SEGMENT = constructLocalSegment(functionName);

  // If segment construction fails ignore errors and run handler
  if (!SEGMENT) {
    AWSXRay.setContextMissingStrategy("IGNORE_ERROR");
    return runner();
  }

  // Execute the handler within cls-hooked namespace create by XRay
  await nameSpace.runAndReturn(async () => {
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
  xrayEnabled,
  drain,
  wrapWithLocalXray,
};

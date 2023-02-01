'use strict';

const aws = require('aws-sdk');

const defaultSleep = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// These are used for test purposes only
let defaultResponseURL;
let waiter;
let sleep = defaultSleep;
let random = Math.random;
let maxAttempts = 10;

/**
 * Upload a CloudFormation response object to S3.
 *
 * @param {object} event the Lambda event payload received by the handler function
 * @param {object} context the Lambda context received by the handler function
 * @param {string} responseStatus the response status, either 'SUCCESS' or 'FAILED'
 * @param {string} physicalResourceId CloudFormation physical resource ID
 * @param {object} [responseData] arbitrary response data object
 * @param {string} [reason] reason for failure, if any, to convey to the user
 * @returns {Promise} Promise that is resolved on success, or rejected on connection error or HTTP error response
 */
let report = function (event, context, responseStatus, physicalResourceId, responseData, reason) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const { URL } = require('url');

    var responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: reason,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: responseData
    });

    const parsedUrl = new URL(event.ResponseURL || defaultResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Content-Type': '',
        'Content-Length': responseBody.length
      }
    };

    https.request(options)
      .on('error', reject)
      .on('response', res => {
        res.resume();
        if (res.statusCode >= 400) {
          reject(new Error(`Server returned error ${res.statusCode}: ${res.statusMessage}`));
        } else {
          resolve();
        }
      })
      .end(responseBody, 'utf8');
  });
};

/**
 * Adds tags to an existing certificate
 *
 * @param {string} certificateArn the ARN of the certificate to add tags to
 * @param {string} region the region the certificate exists in
 * @param {map} tags Tags to add to the requested certificate
 */
const addTags = async function(certificateArn, region, tags) {
  const result = Array.from(Object.entries(tags)).map(([Key, Value]) => ({ Key, Value }))
  const acm = new aws.ACM({ region });

  await acm.addTagsToCertificate({
    CertificateArn: certificateArn,
    Tags: result,
  }).promise();
}

/**
 * Requests a public certificate from AWS Certificate Manager, using DNS validation.
 * The hosted zone ID must refer to a **public** Route53-managed DNS zone that is authoritative
 * for the suffix of the certificate's Common Name (CN).  For example, if the CN is
 * `*.example.com`, the hosted zone ID must point to a Route 53 zone authoritative
 * for `example.com`.
 *
 * @param {string} requestId the CloudFormation request ID
 * @param {string} domainName the Common Name (CN) field for the requested certificate
 * @param {string} hostedZoneId the Route53 Hosted Zone ID
 * @returns {string} Validated certificate ARN
 */
const requestCertificate = async function (requestId, domainName, subjectAlternativeNames, certificateTransparencyLoggingPreference, hostedZoneId, region, route53Endpoint) {
  const crypto = require('crypto');
  const acm = new aws.ACM({ region });
  const route53 = route53Endpoint ? new aws.Route53({ endpoint: route53Endpoint }) : new aws.Route53();
  if (waiter) {
    // Used by the test suite, since waiters aren't mockable yet
    route53.waitFor = acm.waitFor = waiter;
  }

  console.log(`Requesting certificate for ${domainName}`);

  const reqCertResponse = await acm.requestCertificate({
    DomainName: domainName,
    SubjectAlternativeNames: subjectAlternativeNames,
    Options: {
      CertificateTransparencyLoggingPreference: certificateTransparencyLoggingPreference
    },
    IdempotencyToken: crypto.createHash('sha256').update(requestId).digest('hex').slice(0, 32),
    ValidationMethod: 'DNS'
  }).promise();

  console.log(`Certificate ARN: ${reqCertResponse.CertificateArn}`);

  console.log('Waiting for ACM to provide DNS records for validation...');

  let records = [];
  for (let attempt = 0; attempt < maxAttempts && !records.length; attempt++) {
    const { Certificate } = await acm.describeCertificate({
      CertificateArn: reqCertResponse.CertificateArn
    }).promise();

    records = getDomainValidationRecords(Certificate);
    if (!records.length) {
      // Exponential backoff with jitter based on 200ms base
      // component of backoff fixed to ensure minimum total wait time on
      // slow targets.
      const base = Math.pow(2, attempt);
      await sleep(random() * base * 50 + base * 150);
    }
  }
  if (!records.length) {
    throw new Error(`Response from describeCertificate did not contain DomainValidationOptions after ${maxAttempts} attempts.`)
  }

  console.log(`Upserting ${records.length} DNS records into zone ${hostedZoneId}:`);

  await commitRoute53Records(route53, records, hostedZoneId);

  console.log('Waiting for validation...');
  await acm.waitFor('certificateValidated', {
    // Wait up to 9 minutes and 30 seconds
    $waiter: {
      delay: 30,
      maxAttempts: 19
    },
    CertificateArn: reqCertResponse.CertificateArn
  }).promise();

  return reqCertResponse.CertificateArn;
};

/**
 * Deletes a certificate from AWS Certificate Manager (ACM) by its ARN.
 * If the certificate does not exist, the function will return normally.
 *
 * @param {string} arn The certificate ARN
 */
const deleteCertificate = async function (arn, region, hostedZoneId, route53Endpoint, cleanupRecords) {
  const acm = new aws.ACM({ region });
  const route53 = route53Endpoint ? new aws.Route53({ endpoint: route53Endpoint }) : new aws.Route53();
  if (waiter) {
    // Used by the test suite, since waiters aren't mockable yet
    route53.waitFor = acm.waitFor = waiter;
  }

  try {
    console.log(`Waiting for certificate ${arn} to become unused`);

    let inUseByResources;
    let records = [];
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { Certificate } = await acm.describeCertificate({
        CertificateArn: arn
      }).promise();

      if (cleanupRecords) {
        records = getDomainValidationRecords(Certificate);
      }
      inUseByResources = Certificate.InUseBy || [];

      if (inUseByResources.length || !records.length) {
        // Exponential backoff with jitter based on 200ms base
        // component of backoff fixed to ensure minimum total wait time on
        // slow targets.
        const base = Math.pow(2, attempt);
        await sleep(random() * base * 50 + base * 150);
      } else {
        break;
      }
    }

    if (inUseByResources.length) {
      throw new Error(`Response from describeCertificate did not contain an empty InUseBy list after ${maxAttempts} attempts.`)
    }
    if (cleanupRecords && !records.length) {
      throw new Error(`Response from describeCertificate did not contain DomainValidationOptions after ${maxAttempts} attempts.`)
    }

    console.log(`Deleting certificate ${arn}`);

    await acm.deleteCertificate({
      CertificateArn: arn
    }).promise();

    if (cleanupRecords) {
      console.log(`Deleting ${records.length} DNS records from zone ${hostedZoneId}:`);

      await commitRoute53Records(route53, records, hostedZoneId, 'DELETE');
    }

  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      throw err;
    }
  }
};

/**
 * Retrieve the unique domain validation options as records to be upserted (or deleted) from Route53.
 *
 * Returns an empty array ([]) if the domain validation options is empty or the records are not yet ready.
 */
function getDomainValidationRecords(certificate) {
  const options = certificate.DomainValidationOptions || [];
  // Ensure all records are ready; there is (at least a theory there's) a chance of a partial response here in rare cases.
  if (options.length > 0 && options.every(opt => opt && !!opt.ResourceRecord)) {
    // some alternative names will produce the same validation record
    // as the main domain (eg. example.com + *.example.com)
    // filtering duplicates to avoid errors with adding the same record
    // to the route53 zone twice
    const unique = options
      .map((val) => val.ResourceRecord)
      .reduce((acc, cur) => {
        acc[cur.Name] = cur;
        return acc;
      }, {});
    return Object.keys(unique).sort().map(key => unique[key]);
  }
  return [];
}

/**
 * Execute Route53 ChangeResourceRecordSets for a set of records within a Hosted Zone,
 * and wait for the records to commit. Defaults to an 'UPSERT' action.
 */
async function commitRoute53Records(route53, records, hostedZoneId, action = 'UPSERT') {
  const changeBatch = await route53.changeResourceRecordSets({
    ChangeBatch: {
      Changes: records.map((record) => {
        console.log(`${record.Name} ${record.Type} ${record.Value}`);
        return {
          Action: action,
          ResourceRecordSet: {
            Name: record.Name,
            Type: record.Type,
            TTL: 60,
            ResourceRecords: [{
              Value: record.Value
            }]
          }
        };
      }),
    },
    HostedZoneId: hostedZoneId
  }).promise();

  console.log('Waiting for DNS records to commit...');
  await route53.waitFor('resourceRecordSetsChanged', {
    // Wait up to 5 minutes
    $waiter: {
      delay: 30,
      maxAttempts: 10
    },
    Id: changeBatch.ChangeInfo.Id
  }).promise();
}

/**
 * Determines whether an update request should request a new certificate
 *
 * @param {map} oldParams the previously process request parameters
 * @param {map} newParams the current process request parameters
 * @param {string} physicalResourceId the physicalResourceId
 * @returns {boolean} whether or not to request a new certificate
 */
function shouldUpdate(oldParams, newParams, physicalResourceId) {
  if (!oldParams) return true;
  if (oldParams.DomainName !== newParams.DomainName) return true;
  if (oldParams.SubjectAlternativeNames !== newParams.SubjectAlternativeNames) return true;
  if (oldParams.CertificateTransparencyLoggingPreference !== newParams.CertificateTransparencyLoggingPreference) return true;
  if (oldParams.HostedZoneId !== newParams.HostedZoneId) return true;
  if (oldParams.Region !== newParams.Region) return true;
  if (!physicalResourceId || !physicalResourceId.startsWith('arn:')) return true;
  return false;
}

/**
 * Main handler, invoked by Lambda
 */
exports.certificateRequestHandler = async function (event, context) {
  var responseData = {};
  var physicalResourceId;
  var certificateArn;
  async function processRequest() {
    certificateArn = await requestCertificate(
      event.RequestId,
      event.ResourceProperties.DomainName,
      event.ResourceProperties.SubjectAlternativeNames,
      event.ResourceProperties.CertificateTransparencyLoggingPreference,
      event.ResourceProperties.HostedZoneId,
      event.ResourceProperties.Region,
      event.ResourceProperties.Route53Endpoint,
    );
    responseData.Arn = physicalResourceId = certificateArn;
  }

  try {
    switch (event.RequestType) {
      case 'Create':
        await processRequest();
        if (event.ResourceProperties.Tags && physicalResourceId.startsWith('arn:')) {
          await addTags(physicalResourceId, event.ResourceProperties.Region, event.ResourceProperties.Tags);
        }
        break;
      case 'Update':
        if (shouldUpdate(event.OldResourceProperties, event.ResourceProperties, event.PhysicalResourceId)) {
          await processRequest();
        } else {
          responseData.Arn = physicalResourceId = event.PhysicalResourceId;
        }
        if (event.ResourceProperties.Tags && physicalResourceId.startsWith('arn:')) {
          await addTags(physicalResourceId, event.ResourceProperties.Region, event.ResourceProperties.Tags);
        }
        break;
      case 'Delete':
        physicalResourceId = event.PhysicalResourceId;
        const removalPolicy = event.ResourceProperties.RemovalPolicy ?? 'destroy';
        // If the resource didn't create correctly, the physical resource ID won't be the
        // certificate ARN, so don't try to delete it in that case.
        if (physicalResourceId.startsWith('arn:') && removalPolicy === 'destroy') {
          await deleteCertificate(
            physicalResourceId,
            event.ResourceProperties.Region,
            event.ResourceProperties.HostedZoneId,
            event.ResourceProperties.Route53Endpoint,
            event.ResourceProperties.CleanupRecords === "true",
          );
        }
        break;
      default:
        throw new Error(`Unsupported request type ${event.RequestType}`);
    }

    console.log(`Uploading SUCCESS response to S3...`);
    await report(event, context, 'SUCCESS', physicalResourceId, responseData);
    console.log('Done.');
  } catch (err) {
    console.log(`Caught error ${err}. Uploading FAILED message to S3.`);
    await report(event, context, 'FAILED', physicalResourceId, null, err.message);
  }
};

/**
 * @private
 */
exports.withReporter = function (reporter) {
  report = reporter;
};

/**
 * @private
 */
exports.withDefaultResponseURL = function (url) {
  defaultResponseURL = url;
};

/**
 * @private
 */
exports.withWaiter = function (w) {
  waiter = w;
};

/**
 * @private
 */
exports.resetWaiter = function () {
  waiter = undefined;
};

/**
 * @private
 */
exports.withSleep = function (s) {
  sleep = s;
}

/**
 * @private
 */
exports.resetSleep = function () {
  sleep = defaultSleep;
}

/**
 * @private
 */
exports.withRandom = function (r) {
  random = r;
}

/**
 * @private
 */
exports.resetRandom = function () {
  random = Math.random;
}

/**
 * @private
 */
exports.withMaxAttempts = function (ma) {
  maxAttempts = ma;
}

/**
 * @private
 */
exports.resetMaxAttempts = function () {
  maxAttempts = 10;
}

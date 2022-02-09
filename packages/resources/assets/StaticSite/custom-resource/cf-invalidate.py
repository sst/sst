import subprocess
import os
import tempfile
import json
import glob
import traceback
import logging
import shutil
import boto3
import contextlib
import asyncio
import functools
from datetime import datetime
from uuid import uuid4

from urllib.request import Request, urlopen
from zipfile import ZipFile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.resource('s3')
awslambda = boto3.client('lambda')
cloudfront = boto3.client('cloudfront')

CFN_SUCCESS = "SUCCESS"
CFN_FAILED = "FAILED"

def handler(event, context):

    def cfn_error(message=None):
        logger.error("| cfn_error: %s" % message)
        cfn_send(event, context, CFN_FAILED, reason=message)

    try:
        logger.info(event)

        # cloudformation request type (create/update/delete)
        request_type = event['RequestType']

        # extract resource properties
        props = event['ResourceProperties']
        old_props = event.get('OldResourceProperties', {})
        physical_id = event.get('PhysicalResourceId', None)

        try:
            distribution_id    = props.get('DistributionId', '')
            distribution_paths = props.get('DistributionPaths', ['/*'])
            wait_for_invalidation = props.get('WaitForInvalidation', 'true')
        except KeyError as e:
            cfn_error("missing request resource property %s. props: %s" % (str(e), props))
            return

        # if we are creating a new resource, allocate a physical id for it
        # otherwise, we expect physical id to be relayed by cloudformation
        if request_type == "Create":
            physical_id = "aws.cdk.s3deployment.%s" % str(uuid4())
        else:
            if not physical_id:
                cfn_error("invalid request: request type is '%s' but 'PhysicalResourceId' is not defined" % request_type)
                return

        if request_type == "Update" or request_type == "Create":
            if distribution_id:
                cloudfront_invalidate(distribution_id, distribution_paths, wait_for_invalidation)

        cfn_send(event, context, CFN_SUCCESS, physicalResourceId=physical_id)
    except KeyError as e:
        cfn_error("invalid request. Missing key %s" % str(e))
    except Exception as e:
        logger.exception(e)
        cfn_error(str(e))

#---------------------------------------------------------------------------------------------------
# invalidate files in the CloudFront distribution edge caches
def cloudfront_invalidate(distribution_id, distribution_paths, wait_for_invalidation):
    invalidation_resp = cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': len(distribution_paths),
                'Items': distribution_paths
            },
            'CallerReference': str(uuid4()),
        })
    # by default, will wait up to 10 minutes
    if wait_for_invalidation == "true":
        cloudfront.get_waiter('invalidation_completed').wait(
            DistributionId=distribution_id,
            Id=invalidation_resp['Invalidation']['Id'])

#---------------------------------------------------------------------------------------------------
# executes an "aws" cli command
def aws_command(*args):
    aws="/opt/awscli/aws" # from AwsCliLayer
    logger.info("| aws %s" % ' '.join(args))
    subprocess.check_call([aws] + list(args))

#---------------------------------------------------------------------------------------------------
# sends a response to cloudformation
def cfn_send(event, context, responseStatus, responseData={}, physicalResourceId=None, noEcho=False, reason=None):

    responseUrl = event['ResponseURL']
    logger.info(responseUrl)

    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = reason or ('See the details in CloudWatch Log Stream: ' + context.log_stream_name)
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['NoEcho'] = noEcho
    responseBody['Data'] = responseData

    body = json.dumps(responseBody)
    logger.info("| response body:\n" + body)

    headers = {
        'content-type' : '',
        'content-length' : str(len(body))
    }

    try:
        request = Request(responseUrl, method='PUT', data=bytes(body.encode('utf-8')), headers=headers)
        with contextlib.closing(urlopen(request)) as response:
          logger.info("| status code: " + response.reason)
    except Exception as e:
        logger.error("| unable to send response to CloudFormation")
        logger.exception(e)

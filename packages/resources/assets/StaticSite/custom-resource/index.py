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
from botocore.config import Config

from urllib.request import Request, urlopen
from zipfile import ZipFile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

config = Config(
    read_timeout=900,
)

s3 = boto3.resource('s3')
awslambda = boto3.client('lambda', config=config)
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
            sources            = props['Sources']
            dest_bucket_name   = props['DestinationBucketName']
            dest_bucket_prefix = props.get('DestinationBucketKeyPrefix', '')
            distribution_id    = props.get('DistributionId', '')
            file_options       = props.get('FileOptions', [])
            replace_values     = props.get('ReplaceValues', [])

            default_distribution_path = dest_bucket_prefix
            if not default_distribution_path.endswith("/"):
                default_distribution_path += "/"
            if not default_distribution_path.startswith("/"):
                default_distribution_path = "/" + default_distribution_path
            default_distribution_path += "*"

            distribution_paths = props.get('DistributionPaths', [default_distribution_path])
        except KeyError as e:
            cfn_error("missing request resource property %s. props: %s" % (str(e), props))
            return

        # treat "/" as if no prefix was specified
        if dest_bucket_prefix == "/":
            dest_bucket_prefix = ""

        s3_dest = "s3://%s/%s" % (dest_bucket_name, dest_bucket_prefix)

        old_dest_bucket_name = old_props.get("DestinationBucketName", "")
        old_dest_bucket_prefix = old_props.get("DestinationBucketKeyPrefix", "")
        old_s3_dest = "s3://%s/%s" % (old_dest_bucket_name, old_dest_bucket_prefix)

        # obviously this is not
        if old_s3_dest == "s3:///":
            old_s3_dest = None

        logger.info("| s3_dest: %s" % s3_dest)
        logger.info("| old_s3_dest: %s" % old_s3_dest)

        # if we are creating a new resource, allocate a physical id for it
        # otherwise, we expect physical id to be relayed by cloudformation
        if request_type == "Create":
            physical_id = "aws.cdk.s3deployment.%s" % str(uuid4())
        else:
            if not physical_id:
                cfn_error("invalid request: request type is '%s' but 'PhysicalResourceId' is not defined" % request_type)
                return

        # delete or create/update
        if request_type == "Delete":
            aws_command("s3", "rm", s3_dest, "--recursive")

        if request_type == "Update" or request_type == "Create":
            loop = asyncio.get_event_loop()
            loop.run_until_complete(s3_deploy_all(sources, dest_bucket_name, dest_bucket_prefix, file_options, replace_values))
            cleanup_old_deploys(dest_bucket_name, dest_bucket_prefix, old_dest_bucket_prefix)

        if distribution_id:
            cloudfront_invalidate(distribution_id, distribution_paths)

        cfn_send(event, context, CFN_SUCCESS, physicalResourceId=physical_id)
    except KeyError as e:
        cfn_error("invalid request. Missing key %s" % str(e))
    except Exception as e:
        logger.exception(e)
        cfn_error(str(e))

#---------------------------------------------------------------------------------------------------
# populate all files
async def s3_deploy_all(sources, dest_bucket_name, dest_bucket_prefix, file_options, replace_values):
    logger.info("| s3_deploy_all")

    loop = asyncio.get_running_loop()
    function_name = os.environ['UPLOADER_FUNCTION_NAME']

    logger.info("| s3_deploy_all: uploader function: %s" % function_name)

    await asyncio.gather(
        *[
            loop.run_in_executor(None, functools.partial(
                s3_deploy,
                function_name,
                source,
                dest_bucket_name,
                dest_bucket_prefix,
                file_options,
                replace_values
            ))
            for source in sources
        ]
    )

#---------------------------------------------------------------------------------------------------
# populate all files
def s3_deploy(function_name, source, dest_bucket_name, dest_bucket_prefix, file_options, replace_values):
    logger.info("| s3_deploy")

    response = awslambda.invoke(
        FunctionName=function_name,
        InvocationType="RequestResponse",
        Payload=bytes(json.dumps({
            'SourceBucketName': source['BucketName'],
            'SourceObjectKey': source['ObjectKey'],
            'DestinationBucketName': dest_bucket_name,
            'DestinationBucketKeyPrefix': dest_bucket_prefix,
            'FileOptions': file_options,
            'ReplaceValues': replace_values,
        }), encoding='utf8')
    )

    payload = response['Payload'].read()
    result = json.loads(payload.decode("utf8"))
    logger.info(result)
    if (result['Status'] != True):
        raise Exception("failed to upload to s3")

#---------------------------------------------------------------------------------------------------
# cleanup old deployment folders in destination bucket
def cleanup_old_deploys(dest_bucket_name, dest_bucket_prefix, old_dest_bucket_prefix):
    logger.info("| cleanup old deploys")

    # list top level folder in the bucket
    bucket = s3.Bucket(dest_bucket_name)
    result = bucket.meta.client.list_objects(Bucket=bucket.name, Delimiter='/')

    # filter all the deployment folders (ie. starts with 'deploy-')
    # note: Do not remove the new bucket path and the old bucket path. This is
    #       to prevent the bucket path in use (old bucket path) getting delete
    #       after a number of new deployments fail.
    old_deployments = []
    for o in result.get('CommonPrefixes'):
        prefix = o.get('Prefix').rstrip('/')
        if (prefix.startswith('deploy-') and prefix != dest_bucket_prefix and prefix != old_dest_bucket_prefix):
            old_deployments.append(prefix)
    logger.info("| cleanup old deploys: %s" % old_deployments)

    # remove deployment folders if limit exceeded
    for old_deployment in old_deployments:
        logger.info("| cleanup deploy: %s" % old_deployment)
        old_deploy = "s3://%s/%s" % (dest_bucket_name, old_deployment)
        aws_command("s3", "rm", old_deploy, "--recursive")

#---------------------------------------------------------------------------------------------------
# invalidate files in the CloudFront distribution edge caches
def cloudfront_invalidate(distribution_id, distribution_paths):
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

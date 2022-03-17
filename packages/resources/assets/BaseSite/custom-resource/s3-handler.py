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
            filenames          = props.get('Filenames', None)
            file_options       = props.get('FileOptions', [])
            replace_values     = props.get('ReplaceValues', [])
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

        # delete or create/update
        if request_type == "Update" or request_type == "Create":
            loop = asyncio.get_event_loop()
            loop.run_until_complete(s3_deploy_all(sources, dest_bucket_name, file_options, replace_values))
            # purge old items
            if filenames:
                s3_purge(filenames, dest_bucket_name)

        cfn_send(event, context, CFN_SUCCESS, physicalResourceId=physical_id)
    except KeyError as e:
        cfn_error("invalid request. Missing key %s" % str(e))
    except Exception as e:
        logger.exception(e)
        cfn_error(str(e))

#---------------------------------------------------------------------------------------------------
# populate all files
async def s3_deploy_all(sources, dest_bucket_name, file_options, replace_values):
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
                file_options,
                replace_values
            ))
            for source in sources
        ]
    )

#---------------------------------------------------------------------------------------------------
# populate all files
def s3_deploy(function_name, source, dest_bucket_name, file_options, replace_values):
    logger.info("| s3_deploy")

    response = awslambda.invoke(
        FunctionName=function_name,
        InvocationType="RequestResponse",
        Payload=bytes(json.dumps({
            'SourceBucketName': source['BucketName'],
            'SourceObjectKey': source['ObjectKey'],
            'DestinationBucketName': dest_bucket_name,
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
# remove old files
def s3_purge(filenames, dest_bucket_name):
    logger.info("| s3_purge")

    source_bucket_name = filenames['BucketName']
    source_object_key  = filenames['ObjectKey']
    s3_source = "s3://%s/%s" % (source_bucket_name, source_object_key)

    # create a temporary working directory
    workdir=tempfile.mkdtemp()
    logger.info("| workdir: %s" % workdir)

    # download the archive from the source and extract to "contents"
    target_path=os.path.join(workdir, str(uuid4()))
    logger.info("target_path: %s" % target_path)
    aws_command("s3", "cp", s3_source, target_path)
    with open(target_path) as f:
        filepaths = f.read().splitlines()

    #s3_dest get S3 files
    for file in s3.Bucket(dest_bucket_name).objects.all():
        if (file.key not in filepaths):
            logger.info("| removing file %s", file.key)
            file.delete()

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

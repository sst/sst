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
from datetime import datetime
from uuid import uuid4

from urllib.request import Request, urlopen
from zipfile import ZipFile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.resource('s3')
cloudfront = boto3.client('cloudfront')

CFN_SUCCESS = "SUCCESS"
CFN_FAILED = "FAILED"
MAX_DEPLOYMENTS = 10

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
            source_bucket_name = props['SourceBucketName']
            source_object_key  = props['SourceObjectKey']
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

        s3_source_zip = "s3://%s/%s" % (source_bucket_name, source_object_key)
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
            s3_deploy(s3_source_zip, s3_dest, file_options, replace_values)
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
# populate all files from s3_source_zip to a destination bucket
def s3_deploy(s3_source_zip, s3_dest, file_options, replace_values):
    # create a temporary working directory
    workdir=tempfile.mkdtemp()
    logger.info("| workdir: %s" % workdir)

    # create a directory into which we extract the contents of the zip file
    contents_dir=os.path.join(workdir, 'contents')
    os.mkdir(contents_dir)

    # download the archive from the source and extract to "contents"
    archive=os.path.join(workdir, str(uuid4()))
    logger.info("archive: %s" % archive)
    aws_command("s3", "cp", s3_source_zip, archive)
    logger.info("| extracting archive to: %s\n" % contents_dir)
    with ZipFile(archive, "r") as zip:
      zip.extractall(contents_dir)

    # replace values in files
    logger.info("replacing values: %s" % replace_values)
    for replace_value in replace_values:
        pattern = "%s/%s" % (contents_dir, replace_value['files'])
        logger.info("| replacing pattern: %s", pattern)
        for filepath in glob.iglob(pattern, recursive=True):
            logger.info("| replacing %s", filepath)
            with open(filepath) as file:
                s = file.read()
                s = s.replace(replace_value['search'], replace_value['replace'])
            with open(filepath, "w") as file:
                file.write(s)

    # sync from "contents" to destination
    for file_option in file_options:
        s3_command = ["s3", "cp"]
        s3_command.extend([contents_dir, s3_dest])
        s3_command.append("--recursive")
        logger.info(file_option)
        s3_command.extend(file_option)
        aws_command(*s3_command)

    s3_command = ["s3", "sync"]
    s3_command.extend([contents_dir, s3_dest])
    aws_command(*s3_command)

    shutil.rmtree(workdir)

#---------------------------------------------------------------------------------------------------
# cleanup old deployment folders in destination bucket
def cleanup_old_deploys(dest_bucket_name, dest_bucket_prefix, old_dest_bucket_prefix):
    # list top level folder in the bucket
    bucket = s3.Bucket('dev-playground-another-spabucket895d0616-19f75bqvxle60')
    result = bucket.meta.client.list_objects(Bucket=bucket.name, Delimiter='/')

    # filter all the deployment folders (ie. starts with 'deploy-')
    # note: Do not remove the new bucket path and the old bucket path. This is
    #       to prevent the bucket path in use (old bucket path) getting delete
    #       after a number of new deployments fail.
    deployments = []
    for o in result.get('CommonPrefixes'):
        prefix = o.get('Prefix').rstrip('/')
        if (prefix.startswith('deploy-') and prefix != dest_bucket_prefix and prefix != old_dest_bucket_prefix):
            deployments.append(prefix)
    logger.info("cleaning up old deploys: %s" % deployments)

    # remove deployment folders if limit exceeded
    if (len(deployments) > MAX_DEPLOYMENTS):
        remove_list = sorted(deployments, reverse=True)[MAX_DEPLOYMENTS:]
        for o in remove_list:
            logger.info("| cleanup deploy: %s" % o)
            old_deploy = "s3://%s/%s" % (dest_bucket_name, o)
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

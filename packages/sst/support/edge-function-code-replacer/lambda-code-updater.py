import subprocess
import os
import tempfile
import json
import glob
import logging
import shutil
import contextlib
from uuid import uuid4

from urllib.request import Request, urlopen
from zipfile import ZipFile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

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
            source             = props['Source']
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
            update_code(source, replace_values)

        cfn_send(event, context, CFN_SUCCESS, physicalResourceId=physical_id)
    except KeyError as e:
        cfn_error("invalid request. Missing key %s" % str(e))
    except Exception as e:
        logger.exception(e)
        cfn_error(str(e))

#---------------------------------------------------------------------------------------------------
# populate all files
def update_code(source, replace_values):
    logger.info("| update_code")

    # do not replace if replace_values is empty
    if len(replace_values) == 0:
        logger.info("| update_code skipped b/c replace_values is []")
        return

    source_bucket_name = source['BucketName']
    source_object_key  = source['ObjectKey']
    s3_source_zip = "s3://%s/%s" % (source_bucket_name, source_object_key)

    # create a temporary working directory
    workdir=tempfile.mkdtemp()
    logger.info("| workdir: %s" % workdir)

    # create a directory into which we extract the contents of the zip file
    contents_dir=os.path.join(workdir, 'contents')
    os.mkdir(contents_dir)

    # download the archive from the source and extract to "contents"
    archive=os.path.join(workdir, str(uuid4()))
    logger.info("unzip: %s" % archive)
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
            logger.info("| replacing pattern in file %s", filepath)
            with open(filepath) as file:
                ori = file.read()
                new = ori.replace(replace_value['search'], replace_value['replace'])
                if ori != new:
                    logger.info("| updated")
                    with open(filepath, "w") as file:
                        file.write(new)

    # remove old archive to preserve disk space
    os.remove(archive)

    # zip and upload
    shutil.make_archive(archive, "zip", contents_dir)
    aws_command("s3", "cp", archive + ".zip", s3_source_zip)

    shutil.rmtree(workdir)

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

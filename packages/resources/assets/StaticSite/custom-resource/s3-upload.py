import subprocess
import os
import tempfile
import json
import glob
import logging
import shutil
import boto3
import asyncio
from uuid import uuid4
from zipfile import ZipFile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.resource('s3')

def handler(event, context):
    logger.info(event)
    source_bucket_name = event['SourceBucketName']
    source_object_key  = event['SourceObjectKey']
    dest_bucket_name   = event['DestinationBucketName']
    file_options       = event.get('FileOptions', [])
    replace_values     = event.get('ReplaceValues', [])
    s3_source_zip = "s3://%s/%s" % (source_bucket_name, source_object_key)
    s3_dest = "s3://%s" % (dest_bucket_name)
    logger.info("| s3_source_zip: %s" % s3_source_zip)
    logger.info("| s3_dest: %s" % s3_dest)
    s3_deploy(s3_source_zip, s3_dest, file_options, replace_values)
    return { "Status": True }

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
            logger.info("| replacing pattern in file %s", filepath)
            with open(filepath) as file:
                ori = file.read()
                new = ori.replace(replace_value['search'], replace_value['replace'])
                if ori != new:
                    logger.info("| updated")
                    with open(filepath, "w") as file:
                        file.write(new)

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
# executes an "aws" cli command
def aws_command(*args):
    aws="/opt/awscli/aws" # from AwsCliLayer
    logger.info("| aws %s" % ' '.join(args))
    subprocess.check_call([aws] + list(args))


import boto3
import certbot.main
import os
import shutil

def read_and_delete_file(path):
  with open(path, 'r') as file:
    contents = file.read()
  os.remove(path)
  return contents

def provision_cert(email, domains):
  certbot.main.main([
    'certonly',                             # Obtain a cert but don't install it
    '-n',                                   # Run in non-interactive mode
    '--agree-tos',                          # Agree to the terms of service,
    '--email', email,                       # Email
    '--dns-route53',                        # Use dns challenge with route53
    '--preferred-chain', 'ISRG Root X1',
    '-d', domains,                          # Domains to provision certs for
    # Override directory paths so script doesn't have to be run as root
    '--config-dir', '/tmp/config-dir/',
    '--work-dir', '/tmp/work-dir/',
    '--logs-dir', '/tmp/logs-dir/',
  ])

  first_domain = domains.split(',')[0]
  path = '/tmp/config-dir/live/' + first_domain

  # Zip files
  shutil.make_archive('/tmp/cert', 'zip', path)

  # Upload
  client = boto3.resource('s3')
  client.Bucket(os.environ['BUCKET_NAME']).upload_file('/tmp/cert.zip', "cert.zip")

def handler(event, context):
  domains = 'local.serverless-stack.com'
  provision_cert('frank@serverless-stack.com', domains)

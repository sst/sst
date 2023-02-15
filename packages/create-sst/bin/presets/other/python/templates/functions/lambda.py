def handler(event, context):
  return {
    "statusCode": 200,
    "body": "Hello, World! Your request was received at {}.".format(event['requestContext']['time'])
  }

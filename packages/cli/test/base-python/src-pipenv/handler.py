import json
import numpy

def helloA(event, context):
  body = {
    "message": "Go Serverless v1.0! Your function executed successfully!",
    "input": event
  }

  return {
    "statusCode": 200,
    "body": "Hello, World! Your request was received at {}.".format(event['requestContext']['time'])
  }

def helloB(event, context):
    return {
        "statusCode": 200,
        "body": str(numpy.array([2,3,4,5]))
    }

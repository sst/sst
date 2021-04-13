import json
import numpy

def helloA(event, context):
  body = {
    "message": "Go Serverless v1.0! Your function executed successfully!",
    "input": event
  }

  response = {
    "statusCode": 200,
    "body": json.dumps(body)
  }

  return response

def helloB(event, context):
    return {
        "statusCode": 200,
        "body": str(numpy.array([2,3,4,5]))
    }

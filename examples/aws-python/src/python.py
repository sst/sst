from dateutil.parser import parse
from .sst_env import Resource


def handler(event, context):
    print("Function invoked from Python")
    today = "2024-08-24"
    date = parse(today)
    print(f"Date: {date}")
    # print all attributes of the Resource
    print(f"Resource: {dir(Resource)}")
    print(f"url: {Resource.MyPythonFunction.url}")
    return {
        "statusCode": 200,
        "body": f"Hello World from Python!!!!!! - {date}",
    }

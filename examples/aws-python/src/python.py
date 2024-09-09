from dateutil.parser import parse


def handler(event, context):
    print("Function invoked from Python")
    today = "2024-08-24"
    date = parse(today)
    print(f"Date: {date}")
    return {
        "statusCode": 200,
        "body": f"Hello World from Python!!!!!! - {date}",
    }

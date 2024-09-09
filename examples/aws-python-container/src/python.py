import numpy as np


def handler(event, context):
    print("Function invoked from Python")
    random_arr = np.random.rand(3)
    return {
        "statusCode": 200,
        "body": f"Hello World from Python in a container!!!!!! - {random_arr}",
    }

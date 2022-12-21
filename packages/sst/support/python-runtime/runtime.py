import os
import sys
import json
import logging
import argparse
import traceback
from urllib import request, parse
from time import strftime, time
from importlib import import_module

class Identity(object):
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
    #__slots__ = ["cognito_identity_id", "cognito_identity_pool_id"]

class ClientContext(object):
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
    #__slots__ = ['custom', 'env', 'client']

class Context(object):
    def __init__(self, invoked_function_arn, aws_request_id, deadline_ms, identity, client_context):
        self.function_name = os.environ['AWS_LAMBDA_FUNCTION_NAME']
        self.invoked_function_arn = invoked_function_arn
        self.aws_request_id = aws_request_id
        self.memory_limit_in_mb = os.environ['AWS_LAMBDA_FUNCTION_MEMORY_SIZE']
        self.deadline_ms = deadline_ms
        self.identity = Identity(**json.loads(identity))
        self.client_context = ClientContext(**json.loads(client_context))

    def get_remaining_time_in_millis(self):
        return int(max(self.deadline_ms - int(round(time() * 1000)), 0))

    def log(self):
        return sys.stdout.write


def handleUnserializable(obj):
    print(
        "Unserializable {}: {} when returning result {!r}".format(
            type(obj), repr(obj), result
        )
    )

    raise TypeError("Unserializable {}: {!r}".format(type(obj), obj))


logging.basicConfig()

parser = argparse.ArgumentParser(
    prog='invoke',
    description='Runs a Lambda entry point (handler) with an optional event',
)

parser.add_argument('handler_module',
                    help=('Module containing the handler function,'
                          ' omitting ".py". IE: "path.to.module"'))
parser.add_argument('src_path', help='SrcPath of the handler function')
parser.add_argument('handler_name', help='Name of the handler function')

if __name__ == '__main__':
    args = parser.parse_args()

    # this is needed because you need to import from where you've executed sst
    sys.path.append('.')

    # fetch request
    url = "http://{}/2018-06-01/runtime/invocation/next".format(os.environ['AWS_LAMBDA_RUNTIME_API'])
    r = request.urlopen(url)
    event = json.loads(r.read())
    context = Context(
        r.getheader('Lambda-Runtime-Invoked-Function-Arn'),
        r.getheader('Lambda-Runtime-Aws-Request-Id'),
        r.getheader('Lambda-Runtime-Deadline-Ms'),
        r.getheader('Lambda-Runtime-Cognito-Identity'),
        r.getheader('Lambda-Runtime-Client-Context')
    )

    # invoke handler
    has_error = False
    try:
        # set the sys.path to the src_path. Other wise importing a local file
        # would fail with error ModuleNotFoundError
        sys.path.append(args.src_path)

        module = import_module(args.handler_module)
        handler = getattr(module, args.handler_name)
        result = handler(event, context)
        data = json.dumps(result, default=handleUnserializable).encode("utf-8")

    except Exception as e:
        has_error = True
        # print error in bootstrap because we won't be able to print the Python
        # stack trace in the correct format in NodeJS
        traceback.print_exc()
        # build error response
        ex_type, ex_value, ex_traceback = sys.exc_info()
        result = {
            "errorType": ex_type.__name__,
            "errorMessage": str(ex_value),
            "trace": traceback.format_tb(ex_traceback),
        }
        data = json.dumps(result).encode("utf-8")

    # send response
    if has_error == False:
        url_destination = '/response'
    else:
        url_destination = '/error'
    url = "http://{}/2018-06-01/runtime/invocation/{}{}".format(os.environ['AWS_LAMBDA_RUNTIME_API'], context.aws_request_id, url_destination)
    req =  request.Request(url, method="POST", data=data)
    req.add_header('Content-Type', 'application/json')
    r = request.urlopen(req, data=data)


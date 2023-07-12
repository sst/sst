The `Job` construct is a higher level CDK construct that makes it easy to perform long running jobs.

## Examples

### Creating a Job

```js
import { Job } from "sst/constructs";

new Job(stack, "MyJob", {
  handler: "src/job.main",
});
```

### Creating a Container Job

To create a container job, set `runtime` to "container" and point the handler to the directory containing the Dockerfile.

```js
import { Job } from "sst/constructs";

new Job(stack, "MyJob", {
  runtime: "container",
  handler: "src/job",
  container: {
    cmd: ["python3", "/var/task/my-script.py"]
  }
});
```

Here's an example of `my-script.py`. Note that the payload is accessible via the environment variable `SST_PAYLOAD`.

```py title="src/job/my-script.py"
import json
import numpy
import sys

payload = json.loads(os.getenv("SST_PAYLOAD"))
number = payload["number"]
print(f"Square root of {number} is {numpy.sqrt(number)}")
```

In this example, the `Dockerfile` would look like this:

```Dockerfile title="src/job/Dockerfile"
# Start from Python 3.8 base image
FROM python:3.8-slim

# Install the dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt --target /var/task

# Copy our function code
COPY my-script.py /var/task
```

Here, the Docker container uses the Python 3.8 slim image, installs the dependencies specified in the `requirements.txt`, and copies the script code into the container. The command to run the script is passed as `cmd` in the `docker` property of the `Job` construct.

### Setting additional props

```js
new Job(stack, "MyJob", {
  handler: "job.main",
  srcPath: "services",
  timeout: "30 minutes",
  memorySize: "3 GB",
  config: [STRIPE_KEY, API_URL],
  permissions: ["ses", bucket],
});
```

### Create a job in a VPC

```js
import { Job } from "sst/constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";

new Job(stack, "MyJob", {
  handler: "src/job.main",
  cdk: {
    vpc: Vpc.fromLookup(stack, "VPC", {
      vpcId: "vpc-xxxxxxxxxx",
    }),
  },
});
```

# The correct AWS SAM build image based on the runtime of the function will be
# passed as build arg. The default allows to do `docker build .` when testing.
ARG IMAGE=amazon/aws-sam-cli-build-image-python3.7
FROM $IMAGE

# Ensure rsync is installed
RUN yum -q list installed rsync &>/dev/null || yum install -y rsync

CMD [ "python" ]

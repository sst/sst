# Rust Docker Service

A simple example of running a slim rust docker image on ion. Of course the Dockerfile can be configured to do anything, but 
in this example it utilizes [cargo chef](https://github.com/LukeMathWalker/cargo-chef) to make use of Docker layers to speed up
the builds.

You will need docker running for this example to work. Also included is a `docker-compose.yml` for convenience of running the image locally, but it is not needed for deploying via sst.

Simply using the typical
```sh
sst deploy --stage production
```
will deploy the image
FROM public.ecr.aws/lambda/nodejs:18
COPY bridge.mjs ${LAMBDA_TASK_ROOT}
CMD ["bridge.handler"]
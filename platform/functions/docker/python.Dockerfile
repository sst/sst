# Use an official AWS Lambda base image for Python
FROM public.ecr.aws/lambda/python:3.11

# Install UV to manage your python runtime
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

ARG PYPROJECT_PATH
ARG UV_LOCK_PATH

# I am sure someone more experienced with Docker can do this better for cachine
# Copy everything from the current context to the LAMBDA_TASK_ROOT
COPY . ${LAMBDA_TASK_ROOT}

# Find the directory containing pyproject.toml, cd into it, and run pip install
# lambdaric controlling the runtime means that we cannot use `uv run`
# to automatically execute the virtual environment. So we need to export
# the lockfile to a requirements.txt file and just let pip install it.
RUN PYPROJECT_DIR=$(find ${LAMBDA_TASK_ROOT} -name "pyproject.toml" -exec dirname {} \;) && \
    if [ -n "$PYPROJECT_DIR" ]; then \
      cd "$PYPROJECT_DIR" && uv export && pip install -t ${LAMBDA_TASK_ROOT} .; \
    else \
      echo "pyproject.toml not found"; \
    fi


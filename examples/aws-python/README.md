# ❍ Python Example

Deploy python applications using sst ion.

SST uses [uv](https://github.com/astral-sh/uv) to manage your python runtime. If you do not have uv installed, it will be installed for you and will install a compatible version of python. You can configure the version of python used by SST when creating your function:

```typescript title="sst.config.ts"
const python = new sst.aws.Function("MyPythonFunction", {
  handler: "src/python.handler",
  runtime: "python3.11",
  url: true
});
```

If you are using live lambdas for your python functions, it is recommended to specify your python version to match your Lambda runtime otherwise you may encounter issues with dependencies.

```toml title="src/pyproject.toml"
[project]
name = "aws-python"
version = "0.1.0"
description = "A SST app"
authors = [
    {name = "<your_name_here>", email = "<your_email_here>" },
]
requires-python = ">=3.11"
```

Live lambda will locally run your python code with the environment specified in the closes `pyproject.toml` file. If you have multiple environments, you can create multiple `pyproject.toml` files and specify the environment in your function:

```markdown
.
├── function_a
│   ├── pyproject.toml
│   └── index.py
└── function_b
    ├── pyproject.toml
    └── index.py
```

## Dependencies

Since SST packages and manages your environment, you can easily add dependencies with [uv](https://docs.astral.sh/uv/concepts/dependencies/#dependency-sources) and they will be automatically installed when you deploy your function. 

```sh title="src/function_a/"
uv add requests
```

or

```sh title="src/function_a/"
uv pip install requests
```

Keep in mind that AWS Lambda has a maximum of 50mb for uploaded code, if you are using large dependencies such as numpy, pandas, and others found in the SciPy stack, you may want to use a lambda layer and specify these dependencies as development dependencies in your `pyproject.toml` file.

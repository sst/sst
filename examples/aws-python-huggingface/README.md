# ❍ Using Hugging Face Models with Python

Deploy lightweight huggingface models using sst ion on AWS Lambda.

This example uses the [transformers](https://github.com/huggingface/transformers) library to generate text using the [TinyStories-33M](https://huggingface.co/roneneldan/TinyStories-33M) model. The backend is the pytorch cpu runtime. This example also shows how it is possible to use custom
link resolution to get dependencies from a private pypi server such as the pytorch cpu link.

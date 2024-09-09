import os
import json


class ResourceProxy:
    def __init__(self):
        self._raw = {}
        self._load_resources()

    def _load_resources(self):
        # Load environment variables that start with SST_RESOURCE_
        for key, value in os.environ.items():
            if key.startswith("SST_RESOURCE_"):
                resource_key = key[len("SST_RESOURCE_") :]
                try:
                    self._raw[resource_key] = json.loads(value)
                except json.JSONDecodeError:
                    self._raw[resource_key] = value

    def __getattr__(self, name):
        if name in self._raw:
            return self._raw[name]
        raise AttributeError(f"Resource '{name}' not found.")


# Initialize the proxy object
Resource = ResourceProxy()

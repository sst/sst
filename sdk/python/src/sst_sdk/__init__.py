import os
import json
from typing import Dict, Any, Type, TypeVar, Union, TypedDict


# Define a base TypedDict class for dynamic typing
class BaseResource(TypedDict):
    pass


def create_resource_class(attributes: Dict[str, Type]) -> Type[BaseResource]:
    class DynamicResource(BaseResource):
        def __init__(self, data: Dict[str, Any]):
            self._data = data

        def __getattr__(self, name: str) -> Any:
            if name in self._data:
                value = self._data[name]
                expected_type = attributes.get(name, Any)
                if not isinstance(value, expected_type):
                    raise TypeError(
                        f"Expected {name} to be of type {expected_type.__name__}, got {type(value).__name__}."
                    )
                return value
            raise AttributeError(f"Attribute '{name}' not found.")

    return DynamicResource


class ResourceProxy:
    def __init__(self):
        self._raw: Dict[str, Any] = {}
        self._resource_classes: Dict[str, Type[BaseResource]] = {}
        self._load_resources()

    def _load_resources(self):
        # Load environment variables that start with SST_RESOURCE_
        for key, value in os.environ.items():
            if key.startswith("SST_RESOURCE_"):
                resource_key = key[len("SST_RESOURCE_") :]
                try:
                    data = json.loads(value)
                except json.JSONDecodeError:
                    data = value
                if isinstance(data, dict):
                    # Create a resource class based on the keys in the data
                    attributes = {k: type(v) for k, v in data.items()}
                    self._resource_classes[resource_key] = create_resource_class(
                        attributes
                    )
                self._raw[resource_key] = data

    def __getattr__(self, name: str) -> Union[BaseResource, Any]:
        if name in self._raw:
            resource_data = self._raw[name]
            resource_class = self._resource_classes.get(name)
            if resource_class:
                return resource_class(resource_data)
            return resource_data
        raise AttributeError(f"Resource '{name}' not found.")


# Initialize the proxy object
Resource = ResourceProxy()

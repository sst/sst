package ui

import (
	"reflect"
	"testing"
)

var examples = map[string][]string{
	"1 error occurred:\n\t* creating EventBridge Target (nextjs-frank-WebWarmerRule-WebWarmerTarget-1d76e5b): InvalidParameter: 1 validation error(s) found.\n- minimum field value of 60, PutTargetsInput.Targets[0].RetryPolicy.MaximumEventAgeInSeconds.\n\n\n\n": {
		"InvalidParameter: 1 validation error(s) found.",
		"- minimum field value of 60, PutTargetsInput.Targets[0].RetryPolicy.MaximumEventAgeInSeconds.",
	},
	"1 error occurred:\n\t* creating Lambda Event Source Mapping (arn:aws:sqs:us-east-1:058264306954:stacks-ils-ion-aboza-BookEmbeddingQueueQueue): InvalidParameterValueException: Queue visibility timeout: 30 seconds is less than Function timeout: 900 seconds\n{\n  RespMetadata: {\n    StatusCode: 400,\n    RequestID: \"4b3c8415-400f-437c-b1ea-af1a5c771c41\"\n  },\n  Message_: \"Queue visibility timeout: 30 seconds is less than Function timeout: 900 seconds\",\n  Type: \"User\"\n}\n\n\n": {
		"InvalidParameterValueException: Queue visibility timeout: 30 seconds is less than Function timeout: 900 seconds",
	},
}

func TestParseError(t *testing.T) {
	for input, expected := range examples {
		result := parseError(input)
		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v, got %v", expected, result)
		}
	}
}

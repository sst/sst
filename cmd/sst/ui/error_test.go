package ui

import (
	"reflect"
	"testing"
)

var examples = map[string][]string{
	"1 error occurred:\n\t* creating EventBridge Target (nextjs-frank-WebWarmerRule-WebWarmerTarget-1d76e5b): InvalidParameter: 1 validation error(s) found.\n- minimum field value of 60, PutTargetsInput.Targets[0].RetryPolicy.MaximumEventAgeInSeconds.\n\n\n\n": {
		"1 validation error(s) found.",
		"- minimum field value of 60, PutTargetsInput.Targets[0].RetryPolicy.MaximumEventAgeInSeconds.",
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

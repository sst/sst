package tcellterm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseOSC8(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		expected   string
		expectedID string
	}{
		{
			name:       "no semicolon in URI",
			input:      "8;;https://example.com",
			expected:   "https://example.com",
			expectedID: "",
		},
		{
			name:       "no semicolon in URI, with id",
			input:      "8;id=hello;https://example.com",
			expected:   "https://example.com",
			expectedID: "hello",
		},
		{
			name:       "semicolon in URI",
			input:      "8;;https://example.com/semi;colon",
			expected:   "https://example.com/semi;colon",
			expectedID: "",
		},
		{
			name:       "multiple semicolons in URI",
			input:      "8;;https://example.com/s;e;m;i;colon",
			expected:   "https://example.com/s;e;m;i;colon",
			expectedID: "",
		},
		{
			name:       "semicolon in URI, with id",
			input:      "8;id=hello;https://example.com/semi;colon",
			expected:   "https://example.com/semi;colon",
			expectedID: "hello",
		},
		{
			name:       "terminating sequence",
			input:      "8;;",
			expected:   "",
			expectedID: "",
		},
		{
			name:       "terminating sequence with id",
			input:      "8;id=hello;",
			expected:   "",
			expectedID: "hello",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Simulate vt.osc
			selector, val, found := cutString(test.input, ";")
			if !found {
				return
			}
			assert.Equal(t, "8", selector)
			// parse the result
			url, id := osc8(val)
			assert.Equal(t, test.expected, url)
			assert.Equal(t, test.expectedID, id)
		})
	}
}

package project

import "strings"

func inferTypes(input map[string]interface{}, indentArgs ...string) string {
	indent := ""
	if len(indentArgs) > 0 {
		indent = indentArgs[0]
	}
	var builder strings.Builder
	builder.WriteString("{")
	builder.WriteString("\n")
	for key, value := range input {
		builder.WriteString(indent + "  " + key + ": ")
		switch value.(type) {
		case string:
			builder.WriteString("string")
		case int:
			builder.WriteString("number")
		case float64:
			builder.WriteString("number")
		case float32:
			builder.WriteString("number")
		case map[string]interface{}:
			builder.WriteString(inferTypes(value.(map[string]interface{}), indent+"  "))
		}
		builder.WriteString("\n")
	}
	builder.WriteString(indent + "}")
	return builder.String()
}

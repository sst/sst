package ui

import (
	"regexp"
	"strings"
)

func parseError(input string) []string {
	input = strings.TrimRight(input, "\n")
	if strings.Contains(input, "failed with an unhandled exception") {
		input = regexp.MustCompile(`(?m)^Running program .*$\n?`).ReplaceAllString(input, "")
		input = regexp.MustCompile(`<ref \*\d+>\s*`).ReplaceAllString(input, "")
		input = strings.TrimSpace(input)
		lines := strings.Split(input, "\n")
		return lines
	}

	if strings.Contains(input, "occurred:") {
		lines := []string{}
		for _, line := range strings.Split(input, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "*") {
				splits := strings.Split(line, ":")
				lines = append(lines, strings.TrimSpace(splits[len(splits)-1]))
			}
		}
		return lines
	}
	return []string{input, "ADD THIS ERROR TO NOTION"}
}

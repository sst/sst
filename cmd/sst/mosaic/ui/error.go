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
		if strings.HasPrefix(lines[0], "VisibleError") {
			stripped := strings.SplitN(lines[0], ": ", 2)
			return stripped[1:]
		}
		return lines
	}

	if strings.Contains(input, "occurred:") {
		lines := []string{}
		sections := strings.Split(input, "*")
		for _, section := range sections[1:] {
			for _, line := range strings.Split(section, "\n") {
				line = strings.TrimSpace(line)

				// matches ExampleError: some thing went wrong
				match := regexp.MustCompile(`\s[A-Z][a-zA-z]+\:.+`).FindString(line)
				if match != "" {
					lines = append(lines, strings.TrimSpace(match))
					continue
				}

				// if json object is printed stop parsing
				if line == "{" {
					break
				}

				lines = append(lines, line)
			}
		}
		return lines
	}
	return []string{input}
}

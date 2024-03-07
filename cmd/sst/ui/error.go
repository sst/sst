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
		sections := strings.Split(input, "*")
		for _, line := range sections[1:] {
			line = strings.TrimSpace(line)
			splits := regexp.MustCompile("[a-zA-Z]+:").Split(
				strings.Split(line, "\n")[0],
				-1,
			)
			final := strings.TrimSpace(splits[len(splits)-1])

			for _, split := range strings.Split(final, "\n") {
				lines = append(lines, split)
			}
		}
		return lines
	}
	return []string{input, "ADD THIS ERROR HERE https://www.notion.so/sst-dev/Flaky-errors-2a51e5e471f745ee9d0b8d69c5b4f8c8?pvs=4"}
}

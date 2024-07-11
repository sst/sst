package vterm

import (
	"strconv"
	"strings"
)

// parseSemicolonNumSeq parses a series of numbers separated by semicolons, replacing empty values with the given default value
// FIXME: this function is an unclean way to parse parameters, espcially when it comes to default values
func parseSemicolonNumSeq(s string, d int) []int {
	s = strings.TrimSpace(s)

	if s == "" {
		return []int{d}
	}

	parts := strings.Split(s, ";")

	out := []int{}
	for _, part := range parts {
		if part == "" {
			out = append(out, d)
		} else {
			num, err := strconv.ParseInt(part, 10, 32)
			if err != nil {
				continue // fixme?
			}

			out = append(out, int(num))
		}
	}
	return out
}

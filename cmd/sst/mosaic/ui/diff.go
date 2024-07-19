package ui

import (
	"fmt"
	"reflect"
	"strings"
)

type DiffEntry struct {
	Path string
	Old  interface{}
	New  interface{}
}

func Diff(old map[string]interface{}, new map[string]interface{}, path ...string) []DiffEntry {
	var result []DiffEntry

	for key, newValue := range new {
		newPath := append(path, key)
		pathString := strings.Join(newPath, ".")

		oldValue, exists := old[key]
		if !exists {
			result = append(result, DiffEntry{Path: pathString, Old: nil, New: newValue})
			continue
		}

		switch typedNew := newValue.(type) {
		case map[string]interface{}:
			if typedOld, ok := oldValue.(map[string]interface{}); ok {
				result = append(result, Diff(typedOld, typedNew, newPath...)...)
			} else {
				result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
			}
		case []interface{}:
			if typedOld, ok := oldValue.([]interface{}); ok {
				result = append(result, diffArray(typedOld, typedNew, newPath)...)
			} else {
				result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
			}
		default:
			if !reflect.DeepEqual(oldValue, newValue) {
				result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
			}
		}
	}

	for key, oldValue := range old {
		if _, exists := new[key]; !exists {
			deletedPath := append(path, key)
			result = append(result, DiffEntry{Path: strings.Join(deletedPath, "."), Old: oldValue, New: nil})
		}
	}

	return result
}

func diffArray(old []interface{}, new []interface{}, path []string) []DiffEntry {
	var result []DiffEntry

	for i := 0; i < len(new) || i < len(old); i++ {
		indexPath := append(path, fmt.Sprintf("[%d]", i))
		pathString := strings.Join(indexPath, ".")

		if i >= len(old) {
			result = append(result, DiffEntry{Path: pathString, Old: nil, New: new[i]})
		} else if i >= len(new) {
			result = append(result, DiffEntry{Path: pathString, Old: old[i], New: nil})
		} else {
			oldValue := old[i]
			newValue := new[i]

			switch typedNew := newValue.(type) {
			case map[string]interface{}:
				if typedOld, ok := oldValue.(map[string]interface{}); ok {
					result = append(result, Diff(typedOld, typedNew, indexPath...)...)
				} else {
					result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
				}
			case []interface{}:
				if typedOld, ok := oldValue.([]interface{}); ok {
					result = append(result, diffArray(typedOld, typedNew, indexPath)...)
				} else {
					result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
				}
			default:
				if !reflect.DeepEqual(oldValue, newValue) {
					result = append(result, DiffEntry{Path: pathString, Old: oldValue, New: newValue})
				}
			}
		}
	}

	return result
}

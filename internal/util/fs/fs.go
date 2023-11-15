package fs

import (
	"fmt"
	"os"
	"path/filepath"
)

func FindUp(initialPath, fileName string) (string, error) {
	currentDir := initialPath
	for {
		// Check if the current directory contains the target file
		filePath := filepath.Join(currentDir, fileName)
		_, err := os.Stat(filePath)
		if err == nil {
			// File found
			return filePath, nil
		}

		// If we've reached the root directory, stop searching
		if currentDir == filepath.Dir(currentDir) {
			return "", fmt.Errorf("File '%s' not found", fileName)
		}

		// Move up to the parent directory
		currentDir = filepath.Dir(currentDir)
	}
}

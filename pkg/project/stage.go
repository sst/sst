package project

import (
	"os"
	"path/filepath"
	"strings"
)

func resolveStageFile(cfgPath string) string {
	return filepath.Join(
		ResolveWorkingDir(cfgPath),
		"stage",
	)
}

func LoadPersonalStage(cfgPath string) string {
	data, err := os.ReadFile(resolveStageFile(cfgPath))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func SetPersonalStage(cfgPath string, stage string) error {
	err := os.WriteFile(resolveStageFile(cfgPath), []byte(strings.TrimSpace(stage)), 0644)
	if err != nil {
		return err
	}
	return nil
}

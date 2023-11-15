package project

import (
	"os"
	"path/filepath"
	"strings"
)

func (p *Project) pathPersonalStage() string {
	return filepath.Join(p.PathTemp(), "stage")
}

func (p *Project) LoadPersonalStage() {
	data, err := os.ReadFile(p.pathPersonalStage())
	if err != nil {
		return
	}
	p.stage = strings.TrimSpace(string(data))
}

func (p *Project) SetPersonalStage(input string) error {
	err := os.WriteFile(p.pathPersonalStage(), []byte(strings.TrimSpace(input)), 0644)
	if err != nil {
		return err
	}
	p.stage = input
	return nil
}

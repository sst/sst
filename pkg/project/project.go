package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/sst/v10/internal/util/fs"
	"github.com/sst/v10/pkg/js"
)

type Project struct {
	root    string
	config  string
	name    string
	profile string
	stage   string
}

func New() (*Project, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}

	cfgPath, err := fs.FindUp(cwd, "sst.config.ts")
	if err != nil {
		return nil, err
	}

	rootPath := filepath.Dir(cfgPath)

	proj := &Project{
		root:   rootPath,
		config: cfgPath,
	}
	tmp := proj.PathTemp()

	_, err = os.Stat(tmp)
	if err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
		err := os.Mkdir(tmp, 0755)
		if err != nil {
			return nil, err
		}
	}

	evaled, err := js.Eval(tmp, fmt.Sprintf(`
    import mod from '%s';
    console.log(JSON.stringify(mod.config()))
  `, cfgPath))
	if err != nil {
		return nil, err
	}

	parsed := struct {
		Name    string `json:"name"`
		Profile string `json:"profile"`
		Stage   string `json:"stage"`
	}{}
	err = json.Unmarshal(evaled, &parsed)
	if err != nil {
		return nil, err
	}
	proj.name = parsed.Name
	if proj.name == "" {
		return nil, fmt.Errorf("Project name is required")
	}
	proj.profile = parsed.Profile
	proj.stage = parsed.Stage

	return proj, nil
}

func (p *Project) PathTemp() string {
	return filepath.Join(p.root, ".sst")
}

func (p *Project) PathRoot() string {
	return p.root
}

func (p *Project) PathConfig() string {
	return p.config
}

func (p *Project) Name() string {
	return p.name
}

func (p *Project) Profile() string {
	return p.profile
}

func (p *Project) Stage() string {
	return p.stage
}

func (p *Project) StageSet(input string) {
	p.stage = input
}

func (p *Project) stagePersonalPath() string {
	return filepath.Join(p.PathTemp(), "stage")
}

func (p *Project) StagePersonalLoad() {
	data, err := os.ReadFile(p.stagePersonalPath())
	if err != nil {
		return
	}
	p.stage = strings.TrimSpace(string(data))
}

func (p *Project) StagePersonalSet(input string) error {
	err := os.WriteFile(p.stagePersonalPath(), []byte(strings.TrimSpace(input)), 0644)
	if err != nil {
		return err
	}
	p.stage = input
	return nil
}

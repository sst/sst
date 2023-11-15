package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/sst/v10/internal/fs"
	"github.com/sst/v10/pkg/js"
)

type Project struct {
	root        string
	config      string
	name        string
	profile     string
	stage       string
	credentials *aws.Credentials
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

	eval, err := js.Eval(
		js.EvalOptions{
			Dir: tmp,
			Code: fmt.Sprintf(`
    import mod from '%s';
    console.log(JSON.stringify(mod.config()))`,
				cfgPath),
		},
	)
	if err != nil {
		return nil, err
	}

	eval.Start()

	for eval.Out.Scan() {
		line := eval.Out.Bytes()
		parsed := struct {
			Name    string `json:"name"`
			Profile string `json:"profile"`
			Stage   string `json:"stage"`
		}{}
		err = json.Unmarshal(line, &parsed)
		if err != nil {
			return nil, err
		}
		proj.name = parsed.Name
		if proj.name == "" {
			return nil, fmt.Errorf("Project name is required")
		}
		proj.profile = parsed.Profile
		proj.stage = parsed.Stage
		break
	}

	err = eval.Wait()
	if err != nil {
		return nil, err
	}

	return proj, nil
}

func (p *Project) getPath(path ...string) string {
	paths := append([]string{p.PathTemp()}, path...)
	return filepath.Join(paths...)
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

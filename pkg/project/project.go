package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"

	"github.com/sst/ion/internal/fs"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type App struct {
	Name          string                            `json:"name"`
	Stage         string                            `json:"stage"`
	RemovalPolicy string                            `json:"removalPolicy"`
	Providers     map[string]map[string]interface{} `json:"providers"`
}

type Project struct {
	version   string
	root      string
	config    string
	process   *js.Process
	app       *App
	backend   provider.Backend
	Providers map[string]provider.Provider
	env       map[string]string

	Stack *stack
}

func Discover() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	cfgPath, err := fs.FindUp(cwd, "sst.config.ts")
	if err != nil {
		return "", err
	}
	err = os.MkdirAll(ResolveWorkingDir(cfgPath), 0755)
	if err != nil {
		return "", err
	}
	return cfgPath, nil
}

func ResolveWorkingDir(cfgPath string) string {
	return path.Join(filepath.Dir(cfgPath), ".sst")
}

func ResolvePlatformDir(cfgPath string) string {
	return path.Join(ResolveWorkingDir(cfgPath), "platform")
}

type ProjectConfig struct {
	Version string
	Stage   string
	Config  string
}

func New(input *ProjectConfig) (*Project, error) {
	rootPath := filepath.Dir(input.Config)

	process, err := js.Start(
		rootPath,
	)
	if err != nil {
		return nil, err
	}

	proj := &Project{
		version: input.Version,
		root:    rootPath,
		process: process,
		config:  input.Config,
	}
	proj.Stack = &stack{
		project: proj,
	}
	tmp := proj.PathWorkingDir()
	// platformDir := proj.PathPlatformDir()

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

	inputBytes, err := json.Marshal(map[string]string{
		"stage": input.Stage,
	})
	err = process.Eval(
		js.EvalOptions{
			Dir: tmp,
			Banner: `
      function $config(input) { return input }
      `,
			Define: map[string]string{
				"$input": string(inputBytes),
			},
			Code: fmt.Sprintf(`
import mod from '%s';
console.log("~j" + JSON.stringify(mod.app({
  stage: $input.stage || undefined,
})))`,
				input.Config),
		},
	)
	if err != nil {
		return nil, err
	}

	for {
		cmd, line := process.Scan()

		if cmd == js.CommandDone {
			break
		}

		if cmd != js.CommandJSON {
			fmt.Println(line)
			continue
		}

		var parsed App
		err = json.Unmarshal([]byte(line), &parsed)
		if err != nil {
			return nil, err
		}
		proj.app = &parsed
		proj.app.Stage = input.Stage

		if proj.app.Providers == nil {
			proj.app.Providers = map[string]map[string]interface{}{}
		}

		if proj.app.Name == "" {
			return nil, fmt.Errorf("Project name is required")
		}

		if proj.app.RemovalPolicy == "" {
			proj.app.RemovalPolicy = "retain"
		}

		if proj.app.RemovalPolicy != "remove" && proj.app.RemovalPolicy != "retain" && proj.app.RemovalPolicy != "retain-all" {
			return nil, fmt.Errorf("RemovalPolicy must be one of: remove, retain, retain-all")
		}
	}

	return proj, nil
}

func (proj *Project) LoadProviders() error {
	if _, ok := proj.app.Providers["aws"]; !ok {
		proj.app.Providers["aws"] = map[string]interface{}{}
	}

	proj.Providers = map[string]provider.Provider{}
	for name, args := range proj.app.Providers {
		var p provider.Provider

		if name == "aws" {
			p = &provider.AwsProvider{}
		}

		if name == "cloudflare" {
			p = &provider.CloudflareProvider{}
		}

		if p == nil {
			continue
		}

		err := p.Init(proj.app.Name, proj.app.Stage, args)
		if err != nil {
			return fmt.Errorf("Error initializing provider %s: %w", name, err)
		}
		proj.Providers[name] = p
	}

	proj.backend = proj.Providers["aws"].(provider.Backend)

	return nil
}

func (p *Project) getPath(path ...string) string {
	paths := append([]string{p.PathWorkingDir()}, path...)
	return filepath.Join(paths...)
}

func (p *Project) PathWorkingDir() string {
	return filepath.Join(p.root, ".sst")
}

func (p *Project) PathPlatformDir() string {
	return filepath.Join(p.PathWorkingDir(), "platform")
}

func (p *Project) PathRoot() string {
	return p.root
}

func (p *Project) PathConfig() string {
	return p.config
}

func (p *Project) Version() string {
	return p.version
}

func (p *Project) App() *App {
	return p.app
}

func (p *Project) Backend() provider.Backend {
	return p.backend
}

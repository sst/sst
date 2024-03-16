package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"

	"github.com/sst/ion/internal/fs"
	"github.com/sst/ion/internal/util"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type App struct {
	Name      string                 `json:"name"`
	Stage     string                 `json:"stage"`
	Removal   string                 `json:"removal"`
	Providers map[string]interface{} `json:"providers"`
	Home      string                 `json:"home"`
	// Deprecated: Backend is now Home
	Backend string `json:"backend"`
	// Deprecated: RemovalPolicy is now Removal
	RemovalPolicy string `json:"removalPolicy"`
}

type Project struct {
	version   string
	root      string
	config    string
	process   *js.Process
	app       *App
	home      provider.Home
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

var ErrInvalidStageName = fmt.Errorf("Invalid stage name")
var StageRegex = regexp.MustCompile(`^[a-zA-Z0-9-]+$`)

func New(input *ProjectConfig) (*Project, error) {
	if !StageRegex.MatchString(input.Stage) {
		return nil, ErrInvalidStageName
	}

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
			proj.app.Providers = map[string]interface{}{}
		}

		for name, args := range proj.app.Providers {
			if argsBool, ok := args.(bool); ok && argsBool {
				proj.app.Providers[name] = make(map[string]interface{})
			}
		}

		if _, ok := proj.app.Providers[proj.app.Home]; !ok {
			proj.app.Providers[proj.app.Home] = map[string]interface{}{}
		}

		if proj.app.Name == "" {
			return nil, fmt.Errorf("Project name is required")
		}

		if proj.app.Home == "" {
			return nil, util.NewReadableError(nil, `You must specify a "home" provider in the project configuration file.`)
		}

		if proj.app.RemovalPolicy != "" {
			return nil, util.NewReadableError(nil, `The "removalPolicy" has been renamed to "removal"`)
		}

		if proj.app.Removal == "" {
			proj.app.Removal = "retain"
		}

		if proj.app.Removal != "remove" && proj.app.Removal != "retain" && proj.app.Removal != "retain-all" {
			return nil, fmt.Errorf("Removal must be one of: remove, retain, retain-all")
		}
	}

	return proj, nil
}

func (proj *Project) LoadProviders() error {
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

		err := p.Init(proj.app.Name, proj.app.Stage, args.(map[string]interface{}))
		if err != nil {
			return fmt.Errorf("Error initializing provider %s: %w", name, err)
		}
		proj.Providers[name] = p
	}

	p := proj.Providers[proj.app.Home]
	casted, ok := p.(provider.Home)
	if !ok {
		return util.NewReadableError(nil, proj.app.Home+` is not a valid backend provider.`)
	}
	proj.home = casted

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

func (p *Project) Backend() provider.Home {
	return p.home
}

func (p *Project) Cleanup() error {
	return os.RemoveAll(
		filepath.Join(p.PathWorkingDir(), "artifacts"),
	)
}

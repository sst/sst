package project

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/pulumi/pulumi/sdk/v3/go/auto"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/events"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optdestroy"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optrefresh"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/pulumi/pulumi/sdk/v3/go/common/tokens"
	"github.com/pulumi/pulumi/sdk/v3/go/common/workspace"
	"github.com/sst/ion/internal/fs"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type stack struct {
	project *Project
}

type StackEvent struct {
	events.EngineEvent
	StdOutEvent           *StdOutEvent
	ConcurrentUpdateEvent *ConcurrentUpdateEvent
	CompleteEvent         *CompleteEvent
	StackCommandEvent     *StackCommandEvent
	BuildFailedEvent      *BuildFailedEvent
}

type BuildFailedEvent struct {
	Error string
}

type StackInput struct {
	OnEvent func(event *StackEvent)
	OnFiles func(files []string)
	Command string
	Dev     bool
}

type StdOutEvent struct {
	Text string
}

type ConcurrentUpdateEvent struct{}

type Links map[string]interface{}

type Receiver struct {
	Directory   string              `json:"directory"`
	Links       []string            `json:"links"`
	Environment map[string]string   `json:"environment"`
	AwsRole     string              `json:"awsRole"`
	Cloudflare  *CloudflareReceiver `json:"cloudflare"`
	Aws         *AwsReceiver        `json:"aws"`
}

type CloudflareReceiver struct {
}

type AwsReceiver struct {
	Role string `json:"role"`
}

type Receivers map[string]Receiver

type Warp struct {
	FunctionID string          `json:"functionID"`
	Runtime    string          `json:"runtime"`
	Handler    string          `json:"handler"`
	Bundle     string          `json:"bundle"`
	Properties json.RawMessage `json:"properties"`
	Links      []string        `json:"links"`
	CopyFiles  []struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"copyFiles"`
	Environment map[string]string `json:"environment"`
}
type Warps map[string]Warp

type CompleteEvent struct {
	Links     Links
	Warps     Warps
	Receivers Receivers
	Outputs   map[string]interface{}
	Hints     map[string]string
	Errors    []Error
	Finished  bool
	Resources []apitype.ResourceV3
}

type StackCommandEvent struct {
	Command string
}

type Error struct {
	Message string
	URN     string
}

type StackEventStream = chan StackEvent

var ErrStackRunFailed = fmt.Errorf("stack run had errors")
var ErrStageNotFound = fmt.Errorf("stage not found")
var ErrPassphraseInvalid = fmt.Errorf("passphrase invalid")

func (s *stack) Run(ctx context.Context, input *StackInput) error {
	slog.Info("running stack command", "cmd", input.Command)
	input.OnEvent(&StackEvent{StackCommandEvent: &StackCommandEvent{
		Command: input.Command,
	}})

	err := s.Lock()
	if err != nil {
		if err == provider.ErrLockExists {
			input.OnEvent(&StackEvent{ConcurrentUpdateEvent: &ConcurrentUpdateEvent{}})
		}
		return err
	}
	defer s.Unlock()

	_, err = s.PullState()
	if err != nil {
		if errors.Is(err, provider.ErrStateNotFound) {
			if input.Command != "up" {
				return ErrStageNotFound
			}
		} else {
			return err
		}
	}
	defer s.PushState()

	passphrase, err := provider.Passphrase(s.project.home, s.project.app.Name, s.project.app.Stage)
	if err != nil {
		return err
	}

	secrets, err := provider.GetSecrets(s.project.home, s.project.app.Name, s.project.app.Stage)
	if err != nil {
		return ErrPassphraseInvalid
	}

	env := map[string]string{}
	for key, value := range s.project.Env() {
		env[key] = value
	}
	for _, value := range os.Environ() {
		pair := strings.SplitN(value, "=", 2)
		if len(pair) == 2 {
			env[pair[0]] = pair[1]
		}
	}
	for key, value := range secrets {
		env["SST_SECRET_"+key] = value
	}
	env["PULUMI_CONFIG_PASSPHRASE"] = passphrase

	cli := map[string]interface{}{
		"command": input.Command,
		"dev":     input.Dev,
		"paths": map[string]string{
			"home":     global.ConfigDir(),
			"root":     s.project.PathRoot(),
			"work":     s.project.PathWorkingDir(),
			"platform": s.project.PathPlatformDir(),
		},
		"env": env,
	}
	cliBytes, err := json.Marshal(cli)
	if err != nil {
		return err
	}
	appBytes, err := json.Marshal(s.project.app)
	if err != nil {
		return err
	}

	providerShim := []string{}
	for name := range s.project.app.Providers {
		pkg := getProviderPackage(name)
		global := cleanProviderName(name)
		providerShim = append(providerShim, fmt.Sprintf("import * as %s from '%s'", global, pkg))
		providerShim = append(providerShim, fmt.Sprintf("globalThis.%s = %s", global, global))
	}

	buildResult, err := js.Build(js.EvalOptions{
		Dir: s.project.PathPlatformDir(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
			"$dev": fmt.Sprintf("%v", input.Dev),
		},
		Inject: []string{filepath.Join(s.project.PathWorkingDir(), "platform/src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      %v
      import mod from "%v/sst.config.ts";
      const result = await run(mod.run)
      export default result
    `,
			filepath.Join(s.project.PathWorkingDir(), "platform/src/auto/run.ts"),
			strings.Join(providerShim, "\n"),
			s.project.PathRoot(),
		),
	})
	if err != nil {
		input.OnEvent(&StackEvent{
			BuildFailedEvent: &BuildFailedEvent{
				Error: err.Error(),
			},
		})
		return err
	}
	outfile := buildResult.OutputFiles[0].Path

	if input.OnFiles != nil {
		var meta = map[string]interface{}{}
		err := json.Unmarshal([]byte(buildResult.Metafile), &meta)
		if err != nil {
			return err
		}
		files := []string{}
		for key := range meta["inputs"].(map[string]interface{}) {
			absPath, err := filepath.Abs(key)
			if err != nil {
				continue
			}
			files = append(files, absPath)
		}
		input.OnFiles(files)
	}
	slog.Info("tracked files")

	pulumi, err := auto.NewPulumiCommand(&auto.PulumiCommandOptions{
		Root:             filepath.Join(global.BinPath(), ".."),
		SkipVersionCheck: true,
	})
	if err != nil {
		return err
	}
	ws, err := auto.NewLocalWorkspace(ctx,
		auto.Pulumi(pulumi),
		auto.WorkDir(s.project.PathWorkingDir()),
		auto.PulumiHome(global.ConfigDir()),
		auto.Project(workspace.Project{
			Name:    tokens.PackageName(s.project.app.Name),
			Runtime: workspace.NewProjectRuntimeInfo("nodejs", nil),
			Backend: &workspace.ProjectBackend{
				URL: fmt.Sprintf("file://%v", s.project.PathWorkingDir()),
			},
			Main: outfile,
		}),
		auto.EnvVars(
			env,
		),
	)
	if err != nil {
		return err
	}
	slog.Info("built workspace")

	stack, err := auto.UpsertStack(ctx,
		s.project.app.Stage,
		ws,
	)
	if err != nil {
		return err
	}
	slog.Info("built stack")

	config := auto.ConfigMap{}
	for provider, args := range s.project.app.Providers {
		for key, value := range args.(map[string]interface{}) {
			switch v := value.(type) {
			case map[string]interface{}:
				bytes, err := json.Marshal(v)
				if err != nil {
					return err
				}
				config[fmt.Sprintf("%v:%v", provider, key)] = auto.ConfigValue{Value: string(bytes)}
			case string:
				config[fmt.Sprintf("%v:%v", provider, key)] = auto.ConfigValue{Value: v}
			case []string:
				for i, val := range v {
					config[fmt.Sprintf("%v:%v[%d]", provider, key, i)] = auto.ConfigValue{Value: val}
				}
			}
		}
	}
	err = stack.SetAllConfig(ctx, config)
	if err != nil {
		return err
	}
	slog.Info("built config")

	stream := make(chan events.EngineEvent)
	eventlog, err := os.Create(filepath.Join(s.project.PathWorkingDir(), "event.log"))
	if err != nil {
		return err
	}
	defer eventlog.Close()

	complete := &CompleteEvent{
		Links:     Links{},
		Receivers: Receivers{},
		Warps:     Warps{},
		Hints:     map[string]string{},
		Outputs:   map[string]interface{}{},
		Errors:    []Error{},
		Finished:  false,
	}

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event, ok := <-stream:
				if !ok {
					return
				}

				if event.DiagnosticEvent != nil && event.DiagnosticEvent.Severity == "error" {
					if strings.HasPrefix(event.DiagnosticEvent.Message, "update failed") {
						break
					}
					complete.Errors = append(complete.Errors, Error{
						Message: event.DiagnosticEvent.Message,
						URN:     event.DiagnosticEvent.URN,
					})
				}

				input.OnEvent(&StackEvent{EngineEvent: event})

				if event.SummaryEvent != nil {
					complete.Finished = true
				}

				bytes, err := json.Marshal(event)
				if err != nil {
					return
				}
				eventlog.Write(bytes)
				eventlog.WriteString("\n")
			}
		}
	}()

	defer func() {
		slog.Info("stack command complete")
		defer input.OnEvent(&StackEvent{CompleteEvent: complete})

		rawDeploment, _ := stack.Export(context.Background())
		var deployment apitype.DeploymentV3
		json.Unmarshal(rawDeploment.Deployment, &deployment)

		if len(deployment.Resources) == 0 {
			return
		}
		complete.Resources = deployment.Resources

		cloudflareBindings := map[string]string{}
		for _, resource := range complete.Resources {
			outputs := decrypt(resource.Outputs).(map[string]interface{})
			if match, ok := outputs["_live"].(map[string]interface{}); ok {
				data, _ := json.Marshal(match)
				var entry Warp
				json.Unmarshal(data, &entry)
				complete.Warps[entry.FunctionID] = entry
			}
			if match, ok := outputs["_receiver"].(map[string]interface{}); ok {
				data, _ := json.Marshal(match)
				var entry Receiver
				json.Unmarshal(data, &entry)
				complete.Receivers[entry.Directory] = entry
			}

			if hint, ok := outputs["_hint"].(string); ok {
				complete.Hints[string(resource.URN)] = hint
			}

			if match, ok := outputs["r2BucketBindings"].([]interface{}); ok {
				for _, binding := range match {
					item := binding.(map[string]interface{})
					cloudflareBindings[item["name"].(string)] = "R2Bucket"
				}
			}

			if match, ok := outputs["d1DatabaseBindings"].([]interface{}); ok {
				for _, binding := range match {
					item := binding.(map[string]interface{})
					cloudflareBindings[item["name"].(string)] = "D1Database"
				}
			}

			if match, ok := outputs["kvNamespaceBindings"].([]interface{}); ok {
				for _, binding := range match {
					item := binding.(map[string]interface{})
					cloudflareBindings[item["name"].(string)] = "KVNamespace"
				}
			}

			if match, ok := outputs["serviceBindings"].([]interface{}); ok {
				for _, binding := range match {
					item := binding.(map[string]interface{})
					cloudflareBindings[item["name"].(string)] = "Service"
				}
			}
		}

		outputs := decrypt(deployment.Resources[0].Outputs).(map[string]interface{})
		linksOutput, ok := outputs["_links"]
		if ok {
			for key, value := range linksOutput.(map[string]interface{}) {
				complete.Links[key] = value
			}

			types := map[string]map[string]interface{}{}
			for _, receiver := range complete.Receivers {
				if len(receiver.Links) == 0 {
					continue
				}
				typesPath, err := fs.FindUp(filepath.Join(s.project.PathRoot(), receiver.Directory), "tsconfig.json")
				if err != nil {
					continue
				}
				dir := filepath.Join(filepath.Dir(typesPath), "sst-env.d.ts")
				links, ok := types[dir]
				if !ok {
					links = map[string]interface{}{}
					types[dir] = links
				}
				for _, link := range receiver.Links {
					if cloudflareBindings[link] != "" && receiver.Cloudflare != nil {
						links[link] = literal{value: `import("@cloudflare/workers-types").` + cloudflareBindings[link]}
						continue
					}
					links[link] = complete.Links[link]
				}
			}

			globalTypes := map[string]interface{}{}
			for _, links := range types {
				for key, value := range links {
					globalTypes[key] = value
				}
			}
			types[filepath.Join(s.project.PathWorkingDir(), "types.generated.ts")] = globalTypes

			for path, links := range types {
				slog.Info("generating types", "path", path, "count", len(links))
				typesFile, err := os.Create(path)
				if err != nil {
					slog.Error("failed to create types file", "path", path, "err", err)
					continue
				}
				defer typesFile.Close()
				typesFile.WriteString(`import "sst"` + "\n")
				typesFile.WriteString(`declare module "sst" {` + "\n")
				typesFile.WriteString("  export interface Resource " + inferTypes(links, "  ") + "\n")
				typesFile.WriteString("}" + "\n")
				typesFile.WriteString("export {}")
			}
			provider.PutLinks(s.project.home, s.project.app.Name, s.project.app.Stage, complete.Links)
		}

		for key, value := range outputs {
			if strings.HasPrefix(key, "_") {
				continue
			}
			complete.Outputs[key] = value
		}
	}()

	slog.Info("running stack command", "cmd", input.Command)
	switch input.Command {
	case "up":
		_, err = stack.Up(ctx,
			optup.ProgressStreams(),
			optup.ErrorProgressStreams(),
			optup.EventStreams(stream),
		)

	case "destroy":
		_, err = stack.Destroy(ctx,
			optdestroy.ProgressStreams(),
			optdestroy.ErrorProgressStreams(),
			optdestroy.EventStreams(stream),
		)

	case "refresh":
		_, err = stack.Refresh(ctx,
			optrefresh.ProgressStreams(),
			optrefresh.ErrorProgressStreams(),
			optrefresh.EventStreams(stream),
		)
	}

	slog.Info("done running stack command")
	if err != nil {
		return ErrStackRunFailed
	}
	return nil
}

type ImportOptions struct {
	Type   string
	Name   string
	ID     string
	Parent string
}

func (s *stack) Import(ctx context.Context, input *ImportOptions) error {
	urnPrefix := fmt.Sprintf("urn:pulumi:%v::%v::", s.project.app.Stage, s.project.app.Name)
	urnFinal := input.Type + "::" + input.Name
	urn, err := resource.ParseURN(urnPrefix + urnFinal)
	if err != nil {
		return err
	}
	var parent resource.URN
	if input.Parent != "" {
		splits := strings.Split(input.Parent, "::")
		parentType := splits[0]
		parentName := splits[1]
		urn, err = resource.ParseURN(urnPrefix + parentType + "$" + urnFinal)
		if err != nil {
			return err
		}
		parent, err = resource.ParseURN(urnPrefix + parentType + "::" + parentName)
	}

	fmt.Println(urn)
	fmt.Println(parent)

	err = provider.Lock(s.project.home, s.project.app.Name, s.project.app.Stage)
	if err != nil {
		return err
	}
	defer provider.Unlock(s.project.home, s.project.app.Name, s.project.app.Stage)

	_, err = s.PullState()
	if err != nil {
		return err
	}

	passphrase, err := provider.Passphrase(s.project.home, s.project.app.Name, s.project.app.Stage)
	if err != nil {
		return err
	}
	env := map[string]string{}
	for key, value := range s.project.Env() {
		env[key] = value
	}
	for _, value := range os.Environ() {
		pair := strings.SplitN(value, "=", 2)
		if len(pair) == 2 {
			env[pair[0]] = pair[1]
		}
	}
	env["PULUMI_CONFIG_PASSPHRASE"] = passphrase

	ws, err := auto.NewLocalWorkspace(ctx,
		auto.WorkDir(s.project.PathWorkingDir()),
		auto.PulumiHome(global.ConfigDir()),
		auto.Project(workspace.Project{
			Name:    tokens.PackageName(s.project.app.Name),
			Runtime: workspace.NewProjectRuntimeInfo("nodejs", nil),
			Backend: &workspace.ProjectBackend{
				URL: fmt.Sprintf("file://%v", s.project.PathWorkingDir()),
			},
		}),
		auto.EnvVars(env),
	)
	if err != nil {
		return err
	}

	stack, err := auto.SelectStack(ctx, s.project.app.Stage, ws)
	if err != nil {
		return err
	}

	config := auto.ConfigMap{}
	for provider, args := range s.project.app.Providers {
		for key, value := range args.(map[string]interface{}) {
			if key == "version" {
				continue
			}
			switch v := value.(type) {
			case string:
				config[fmt.Sprintf("%v:%v", provider, key)] = auto.ConfigValue{Value: v}
			case []string:
				for i, val := range v {
					config[fmt.Sprintf("%v:%v[%d]", provider, key, i)] = auto.ConfigValue{Value: val}
				}
			}
		}
	}
	err = stack.SetAllConfig(ctx, config)
	if err != nil {
		return err
	}

	export, err := stack.Export(ctx)
	if err != nil {
		return err
	}

	var deployment apitype.DeploymentV3
	err = json.Unmarshal(export.Deployment, &deployment)
	if err != nil {
		return err
	}

	existingIndex := -1
	for index, resource := range deployment.Resources {
		if urn == resource.URN {
			existingIndex = index
			break
		}
	}
	if existingIndex < 0 {
		deployment.Resources = append(deployment.Resources, apitype.ResourceV3{})
		existingIndex = len(deployment.Resources) - 1
	}
	deployment.Resources[existingIndex].URN = urn
	deployment.Resources[existingIndex].Parent = parent
	deployment.Resources[existingIndex].Custom = true
	deployment.Resources[existingIndex].ID = resource.ID(input.ID)
	deployment.Resources[existingIndex].Type, err = tokens.ParseTypeToken(input.Type)
	if err != nil {
		return err
	}

	serialized, err := json.Marshal(deployment)
	export.Deployment = serialized
	err = stack.Import(ctx, export)
	if err != nil {
		return err
	}

	fmt.Println("imported")
	fmt.Println("refreshing")
	_, err = stack.Refresh(ctx, optrefresh.Target([]string{string(urn)}))
	if err != nil {
		return err
	}
	return s.PushState()
}

func (s *stack) Lock() error {
	return provider.Lock(s.project.home, s.project.app.Name, s.project.app.Stage)
}

func (s *stack) Unlock() error {
	dir := s.project.PathWorkingDir()
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "Pulumi") {
			err := os.Remove(filepath.Join(dir, file.Name()))
			if err != nil {
				return err
			}
		}
	}

	return provider.Unlock(s.project.home, s.project.app.Name, s.project.app.Stage)
}

func (s *stack) PullState() (string, error) {
	pulumiDir := filepath.Join(s.project.PathWorkingDir(), ".pulumi")
	err := os.RemoveAll(pulumiDir)
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(pulumiDir, "stacks", s.project.app.Name)
	err = os.MkdirAll(appDir, 0755)
	if err != nil {
		return "", err
	}
	path := filepath.Join(appDir, fmt.Sprintf("%v.json", s.project.app.Stage))
	err = provider.PullState(
		s.project.home,
		s.project.app.Name,
		s.project.app.Stage,
		path,
	)
	if err != nil {
		return "", err
	}
	return path, nil
}

func (s *stack) PushState() error {
	pulumiDir := filepath.Join(s.project.PathWorkingDir(), ".pulumi")
	return provider.PushState(
		s.project.home,
		s.project.app.Name,
		s.project.app.Stage,
		filepath.Join(pulumiDir, "stacks", s.project.app.Name, fmt.Sprintf("%v.json", s.project.app.Stage)),
	)
}

func (s *stack) Cancel() error {
	return provider.Unlock(
		s.project.home,
		s.project.app.Name,
		s.project.app.Stage,
	)
}

func decrypt(input interface{}) interface{} {
	switch cast := input.(type) {
	case map[string]interface{}:
		if cast["plaintext"] != nil {
			var parsed any
			json.Unmarshal([]byte(cast["plaintext"].(string)), &parsed)
			return parsed
		}
		for key, value := range cast {
			cast[key] = decrypt(value)
		}
		return cast
	case []interface{}:
		for i, value := range cast {
			cast[i] = decrypt(value)
		}
		return cast
	default:
		return cast
	}
}

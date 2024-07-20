package project

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nrednav/cuid2"
	"github.com/pulumi/pulumi/sdk/v3/go/auto"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/events"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optdestroy"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optrefresh"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/tokens"
	"github.com/pulumi/pulumi/sdk/v3/go/common/workspace"
	"github.com/sst/ion/internal/fs"
	"github.com/sst/ion/pkg/global"
	"github.com/sst/ion/pkg/js"
	"github.com/sst/ion/pkg/project/provider"
)

type StackEvent struct {
	events.EngineEvent
	ConcurrentUpdateEvent *ConcurrentUpdateEvent
	CompleteEvent         *CompleteEvent
	OldCompleteEvent      *CompleteEvent
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
	Target  []string
	Dev     bool
}

type ConcurrentUpdateEvent struct{}

type Links map[string]interface{}

type Receiver struct {
	Name        string              `json:"name"`
	Directory   string              `json:"directory"`
	Links       []string            `json:"links"`
	Environment map[string]string   `json:"environment"`
	AwsRole     string              `json:"awsRole"`
	Cloudflare  *CloudflareReceiver `json:"cloudflare"`
	Aws         *AwsReceiver        `json:"aws"`
}

type Dev struct {
	Name        string            `json:"name"`
	Command     string            `json:"command"`
	Directory   string            `json:"directory"`
	Links       []string          `json:"links"`
	Environment map[string]string `json:"environment"`
	Aws         *struct {
		Role string `json:"role"`
	} `json:"aws"`
}
type Devs map[string]Dev

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
	Links       Links
	Warps       Warps
	Receivers   Receivers
	Devs        Devs
	Outputs     map[string]interface{}
	Hints       map[string]string
	Errors      []Error
	Finished    bool
	Old         bool
	Resources   []apitype.ResourceV3
	ImportDiffs []ImportDiff
}

type ImportDiff struct {
	URN   string
	Input string
	Old   interface{}
	New   interface{}
}

type StackCommandEvent struct {
	Command string
}

type Error struct {
	Message string `json:"message"`
	URN     string `json:"urn"`
}

type StackEventStream = chan StackEvent

var ErrStackRunFailed = fmt.Errorf("stack run had errors")
var ErrStageNotFound = fmt.Errorf("stage not found")
var ErrPassphraseInvalid = fmt.Errorf("passphrase invalid")

func (p *Project) Run(ctx context.Context, input *StackInput) error {
	slog.Info("running stack command", "cmd", input.Command)

	updateID := cuid2.Generate()
	err := p.Lock(updateID, input.Command)
	if err != nil {
		if err == provider.ErrLockExists {
			input.OnEvent(&StackEvent{ConcurrentUpdateEvent: &ConcurrentUpdateEvent{}})
		}
		return err
	}
	defer p.Unlock()

	input.OnEvent(&StackEvent{StackCommandEvent: &StackCommandEvent{
		Command: input.Command,
	}})

	_, err = p.PullState()
	if err != nil {
		if errors.Is(err, provider.ErrStateNotFound) {
			if input.Command != "deploy" {
				return ErrStageNotFound
			}
		} else {
			return err
		}
	}
	defer p.PushState(updateID)

	passphrase, err := provider.Passphrase(p.home, p.app.Name, p.app.Stage)
	if err != nil {
		return err
	}

	secrets, err := provider.GetSecrets(p.home, p.app.Name, p.app.Stage)
	if err != nil {
		return ErrPassphraseInvalid
	}

	env := map[string]string{}
	for key, value := range p.Env() {
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
	env["NODE_OPTIONS"] = "--enable-source-maps --no-deprecation"

	cli := map[string]interface{}{
		"command": input.Command,
		"dev":     input.Dev,
		"paths": map[string]string{
			"home":     global.ConfigDir(),
			"root":     p.PathRoot(),
			"work":     p.PathWorkingDir(),
			"platform": p.PathPlatformDir(),
		},
	}
	cliBytes, err := json.Marshal(cli)
	if err != nil {
		return err
	}
	appBytes, err := json.Marshal(p.app)
	if err != nil {
		return err
	}

	providerShim := []string{}
	for _, entry := range p.lock {
		providerShim = append(providerShim, fmt.Sprintf("import * as %s from '%s'", entry.Alias, entry.Package))
		providerShim = append(providerShim, fmt.Sprintf("globalThis.%s = %s", entry.Alias, entry.Alias))
	}

	buildResult, err := js.Build(js.EvalOptions{
		Dir: p.PathRoot(),
		Define: map[string]string{
			"$app": string(appBytes),
			"$cli": string(cliBytes),
			"$dev": fmt.Sprintf("%v", input.Dev),
		},
		Inject: []string{filepath.Join(p.PathWorkingDir(), "platform/src/shim/run.js")},
		Code: fmt.Sprintf(`
      import { run } from "%v";
      %v
      import mod from "%v/sst.config.ts";
      const result = await run(mod.run)
      export default result
    `,
			filepath.Join(p.PathWorkingDir(), "platform/src/auto/run.ts"),
			strings.Join(providerShim, "\n"),
			p.PathRoot(),
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
	defer js.Cleanup(buildResult)
	outfile := buildResult.OutputFiles[1].Path

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
		auto.WorkDir(p.PathWorkingDir()),
		auto.PulumiHome(global.ConfigDir()),
		auto.Project(workspace.Project{
			Name:    tokens.PackageName(p.app.Name),
			Runtime: workspace.NewProjectRuntimeInfo("nodejs", nil),
			Backend: &workspace.ProjectBackend{
				URL: fmt.Sprintf("file://%v", p.PathWorkingDir()),
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
		p.app.Stage,
		ws,
	)
	if err != nil {
		return err
	}
	slog.Info("built stack")

	go func() {
		completed, err := getCompletedEvent(ctx, stack)
		if err != nil {
			return
		}
		completed.Finished = true
		completed.Old = true
		input.OnEvent(&StackEvent{
			OldCompleteEvent: completed,
		})
	}()

	config := auto.ConfigMap{}
	for provider, args := range p.app.Providers {
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
	eventlog, err := os.Create(filepath.Join(p.PathWorkingDir(), "event.log"))
	if err != nil {
		return err
	}
	defer eventlog.Close()

	errors := []Error{}
	finished := false
	importDiffs := []ImportDiff{}

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
					if strings.Contains(event.DiagnosticEvent.Message, "failed to register new resource") {
						break
					}
					errors = append(errors, Error{
						Message: event.DiagnosticEvent.Message,
						URN:     event.DiagnosticEvent.URN,
					})
				}

				if event.ResOpFailedEvent != nil {
					if event.ResOpFailedEvent.Metadata.Op == apitype.OpImport {
						for _, name := range event.ResOpFailedEvent.Metadata.Diffs {
							old := event.ResOpFailedEvent.Metadata.Old.Inputs[name]
							next := event.ResOpFailedEvent.Metadata.New.Inputs[name]
							importDiffs = append(importDiffs, ImportDiff{
								URN:   event.ResOpFailedEvent.Metadata.URN,
								Input: name,
								Old:   old,
								New:   next,
							})
						}
					}
				}

				input.OnEvent(&StackEvent{EngineEvent: event})

				if event.SummaryEvent != nil {
					finished = true
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
		complete, err := getCompletedEvent(ctx, stack)
		if err != nil {
			return
		}
		complete.Finished = finished
		complete.Errors = errors
		complete.ImportDiffs = importDiffs
		defer input.OnEvent(&StackEvent{CompleteEvent: complete})

		cloudflareBindings := map[string]string{}
		for _, resource := range complete.Resources {
			outputs := decrypt(resource.Outputs).(map[string]interface{})
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

		typesFileName := "sst-env.d.ts"
		typesFilePath := filepath.Join(p.PathRoot(), typesFileName)
		typesFile, _ := os.Create(typesFilePath)
		defer typesFile.Close()

		oldTypesFilePath := filepath.Join(p.PathWorkingDir(), "types.generated.ts")
		oldTypesFile, _ := os.Create(oldTypesFilePath)
		defer oldTypesFile.Close()

		multi := io.MultiWriter(typesFile, oldTypesFile)

		multi.Write([]byte("/* tslint:disable */\n"))
		multi.Write([]byte("/* eslint-disable */\n"))
		multi.Write([]byte("import \"sst\"\n"))
		multi.Write([]byte("declare module \"sst\" {\n"))
		multi.Write([]byte("  export interface Resource " + inferTypes(complete.Links, "  ") + "\n"))
		multi.Write([]byte("}\n"))
		multi.Write([]byte("export {}\n"))

		for _, receiver := range complete.Receivers {
			envPathHint, err := fs.FindUp(filepath.Join(p.PathRoot(), receiver.Directory), "tsconfig.json")
			if err != nil {
				continue
			}
			envPath := filepath.Join(filepath.Dir(envPathHint), "sst-env.d.ts")
			rel, _ := filepath.Rel(filepath.Dir(envPath), typesFilePath)
			if rel == typesFileName && receiver.Cloudflare == nil {
				continue
			}
			file, _ := os.Create(envPath)
			file.WriteString("/* tslint:disable */\n")
			file.WriteString("/* eslint-disable */\n")
			if rel != typesFileName {
				file.WriteString("/// <reference path=\"" + rel + "\" />\n")
			}
			defer file.Close()

			if receiver.Cloudflare != nil {
				if rel == typesFileName {
					file.WriteString("import \"sst\"\n")
					file.WriteString("declare module \"sst\" {\n")
					file.WriteString("  export interface Resource " + inferTypes(complete.Links, "  ") + "\n")
					file.WriteString("}" + "\n")
				}
				bindings := map[string]interface{}{}
				for _, link := range receiver.Links {
					if cloudflareBindings[link] != "" {
						bindings[link] = literal{value: `import("@cloudflare/workers-types").` + cloudflareBindings[link]}
					}
				}
				if len(bindings) > 0 {
					file.WriteString("// cloudflare \n")
					file.WriteString("declare module \"sst\" {\n")
					file.WriteString("  export interface Resource " + inferTypes(bindings, "  ") + "\n")
					file.WriteString("}\n")
				}
			}
			file.WriteString("export {}\n")
		}

		provider.PutLinks(p.home, p.app.Name, p.app.Stage, complete.Links)
	}()

	slog.Info("running stack command", "cmd", input.Command)
	var summary auto.UpdateSummary
	defer func() {
		var parsed provider.Summary
		parsed.Version = p.Version()
		parsed.UpdateID = updateID
		parsed.TimeStarted = summary.StartTime
		parsed.TimeCompleted = time.Now().Format(time.RFC3339)
		if summary.EndTime != nil {
			parsed.TimeCompleted = *summary.EndTime
		}
		if summary.ResourceChanges != nil {
			if match, ok := (*summary.ResourceChanges)["same"]; ok {
				parsed.ResourceSame = match
			}
			if match, ok := (*summary.ResourceChanges)["create"]; ok {
				parsed.ResourceCreated = match
			}
			if match, ok := (*summary.ResourceChanges)["update"]; ok {
				parsed.ResourceUpdated = match
			}
			if match, ok := (*summary.ResourceChanges)["delete"]; ok {
				parsed.ResourceDeleted = match
			}
		}
		for _, err := range errors {
			parsed.Errors = append(parsed.Errors, provider.SummaryError{
				URN:     err.URN,
				Message: err.Message,
			})
		}

		provider.PutSummary(p.home, p.app.Name, p.app.Stage, updateID, parsed)
	}()

	switch input.Command {
	case "deploy":
		result, derr := stack.Up(ctx,
			optup.Target(input.Target),
			optup.TargetDependents(),
			optup.ProgressStreams(),
			optup.ErrorProgressStreams(),
			optup.EventStreams(stream),
		)
		err = derr
		summary = result.Summary

	case "remove":
		result, derr := stack.Destroy(ctx,
			optdestroy.ContinueOnError(),
			optdestroy.Target(input.Target),
			optdestroy.TargetDependents(),
			optdestroy.ProgressStreams(),
			optdestroy.ErrorProgressStreams(),
			optdestroy.EventStreams(stream),
		)
		err = derr
		summary = result.Summary

	case "refresh":
		result, derr := stack.Refresh(ctx,
			optrefresh.Target(input.Target),
			optrefresh.ProgressStreams(),
			optrefresh.ErrorProgressStreams(),
			optrefresh.EventStreams(stream),
		)
		err = derr
		summary = result.Summary
	}

	slog.Info("done running stack command")
	if err != nil {
		slog.Error("stack run failed", "error", err)
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

func (s *Project) Lock(updateID string, command string) error {
	return provider.Lock(s.home, updateID, command, s.app.Name, s.app.Stage)
}

func (s *Project) Unlock() error {
	dir := s.PathWorkingDir()
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

	return provider.Unlock(s.home, s.app.Name, s.app.Stage)
}

func (s *Project) PullState() (string, error) {
	pulumiDir := filepath.Join(s.PathWorkingDir(), ".pulumi")
	err := os.RemoveAll(pulumiDir)
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(pulumiDir, "stacks", s.app.Name)
	err = os.MkdirAll(appDir, 0755)
	if err != nil {
		return "", err
	}
	path := filepath.Join(appDir, fmt.Sprintf("%v.json", s.app.Stage))
	err = provider.PullState(
		s.home,
		s.app.Name,
		s.app.Stage,
		path,
	)
	if err != nil {
		return "", err
	}
	return path, nil
}

func (s *Project) PushState(version string) error {
	pulumiDir := filepath.Join(s.PathWorkingDir(), ".pulumi")
	return provider.PushState(
		s.home,
		version,
		s.app.Name,
		s.app.Stage,
		filepath.Join(pulumiDir, "stacks", s.app.Name, fmt.Sprintf("%v.json", s.app.Stage)),
	)
}

func (s *Project) Cancel() error {
	return provider.Unlock(
		s.home,
		s.app.Name,
		s.app.Stage,
	)
}

func decrypt(input interface{}) interface{} {
	switch cast := input.(type) {
	case map[string]interface{}:
		if cast["plaintext"] != nil {
			var parsed any
			str, ok := cast["plaintext"].(string)
			if ok {
				json.Unmarshal([]byte(str), &parsed)
				return parsed
			}
			return cast["plaintext"]
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

type upOptionFunc func(*optup.Options)

// ApplyOption is an implementation detail
func (o upOptionFunc) ApplyOption(opts *optup.Options) {
	o(opts)
}

func getCompletedEvent(ctx context.Context, stack auto.Stack) (*CompleteEvent, error) {
	exported, err := stack.Export(ctx)
	if err != nil {
		return nil, err
	}
	slog.Info("stack command complete")
	var deployment apitype.DeploymentV3
	json.Unmarshal(exported.Deployment, &deployment)
	complete := &CompleteEvent{
		Links:       Links{},
		ImportDiffs: []ImportDiff{},
		Receivers:   Receivers{},
		Devs:        Devs{},
		Warps:       Warps{},
		Hints:       map[string]string{},
		Outputs:     map[string]interface{}{},
		Errors:      []Error{},
		Finished:    false,
		Resources:   []apitype.ResourceV3{},
	}
	if len(deployment.Resources) == 0 {
		return complete, nil
	}
	complete.Resources = deployment.Resources

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
			entry.Name = resource.URN.Name()
			complete.Receivers[entry.Directory] = entry
		}

		if match, ok := outputs["_dev"].(map[string]interface{}); ok {
			data, _ := json.Marshal(match)
			var entry Dev
			json.Unmarshal(data, &entry)
			entry.Name = resource.URN.Name()
			complete.Devs[entry.Name] = entry
		}

		if hint, ok := outputs["_hint"].(string); ok {
			complete.Hints[string(resource.URN)] = hint
		}

		if resource.Type == "sst:sst:LinkRef" && outputs["target"] != nil && outputs["properties"] != nil {
			complete.Links[outputs["target"].(string)] = outputs["properties"].(map[string]interface{})
		}
	}

	outputs := decrypt(deployment.Resources[0].Outputs).(map[string]interface{})
	for key, value := range outputs {
		if strings.HasPrefix(key, "_") {
			continue
		}
		complete.Outputs[key] = value
	}

	return complete, nil
}

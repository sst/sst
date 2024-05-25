package ui

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/sst/ion/pkg/project"
	"github.com/sst/ion/pkg/server"
)

type ProgressMode string

const (
	ProgressModeDev     ProgressMode = "dev"
	ProgressModeDeploy  ProgressMode = "deploy"
	ProgressModeRemove  ProgressMode = "remove"
	ProgressModeRefresh ProgressMode = "refresh"
)

const (
	IconX     = "×"
	IconCheck = "✓"
)

type UI struct {
	spinner     *spinner.Spinner
	mode        ProgressMode
	hasProgress bool
	pending     map[string]string
	dedupe      map[string]bool
	timing      map[string]time.Time
	hints       map[string]string
	parents     map[string]string
	footer      string
	colors      map[string]color.Attribute
	workerTime  map[string]time.Time
	complete    *project.CompleteEvent
	skipped     int
}

func New(mode ProgressMode) *UI {
	result := &UI{
		spinner:    spinner.New(spinner.CharSets[14], 100*time.Millisecond),
		mode:       mode,
		colors:     map[string]color.Attribute{},
		workerTime: map[string]time.Time{},
	}
	result.Reset()
	return result
}

func (u *UI) Reset() {
	u.hasProgress = false
	u.skipped = 0
	u.parents = map[string]string{}
	u.hints = map[string]string{}
	u.pending = map[string]string{}
	u.dedupe = map[string]bool{}
	u.timing = map[string]time.Time{}
}

func (u *UI) StackEvent(evt *project.StackEvent) {
	if evt.ConcurrentUpdateEvent != nil {
		u.printEvent(color.FgRed, "Locked", "A concurrent update was detected on the app. Run `sst unlock` to remove the lock and try again.")
	}
	if evt.StackCommandEvent != nil {
		u.spinner.Disable()

		if evt.StackCommandEvent.Command == "deploy" {
			color.New(color.FgYellow, color.Bold).Print("~")
			color.New(color.FgWhite, color.Bold).Println("  Deploying")
			u.spinner.Suffix = "  Deploying..."
		}

		if evt.StackCommandEvent.Command == "remove" {
			color.New(color.FgRed, color.Bold).Print("~")
			color.New(color.FgWhite, color.Bold).Println("  Removing")
			u.spinner.Suffix = "  Removing..."
		}

		if evt.StackCommandEvent.Command == "refresh" {
			color.New(color.FgBlue, color.Bold).Print("~")
			color.New(color.FgWhite, color.Bold).Println("  Refreshing")
			u.spinner.Suffix = "  Refreshing..."
		}

		fmt.Println()
		u.spinner.Start()
		u.spinner.Disable()
		return
	}

	if evt.SummaryEvent != nil {
		u.spinner.Suffix = "  Finalizing..."
	}

	if evt.BuildFailedEvent != nil {
		u.spinner.Disable()
		u.printEvent(color.FgRed, "Error", evt.BuildFailedEvent.Error)
	}

	if evt.StdOutEvent != nil {
		u.spinner.Disable()
		fmt.Println(evt.StdOutEvent.Text)
		u.spinner.Enable()
		return
	}

	if evt.ResourcePreEvent != nil {
		u.timing[evt.ResourcePreEvent.Metadata.URN] = time.Now()
		if evt.ResourcePreEvent.Metadata.Type == "pulumi:pulumi:Stack" {
			return
		}

		if evt.ResourcePreEvent.Metadata.Old != nil && evt.ResourcePreEvent.Metadata.Old.Parent != "" {
			u.parents[evt.ResourcePreEvent.Metadata.URN] = evt.ResourcePreEvent.Metadata.Old.Parent
		}

		if evt.ResourcePreEvent.Metadata.New != nil && evt.ResourcePreEvent.Metadata.New.Parent != "" {
			u.parents[evt.ResourcePreEvent.Metadata.URN] = evt.ResourcePreEvent.Metadata.New.Parent
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpSame {
			// Do not print anything for skipped resources
			if u.mode == ProgressModeDeploy || u.mode == ProgressModeDev {
				u.skipped++
				u.spinner.Suffix = fmt.Sprintf("  Deploying (%v skipped)...", u.skipped)
				u.spinner.Enable()
			}
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpCreate {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Creating",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpUpdate {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Updating",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpCreateReplacement {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Creating",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpDeleteReplaced {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Deleting",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpReplace {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Creating",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpDelete {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Deleting",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpRefresh {
			u.printProgress(Progress{
				Color: color.FgYellow,
				Label: "Refreshing",
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
			return
		}
	}

	if evt.ResOutputsEvent != nil {
		// if evt.ResOutputsEvent.Metadata.Type == "pulumi:pulumi:Stack" && evt.ResOutputsEvent.Metadata.Op != apitype.OpDelete {
		// 	u.outputs = evt.ResOutputsEvent.Metadata.New.Outputs
		// 	return
		// }
		if evt.ResOutputsEvent.Metadata.Type == "pulumi:pulumi:Stack" {
			return
		}

		if evt.ResOutputsEvent.Metadata.New != nil {
			if hint, ok := evt.ResOutputsEvent.Metadata.New.Outputs["_hint"]; ok {
				stringHint, ok := hint.(string)
				if ok {
					u.hints[evt.ResOutputsEvent.Metadata.URN] = stringHint
				} else {
					slog.Info("hint is not a string", "hint", hint)
				}
			}
		}

		if evt.ResOutputsEvent.Metadata.Type == "sst:aws:Nextjs" && evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate && false {
			u.footer = "🎉 Congrats on your new site!"
		}

		duration := time.Since(u.timing[evt.ResOutputsEvent.Metadata.URN]).Round(time.Millisecond)
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpSame && u.mode == ProgressModeRefresh {
			u.printProgress(Progress{
				Color:    color.FgGreen,
				Label:    "Refreshed",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
			return
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate {
			u.printProgress(Progress{
				Color:    color.FgGreen,
				Label:    "Created",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpUpdate {
			u.printProgress(Progress{
				Color:    color.FgGreen,
				Label:    "Updated",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpDelete {
			u.printProgress(Progress{
				Color:    color.FgHiBlack,
				Label:    "Deleted",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpDeleteReplaced {
			u.printProgress(Progress{
				Color:    color.FgHiBlack,
				Label:    "Deleted",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreateReplacement {
			u.printProgress(Progress{
				Color:    color.FgGreen,
				Label:    "Created",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpReplace {
			u.printProgress(Progress{
				Color:    color.FgGreen,
				Label:    "Created",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
	}

	if evt.ResOpFailedEvent != nil {
	}

	if evt.DiagnosticEvent != nil {
		if evt.DiagnosticEvent.Severity == "error" {
			u.printProgress(Progress{
				URN:     evt.DiagnosticEvent.URN,
				Color:   color.FgRed,
				Final:   true,
				Label:   "Error",
				Message: parseError(evt.DiagnosticEvent.Message),
			})
		}

		if evt.DiagnosticEvent.Severity == "info" {
			u.spinner.Disable()
			fmt.Println(parseError(evt.DiagnosticEvent.Message)[0])
			u.spinner.Enable()
		}

		if evt.DiagnosticEvent.Severity == "info#err" {
			if strings.HasPrefix(evt.DiagnosticEvent.Message, "Downloading provider") {
				u.printEvent(color.FgMagenta, "Info", strings.TrimSpace(evt.DiagnosticEvent.Message))
			} else {
				u.spinner.Disable()
				fmt.Println(parseError(evt.DiagnosticEvent.Message)[0])
				u.spinner.Enable()
			}
		}
	}

	if evt.CompleteEvent != nil {
		u.complete = evt.CompleteEvent
		u.spinner.Disable()
		defer fmt.Println()
		if u.hasProgress {
			fmt.Println()
		}
		if len(evt.CompleteEvent.Errors) == 0 && evt.CompleteEvent.Finished {
			color.New(color.FgGreen, color.Bold).Print(IconCheck)
			if !u.hasProgress {
				if u.mode == ProgressModeRemove {
					color.New(color.FgWhite, color.Bold).Println("  No resources to remove")
				} else {
					color.New(color.FgWhite, color.Bold).Println("  No changes")
				}
			}
			if u.hasProgress {
				if u.mode == ProgressModeRemove {
					color.New(color.FgWhite, color.Bold).Println("  Removed")
				}
				if u.mode == ProgressModeDeploy || u.mode == ProgressModeDev {
					color.New(color.FgWhite, color.Bold).Println("  Complete")
				}
				if u.mode == ProgressModeRefresh {
					color.New(color.FgWhite, color.Bold).Println("  Refreshed")
				}
			}
			if len(evt.CompleteEvent.Hints) > 0 {
				for k, v := range evt.CompleteEvent.Hints {
					splits := strings.Split(k, "::")
					color.New(color.FgHiBlack).Print("   ")
					color.New(color.FgHiBlack, color.Bold).Print(splits[len(splits)-1] + ": ")
					color.New(color.FgWhite).Println(v)
				}
			}
			if len(evt.CompleteEvent.Outputs) > 0 {
				if len(evt.CompleteEvent.Hints) > 0 {
					color.New(color.FgHiBlack).Println("   ---")
				}
				for k, v := range evt.CompleteEvent.Outputs {
					color.New(color.FgHiBlack).Print("   ")
					color.New(color.FgHiBlack, color.Bold).Print(k + ": ")
					color.New(color.FgWhite).Println(v)
				}
			}
			if u.footer != "" {
				fmt.Println()
				fmt.Println(u.footer)
			}
			return
		}

		if len(evt.CompleteEvent.Errors) == 0 && !evt.CompleteEvent.Finished {
			color.New(color.FgRed, color.Bold).Print("\n" + IconX)
			color.New(color.FgWhite, color.Bold).Println("  Interrupted")
			return
		}

		color.New(color.FgRed, color.Bold).Print(IconX)
		color.New(color.FgWhite, color.Bold).Println("  Failed")

		for _, status := range evt.CompleteEvent.Errors {
			if status.URN != "" {
				color.New(color.FgRed, color.Bold).Println("   " + u.formatURN(status.URN))
			}
			color.New(color.FgWhite).Println("   " + strings.Join(parseError(status.Message), "\n   "))
		}
	}
}

var COLORS = []color.Attribute{
	color.FgMagenta,
	color.FgCyan,
	color.FgGreen,
	color.FgWhite,
}

func (u *UI) getColor(input string) color.Attribute {
	result, ok := u.colors[input]
	if !ok {
		result = COLORS[len(u.colors)%len(COLORS)]
		u.colors[input] = result
	}
	return result
}

func (u *UI) Event(evt *server.Event) {
	if evt.FunctionInvokedEvent != nil {
		u.workerTime[evt.FunctionInvokedEvent.WorkerID] = time.Now()
		u.printEvent(u.getColor(evt.FunctionInvokedEvent.WorkerID), color.New(color.FgWhite, color.Bold).Sprintf("%-11s", "Invoke"), u.functionName(evt.FunctionInvokedEvent.FunctionID))
	}

	if evt.FunctionResponseEvent != nil {
		duration := time.Since(u.workerTime[evt.FunctionResponseEvent.WorkerID]).Round(time.Millisecond)
		formattedDuration := fmt.Sprintf("took %.9s", fmt.Sprintf("+%v", duration))
		u.printEvent(u.getColor(evt.FunctionResponseEvent.WorkerID), "Done", formattedDuration)
	}

	if evt.FunctionLogEvent != nil {
		duration := time.Since(u.workerTime[evt.FunctionLogEvent.WorkerID]).Round(time.Millisecond)
		formattedDuration := fmt.Sprintf("%.9s", fmt.Sprintf("+%v", duration))
		u.printEvent(u.getColor(evt.FunctionLogEvent.WorkerID), formattedDuration, evt.FunctionLogEvent.Line)
	}

	if evt.WorkerBuildEvent != nil {
		if len(evt.WorkerBuildEvent.Errors) > 0 {
			u.printEvent(color.FgRed, "Build Error", u.functionName(evt.WorkerBuildEvent.WorkerID)+" "+strings.Join(evt.WorkerBuildEvent.Errors, "\n"))
			return
		}
		u.printEvent(color.FgGreen, "Build", u.functionName(evt.WorkerBuildEvent.WorkerID))
	}

	if evt.WorkerUpdatedEvent != nil {
		u.printEvent(color.FgBlue, "Reload", u.functionName(evt.WorkerUpdatedEvent.WorkerID))
	}
	if evt.WorkerInvokedEvent != nil {
		url, _ := url.Parse(evt.WorkerInvokedEvent.TailEvent.Event.Request.URL)
		u.printEvent(u.getColor(evt.WorkerInvokedEvent.WorkerID), color.New(color.FgWhite, color.Bold).Sprintf("%-11s", "Invoke"), u.functionName(evt.WorkerInvokedEvent.WorkerID)+" "+evt.WorkerInvokedEvent.TailEvent.Event.Request.Method+" "+url.Path)

		for _, log := range evt.WorkerInvokedEvent.TailEvent.Logs {
			duration := time.UnixMilli(log.Timestamp).Sub(time.UnixMilli(evt.WorkerInvokedEvent.TailEvent.EventTimestamp))
			formattedDuration := fmt.Sprintf("%.9s", fmt.Sprintf("+%v", duration))

			line := []string{}
			for _, part := range log.Message {
				switch v := part.(type) {
				case string:
					line = append(line, v)
				case map[string]interface{}:
					data, _ := json.Marshal(v)
					line = append(line, string(data))
				}
			}

			for _, item := range strings.Split(strings.Join(line, " "), "\n") {
				u.printEvent(u.getColor(evt.WorkerInvokedEvent.WorkerID), formattedDuration, item)
			}
		}
		u.printEvent(u.getColor(evt.WorkerInvokedEvent.WorkerID), "Done", evt.WorkerInvokedEvent.TailEvent.Outcome)
	}

	if evt.FunctionBuildEvent != nil {
		if len(evt.FunctionBuildEvent.Errors) > 0 {
			u.printEvent(color.FgRed, "Build Error", u.functionName(evt.FunctionBuildEvent.FunctionID)+" "+strings.Join(evt.FunctionBuildEvent.Errors, "\n"))
			return
		}
		u.printEvent(color.FgGreen, "Build", u.functionName(evt.FunctionBuildEvent.FunctionID))
	}

	if evt.FunctionErrorEvent != nil {
		u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), color.New(color.FgRed).Sprintf("%-11s", "Error"), "")
		u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), "", evt.FunctionErrorEvent.ErrorMessage)
		for _, item := range evt.FunctionErrorEvent.Trace {
			if strings.Contains(item, "Error:") {
				continue
			}
			u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), "", "↳ "+strings.TrimSpace(item))
		}
	}
}

func (u *UI) functionName(functionID string) string {
	if u.complete == nil {
		return functionID
	}
	for _, resource := range u.complete.Resources {
		if resource.Type == "sst:aws:Function" && resource.URN.Name() == functionID {
			return resource.Outputs["_metadata"].(map[string]interface{})["handler"].(string)
		}
		if resource.Type == "sst:cloudflare:Worker" && resource.URN.Name() == functionID {
			return resource.Outputs["_metadata"].(map[string]interface{})["handler"].(string)
		}
	}
	return functionID
}

func (u *UI) printEvent(barColor color.Attribute, label string, message string) {
	if u.spinner.Active() {
		u.spinner.Disable()
		defer u.spinner.Enable()
	}
	color.New(barColor, color.Bold).Print("|  ")
	if label != "" {
		color.New(color.FgHiBlack).Print(fmt.Sprintf("%-11s", label), " ")
	}
	color.New(color.FgHiBlack).Print(message)
	fmt.Println()
	u.hasProgress = true
}

func (u *UI) Interrupt() {
	u.spinner.Suffix = "  Interrupting..."
}

func (u *UI) Destroy() {
	u.spinner.Stop()
}

func (u *UI) Header(version, app, stage string) {
	color.New(color.FgCyan, color.Bold).Print("SST ❍ ion " + version + "  ")
	color.New(color.FgHiBlack).Print("ready!")
	fmt.Println()
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Print("➜  ")

	color.New(color.FgWhite, color.Bold).Printf("%-12s", "App:")
	color.New(color.FgHiBlack).Println(app)

	color.New(color.FgWhite, color.Bold).Printf("   %-12s", "Stage:")
	color.New(color.FgHiBlack).Println(stage)
	if u.mode == ProgressModeDev {
		color.New(color.FgWhite, color.Bold).Printf("   %-12s", "Console:")
		color.New(color.FgHiBlack).Println("https://console.sst.dev/local/" + app + "/" + stage)
	}
	fmt.Println()
}

func (u *UI) formatURN(urn string) string {
	if urn == "" {
		return ""
	}

	child := resource.URN(urn)
	name := child.Name()
	typeName := child.Type().DisplayName()
	splits := strings.SplitN(child.Name(), ".", 2)
	if len(splits) > 1 {
		name = splits[0]
		typeName = strings.ReplaceAll(splits[1], ".", ":")
	}
	result := name + " " + typeName

	for {
		parent := resource.URN(u.parents[string(child)])
		if parent == "" {
			break
		}
		if parent.Type().DisplayName() == "pulumi:pulumi:Stack" {
			break
		}
		child = parent
	}
	if string(child) != urn {
		result = child.Name() + " " + child.Type().DisplayName() + " → " + result
	}
	return result
}

type Progress struct {
	Color   color.Attribute
	Label   string
	URN     string
	Final   bool
	Message []string
	time.Duration
}

func (u *UI) printProgress(progress Progress) {
	u.spinner.Disable()
	defer u.spinner.Enable()
	dedupeKey := progress.URN + progress.Label
	// if u.dedupe[dedupeKey] {
	// 	return
	// }
	u.dedupe[dedupeKey] = true

	color.New(progress.Color, color.Bold).Print("|  ")
	color.New(color.FgHiBlack).Print(fmt.Sprintf("%-11s", progress.Label), " ", u.formatURN(progress.URN))
	if progress.Duration > time.Second {
		color.New(color.FgHiBlack).Printf(" (%.1fs)", progress.Duration.Seconds())
	}
	if len(progress.Message) > 0 {
		color.New(color.FgWhite).Print(" " + progress.Message[0])
		for _, item := range progress.Message[1:] {
			fmt.Println()
			color.New(progress.Color, color.Bold).Print("|  ")
			color.New(color.FgWhite).Print(strings.TrimSpace(item))
		}
	}
	fmt.Println()
	u.hasProgress = true
}

func Success(msg string) {
	os.Stderr.WriteString(color.New(color.FgGreen, color.Bold).Sprint(IconCheck + "  "))
	os.Stderr.WriteString(color.New(color.FgWhite).Sprintln(msg))
}

func Error(msg string) {
	os.Stderr.WriteString(color.New(color.FgRed, color.Bold).Sprint(IconX + "  "))
	os.Stderr.WriteString(color.New(color.FgWhite).Sprintln(msg))
}

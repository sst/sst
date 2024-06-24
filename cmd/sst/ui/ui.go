package ui

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
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
	mode        ProgressMode
	hasProgress bool
	pending     map[string]string
	dedupe      map[string]bool
	timing      map[string]time.Time
	parents     map[string]string
	colors      map[string]color.Attribute
	workerTime  map[string]time.Time
	complete    *project.CompleteEvent
	skipped     int
	footer      *tea.Program
	buffer      []interface{}
	hasBlank    bool
}

func New(ctx context.Context, mode ProgressMode) *UI {
	result := &UI{
		footer:     NewFooter(),
		mode:       mode,
		colors:     map[string]color.Attribute{},
		workerTime: map[string]time.Time{},
		hasBlank:   false,
	}
	result.Reset()
	return result
}

func (u *UI) print(args ...interface{}) {
	u.buffer = append(u.buffer, args...)
}

func (u *UI) printf(tmpl string, args ...interface{}) {
	u.buffer = append(u.buffer, fmt.Sprintf(tmpl, args...))
}

func (u *UI) println(args ...interface{}) {
	u.buffer = append(u.buffer, args...)
	u.footer.Send(lineMsg(fmt.Sprint(u.buffer...)))
	u.buffer = []interface{}{}
	u.hasBlank = false
}

func (u *UI) blank() {
	if u.hasBlank {
		return
	}
	u.println()
	u.hasBlank = true
}

func (u *UI) Reset() {
	u.hasProgress = false
	u.skipped = 0
	u.parents = map[string]string{}
	u.pending = map[string]string{}
	u.dedupe = map[string]bool{}
	u.timing = map[string]time.Time{}
	u.buffer = []interface{}{}
}

func (u *UI) StackEvent(evt *project.StackEvent) {
	u.footer.Send(evt)
	if evt.ConcurrentUpdateEvent != nil {
		u.printEvent(color.FgRed, "Locked", "A concurrent update was detected on the app. Run `sst unlock` to remove the lock and try again.")
	}
	if evt.StackCommandEvent != nil {
		u.blank()
		if evt.StackCommandEvent.Command == "deploy" {
			u.println(
				color.New(color.FgYellow, color.Bold).Sprint("~"),
				color.New(color.FgWhite, color.Bold).Sprint("  Deploying"),
			)
		}
		if evt.StackCommandEvent.Command == "remove" {
			u.println(
				color.New(color.FgRed, color.Bold).Sprint("~"),
				color.New(color.FgWhite, color.Bold).Sprint("  Removing"),
			)
		}
		if evt.StackCommandEvent.Command == "refresh" {
			u.println(
				color.New(color.FgBlue, color.Bold).Sprint("~"),
				color.New(color.FgWhite, color.Bold).Sprint("  Refreshing"),
			)
		}
		u.blank()
		return
	}

	if evt.BuildFailedEvent != nil {
		u.printEvent(color.FgRed, "Error", evt.BuildFailedEvent.Error)
	}

	if evt.StdOutEvent != nil {
		u.println(evt.StdOutEvent.Text)
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
			}
			return
		}
	}

	if evt.ResOutputsEvent != nil {
		if evt.ResOutputsEvent.Metadata.Type == "pulumi:pulumi:Stack" {
			return
		}

		duration := time.Since(u.timing[evt.ResOutputsEvent.Metadata.URN]).Round(time.Millisecond)
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpSame && u.mode == ProgressModeRefresh {
			u.printProgress(
				color.FgGreen,
				"Refreshed",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
			return
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate {
			u.printProgress(
				color.FgGreen,
				"Created",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpUpdate {
			u.printProgress(
				color.FgGreen,
				"Updated",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpDelete {
			u.printProgress(
				color.FgHiBlack,
				"Deleted",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpDeleteReplaced {
			u.printProgress(
				color.FgHiBlack,
				"Deleted",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpCreateReplacement {
			u.printProgress(
				color.FgGreen,
				"Created",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpReplace {
			u.printProgress(
				color.FgGreen,
				"Created",
				duration,
				evt.ResOutputsEvent.Metadata.URN,
			)
		}
	}

	if evt.ResOpFailedEvent != nil {
	}

	if evt.DiagnosticEvent != nil {
		if evt.DiagnosticEvent.Severity == "error" {
			message := []string{u.formatURN(evt.DiagnosticEvent.URN)}
			message = append(message, parseError(evt.DiagnosticEvent.Message)...)
			u.printEvent(color.FgRed, "Error", message...)
		}

		if evt.DiagnosticEvent.Severity == "info" {
			u.printEvent(
				color.FgHiBlack,
				"Log",
				strings.TrimSpace(evt.DiagnosticEvent.Message),
			)
		}

		if evt.DiagnosticEvent.Severity == "info#err" {
			if strings.HasPrefix(evt.DiagnosticEvent.Message, "Downloading provider") {
				u.printEvent(color.FgMagenta, "Info", strings.TrimSpace(evt.DiagnosticEvent.Message))
			} else {
				u.printEvent(
					color.FgHiBlack,
					"Log",
					evt.DiagnosticEvent.Message,
				)
			}
		}
	}

	if evt.CompleteEvent != nil {
		u.complete = evt.CompleteEvent
		u.blank()
		if len(evt.CompleteEvent.Errors) == 0 && evt.CompleteEvent.Finished {
			u.print(color.New(color.FgGreen, color.Bold).Sprint(IconCheck))
			if len(u.timing) == 0 {
				if u.mode == ProgressModeRemove {
					u.print(color.New(color.FgWhite, color.Bold).Sprint("  No resources to remove"))
				} else {
					u.print(color.New(color.FgWhite, color.Bold).Sprint("  No changes"))
				}
			}
			if len(u.timing) > 0 {
				if u.mode == ProgressModeRemove {
					u.print(color.New(color.FgWhite, color.Bold).Sprint("  Removed"))
				}
				if u.mode == ProgressModeDeploy || u.mode == ProgressModeDev {
					u.print(color.New(color.FgWhite, color.Bold).Sprint("  Complete"))
				}
				if u.mode == ProgressModeRefresh {
					u.print(color.New(color.FgWhite, color.Bold).Sprint("  Refreshed"))
				}
			}
			u.println()
			if len(evt.CompleteEvent.Hints) > 0 {
				for k, v := range evt.CompleteEvent.Hints {
					splits := strings.Split(k, "::")
					u.println(
						color.New(color.FgHiBlack).Sprint("   "),
						color.New(color.FgHiBlack, color.Bold).Sprint(splits[len(splits)-1]+": "),
						color.New(color.FgWhite).Sprint(v),
					)
				}
			}
			if len(evt.CompleteEvent.Outputs) > 0 {
				if len(evt.CompleteEvent.Hints) > 0 {
					u.println(color.New(color.FgHiBlack).Sprint("   ---"))
				}
				for k, v := range evt.CompleteEvent.Outputs {
					u.println(
						color.New(color.FgHiBlack).Sprint("   "),
						color.New(color.FgHiBlack, color.Bold).Sprint(k+": "),
						color.New(color.FgWhite).Sprint(v),
					)
				}
			}
		}

		if len(evt.CompleteEvent.Errors) == 0 && !evt.CompleteEvent.Finished {
			u.println(
				color.New(color.FgRed, color.Bold).Sprint(IconX),
				color.New(color.FgWhite, color.Bold).Sprint("  Interrupted"),
			)
		}

		if len(evt.CompleteEvent.Errors) > 0 {
			u.println(
				color.New(color.FgRed, color.Bold).Sprint(IconX),
				color.New(color.FgWhite, color.Bold).Sprint("  Failed"),
			)

			for _, status := range evt.CompleteEvent.Errors {
				if status.URN != "" {
					u.println(color.New(color.FgRed, color.Bold).Sprint("   " + u.formatURN(status.URN)))
				}
				u.println(color.New(color.FgWhite).Sprint("   " + strings.Join(parseError(status.Message), "\n   ")))
			}
		}

		u.blank()
	}
}

func (u *UI) Event(evt *server.Event) {
	u.footer.Send(evt)
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
			u.printEvent(color.FgRed, "Build Error", u.functionName(evt.FunctionBuildEvent.FunctionID))
			for _, item := range evt.FunctionBuildEvent.Errors {
				u.printEvent(color.FgRed, "", "↳ "+strings.TrimSpace(item))
			}
			return
		}
		u.printEvent(color.FgGreen, "Build", u.functionName(evt.FunctionBuildEvent.FunctionID))
	}

	if evt.FunctionErrorEvent != nil {
		u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), color.New(color.FgRed).Sprintf("%-11s", "Error"), u.functionName(evt.FunctionErrorEvent.FunctionID))
		u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), "", evt.FunctionErrorEvent.ErrorMessage)
		for _, item := range evt.FunctionErrorEvent.Trace {
			if strings.Contains(item, "Error:") {
				continue
			}
			u.printEvent(u.getColor(evt.FunctionErrorEvent.WorkerID), "", "↳ "+strings.TrimSpace(item))
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

func (u *UI) printProgress(barColor color.Attribute, label string, duration time.Duration, urn string) {
	message := u.formatURN(urn)
	if duration > time.Second {
		message += fmt.Sprintf(" (%.1fs)", duration.Seconds())
	}
	u.printEvent(barColor, label, message)
}

func (u *UI) printEvent(barColor color.Attribute, label string, message ...string) {
	u.print(color.New(barColor, color.Bold).Sprint("|  "))
	if label != "" {
		u.print(color.New(color.FgHiBlack).Sprint(fmt.Sprintf("%-11s", label), " "))
	}
	if len(message) > 0 {
		u.print(color.New(color.FgHiBlack).Sprint(message[0]))
	}
	u.println()
	for _, msg := range message[1:] {
		u.print(color.New(barColor, color.Bold).Sprint("|  "))
		u.println(color.New(color.FgHiBlack).Sprint(msg))
	}
	u.hasProgress = true
}

func (u *UI) Destroy() {
	u.footer.Quit()
	u.footer.Wait()
}

func (u *UI) Header(version, app, stage string) {
	u.println(
		color.New(color.FgCyan, color.Bold).Sprint("SST ❍ ion "+version),
		color.New(color.FgHiBlack).Sprint(" ready!"),
	)
	u.blank()
	u.println(
		color.New(color.FgCyan, color.Bold).Sprint("➜  "),
		color.New(color.FgWhite, color.Bold).Sprintf("%-12s", "App:"),
		color.New(color.FgHiBlack).Sprint(app),
	)
	u.println(
		color.New(color.FgWhite, color.Bold).Sprintf("   %-12s", "Stage:"),
		color.New(color.FgHiBlack).Sprint(stage),
	)

	if u.mode == ProgressModeDev {
		u.println(
			color.New(color.FgWhite, color.Bold).Sprintf("   %-12s", "Console:"),
			color.New(color.FgHiBlack).Sprint("https://console.sst.dev/local/"+app+"/"+stage),
		)
	}
	u.blank()
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

func Success(msg string) {
	os.Stderr.WriteString(color.New(color.FgGreen, color.Bold).Sprint(IconCheck + "  "))
	os.Stderr.WriteString(color.New(color.FgWhite).Sprintln(msg))
}

func Error(msg string) {
	os.Stderr.WriteString(color.New(color.FgRed, color.Bold).Sprint(IconX + "  "))
	os.Stderr.WriteString(color.New(color.FgWhite).Sprintln(msg))
}

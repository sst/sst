package ui

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
	"unicode"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/sst/ion/cmd/sst/mosaic/aws"
	"github.com/sst/ion/pkg/project"
	"golang.org/x/crypto/ssh/terminal"
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
	IconCheck = "✔︎"
)

type UI struct {
	mode       ProgressMode
	pending    map[string]string
	dedupe     map[string]bool
	timing     map[string]time.Time
	parents    map[string]string
	colors     map[string]lipgloss.Style
	workerTime map[string]time.Time
	complete   *project.CompleteEvent
	skipped    int
	footer     *tea.Program
	buffer     []interface{}
	hasBlank   bool
}

type Options struct {
	Silent bool
}

type Option func(*Options)

func WithSilent(u *Options) {
	u.Silent = true
}

func New(ctx context.Context, mode ProgressMode, options ...Option) *UI {
	opts := &Options{}
	for _, option := range options {
		option(opts)
	}
	isTTY := terminal.IsTerminal(int(os.Stdout.Fd()))
	slog.Info("initializing ui", "isTTY", isTTY)
	result := &UI{
		mode:       mode,
		colors:     map[string]lipgloss.Style{},
		workerTime: map[string]time.Time{},
		hasBlank:   false,
	}
	if isTTY && !opts.Silent {
		result.footer = NewFooter(mode)
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
	if u.footer == nil {
		fmt.Println(fmt.Sprint(u.buffer...))
	}
	if u.footer != nil {
		// u.footer.Send(lineMsg(fmt.Sprint(u.buffer...)))
		u.footer.Printf(fmt.Sprint(u.buffer...))
	}
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
	u.skipped = 0
	u.complete = nil
	u.parents = map[string]string{}
	u.pending = map[string]string{}
	u.dedupe = map[string]bool{}
	u.timing = map[string]time.Time{}
	u.buffer = []interface{}{}
}

func (u *UI) Event(unknown interface{}) {
	if u.footer != nil {
		defer u.footer.Send(unknown)
	}
	switch evt := unknown.(type) {

	case *aws.FunctionInvokedEvent:
		u.workerTime[evt.WorkerID] = time.Now()
		u.printEvent(u.getColor(evt.WorkerID), TEXT_NORMAL_BOLD.Render(fmt.Sprintf("%-11s", "Invoke")), u.functionName(evt.FunctionID))

	case *aws.FunctionResponseEvent:
		duration := time.Since(u.workerTime[evt.WorkerID]).Round(time.Millisecond)
		formattedDuration := fmt.Sprintf("took %.9s", fmt.Sprintf("+%v", duration))
		u.printEvent(u.getColor(evt.WorkerID), "Done", formattedDuration)

	case *aws.FunctionLogEvent:
		duration := time.Since(u.workerTime[evt.WorkerID]).Round(time.Millisecond)
		formattedDuration := fmt.Sprintf("%.9s", fmt.Sprintf("+%v", duration))
		u.printEvent(u.getColor(evt.WorkerID), formattedDuration, evt.Line)

	case *aws.FunctionBuildEvent:
		if len(evt.Errors) > 0 {
			u.printEvent(TEXT_DANGER, "Build Error", u.functionName(evt.FunctionID))
			for _, item := range evt.Errors {
				u.printEvent(TEXT_DANGER, "", "↳ "+strings.TrimSpace(item))
			}
			return
		}
		u.printEvent(TEXT_SUCCESS, "Build", u.functionName(evt.FunctionID))

	case *aws.FunctionErrorEvent:
		u.printEvent(u.getColor(evt.WorkerID), TEXT_DANGER.Render(fmt.Sprintf("%-11s", "Error")), u.functionName(evt.FunctionID))
		u.printEvent(u.getColor(evt.WorkerID), "", evt.ErrorMessage)
		for _, item := range evt.Trace {
			if strings.Contains(item, "Error:") {
				continue
			}
			u.printEvent(u.getColor(evt.WorkerID), "", "↳ "+strings.TrimSpace(item))
		}

	case *project.ConcurrentUpdateEvent:
		u.printEvent(TEXT_DANGER, "Locked", "A concurrent update was detected on the app. Run `sst unlock` to remove the lock and try again.")

	case *project.StackCommandEvent:
		u.blank()
		if evt.Command == "deploy" {
			u.println(
				TEXT_WARNING_BOLD.Render("~"),
				TEXT_NORMAL_BOLD.Render("  Deploying"),
			)
		}
		if evt.Command == "remove" {
			u.println(
				TEXT_DANGER_BOLD.Render("~"),
				TEXT_NORMAL_BOLD.Render("  Removing"),
			)
		}
		if evt.Command == "refresh" {
			u.println(
				TEXT_INFO_BOLD.Render("~"),
				TEXT_NORMAL_BOLD.Render("  Refreshing"),
			)
		}
		u.blank()

	case *project.BuildFailedEvent:
		u.printEvent(TEXT_DANGER, "Error", evt.Error)

	case *apitype.ResourcePreEvent:
		u.timing[evt.Metadata.URN] = time.Now()
		if evt.Metadata.Type == "pulumi:pulumi:Stack" {
			return
		}

		if evt.Metadata.Old != nil && evt.Metadata.Old.Parent != "" {
			u.parents[evt.Metadata.URN] = evt.Metadata.Old.Parent
		}

		if evt.Metadata.New != nil && evt.Metadata.New.Parent != "" {
			u.parents[evt.Metadata.URN] = evt.Metadata.New.Parent
		}

		if evt.Metadata.Op == apitype.OpSame {
			// Do not print anything for skipped resources
			if u.mode == ProgressModeDeploy || u.mode == ProgressModeDev {
				u.skipped++
			}
			return
		}

	case *apitype.ResOutputsEvent:
		if evt.Metadata.Type == "pulumi:pulumi:Stack" {
			return
		}

		duration := time.Since(u.timing[evt.Metadata.URN]).Round(time.Millisecond)
		if evt.Metadata.Op == apitype.OpSame && u.mode == ProgressModeRefresh {
			u.printProgress(
				TEXT_SUCCESS,
				"Refreshed",
				duration,
				evt.Metadata.URN,
			)
			return
		}
		if evt.Metadata.Op == apitype.OpCreate {
			u.printProgress(
				TEXT_SUCCESS,
				"Created",
				duration,
				evt.Metadata.URN,
			)
		}
		if evt.Metadata.Op == apitype.OpUpdate {
			u.printProgress(
				TEXT_SUCCESS,
				"Updated",
				duration,
				evt.Metadata.URN,
			)
		}
		if evt.Metadata.Op == apitype.OpDelete {
			u.printProgress(
				TEXT_DIM,
				"Deleted",
				duration,
				evt.Metadata.URN,
			)
		}
		if evt.Metadata.Op == apitype.OpDeleteReplaced {
			u.printProgress(
				TEXT_DIM,
				"Deleted",
				duration,
				evt.Metadata.URN,
			)
		}
		if evt.Metadata.Op == apitype.OpCreateReplacement {
			u.printProgress(
				TEXT_SUCCESS,
				"Created",
				duration,
				evt.Metadata.URN,
			)
		}
		if evt.Metadata.Op == apitype.OpReplace {
		}

	case *apitype.DiagnosticEvent:
		if evt.Severity == "error" {
			message := []string{u.formatURN(evt.URN)}
			message = append(message, parseError(evt.Message)...)
			u.printEvent(TEXT_DANGER, "Error", message...)
		}

		if evt.Severity == "info" {
			for _, line := range strings.Split(strings.TrimRightFunc(ansi.Strip(evt.Message), unicode.IsSpace), "\n") {
				u.printEvent(
					TEXT_DIM,
					"Log",
					line,
				)
			}
		}

		if evt.Severity == "info#err" {
			if strings.HasPrefix(evt.Message, "Downloading provider") {
				u.printEvent(TEXT_INFO, "Info", strings.TrimSpace(ansi.Strip(evt.Message)))
			} else {
				u.printEvent(
					TEXT_DIM,
					"Log",
					strings.TrimRightFunc(ansi.Strip(evt.Message), unicode.IsSpace),
				)
			}
		}

	case *project.CompleteEvent:
		if evt.Old {
			break
		}
		u.complete = evt
		u.blank()
		if len(evt.Errors) == 0 && evt.Finished {
			u.print(TEXT_SUCCESS_BOLD.Render(IconCheck))
			if len(u.timing) == 0 {
				if u.mode == ProgressModeRemove {
					u.print(TEXT_NORMAL_BOLD.Render("  No resources to remove"))
				} else {
					u.print(TEXT_NORMAL_BOLD.Render("  No changes"))
				}
			}
			if len(u.timing) > 0 {
				if u.mode == ProgressModeRemove {
					u.print(TEXT_NORMAL_BOLD.Render("  Removed"))
				}
				if u.mode == ProgressModeDeploy || u.mode == ProgressModeDev {
					u.print(TEXT_NORMAL_BOLD.Render("  Complete"))
				}
				if u.mode == ProgressModeRefresh {
					u.print(TEXT_NORMAL_BOLD.Render("  Refreshed"))
				}
			}
			u.println()
			if len(evt.Hints) > 0 {
				for k, v := range evt.Hints {
					splits := strings.Split(k, "::")
					u.println(
						TEXT_DIM_BOLD.Render("   "),
						TEXT_DIM_BOLD.Render(splits[len(splits)-1]+": "),
						TEXT_NORMAL.Render(v),
					)
				}
			}
			if len(evt.Outputs) > 0 {
				if len(evt.Hints) > 0 {
					u.println(TEXT_DIM_BOLD.Render("   ---"))
				}
				for k, v := range evt.Outputs {
					u.println(
						TEXT_DIM_BOLD.Render("   "),
						TEXT_DIM_BOLD.Render(k+": "),
						TEXT_NORMAL.Render(fmt.Sprint(v)),
					)
				}
			}
		}

		if len(evt.Errors) == 0 && !evt.Finished {
			u.println(
				TEXT_DANGER_BOLD.Render(IconX),
				TEXT_NORMAL_BOLD.Render("  Interrupted"),
			)
		}

		if len(evt.Errors) > 0 {
			u.println(
				TEXT_DANGER_BOLD.Render(IconX),
				TEXT_NORMAL_BOLD.Render("  Failed"),
			)

			for _, status := range evt.Errors {
				if status.URN != "" {
					u.println(TEXT_DANGER_BOLD.Render("   " + u.formatURN(status.URN)))
				}
				u.println(TEXT_NORMAL.Render("   " + strings.Join(parseError(status.Message), "\n   ")))
			}
		}

		u.blank()
	}

	// if evt.WorkerBuildEvent != nil {
	// 	if len(evt.WorkerBuildEvent.Errors) > 0 {
	// 		u.printEvent(TEXT_DANGER, "Build Error", u.functionName(evt.WorkerBuildEvent.WorkerID)+" "+strings.Join(evt.WorkerBuildEvent.Errors, "\n"))
	// 		return
	// 	}
	// 	u.printEvent(TEXT_INFO, "Build", u.functionName(evt.WorkerBuildEvent.WorkerID))
	// }
	// if evt.WorkerUpdatedEvent != nil {
	// 	u.printEvent(TEXT_INFO, "Reload", u.functionName(evt.WorkerUpdatedEvent.WorkerID))
	// }
	// if evt.WorkerInvokedEvent != nil {
	// 	url, _ := url.Parse(evt.WorkerInvokedEvent.TailEvent.Event.Request.URL)
	// 	u.printEvent(
	// 		u.getColor(evt.WorkerInvokedEvent.WorkerID),
	// 		TEXT_NORMAL_BOLD.Render(fmt.Sprintf("%-11s", "Invoke")),
	// 		u.functionName(evt.WorkerInvokedEvent.WorkerID)+" "+evt.WorkerInvokedEvent.TailEvent.Event.Request.Method+" "+url.Path,
	// 	)

	// 	for _, log := range evt.WorkerInvokedEvent.TailEvent.Logs {
	// 		duration := time.UnixMilli(log.Timestamp).Sub(time.UnixMilli(evt.WorkerInvokedEvent.TailEvent.EventTimestamp))
	// 		formattedDuration := fmt.Sprintf("%.9s", fmt.Sprintf("+%v", duration))

	// 		line := []string{}
	// 		for _, part := range log.Message {
	// 			switch v := part.(type) {
	// 			case string:
	// 				line = append(line, v)
	// 			case map[string]interface{}:
	// 				data, _ := json.Marshal(v)
	// 				line = append(line, string(data))
	// 			}
	// 		}

	// 		for _, item := range strings.Split(strings.Join(line, " "), "\n") {
	// 			u.printEvent(u.getColor(evt.WorkerInvokedEvent.WorkerID), formattedDuration, item)
	// 		}
	// 	}
	// 	u.printEvent(u.getColor(evt.WorkerInvokedEvent.WorkerID), "Done", evt.WorkerInvokedEvent.TailEvent.Outcome)
	// }
}

var COLORS = []lipgloss.Style{
	lipgloss.NewStyle().Foreground(lipgloss.Color("13")),
	lipgloss.NewStyle().Foreground(lipgloss.Color("14")),
	lipgloss.NewStyle().Foreground(lipgloss.Color("2")),
	lipgloss.NewStyle().Foreground(lipgloss.Color("12")),
}

func (u *UI) getColor(input string) lipgloss.Style {
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

func (u *UI) printProgress(barColor lipgloss.Style, label string, duration time.Duration, urn string) {
	message := u.formatURN(urn)
	if duration > time.Second {
		message += fmt.Sprintf(" (%.1fs)", duration.Seconds())
	}
	u.printEvent(barColor, label, message)
}

func (u *UI) printEvent(barColor lipgloss.Style, label string, message ...string) {
	u.print(barColor.Copy().Bold(true).Render("|  "))
	if label != "" {
		u.print(TEXT_DIM.Render(fmt.Sprint(fmt.Sprintf("%-11s", label), " ")))
	}
	if len(message) > 0 {
		u.print(TEXT_DIM.Render(message[0]))
	}
	u.println()
	for _, msg := range message[1:] {
		u.print(barColor.Copy().Bold(true).Render("|  "))
		u.println(TEXT_DIM.Render(msg))
	}
}

func (u *UI) Destroy() {
	if u.footer != nil {
		u.footer.Quit()
		slog.Info("waiting for footer to quit")
		u.footer.Wait()
	}
}

func (u *UI) Header(version, app, stage string) {
	u.println(
		TEXT_HIGHLIGHT_BOLD.Render("SST ❍ ion "+version),
		TEXT_DIM.Render("  ready!"),
	)
	u.blank()
	u.println(
		TEXT_HIGHLIGHT_BOLD.Render("➜  "),
		TEXT_NORMAL_BOLD.Render(fmt.Sprintf("%-12s", "App:")),
		TEXT_DIM.Render(app),
	)
	u.println(
		TEXT_NORMAL_BOLD.Render(fmt.Sprintf("   %-12s", "Stage:")),
		TEXT_DIM.Render(stage),
	)

	if u.mode == ProgressModeDev {
		u.println(
			TEXT_NORMAL_BOLD.Render(fmt.Sprintf("   %-12s", "Console:")),
			TEXT_DIM.Render("https://console.sst.dev/local/"+app+"/"+stage),
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
	fmt.Fprint(os.Stderr, strings.TrimSpace(TEXT_SUCCESS_BOLD.Render(IconCheck)+" "+TEXT_NORMAL.Render(fmt.Sprintln(msg))))
}

func Error(msg string) {
	fmt.Fprint(os.Stderr, strings.TrimSpace(TEXT_DANGER_BOLD.Render(IconX)+" "+TEXT_NORMAL.Render(fmt.Sprintln(msg))))
}

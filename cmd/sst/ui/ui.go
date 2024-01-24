package ui

import (
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/sst/ion/pkg/project"
)

type ProgressMode string

const (
	ProgressModeDev     ProgressMode = "dev"
	ProgressModeDeploy  ProgressMode = "deploy"
	ProgressModeRemove  ProgressMode = "remove"
	ProgressModeRefresh ProgressMode = "refresh"
)

type UI struct {
	spinner     *spinner.Spinner
	mode        ProgressMode
	hasProgress bool
	pending     map[string]string
	dedupe      map[string]bool
	timing      map[string]time.Time
	hints       map[string]string
	footer      string
}

func New(mode ProgressMode) *UI {
	result := &UI{
		spinner: spinner.New(spinner.CharSets[14], 100*time.Millisecond),
		mode:    mode,
	}
	result.Reset()
	return result
}

func (u *UI) Reset() {
	u.hasProgress = false
	u.hints = map[string]string{}
	u.pending = map[string]string{}
	u.dedupe = map[string]bool{}
	u.timing = map[string]time.Time{}
}

func (u *UI) Trigger(evt *project.StackEvent) {
	if evt.SummaryEvent != nil {
		u.spinner.Suffix = "  Finalizing..."
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

		if evt.ResourcePreEvent.Metadata.Op == apitype.OpSame {
			u.printProgress(Progress{
				Color: color.FgHiBlack,
				Label: "Skipped",
				Final: true,
				URN:   evt.ResourcePreEvent.Metadata.URN,
			})
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

		if evt.ResOutputsEvent.Metadata.Type == "sst:sst:Nextjs" && evt.ResOutputsEvent.Metadata.Op == apitype.OpCreate {
			u.footer = "🎉 Congrats on your new site!" + color.New(color.FgHiBlack).Sprintf(" (DNS could take a few mins)")
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
				Color:    color.FgRed,
				Label:    "Deleted",
				Final:    true,
				URN:      evt.ResOutputsEvent.Metadata.URN,
				Duration: duration,
			})
		}
		if evt.ResOutputsEvent.Metadata.Op == apitype.OpDeleteReplaced {
			u.printProgress(Progress{
				Color:    color.FgRed,
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
			msg := strings.TrimSpace(evt.DiagnosticEvent.Message)
			u.printProgress(Progress{
				URN:     evt.DiagnosticEvent.URN,
				Color:   color.FgRed,
				Final:   true,
				Label:   "Error",
				Message: msg,
			})
		}

		if evt.DiagnosticEvent.Severity == "info" {
			u.spinner.Disable()
			fmt.Println(strings.TrimRight(evt.DiagnosticEvent.Message, " \n"))
			u.spinner.Enable()
		}

		if evt.DiagnosticEvent.Severity == "info#err" {
			u.spinner.Disable()
			fmt.Println(strings.TrimRight(evt.DiagnosticEvent.Message, " \n"))
			u.spinner.Enable()
		}
	}

	if evt.CompleteEvent != nil {
		u.spinner.Disable()
		defer fmt.Println()
		if u.hasProgress {
			fmt.Println()
		}
		if len(evt.CompleteEvent.Errors) == 0 && evt.CompleteEvent.Finished {
			color.New(color.FgGreen, color.Bold).Print("✔")
			color.New(color.FgWhite, color.Bold).Println("  Complete")
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
			color.New(color.FgRed, color.Bold).Print("\n❌")
			color.New(color.FgWhite, color.Bold).Println(" Interrupted")
			return
		}

		color.New(color.FgRed, color.Bold).Print("\n❌")
		color.New(color.FgWhite, color.Bold).Println(" Failed")

		for _, status := range evt.CompleteEvent.Errors {
			if status.URN != "" {
				color.New(color.FgRed, color.Bold).Println("   " + formatURN(status.URN))
			}
			color.New(color.FgWhite).Println(status.Message)
		}
	}
}

func (u *UI) Interrupt() {
	u.spinner.Suffix = "  Interrupting..."
}

func (u *UI) Destroy() {
	u.spinner.Disable()
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
	fmt.Println()
}

func (u *UI) Changes() {
	color.New(color.FgYellow, color.Bold).Print("~")
	color.New(color.FgWhite, color.Bold).Println("  Deploying changes")
	fmt.Println()
}

func (u *UI) Start() {
	u.spinner.Start()
	if u.mode == ProgressModeRemove {
		u.spinner.Suffix = "  Removing..."
	}
	if u.mode == ProgressModeDev {
		u.spinner.Suffix = "  Deploying..."
	}
	if u.mode == ProgressModeDeploy {
		u.spinner.Suffix = "  Deploying..."
	}
	if u.mode == ProgressModeRefresh {
		u.spinner.Suffix = "  Refreshing..."
	}
}

func formatURN(urn string) string {
	if urn == "" {
		return ""
	}
	splits := strings.Split(urn, "::")[2:]
	urn0 := splits[0]
	resourceName0 := splits[1]
	// convert sst:sst:Nextjs$aws:s3/bucket:Bucket::Files to Nextjs → Files
	urn1 := regexp.MustCompile(`sst:sst:([^$]+).*$`).ReplaceAllString(urn0, "$1")
	// convert aws:s3/bucket:Bucket to aws:s3:Bucket
	urn2 := regexp.MustCompile(`\/[^:]+`).ReplaceAllString(urn1, "")
	// convert non:sst:Component$aws:s3:Bucket to non:sst:Component → aws:s3:Bucket
	urn3 := regexp.MustCompile(`\$`).ReplaceAllString(urn2, " → ")
	// convert pulumi:providers:aws to AWS Provider
	urn4 := regexp.MustCompile(`pulumi:providers:aws`).ReplaceAllString(urn3, "AWS Provider")
	// convert AwsProvider.sst.us-east-1 to Region us-east-1
	resourceName1 := regexp.MustCompile(`AwsProvider\.sst\.(.+)$`).ReplaceAllString(resourceName0, "Region $1")
	// convert WebServerCodeUpdater.sst.FunctionCodeUpdater to FunctionCodeUpdater
	resourceName2 := regexp.MustCompile(`([^\.]+)\.sst\..*$`).ReplaceAllString(resourceName1, "$1")
	return urn4 + " → " + resourceName2
}

type Progress struct {
	Color   color.Attribute
	Label   string
	URN     string
	Final   bool
	Message string
	time.Duration
}

func (u *UI) printProgress(progress Progress) {
	u.spinner.Disable()
	defer u.spinner.Enable()
	dedupeKey := progress.URN + progress.Label
	if u.dedupe[dedupeKey] {
		return
	}
	u.dedupe[dedupeKey] = true
	if !progress.Final && false {
		u.pending[progress.URN] =
			color.New(color.FgWhite).Sprintf("   %-11s %v", progress.Label, formatURN(progress.URN))
		suffix := "  Deploying...\n"
		for _, item := range u.pending {
			suffix += item + "\n"
		}
		u.spinner.Suffix = strings.TrimRight(suffix, "\n")
		return
	}

	color.New(progress.Color, color.Bold).Print("|  ")
	color.New(color.FgHiBlack).Print(fmt.Sprintf("%-11s", progress.Label), " ", formatURN(progress.URN))
	if progress.Duration != 0 {
		color.New(color.FgHiBlack).Printf(" (%s)", progress.Duration)
	}
	if progress.Message != "" {
		color.New(color.FgHiBlack).Print(" ", progress.Message)
	}
	fmt.Println()
	u.hasProgress = true
}

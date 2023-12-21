package ui

import (
	"fmt"
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
	ProgressModeDeploy  ProgressMode = "deploy"
	ProgressModeRemove  ProgressMode = "remove"
	ProgressModeRefresh ProgressMode = "refresh"
)

type UI struct {
	spinner  *spinner.Spinner
	mode     ProgressMode
	pending  map[string]string
	dedupe   map[string]bool
	timing   map[string]time.Time
	outputs  map[string]interface{}
	errors   []errorStatus
	complete bool
}

type errorStatus struct {
	Error string
	URN   string
}

func New(mode ProgressMode) *UI {
	result := &UI{
		spinner: spinner.New(spinner.CharSets[14], 100*time.Millisecond),
		pending: map[string]string{},
		dedupe:  map[string]bool{},
		timing:  map[string]time.Time{},
		outputs: map[string]interface{}{},
	}
	if mode == ProgressModeRemove {
		result.spinner.Suffix = "  Removing..."
	}
	if mode == ProgressModeDeploy {
		result.spinner.Suffix = "  Deploying..."
	}
	if mode == ProgressModeRefresh {
		result.spinner.Suffix = "  Refreshing..."
	}

	return result
}

func (u *UI) Trigger(evt *project.StackEvent) {
	if evt.SummaryEvent != nil {
		u.spinner.Suffix = "  Finalizing..."
		u.complete = true
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
		if evt.ResOutputsEvent.Metadata.Type == "pulumi:pulumi:Stack" && evt.ResOutputsEvent.Metadata.Op != apitype.OpDelete {
			u.outputs = evt.ResOutputsEvent.Metadata.New.Outputs
			return
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
			if evt.DiagnosticEvent.URN != "" {
				msg := evt.DiagnosticEvent.Message
				lines := strings.Split(evt.DiagnosticEvent.Message, "\n")
				if len(lines) > 2 {
					lines = strings.Split(lines[1], ":")
					msg = strings.TrimSpace(lines[len(lines)-1])
				}
				u.errors = append(u.errors, errorStatus{
					Error: msg,
					URN:   evt.DiagnosticEvent.URN,
				})
				u.printProgress(Progress{
					URN:     evt.DiagnosticEvent.URN,
					Color:   color.FgRed,
					Final:   true,
					Label:   "Error",
					Message: msg,
				})
				return
			}

			lines := strings.Split(evt.DiagnosticEvent.Message, "\n")
			out := []string{}
			for _, line := range lines {
				trimmed := strings.TrimSpace(line)
				if trimmed == "" {
					continue
				}
				if strings.HasPrefix(trimmed, "at") {
					trimmed = "   " + trimmed
				}
				out = append(out, trimmed)
			}
			if len(out) > 1 {
				u.errors = append(u.errors, errorStatus{
					Error: strings.Join(out, "\n"),
				})
			}
		}

		if evt.DiagnosticEvent.Severity == "info" {
			u.spinner.Disable()
			fmt.Println(strings.TrimSpace(evt.DiagnosticEvent.Message))
			u.spinner.Enable()
		}
	}
}

func (u *UI) Interrupt() {
	u.spinner.Suffix = "  Interrupting..."
}

func (u *UI) Finish() {
	u.spinner.Disable()
	if len(u.errors) == 0 && u.complete {
		color.New(color.FgGreen, color.Bold).Print("\n✔")

		if len(u.outputs) > 0 {
			color.New(color.FgWhite, color.Bold).Println("  Complete:")
			for k, v := range u.outputs {
				color.New(color.FgHiBlack).Print("   ")
				color.New(color.FgHiBlack, color.Bold).Print(k + ": ")
				color.New(color.FgWhite).Println(v)
			}
		} else {
			color.New(color.FgWhite, color.Bold).Println("  Complete")
		}
		return
	}

	if len(u.errors) == 0 && !u.complete {
		color.New(color.FgRed, color.Bold).Print("\n❌")
		color.New(color.FgWhite, color.Bold).Println(" Interrupted")
		return
	}

	color.New(color.FgRed, color.Bold).Print("\n❌")
	color.New(color.FgWhite, color.Bold).Println(" Failed:")

	for _, status := range u.errors {
		color.New(color.FgHiBlack).Print("   ")
		if status.URN != "" {
			color.New(color.FgRed, color.Bold).Print(formatURN(status.URN) + ": ")
		}
		color.New(color.FgWhite).Println(strings.TrimSpace(status.Error))
	}
}

func (u *UI) Destroy() {
	u.spinner.Disable()
}

func (u *UI) Header(version string, p *project.Project) {
	color.New(color.FgCyan, color.Bold).Print("SST ❍ ion " + version + "  ")
	color.New(color.FgHiBlack).Print("ready!\n")
	app := p.App()
	fmt.Println()
	color.New(color.FgCyan, color.Bold).Print("➜  ")

	color.New(color.FgWhite, color.Bold).Printf("%-12s", "App:")
	color.New(color.FgHiBlack).Println(app.Name)

	color.New(color.FgWhite, color.Bold).Printf("   %-12s", "Stage:")
	color.New(color.FgHiBlack).Println(app.Stage)

	fmt.Println()
	u.spinner.Start()
}

func formatURN(urn string) string {
	splits := strings.Split(urn, "::")[2:]
	urn0 := splits[0]
	resourceName0 := splits[1]
	// convert aws:s3/bucket:Bucket to aws:s3:Bucket
	urn1 := regexp.MustCompile(`\/[^:]+`).ReplaceAllString(urn0, "")
	// convert sst:sst:Nextjs to sst:Nextjs
	urn2 := regexp.MustCompile(`sst:sst:`).ReplaceAllString(urn1, "sst:")
	// convert pulumi-nodejs:dynamic:Resource to sst:xxxx
	urn3 := urn2
	resourceName1 := resourceName0
	resourceType := regexp.MustCompile(`\.sst\.(.+)$`).FindStringSubmatch(resourceName0)
	if regexp.MustCompile(`pulumi-nodejs:dynamic:Resource$`).MatchString(urn2) &&
		len(resourceType) > 1 {
		urn3 = regexp.MustCompile(`pulumi-nodejs:dynamic:Resource$`).ReplaceAllString(urn2, resourceType[1])
		resourceName1 = regexp.MustCompile(`\.sst\..+$`).ReplaceAllString(resourceName0, "")
	}
	urn4 := regexp.MustCompile(`\$`).ReplaceAllString(urn3, " → ")
	// convert Nextjs$aws:s3:Bucket to Nextjs → aws:s3:Bucket
	urn5 := regexp.MustCompile(`\$`).ReplaceAllString(urn4, " → ")
	return urn5 + " → " + resourceName1
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
	dedupeKey := progress.URN + progress.Label
	if u.dedupe[dedupeKey] {
		return
	}
	u.dedupe[dedupeKey] = true
	defer u.spinner.Enable()
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
}

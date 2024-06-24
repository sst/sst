package ui

import (
	"fmt"
	"os"
	"strings"
	"syscall"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/fatih/color"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/sst/ion/pkg/project"
)

type footer struct {
	spinner   spinner.Model
	mode      ProgressMode
	complete  *project.CompleteEvent
	parents   map[string]string
	summary   bool
	cancelled bool
	lines     []string
	pending   []*apitype.ResourcePreEvent
	skipped   int

	width  int
	height int
}

type op struct {
	urn string
}

func NewFooter() *tea.Program {
	f := footer{
		spinner: spinner.New(),
		lines:   []string{},
	}
	f.spinner.Spinner = spinner.MiniDot
	f.Reset()
	p := tea.NewProgram(f, tea.WithoutSignalHandler())
	go p.Run()
	return p
}

func (m footer) Init() tea.Cmd {
	return m.spinner.Tick
}

type lineMsg string

func (m *footer) Reset() {
	m.skipped = 0
	m.parents = map[string]string{}
	m.pending = []*apitype.ResourcePreEvent{}
	m.complete = nil
	m.summary = false
	m.cancelled = false
}

func (m footer) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	case lineMsg:
		m.lines = append(m.lines, string(msg))
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c":
			pid := os.Getpid()
			syscall.Kill(pid, syscall.SIGINT)
			m.cancelled = true
			break
		}
	case *project.StackEvent:
		if msg.StackCommandEvent != nil {
			m.Reset()
			cmds = append(cmds, tea.HideCursor)
			if msg.StackCommandEvent.Command == "refresh" {
				m.mode = ProgressModeRefresh
			}

			if msg.StackCommandEvent.Command == "remove" {
				m.mode = ProgressModeRemove
			}

			if msg.StackCommandEvent.Command == "deploy" {
				m.mode = ProgressModeDeploy
			}
		}

		if msg.CompleteEvent != nil {
			m.complete = msg.CompleteEvent
		}

		if msg.ResourcePreEvent != nil {
			if resource.URN(msg.ResourcePreEvent.Metadata.URN).Type().DisplayName() == "pulumi:pulumi:Stack" {
				break
			}
			if msg.ResourcePreEvent.Metadata.Old != nil && msg.ResourcePreEvent.Metadata.Old.Parent != "" {
				m.parents[msg.ResourcePreEvent.Metadata.URN] = msg.ResourcePreEvent.Metadata.Old.Parent
			}
			if msg.ResourcePreEvent.Metadata.New != nil && msg.ResourcePreEvent.Metadata.New.Parent != "" {
				m.parents[msg.ResourcePreEvent.Metadata.URN] = msg.ResourcePreEvent.Metadata.New.Parent
			}
			if msg.ResourcePreEvent.Metadata.Op == apitype.OpSame {
				m.skipped++
			}
			if msg.ResourcePreEvent.Metadata.Op != apitype.OpSame {
				m.pending = append(m.pending, msg.ResourcePreEvent)
			}
		}

		if msg.SummaryEvent != nil {
			m.summary = true
		}

		if msg.ResOutputsEvent != nil {
			for i, r := range m.pending {
				if r.Metadata.URN == msg.ResOutputsEvent.Metadata.URN {
					m.pending = append(m.pending[:i], m.pending[i+1:]...)
				}
			}
		}

		if msg.DiagnosticEvent != nil {
		}
	}

	var cmd tea.Cmd
	m.spinner, cmd = m.spinner.Update(msg)
	cmds = append(cmds, cmd)
	return m, tea.Batch(cmds...)
}

var TEXT_HIGHLIGHT = lipgloss.NewStyle().Foreground(lipgloss.Color("14"))
var TEXT_DIM = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
var TEXT_NORMAL = lipgloss.NewStyle().Foreground(lipgloss.Color("15"))
var TEXT_WARNING = lipgloss.NewStyle().Foreground(lipgloss.Color("11"))
var TEXT_DANGER = lipgloss.NewStyle().Foreground(lipgloss.Color("1"))
var TEXT_SUCCESS = lipgloss.NewStyle().Foreground(lipgloss.Color("2"))
var TEXT_INFO = lipgloss.NewStyle().Foreground(lipgloss.Color("4"))

func (m footer) View() string {
	result := []string{}
	for _, line := range m.lines {
		result = append(result, line)
	}
	if m.complete == nil {

		if m.complete == nil {
			for _, r := range m.pending {
				label := "Creating"
				if r.Metadata.Op == apitype.OpUpdate {
					label = "Updating"
				}
				if r.Metadata.Op == apitype.OpDelete {
					label = "Deleting"
				}
				if r.Metadata.Op == apitype.OpReplace {
					label = "Creating"
				}
				if r.Metadata.Op == apitype.OpRefresh {
					label = "Refreshing"
				}
				if r.Metadata.Op == apitype.OpCreate {
					label = "Creating"
				}
				result = append(result, fmt.Sprintf("%s  %-11s %s", m.spinner.View(), label, m.formatURN(r.Metadata.URN)))
			}
		}

		if (m.skipped > 0 || m.summary) && m.complete == nil {
			label := "Finalizing"
			if !m.summary {
				if m.mode == ProgressModeRemove {
					label = "Removing"
				}
				if m.mode == ProgressModeRefresh {
					label = "Refreshing"
				}
				if m.mode == ProgressModeDeploy {
					label = "Deploying"
				}
			}
			if m.skipped > 0 {
				label += fmt.Sprintf(" (%d skipped)...", m.skipped)
			}
			result = append(result, m.spinner.View()+"  "+label)
		}

		result = append(result, "")
	}
	return lipgloss.NewStyle().Width(m.width).Render(lipgloss.JoinVertical(lipgloss.Top, result...))
}

func (m footer) printEvent(barColor color.Attribute, label string, message string) {
	color.New(barColor, color.Bold).Print("|  ")
	if label != "" {
		color.New(color.FgHiBlack).Print(fmt.Sprintf("%-11s", label), " ")
	}
	color.New(color.FgHiBlack).Print(message)
	fmt.Println()
}

func (u *footer) formatURN(urn string) string {
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

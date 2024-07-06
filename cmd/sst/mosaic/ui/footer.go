package ui

import (
	"fmt"
	"log/slog"
	"os"
	"strings"
	"syscall"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/sst/ion/pkg/project"
)

type footer struct {
	spinner     spinner.Model
	mode        ProgressMode
	complete    *project.CompleteEvent
	parents     map[string]string
	summary     bool
	cancelled   bool
	lines       []string
	pending     []*apitype.ResourcePreEvent
	skipped     int
	exitConfirm bool

	width  int
	height int
}

type op struct {
	urn string
}

func NewFooter(mode ProgressMode) *tea.Program {
	slog.Info("initialized footer ui")
	f := footer{
		spinner: spinner.New(),
		lines:   []string{},
		mode:    mode,
	}
	f.spinner.Spinner = spinner.MiniDot
	f.Reset()
	p := tea.NewProgram(f,
		tea.WithFPS(16),
		tea.WithoutSignalHandler())
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
		case "esc":
			if m.exitConfirm {
				m.exitConfirm = false
			}
		case "ctrl+l":
			m.lines = []string{}
			cmds = append(cmds, tea.ClearScreen)
		case "ctrl+c":
			if m.exitConfirm || m.mode == ProgressModeDev {
				pid := os.Getpid()
				syscall.Kill(pid, syscall.SIGINT)
				m.cancelled = true
			}

			if !m.exitConfirm {
				m.exitConfirm = true
			}
			break
		}
	case *project.StackCommandEvent:
		m.Reset()
		cmds = append(cmds, tea.HideCursor)
	case *project.CompleteEvent:
		if msg.Old {
			break
		}
		m.complete = msg
	case *apitype.ResourcePreEvent:
		if resource.URN(msg.Metadata.URN).Type().DisplayName() == "pulumi:pulumi:Stack" {
			break
		}
		if msg.Metadata.Old != nil && msg.Metadata.Old.Parent != "" {
			m.parents[msg.Metadata.URN] = msg.Metadata.Old.Parent
		}
		if msg.Metadata.New != nil && msg.Metadata.New.Parent != "" {
			m.parents[msg.Metadata.URN] = msg.Metadata.New.Parent
		}
		if msg.Metadata.Op == apitype.OpSame {
			m.skipped++
		}
		if msg.Metadata.Op != apitype.OpSame {
			m.pending = append(m.pending, msg)
		}
	case *apitype.SummaryEvent:
		m.summary = true
	case *apitype.ResOutputsEvent:
		m.removePending(msg.Metadata.URN)
	case *apitype.DiagnosticEvent:
		if msg.URN != "" {
			m.removePending(msg.URN)
		}
	}

	var cmd tea.Cmd
	m.spinner, cmd = m.spinner.Update(msg)
	cmds = append(cmds, cmd)
	return m, tea.Batch(cmds...)
}

var TEXT_HIGHLIGHT = lipgloss.NewStyle().Foreground(lipgloss.Color("14"))
var TEXT_HIGHLIGHT_BOLD = TEXT_HIGHLIGHT.Copy().Bold(true)

var TEXT_DIM = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
var TEXT_DIM_BOLD = TEXT_DIM.Copy().Bold(true)

var TEXT_NORMAL = lipgloss.NewStyle().Foreground(lipgloss.Color("15"))
var TEXT_NORMAL_BOLD = TEXT_NORMAL.Copy().Bold(true)

var TEXT_WARNING = lipgloss.NewStyle().Foreground(lipgloss.Color("11"))
var TEXT_WARNING_BOLD = TEXT_WARNING.Copy().Bold(true)

var TEXT_DANGER = lipgloss.NewStyle().Foreground(lipgloss.Color("1"))
var TEXT_DANGER_BOLD = TEXT_DANGER.Copy().Bold(true)

var TEXT_SUCCESS = lipgloss.NewStyle().Foreground(lipgloss.Color("2"))
var TEXT_SUCCESS_BOLD = TEXT_SUCCESS.Copy().Bold(true)

var TEXT_INFO = lipgloss.NewStyle().Foreground(lipgloss.Color("4"))
var TEXT_INFO_BOLD = TEXT_INFO.Copy().Bold(true)

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
				if m.mode == ProgressModeDeploy || m.mode == ProgressModeDev {
					label = "Deploying"
				}
			}
			if m.skipped > 0 {
				label = fmt.Sprintf("%-11s [%d skipped]", label, m.skipped)
			}
			result = append(result, m.spinner.View()+"  "+label)
		}

		if m.exitConfirm {
			result = append(result, TEXT_DANGER_BOLD.Render("|  ")+"Press Ctrl+C again to exit")
		}
	}
	return lipgloss.NewStyle().Width(m.width).Render(lipgloss.JoinVertical(lipgloss.Top, result...))
}

func (u *footer) removePending(urn string) {
	next := []*apitype.ResourcePreEvent{}
	for _, r := range u.pending {
		if r.Metadata.URN == urn {
			continue
		}
		next = append(next, r)
	}
	u.pending = next
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

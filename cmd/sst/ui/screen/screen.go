package screen

import (
	"fmt"
	"io"
	"os/exec"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func Start() error {
	model := Root{
		processes: []*exec.Cmd{
			exec.Command("ping", "google.com"),
			exec.Command("ping", "yahoo.com"),
			exec.Command("node"),
		},
		stdin:    make([]io.WriteCloser, 3),
		stdout:   make([]string, 3),
		tab:      "sidebar",
		selected: 0,
	}
	p := tea.NewProgram(model, tea.WithAltScreen())
	for i, process := range model.processes {
		stdout, _ := process.StdoutPipe()
		stdin, _ := process.StdinPipe()
		process.Start()
		go func(i int, stdout io.ReadCloser) {
			for {
				buf := make([]byte, 1024)
				n, err := stdout.Read(buf)
				if err != nil {
					return
				}
				model.stdout[i] += string(buf[:n])
				p.Send(1)
			}
		}(i, stdout)
		model.stdin[i] = stdin
	}
	_, err := p.Run()
	return err
}

type Root struct {
	width     int
	height    int
	processes []*exec.Cmd
	stdin     []io.WriteCloser
	stdout    []string
	selected  int
	tab       string
}

func (m Root) Init() tea.Cmd {
	return nil
}

func (m Root) Update(raw tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := raw.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit
		case "left", "h":
			if m.tab != "main" {
				m.tab = "main"
			} else {
				m.tab = "sidebar"
			}
		case "right", "l":
			if m.tab != "sidebar" {
				m.tab = "sidebar"
			} else {
				m.tab = "main"
			}
		case "j", "down":
			if m.tab == "sidebar" {
				m.selected++
				if m.selected >= len(m.processes) {
					m.selected = 0
				}
			}
		case "k", "up":
			if m.tab == "sidebar" {
				m.selected--
				if m.selected < 0 {
					m.selected = len(m.processes) - 1
				}
			}
		default:
			if m.tab == "main" {
				m.stdin[m.selected].Write([]byte(msg.String()))
			}
		}

	}
	return m, nil
}

func (m Root) View() string {
	return m.sidebarView()
}

func (m Root) sidebarView() string {
	width := 0
	choices := make([]string, len(m.processes))
	for i, process := range m.processes {
		name := process.Path
		choices[i] = name
		if len(name) > width {
			width = len(name)
		}
	}
	width += 10
	selectedColor := SidebarStyleInactiveSelected
	if m.tab == "sidebar" {
		selectedColor = SidebarStyleActiveSelected
	}
	for i, choice := range choices {
		s := SidebarStyleChoice
		if i == m.selected {
			s = selectedColor
		}
		choices[i] = s.Width(width).Render(fmt.Sprintf("(%d)", i), "+", choice)
	}

	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		lipgloss.
			NewStyle().
			Height(m.height).
			BorderStyle(lipgloss.NormalBorder()).
			BorderRight(true).
			Render(lipgloss.JoinVertical(
				lipgloss.Left,
				choices...,
			)),
		lipgloss.NewStyle().MaxWidth(m.width-width).MaxHeight(m.height).AlignVertical(lipgloss.Bottom).Render(m.stdout[m.selected]),
	)

}

var ColorForeground = lipgloss.AdaptiveColor{Light: "16", Dark: "231"}
var ColorForegroundInverted = lipgloss.AdaptiveColor{Light: "231", Dark: "16"}
var ColorHighlight = lipgloss.AdaptiveColor{Light: "208", Dark: "203"}
var ColorSecondary = lipgloss.AdaptiveColor{Light: "242", Dark: "242"}

var SidebarStyleChoice = lipgloss.NewStyle().Foreground(ColorForeground)
var SidebarStyleActiveSelected = lipgloss.NewStyle().Background(ColorHighlight).Foreground(ColorForegroundInverted)
var SidebarStyleInactiveSelected = lipgloss.NewStyle().Background(ColorSecondary).Foreground(ColorForegroundInverted)

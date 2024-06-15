package screen

import (
	"fmt"
	"io"
	"os/exec"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func Start() error {
	model := Root{
		processes: []*exec.Cmd{
			exec.Command("ping", "-i", "0.1", "google.com"),
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
	if m.width == 0 || m.height == 0 {
		return ""
	}
	heightPadding := 1
	widthPadding := 3
	height := m.height - heightPadding*2

	sidebar := m.ViewSidebar()
	sidebarWidth := lipgloss.Width(sidebar)

	mainWidth := m.width - widthPadding*2 - sidebarWidth
	main := m.ViewMain(mainWidth, height)
	lines := strings.Split(lipgloss.NewStyle().Width(mainWidth).Render(
		m.stdout[m.selected],
	), "\n")
	if len(lines) < height {
		padding := height - len(lines)
		for i := 0; i < padding; i++ {
			lines = append(lines, "")
		}
	}
	if len(lines) > height {
		lines = lines[len(lines)-height-1:]
	}

	return lipgloss.
		NewStyle().
		MaxWidth(m.width).
		MaxHeight(m.height).
		Padding(heightPadding, widthPadding).
		Render(
			lipgloss.JoinHorizontal(
				lipgloss.Top,
				lipgloss.NewStyle().Width(sidebarWidth).Render(sidebar),
				"   ",
				lipgloss.NewStyle().Width(mainWidth).MaxHeight(height).Render(main),
			),
		)
}

func (m Root) ViewMain(width, height int) string {
	lines := strings.Split(lipgloss.NewStyle().Width(width).Render(m.stdout[m.selected]), "\n")
	return strings.Join(lines, "\n")
	return m.stdout[m.selected]
}

func (m Root) ViewSidebar() string {
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

	return lipgloss.JoinVertical(
		lipgloss.Left,
		choices...,
	)
}

var ColorForeground = lipgloss.AdaptiveColor{Light: "16", Dark: "231"}
var ColorForegroundInverted = lipgloss.AdaptiveColor{Light: "231", Dark: "16"}
var ColorHighlight = lipgloss.AdaptiveColor{Light: "208", Dark: "203"}
var ColorSecondary = lipgloss.AdaptiveColor{Light: "242", Dark: "242"}

var SidebarStyleChoice = lipgloss.NewStyle().Foreground(ColorForeground)
var SidebarStyleActiveSelected = lipgloss.NewStyle().Background(ColorHighlight).Foreground(ColorForegroundInverted)
var SidebarStyleInactiveSelected = lipgloss.NewStyle().Background(ColorSecondary).Foreground(ColorForegroundInverted)

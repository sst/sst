package screen

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/liamg/termutil/pkg/termutil"
)

var width = uint16(100)
var height = uint16(50)

func Start() error {
	model := Root{
		processes: []string{
			"zsh",
			"top",
		},
		terminals: []*termutil.Terminal{},
		tab:       "sidebar",
		selected:  0,
	}
	for range model.processes {
		term := termutil.New()
		model.terminals = append(model.terminals, term)
	}
	p := tea.NewProgram(model, tea.WithAltScreen())
	for index, proc := range model.processes {
		term := model.terminals[index]
		updateChan := make(chan struct{}, 1)
		go func() {
			for {
				select {
				case <-updateChan:
					p.Send(TerminalUpdateMsg{})
				}
			}
		}()
		go term.Run(proc, updateChan, height, width)
	}
	_, err := p.Run()
	return err
}

type Root struct {
	width     int
	height    int
	processes []string
	terminals []*termutil.Terminal
	selected  int
	tab       string
}

type TerminalUpdateMsg struct {
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

	sidebar := m.ViewSidebar()
	sidebarWidth := lipgloss.Width(sidebar)
	main := m.ViewMain()

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
				main,
			),
		)
}

func (m Root) ViewMain() string {
	if len(m.terminals) == 0 {
		return ""
	}
	term := m.terminals[m.selected]
	buf := term.GetActiveBuffer()
	result := ""
	for y := uint16(0); y < height; y++ {
		for x := uint16(0); x < width; x++ {
			cell := buf.GetCell(x, y)
			if cell != nil {
				result += string(cell.Rune().Rune)
			}
		}

		result += "\n"
	}
	return result
}

func (m Root) ViewSidebar() string {
	width := 0
	choices := make([]string, len(m.processes))
	for i, process := range m.processes {
		name := process
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

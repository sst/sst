package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	tcellterm "git.sr.ht/~rockorager/tcell-term"
	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
)

type model struct {
	screen tcell.Screen

	focus    string
	selected int

	commands []string
	vts      []*tcellterm.VT

	main          *views.ViewPort
	sidebar       *views.ViewPort
	sidebarWidget *views.BoxLayout
}

var PAD_HEIGHT = 1
var PAD_WIDTH = 2
var SIDEBAR_WIDTH = 20

// Update is the main event handler. It should only be called by the main thread
func (m *model) Update(ev tcell.Event) {
	switch ev := ev.(type) {
	case *tcell.EventKey:
		switch ev.Key() {
		case tcell.KeyCtrlC:
			if m.focus == "sidebar" {
				for _, vt := range m.vts {
					vt.Close()
				}
				m.screen.Fini()
				return
			}

		case tcell.KeyDown:
			if m.focus == "sidebar" {
				m.SidebarMove(1)
				m.Draw()
				m.screen.Show()
			}
		case tcell.KeyUp:
			if m.focus == "sidebar" {
				m.SidebarMove(-1)
				m.Draw()
				m.screen.Show()
				return
			}

		case tcell.KeyEscape:
			if m.focus == "main" {
				m.focus = "sidebar"
				m.Draw()
				m.screen.Show()
				return
			}

		case tcell.KeyEnter:
			if m.focus == "sidebar" {
				m.focus = "main"
				m.SidebarMove(0)
				m.Draw()
				m.screen.Show()
				return
			}
		}

		if m.focus == "main" {
			m.vts[m.selected].HandleEvent(ev)
			m.vts[m.selected].Draw()
		}

	case *tcell.EventResize:
		m.Resize(ev.Size())
		m.Draw()
		m.screen.Sync()
		return

	case *tcellterm.EventRedraw:
		m.Draw()
		m.screen.Show()
		return

	case *tcellterm.EventClosed:
		m.screen.Clear()
		m.screen.Fini()
		return

	case *tcell.EventPaste:
		m.vts[m.selected].HandleEvent(ev)
		return

	case *tcellterm.EventPanic:
		m.screen.Clear()
		m.screen.Fini()
		fmt.Println(ev.Error)
	}
	return
}

// HandleEvent is used to handle events from underlying widgets. Any events
// which redraw must be executed in the main goroutine by posting the event back
// to tcell
func (m *model) HandleEvent(ev tcell.Event) {
	m.screen.PostEvent(ev)
}

func main() {
	f, _ := os.Create("recording.log")
	log.SetOutput(f)
	var err error
	m := &model{
		focus:    "sidebar",
		vts:      []*tcellterm.VT{},
		commands: []string{"zsh", "top"},
	}
	m.screen, err = tcell.NewScreen()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
	if err = m.screen.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
	m.screen.EnablePaste()

	m.sidebar = views.NewViewPort(m.screen, 0, 0, 0, 0)
	m.main = views.NewViewPort(m.screen, 0, 0, 0, 0)

	stack := views.NewBoxLayout(views.Vertical)
	stack.SetView(m.sidebar)
	m.sidebarWidget = stack
	m.Resize(m.screen.Size())

	for _, cmd := range m.commands {
		term := tcellterm.New()
		term.SetSurface(m.main)
		term.Attach(m.HandleEvent)
		term.Logger = log.New(f, "", log.Flags())
		cmd := exec.Command(cmd)
		err = term.Start(cmd)
		m.vts = append(m.vts, term)
	}

	for {
		ev := m.screen.PollEvent()
		if ev == nil {
			break
		}
		m.Update(ev)
	}
}

func (m *model) Draw() {
	vt := m.vts[m.selected]
	vt.Draw()
	m.DrawCursor()
	for _, w := range m.sidebarWidget.Widgets() {
		m.sidebarWidget.RemoveWidget(w)
	}

	for index, item := range m.commands {
		title := views.NewTextBar()
		if index == m.selected {
			bg := tcell.ColorGray
			if m.focus == "sidebar" {
				bg = tcell.ColorOrangeRed
			}
			title.SetStyle(tcell.StyleDefault.Background(bg).Foreground(tcell.ColorWhite))
		}
		title.SetLeft(" "+item, tcell.StyleDefault)
		m.sidebarWidget.AddWidget(title, 0)
	}
	m.sidebarWidget.Draw()
}

func (m *model) Resize(width int, height int) {
	m.sidebar.Resize(PAD_WIDTH, PAD_HEIGHT, SIDEBAR_WIDTH, height-PAD_HEIGHT*2)
	m.main.Resize(PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH, PAD_HEIGHT, width-PAD_WIDTH-SIDEBAR_WIDTH-PAD_WIDTH-PAD_WIDTH, height-PAD_HEIGHT*2)
}

func (m *model) DrawCursor() {
	if m.focus == "sidebar" {
		log.Println("hide cursor")
		m.screen.HideCursor()
		return
	}
	if m.focus == "main" {
		row, col, style, vis := m.vts[m.selected].Cursor()
		log.Println("setting cursor", row, col, vis)
		if vis {
			m.screen.SetCursorStyle(style)
			m.screen.ShowCursor(col+PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH, row+PAD_HEIGHT)
		} else {
			m.screen.HideCursor()
		}
	}
}

func (m *model) SidebarMove(offset int) {
	m.selected += offset
	if m.selected < 0 {
		m.selected = 0
	}

	if m.selected >= len(m.commands) {
		m.selected = len(m.commands) - 1
	}

}

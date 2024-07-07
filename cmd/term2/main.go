package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"reflect"
	"time"

	tcellterm "git.sr.ht/~rockorager/tcell-term"
	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
)

type model struct {
	screen tcell.Screen

	focus    string
	selected int

	panes []*pane

	main          *views.ViewPort
	sidebar       *views.ViewPort
	sidebarWidget *views.BoxLayout
}

type PaneStatus int

const (
	PaneStatusRunning PaneStatus = iota
	PaneStatusStopped
	PaneStatusClearing
)

type pane struct {
	vt     *tcellterm.VT
	args   []string
	status PaneStatus
	title  string
	cmd    *exec.Cmd
}

func (p *pane) Start() error {
	if p.status == PaneStatusStopped {
		p.status = PaneStatusClearing
		p.vt.Start(exec.Command("clear"))
		return nil
	}
	cmd := exec.Command(p.args[0], p.args[1:]...)
	err := p.vt.Start(cmd)
	if err != nil {
		log.Println(err)
		return err
	}
	p.status = PaneStatusRunning
	return nil
}

func (p *pane) Restart() error {
	p.vt.Close()
	return nil
}

func (p *pane) Kill() error {
	p.vt.Close()
	return nil
}

var PAD_HEIGHT = 1
var PAD_WIDTH = 2
var SIDEBAR_WIDTH = 20

// Update is the main event handler. It should only be called by the main thread
func (m *model) Update(ev tcell.Event) {
	log.Println(reflect.TypeOf(ev))
	switch ev := ev.(type) {
	case *tcell.EventKey:
		switch ev.Key() {
		case 256:
			switch ev.Rune() {
			case 'k':
				if m.focus == "sidebar" {
					m.SelectedPane().Kill()
					return
				}
			case 'r':
				if m.focus == "sidebar" {
					if m.SelectedPane().status == PaneStatusRunning {
						m.SelectedPane().Restart()
					}
					if m.SelectedPane().status == PaneStatusStopped {
						m.SelectedPane().Start()
					}
					m.Draw()
					return
				}
			}
		case tcell.KeyCtrlC:
			if m.focus == "sidebar" {
				for _, p := range m.panes {
					p.vt.Close()
				}
				m.screen.Fini()
				return
			}

		case tcell.KeyDown:
			if m.focus == "sidebar" {
				m.SidebarMove(1)
				m.Draw()
			}
		case tcell.KeyUp:
			if m.focus == "sidebar" {
				m.SidebarMove(-1)
				m.Draw()
				return
			}

		case tcell.KeyCtrlZ:
			if m.focus == "main" {
				m.focus = "sidebar"
				m.Draw()
				return
			}

		case tcell.KeyEnter:
			if m.focus == "sidebar" {
				selected := m.SelectedPane()
				if selected.status == PaneStatusRunning {
					m.focus = "main"
				}

				if selected.status == PaneStatusStopped {
					selected.Start()
					m.main.Clear()
					m.screen.Show()
				}

				m.Draw()
				return
			}
		}

		if m.focus == "main" {
			m.panes[m.selected].vt.HandleEvent(ev)
			m.panes[m.selected].vt.Draw()
		}

	case *tcell.EventResize:
		m.Resize(ev.Size())
		m.Draw()
		m.screen.Sync()
		return

	case *tcellterm.EventRedraw:
		m.Draw()
		return

	case *tcellterm.EventClosed:
		for index, pane := range m.panes {
			if pane.vt == ev.VT() {

				if pane.status == PaneStatusRunning {
					pane.status = PaneStatusStopped
					if index == m.selected {
						m.focus = "sidebar"
					}
				}

				if pane.status == PaneStatusClearing {
					p := pane
					go func() {
						time.Sleep(100 * time.Millisecond)
						p.Start()
						m.screen.PostEvent(&tcellterm.EventRedraw{})
					}()
				}
			}
		}
		m.Draw()
		return

	case *tcell.EventPaste:
		if m.focus == "main" {
			m.panes[m.selected].vt.HandleEvent(ev)
		}
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
	var err error
	m := &model{
		focus: "sidebar",
		panes: []*pane{},
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

	for _, args := range [][]string{
		{"ping", "google.com"},
		{"zsh"},
	} {
		term := tcellterm.New()
		term.SetSurface(m.main)
		term.Attach(m.HandleEvent)
		p := &pane{
			vt:    term,
			args:  args,
			title: args[0],
		}
		p.Start()
		m.panes = append(m.panes, p)
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
	m.SelectedPane().vt.Draw()
	m.DrawCursor()
	for _, w := range m.sidebarWidget.Widgets() {
		m.sidebarWidget.RemoveWidget(w)
	}

	for index, item := range m.panes {
		title := views.NewTextBar()
		style := tcell.StyleDefault
		if index == m.selected {
			style = style.Background(tcell.ColorGray)
			if m.focus == "sidebar" {
				style = style.Background(tcell.ColorOrangeRed)
			}
			style = style.Foreground(tcell.ColorWhite)
		}

		text := item.title
		title.SetStyle(style)
		title.SetLeft(" "+text, tcell.StyleDefault)
		if item.status == PaneStatusStopped {
			title.SetRight("(-)", tcell.StyleDefault)
		}
		m.sidebarWidget.AddWidget(title, 0)
	}
	m.sidebarWidget.Draw()

	m.screen.Show()
}

func (m *model) Resize(width int, height int) {
	m.sidebar.Resize(PAD_WIDTH, PAD_HEIGHT, SIDEBAR_WIDTH, height-PAD_HEIGHT*2)
	m.main.Resize(PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH, PAD_HEIGHT, width-PAD_WIDTH-SIDEBAR_WIDTH-PAD_WIDTH-PAD_WIDTH, height-PAD_HEIGHT*2)
	mw, mh := m.main.Size()
	for _, p := range m.panes {
		p.vt.Resize(mw, mh)
	}
}

func (m *model) DrawCursor() {
	if m.focus == "sidebar" {
		m.screen.HideCursor()
		return
	}
	if m.focus == "main" {
		row, col, style, vis := m.panes[m.selected].vt.Cursor()
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

	if m.selected >= len(m.panes) {
		m.selected = len(m.panes) - 1
	}
}

func (m *model) SelectedPane() *pane {
	return m.panes[m.selected]
}

package multiplexer

import (
	"log/slog"
	"os"
	"os/exec"
	"sort"
	"time"

	tcellterm "git.sr.ht/~rockorager/tcell-term"
	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
)

type Model struct {
	screen tcell.Screen

	focus    string
	selected int

	panes []*pane

	main          *views.ViewPort
	sidebar       *views.ViewPort
	sidebarWidget *views.BoxLayout
}

type paneStatus int

const (
	paneStatusRunning paneStatus = iota
	paneStatusStopped
	paneStatusClearing
)

type pane struct {
	key      string
	vt       *tcellterm.VT
	args     []string
	cwd      string
	status   paneStatus
	title    string
	cmd      *exec.Cmd
	killable bool
	env      []string
}

func (p *pane) start() error {
	if p.status == paneStatusStopped {
		p.status = paneStatusClearing
		p.vt.Start(exec.Command("clear"))
		return nil
	}
	cmd := exec.Command(p.args[0], p.args[1:]...)
	cmd.Env = append(p.env, os.Environ()...)
	if p.cwd != "" {
		cmd.Dir = p.cwd
	}
	err := p.vt.Start(cmd)
	if err != nil {
		return err
	}
	p.status = paneStatusRunning
	return nil
}

func (p *pane) kill() error {
	p.vt.Close()
	return nil
}

var PAD_HEIGHT = 0
var PAD_WIDTH = 0
var SIDEBAR_WIDTH = 20

// update is the main event handler. It should only be called by the main thread
func (m *Model) update(ev tcell.Event) {
	switch ev := ev.(type) {
	case *tcell.EventKey:
		switch ev.Key() {
		case 256:
			switch ev.Rune() {
			case 'x':
				if m.focus == "sidebar" && m.selectedPane().killable {
					m.selectedPane().kill()
					return
				}
			case 'j':
				if m.focus == "sidebar" {
					m.sidebarMove(1)
					m.draw()
				}
			case 'k':
				if m.focus == "sidebar" {
					m.sidebarMove(-1)
					m.draw()
				}
			}

		case tcell.KeyDown:
			if m.focus == "sidebar" {
				m.sidebarMove(1)
				m.draw()
			}

		case tcell.KeyUp:
			if m.focus == "sidebar" {
				m.sidebarMove(-1)
				m.draw()
				return
			}

		case tcell.KeyCtrlZ:
			if m.focus == "main" {
				m.focus = "sidebar"
				m.draw()
				return
			}

		case tcell.KeyEnter:
			if m.focus == "sidebar" && m.selectedPane().killable {
				selected := m.selectedPane()
				if selected.status == paneStatusRunning {
					m.focus = "main"
				}

				if selected.status == paneStatusStopped {
					selected.start()
					m.sortPanes()
					// m.focus = "main"
					m.main.Clear()
					m.screen.Show()
				}
				m.draw()
				return
			}
		}

		if m.focus == "main" {
			m.panes[m.selected].vt.HandleEvent(ev)
			m.panes[m.selected].vt.Draw()
		}

	case *tcell.EventResize:
		m.resize(ev.Size())
		m.draw()
		m.screen.Sync()
		return

	case *tcellterm.EventRedraw:
		m.draw()
		return

	case *tcellterm.EventClosed:
		for index, pane := range m.panes {
			if pane.vt == ev.VT() {

				if pane.status == paneStatusRunning {
					pane.status = paneStatusStopped
					m.sortPanes()
					if index == m.selected {
						m.focus = "sidebar"
					}
				}

				if pane.status == paneStatusClearing {
					p := pane
					go func() {
						time.Sleep(100 * time.Millisecond)
						p.start()
						m.sortPanes()
						m.screen.PostEvent(&tcellterm.EventRedraw{})
					}()
				}
			}
		}
		m.draw()
		return

	case *tcell.EventPaste:
		if m.focus == "main" {
			m.panes[m.selected].vt.HandleEvent(ev)
		}
		return

	case *tcellterm.EventPanic:
		m.screen.Clear()
		m.screen.Fini()
	}
	return
}

// handleEvent is used to handle events from underlying widgets. Any events
// which redraw must be executed in the main goroutine by posting the event back
// to tcell
func (m *Model) handleEvent(ev tcell.Event) {
	m.screen.PostEvent(ev)
}

func New() (*Model, error) {
	var err error
	m := &Model{
		focus: "sidebar",
		panes: []*pane{},
	}
	m.screen, err = tcell.NewScreen()
	if err != nil {
		return nil, err
	}
	m.sidebar = views.NewViewPort(m.screen, 0, 0, 0, 0)
	m.main = views.NewViewPort(m.screen, 0, 0, 0, 0)
	stack := views.NewBoxLayout(views.Vertical)
	stack.SetView(m.sidebar)
	m.sidebarWidget = stack
	return m, nil
}

func (m *Model) Start() error {
	if err := m.screen.Init(); err != nil {
		return err
	}
	m.screen.EnablePaste()
	m.resize(m.screen.Size())
	for {
		ev := m.screen.PollEvent()
		if ev == nil {
			break
		}
		if casted, ok := ev.(*tcell.EventKey); ok && casted.Key() == tcell.KeyCtrlC && m.focus == "sidebar" {
			for _, p := range m.panes {
				slog.Info("killing pane", "pane", p.title)
				p.vt.Close()
			}
			break
		}
		m.update(ev)
	}
	m.screen.Fini()
	slog.Info("multiplexer done")
	return nil
}

func (m *Model) AddPane(key string, args []string, title string, cwd string, killable bool, env ...string) {
	term := tcellterm.New()
	term.SetSurface(m.main)
	term.Attach(m.handleEvent)
	for _, p := range m.panes {
		if p.key == key {
			return
		}
	}
	p := &pane{
		key:      key,
		vt:       term,
		cwd:      cwd,
		args:     args,
		title:    title,
		killable: killable,
		env:      env,
	}
	m.panes = append(m.panes, p)
	p.start()
	m.sortPanes()
}

func (m *Model) draw() {
	m.selectedPane().vt.Draw()
	m.drawCursor()
	for _, w := range m.sidebarWidget.Widgets() {
		m.sidebarWidget.RemoveWidget(w)
	}
	running := len(m.panes)
	for index, item := range m.panes {
		if index > 0 && m.panes[index-1].status != paneStatusStopped && item.status == paneStatusStopped {
			spacer := views.NewTextBar()
			spacer.SetLeft("──────────────────────", tcell.StyleDefault.Foreground(tcell.ColorGray))
			m.sidebarWidget.AddWidget(spacer, 0)
		}
		style := tcell.StyleDefault
		if item.status == paneStatusStopped {
			style = style.Foreground(tcell.ColorGray)
			running--
		}
		if index == m.selected {
			style = style.Bold(true)
			if m.focus == "sidebar" {
				style = style.Foreground(tcell.ColorOrange)
			}
		}
		title := views.NewTextBar()
		title.SetStyle(style)
		title.SetLeft(" "+item.title, tcell.StyleDefault)
		m.sidebarWidget.AddWidget(title, 0)
	}
	m.sidebarWidget.AddWidget(views.NewSpacer(), 1)
	selectedPane := m.selectedPane()
	if selectedPane.killable && m.focus == "sidebar" {
		if selectedPane.status == paneStatusRunning {
			title := views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [x]", tcell.StyleDefault)
			title.SetRight("kill  ", tcell.StyleDefault.Foreground(tcell.ColorGray))
			m.sidebarWidget.AddWidget(title, 0)

			title = views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [enter]", tcell.StyleDefault)
			title.SetRight("focus  ", tcell.StyleDefault.Foreground(tcell.ColorGray))
			m.sidebarWidget.AddWidget(title, 0)
		}

		if selectedPane.status == paneStatusStopped {
			title := views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [enter]", tcell.StyleDefault)
			title.SetRight("start  ", tcell.StyleDefault)
			m.sidebarWidget.AddWidget(title, 0)
		}
	}

	if m.focus == "main" {
		title := views.NewTextBar()
		title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
		title.SetLeft(" [ctl-z]", tcell.StyleDefault)
		title.SetRight("sidebar  ", tcell.StyleDefault)
		m.sidebarWidget.AddWidget(title, 0)
	}
	m.sidebarWidget.Draw()

	_, height := m.screen.Size()
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i := 0; i < height; i++ {
		m.screen.SetContent(SIDEBAR_WIDTH-1, i, '│', nil, borderStyle)
	}
	if running < len(m.panes) {
		m.screen.SetContent(SIDEBAR_WIDTH-1, running, '┤', nil, borderStyle)
	}
	m.screen.Show()
}

func (m *Model) resize(width int, height int) {
	m.sidebar.Resize(PAD_WIDTH, PAD_HEIGHT, SIDEBAR_WIDTH, height-PAD_HEIGHT*2)
	m.main.Resize(PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH, PAD_HEIGHT, width-PAD_WIDTH-SIDEBAR_WIDTH-PAD_WIDTH-PAD_WIDTH, height-PAD_HEIGHT*2)
	mw, mh := m.main.Size()
	for _, p := range m.panes {
		p.vt.Resize(mw, mh)
	}
}

func (m *Model) drawCursor() {
	if m.focus == "sidebar" {
		m.screen.HideCursor()
		return
	}
	if m.focus == "main" {
		row, col, style, vis := m.panes[m.selected].vt.Cursor()
		if vis {
			m.screen.SetCursorStyle(style)
			m.screen.ShowCursor(col+PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH, row+PAD_HEIGHT)
		}
	}
}

func (m *Model) sidebarMove(offset int) {
	m.selected += offset
	if m.selected < 0 {
		m.selected = 0
	}

	if m.selected >= len(m.panes) {
		m.selected = len(m.panes) - 1
	}
}

func (m *Model) selectedPane() *pane {
	return m.panes[m.selected]
}

func (m *Model) sortPanes() {
	key := m.selectedPane().key
	sort.Slice(m.panes, func(i, j int) bool {
		if m.panes[i].killable && !m.panes[j].killable {
			return false
		}
		if m.panes[i].status != paneStatusStopped && m.panes[j].status == paneStatusStopped {
			return true
		}
		if m.panes[i].status == paneStatusStopped && m.panes[j].status != paneStatusStopped {
			return false
		}
		return len(m.panes[i].title) < len(m.panes[j].title)
	})
	for i, p := range m.panes {
		if p.key == key {
			m.selected = i
			return
		}
	}
}

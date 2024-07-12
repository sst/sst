package multiplexer

import (
	"context"
	"log"
	"os"
	"syscall"

	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"
)

var PAD_HEIGHT = 0
var PAD_WIDTH = 0
var SIDEBAR_WIDTH = 20

type Multiplexer struct {
	ctx       context.Context
	focused   bool
	width     int
	height    int
	selected  int
	processes []*process
	screen    tcell.Screen
	root      *views.ViewPort
	stack     *views.BoxLayout
	renderer  *renderer
}

type renderer struct {
	cursor func(x, y int)
	render func()
}

func (r *renderer) SetCursor(x, y int) {
	r.cursor(x, y)
}

func (r *renderer) HandleCh(ch ecma48.PositionedChar) {
	r.render()
}

func New(ctx context.Context) *Multiplexer {
	result := &Multiplexer{}
	result.ctx = ctx
	result.processes = []*process{}
	result.screen, _ = tcell.NewScreen()
	result.screen.Init()
	// result.screen.EnableMouse()
	result.screen.Show()
	width, height := result.screen.Size()
	result.width = width
	result.height = height
	result.root = views.NewViewPort(result.screen, 0, 0, 0, 0)
	result.stack = views.NewBoxLayout(views.Vertical)
	result.stack.SetView(result.root)
	return result
}

func (s *Multiplexer) mainRect() (bool, int, int, int, int) {
	return true, SIDEBAR_WIDTH + 1, 0, s.width - SIDEBAR_WIDTH + 1, s.height
}

func (s *Multiplexer) Start() {
	defer func() {
		for _, p := range s.processes {
			p.pane.Kill()
		}
		s.screen.Fini()
	}()
	for {
		select {
		case <-s.ctx.Done():
			return
		default:
			unknown := s.screen.PollEvent()
			if unknown == nil {
				break
			}

			switch evt := unknown.(type) {
			case *drawEvent:
				s.Draw()
				continue

			case *cursorEvent:
				if s.focused {
					s.screen.ShowCursor(evt.X, evt.Y)
					s.screen.Show()
				}
				continue

			case *tcell.EventResize:
				width, height := evt.Size()
				s.width = width
				s.height = height
				s.root.Resize(PAD_WIDTH, PAD_HEIGHT, SIDEBAR_WIDTH, height-PAD_HEIGHT*2)
				for _, p := range s.processes {
					p.pane.SetRenderRect(s.mainRect())
				}
				s.Draw()
				s.screen.Sync()
				continue

			case *tcell.EventKey:
				selected := s.selectedProcess()
				switch evt.Key() {
				case 256:
					switch evt.Rune() {
					case 'j':
						if !s.focused {
							s.move(1)
							continue
						}
					case 'k':
						if !s.focused {
							s.move(-1)
							continue
						}
					case 'x':
						if selected.killable && !selected.pane.IsDead() && !s.focused {
							selected.pane.Kill()
						}
					}
				case tcell.KeyUp:
					if !s.focused {
						s.move(-1)
						continue
					}
				case tcell.KeyDown:
					if !s.focused {
						s.move(1)
						continue
					}
				case tcell.KeyCtrlU:
					if selected != nil {
						log.Println("scrolling up")
						selected.scrollUp(1)
						s.Draw()
						continue
					}
				case tcell.KeyCtrlD:
					if selected != nil {
						log.Println("scrolling down")
						selected.scrollDown(1)
						s.Draw()
						continue
					}
				case tcell.KeyEnter:
					if s.focused && selected != nil && selected.isScrolling() {
						selected.scrollReset()
						s.Draw()
						s.screen.Sync()
						continue
					}
					if !s.focused {
						if selected.killable {
							if selected.pane.IsDead() {
								s.AddProcess(selected.key, selected.args, selected.icon, selected.title, selected.dir, selected.killable, selected.env...)
								continue
							}
							s.focus()
						}
						continue
					}
				case tcell.KeyCtrlC:
					if !s.focused {
						pid := os.Getpid()
						process, _ := os.FindProcess(pid)
						process.Signal(syscall.SIGINT)
						return
					}
				case tcell.KeyCtrlZ:
					if s.focused {
						s.blur()
						continue
					}
				}

				if selected != nil && s.focused && !selected.isScrolling() {
					selected.pane.Write([]byte(keyCode(evt)))
				}
			}
		}
	}
}

type drawEvent struct {
	tcell.EventTime
}

type cursorEvent struct {
	tcell.EventTime
	X int
	Y int
}

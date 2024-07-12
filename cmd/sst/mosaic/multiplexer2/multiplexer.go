package multiplexer

import (
	"context"
	"log/slog"
	"os"
	"syscall"

	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"
	tcellterm "github.com/sst/ion/cmd/sst/mosaic/multiplexer2/tcell-term"
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
	main      *views.ViewPort
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
	result.screen.Show()
	width, height := result.screen.Size()
	result.width = width
	result.height = height
	result.root = views.NewViewPort(result.screen, 0, 0, 0, 0)
	result.main = views.NewViewPort(result.screen, 0, 0, 0, 0)
	result.stack = views.NewBoxLayout(views.Vertical)
	result.stack.SetView(result.root)
	return result
}

func (s *Multiplexer) mainRect() (int, int) {
	return s.width - SIDEBAR_WIDTH + 1, s.height
}

func (s *Multiplexer) resize(width int, height int) {
	s.width = width
	s.height = height
	s.root.Resize(PAD_WIDTH, PAD_HEIGHT, SIDEBAR_WIDTH, height-PAD_HEIGHT*2)
	s.main.Resize(PAD_WIDTH+SIDEBAR_WIDTH+PAD_WIDTH+1, PAD_HEIGHT, width-PAD_WIDTH-SIDEBAR_WIDTH-PAD_WIDTH-PAD_WIDTH-1, height-PAD_HEIGHT*2)
	mw, mh := s.main.Size()
	for _, p := range s.processes {
		p.vt.Resize(mw, mh)
	}
}

func (s *Multiplexer) Start() {
	defer func() {
		for _, p := range s.processes {
			p.vt.Close()
		}
		s.screen.Fini()
	}()

	s.resize(s.screen.Size())

	for {
		select {
		case <-s.ctx.Done():
			return
		default:
			unknown := s.screen.PollEvent()
			if unknown == nil {
				break
			}

			selected := s.selectedProcess()

			switch evt := unknown.(type) {

			case *tcell.EventResize:
				slog.Info("resize")
				s.resize(evt.Size())
				s.draw()
				s.screen.Sync()
				continue

			case *tcellterm.EventRedraw:
				if selected != nil && selected.vt == evt.VT() {
					selected.vt.Draw()
					s.screen.Show()
				}
				continue

			case *tcellterm.EventClosed:
				for index, proc := range s.processes {
					if proc.vt == evt.VT() {
						if !proc.dead {
							proc.dead = true
							s.sort()
							if index == s.selected {
								s.blur()
							}
						}
					}
				}
				s.draw()
				continue

			case *tcell.EventKey:
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
						if selected.killable && !selected.dead && !s.focused {
							selected.vt.Close()
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
						selected.scrollUp(s.height/2 + 1)
						s.draw()
						s.screen.Sync()
						continue
					}
				case tcell.KeyCtrlD:
					if selected != nil {
						selected.scrollDown(s.height/2 + 1)
						s.draw()
						s.screen.Sync()
						continue
					}
				case tcell.KeyEnter:
					if selected != nil && selected.isScrolling() && (s.focused || !selected.killable) {
						selected.scrollReset()
						s.draw()
						s.screen.Sync()
						continue
					}
					if !s.focused {
						if selected.killable {
							if selected.dead {
								selected.start()
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
					selected.vt.HandleEvent(evt)
					s.draw()
				}
			}
		}
	}
}

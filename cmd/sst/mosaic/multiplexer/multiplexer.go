package multiplexer

import (
	"context"
	"encoding/base64"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"syscall"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
	tcellterm "github.com/sst/ion/cmd/sst/mosaic/multiplexer/tcell-term"
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

	dragging bool
	click    *tcell.EventMouse
}

func New(ctx context.Context) *Multiplexer {
	result := &Multiplexer{}
	result.ctx = ctx
	result.processes = []*process{}
	result.screen, _ = tcell.NewScreen()
	result.screen.Init()
	result.screen.EnableMouse()
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

			case *tcell.EventMouse:
				if evt.Buttons()&tcell.WheelUp != 0 {
					s.scrollUp(3)
					continue
				}
				if evt.Buttons()&tcell.WheelDown != 0 {
					s.scrollDown(3)
					continue
				}
				if evt.Buttons() == tcell.ButtonNone {
					if s.dragging && selected != nil {
						copied := selected.vt.Copy()
						slog.Info(copied)
						// copy to clipboard
						// base64 encode copied
						encoded := base64.StdEncoding.EncodeToString([]byte(copied))
						fmt.Fprintf(os.Stderr, "\x1b]52;c;%s\x07", encoded)
					}
					s.dragging = false
					continue
				}
				if evt.Buttons()&tcell.ButtonPrimary != 0 {
					x, y := evt.Position()
					if x < SIDEBAR_WIDTH && y < len(s.processes) && !s.dragging {
						s.selected = y
						s.blur()
						continue
					}
					if x > SIDEBAR_WIDTH {
						if !s.dragging && s.click != nil && time.Since(s.click.When()) < time.Millisecond*500 {
							oldX, oldY := s.click.Position()
							if oldX == x && oldY == y {
								selected.vt.SelectStart(0, y)
								selected.vt.SelectEnd(s.width-1, y)
								s.dragging = true
								s.draw()
								continue
							}
						}
						s.click = evt
						offsetX := x - SIDEBAR_WIDTH - 1
						if s.dragging {
							selected.vt.SelectEnd(offsetX, y)
						}
						if !s.dragging {
							s.dragging = true
							selected.vt.SelectStart(offsetX, y)
						}
						s.draw()
						continue
					}
				}
				break

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
							proc.vt.Start(exec.Command("echo", "\n[process exited]"))
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
						s.scrollUp(s.height/2 + 1)
						continue
					}
				case tcell.KeyCtrlD:
					if selected != nil {
						s.scrollDown(s.height/2 + 1)
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
								s.sort()
								s.draw()
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

func (s *Multiplexer) scrollDown(n int) {
	selected := s.selectedProcess()
	if selected == nil {
		return
	}
	selected.scrollDown(n)
	s.draw()
	s.screen.Sync()
}

func (s *Multiplexer) scrollUp(n int) {
	selected := s.selectedProcess()
	if selected == nil {
		return
	}
	selected.scrollUp(n)
	s.draw()
}

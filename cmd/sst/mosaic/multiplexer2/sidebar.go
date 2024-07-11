package multiplexer

import (
	"context"
	"log"
	"os"
	"sort"
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
	scroll    int
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
	multi *Multiplexer
}

func (r *renderer) SetCursor(x, y int) {
	r.multi.screen.PostEvent(&cursorEvent{X: x, Y: y})
}

func (r *renderer) HandleCh(ch ecma48.PositionedChar) {
	r.multi.screen.PostEvent(&drawEvent{})
}

func New(ctx context.Context) *Multiplexer {
	result := &Multiplexer{}
	result.renderer = &renderer{result}
	result.ctx = ctx
	result.processes = []*process{}
	result.screen, _ = tcell.NewScreen()
	result.screen.Init()
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

				case tcell.KeyCtrlU:
					if selected != nil {
						log.Println("scrolling up")
						s.scroll += 1
						s.scroll = min(len(selected.pane.VT.Scrollback)-1, s.scroll)
						s.Draw()
						continue
					}
				case tcell.KeyCtrlD:
					if selected != nil {
						log.Println("scrolling down")
						s.scroll -= 1
						s.scroll = max(0, s.scroll)
						s.Draw()
						continue
					}
				case tcell.KeyEnter:
					if s.focused {
						if s.scroll > 0 {
							s.scroll = 0
							s.Draw()
							continue
						}
					}
					if !s.focused {
						if selected.killable {
							if selected.pane.IsDead() {
								s.AddProcess(selected.key, selected.args, selected.title, selected.dir, selected.killable, selected.env...)
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

				if s.focused && s.scroll == 0 {
					selected.pane.Write([]byte(keyCode(evt)))
				}
			}
		}
	}
}

func (s *Multiplexer) selectedProcess() *process {
	if s.selected >= len(s.processes) {
		return nil
	}
	return s.processes[s.selected]
}

func (s *Multiplexer) Draw() {
	defer s.screen.Show()
	for _, w := range s.stack.Widgets() {
		s.stack.RemoveWidget(w)
	}
	selected := s.selectedProcess()

	for index, item := range s.processes {
		if index > 0 && !s.processes[index-1].pane.IsDead() && item.pane.IsDead() {
			spacer := views.NewTextBar()
			spacer.SetLeft("──────────────────────", tcell.StyleDefault.Foreground(tcell.ColorGray))
			s.stack.AddWidget(spacer, 0)
		}
		style := tcell.StyleDefault
		if index == s.selected {
			style = style.Bold(true)
			if !s.focused {
				style = style.Foreground(tcell.ColorOrange)
			}
		}
		title := views.NewTextBar()
		title.SetStyle(style)
		title.SetLeft(" "+item.title, tcell.StyleDefault)
		s.stack.AddWidget(title, 0)
	}
	s.stack.AddWidget(views.NewSpacer(), 1)
	if selected != nil && selected.killable && !s.focused {
		if !selected.pane.IsDead() {
			title := views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [x]", tcell.StyleDefault)
			title.SetRight("kill  ", tcell.StyleDefault.Foreground(tcell.ColorGray))
			s.stack.AddWidget(title, 0)

			title = views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [enter]", tcell.StyleDefault)
			title.SetRight("focus  ", tcell.StyleDefault.Foreground(tcell.ColorGray))
			s.stack.AddWidget(title, 0)
		}

		if selected.pane.IsDead() {
			title := views.NewTextBar()
			title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
			title.SetLeft(" [enter]", tcell.StyleDefault)
			title.SetRight("start  ", tcell.StyleDefault)
			s.stack.AddWidget(title, 0)
		}
	}
	if s.focused {
		title := views.NewTextBar()
		title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
		title.SetLeft(" [ctl-z]", tcell.StyleDefault)
		title.SetRight("sidebar  ", tcell.StyleDefault)
		s.stack.AddWidget(title, 0)
	}
	s.stack.Draw()
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i := 0; i < s.height; i++ {
		s.screen.SetContent(SIDEBAR_WIDTH-1, i, '│', nil, borderStyle)
	}
	for i := 0; i < s.height; i++ {
		s.screen.SetContent(SIDEBAR_WIDTH, i, rune(0), nil, tcell.StyleDefault)
	}

	// render virtual terminal
	if selected != nil {
		if s.focused {
			selected.pane.DrawCursor()
		}
		scrollback := selected.pane.VT.Scrollback
		for i := 0; i < s.scroll; i++ {
			cols := scrollback[len(scrollback)-1-(s.scroll-i)]
			for col, cell := range cols {
				style := tcell.StyleDefault
				style = style.Foreground(tcell.Color(cell.Fg.Code))
				style = style.Background(tcell.Color(cell.Bg.Code))
				style = style.Bold(cell.Bold)
				s.screen.SetContent(SIDEBAR_WIDTH+col+1, i, cell.Rune, nil, style)
			}
		}

		for row, cols := range selected.pane.VT.Screen {
			for col, cell := range cols {
				style := tcell.StyleDefault
				if cell.Style.Fg.ColorMode != ecma48.ColorNone && cell.Style.Fg.Code != 0 {
					style = style.Foreground(tcell.PaletteColor(int(cell.Style.Fg.Code)))
				}
				if cell.Style.Bg.ColorMode != ecma48.ColorNone && cell.Style.Bg.Code != 0 {
					style = style.Background(tcell.PaletteColor(int(cell.Style.Bg.Code)))
				}
				style = style.Bold(cell.Bold)
				s.screen.SetContent(SIDEBAR_WIDTH+col+1, row+s.scroll, cell.Rune, nil, style)
			}
		}
		// fill remaining rows with empty cells
		for row := len(selected.pane.VT.Screen); row < s.height; row++ {
			for col := 0; col < s.width; col++ {
				s.screen.SetContent(SIDEBAR_WIDTH+col+1, row, rune(0), nil, tcell.StyleDefault)
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

func (s *Multiplexer) move(offset int) {
	index := s.selected + offset
	if index < 0 {
		index = 0
	}
	if index >= len(s.processes) {
		index = len(s.processes) - 1
	}
	s.scroll = 0
	old := s.processes[s.selected]
	next := s.processes[index]
	if !old.pane.IsDead() {
		old.pane.SetPaused(true)
	}
	if !next.pane.IsDead() {
		next.pane.SetPaused(false)
	}
	s.selected = index
	s.Draw()
	s.screen.Sync()
}

func (s *Multiplexer) focus() {
	s.focused = true
	s.scroll = 0
	s.selectedProcess().pane.UpdateSelection(true)
	s.selectedProcess().pane.DrawCursor()
	s.Draw()
}

func (s *Multiplexer) blur() {
	s.focused = false
	s.scroll = 0
	s.selectedProcess().pane.UpdateSelection(false)
	s.screen.HideCursor()
	s.Draw()
}

func (s *Multiplexer) sort() {
	if len(s.processes) == 0 {
		return
	}
	key := s.selectedProcess().key
	sort.Slice(s.processes, func(i, j int) bool {
		if s.processes[i].killable && !s.processes[i].killable {
			return false
		}
		if !s.processes[i].pane.IsDead() && s.processes[j].pane.IsDead() {
			return true
		}
		if s.processes[i].pane.IsDead() && !s.processes[j].pane.IsDead() {
			return false
		}
		return len(s.processes[i].title) < len(s.processes[j].title)
	})
	for i, p := range s.processes {
		if p.key == key {
			s.selected = i
			return
		}
	}
}

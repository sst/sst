package multiplexer

import (
	"log/slog"
	"sort"

	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"
)

func (s *Multiplexer) draw() {
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
		title.SetLeft(" "+item.icon+" "+item.title, tcell.StyleDefault)
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
		if s.focused && !selected.isScrolling() {
			s.screen.ShowCursor(selected.cursorX, selected.cursorY)
		}
		if selected.isScrolling() || !s.focused {
			s.screen.HideCursor()
		}
		scrollback := selected.pane.VT.Scrollback
		offset := 0
		if selected.isScrolling() {
			for i := selected.scrollStart; i < len(scrollback); i++ {
				cols := scrollback[i]
				s.drawRow(offset, cols)
				offset++
			}
		}
		slog.Info("draw", "offset", offset, "scroll", selected.scrollStart, "max", len(scrollback))
		for _, cols := range selected.pane.VT.Screen {
			s.drawRow(offset, cols)
			offset++
		}
		// fill remaining rows with empty cells
		for row := len(selected.pane.VT.Screen); row < s.height; row++ {
			for col := 0; col < s.width; col++ {
				s.screen.SetContent(SIDEBAR_WIDTH+col+1, row, rune(0), nil, tcell.StyleDefault)
			}
		}
	}
}

func (s *Multiplexer) drawRow(row int, cols []ecma48.StyledChar) {
	for col, cell := range cols {
		style := tcell.
			StyleDefault.
			Bold(cell.Bold).
			Italic(cell.Italic).
			Underline(cell.Underline)
		if cell.Style.Fg.ColorMode != ecma48.ColorNone && cell.Style.Fg.Code != 0 {
			style = style.Foreground(tcell.PaletteColor(int(cell.Style.Fg.Code)))
		}
		if cell.Style.Bg.ColorMode != ecma48.ColorNone && cell.Style.Bg.Code != 0 {
			style = style.Background(tcell.PaletteColor(int(cell.Style.Bg.Code)))
		}
		s.screen.SetContent(SIDEBAR_WIDTH+col+1, row, cell.Rune, nil, style)
	}
}

func (s *Multiplexer) move(offset int) {
	index := s.selected + offset
	if index < 0 {
		index = 0
	}
	if index >= len(s.processes) {
		index = len(s.processes) - 1
	}
	s.selected = index
	s.draw()
	s.screen.Sync()
}

func (s *Multiplexer) focus() {
	s.focused = true
	s.selectedProcess().pane.UpdateSelection(true)
	s.draw()
}

func (s *Multiplexer) blur() {
	s.focused = false
	selected := s.selectedProcess()
	if selected != nil {
		selected.pane.UpdateSelection(false)
		selected.scrollReset()
	}
	s.screen.HideCursor()
	s.draw()
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

func (s *Multiplexer) selectedProcess() *process {
	if s.selected >= len(s.processes) {
		return nil
	}
	return s.processes[s.selected]
}

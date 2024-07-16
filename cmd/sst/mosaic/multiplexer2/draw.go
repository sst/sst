package multiplexer

import (
	"slices"
	"sort"
	"strings"
	"unicode/utf8"

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
		if index > 0 && !s.processes[index-1].dead && item.dead {
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

	hotkeys := map[string]string{}
	if selected != nil && selected.killable && !s.focused {
		if !selected.dead {
			hotkeys["x"] = "kill"
			hotkeys["enter"] = "focus"
		}

		if selected.dead {
			hotkeys["enter"] = "start"
		}
	}
	if !s.focused {
		hotkeys["j/k/↓/↑"] = "up/down"
	}
	if s.focused {
		hotkeys["ctrl-z"] = "sidebar"
	}
	if selected != nil && selected.isScrolling() && (s.focused || !selected.killable) {
		hotkeys["enter"] = "reset"
	}
	hotkeys["ctrl-u/d"] = "scroll"
	// sort hotkeys
	keys := make([]string, 0, len(hotkeys))
	for key := range hotkeys {
		keys = append(keys, key)
	}
	slices.SortFunc(keys, func(i, j string) int {
		ilength := utf8.RuneCountInString(i)
		jlength := utf8.RuneCountInString(j)
		if ilength != jlength {
			return ilength - jlength
		}
		return strings.Compare(i, j)
	})
	for _, key := range keys {
		label := hotkeys[key]
		title := views.NewTextBar()
		title.SetStyle(tcell.StyleDefault.Foreground(tcell.ColorGray))
		title.SetLeft(" "+key, tcell.StyleDefault.Foreground(tcell.ColorWhite).Bold(true))
		title.SetRight(label+"  ", tcell.StyleDefault)
		s.stack.AddWidget(title, 0)
	}
	s.stack.Draw()
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i := 0; i < s.height; i++ {
		s.screen.SetContent(SIDEBAR_WIDTH-1, i, '│', nil, borderStyle)
	}

	// render virtual terminal
	if selected != nil {
		selected.vt.Draw()
		if s.focused {
			y, x, _, _ := selected.vt.Cursor()
			s.screen.ShowCursor(SIDEBAR_WIDTH+1+x, y+PAD_HEIGHT)
		}
		if !s.focused {
			s.screen.HideCursor()
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
}

func (s *Multiplexer) focus() {
	s.focused = true
	s.draw()
}

func (s *Multiplexer) blur() {
	s.focused = false
	selected := s.selectedProcess()
	if selected != nil {
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
		if !s.processes[i].dead && s.processes[j].dead {
			return true
		}
		if s.processes[i].dead && !s.processes[j].dead {
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

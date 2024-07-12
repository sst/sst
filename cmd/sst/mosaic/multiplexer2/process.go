package multiplexer

import (
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/pane"
	"log/slog"
)

type process struct {
	icon        string
	scrollStart int
	cursorX     int
	cursorY     int
	key         string
	args        []string
	title       string
	dir         string
	killable    bool
	env         []string
	pane        *pane.Pane
}

func (s *Multiplexer) AddProcess(key string, args []string, icon string, title string, cwd string, killable bool, env ...string) {
	index := -1
	for i, p := range s.processes {
		if p.key == key {
			if p.pane.IsDead() {
				index = i
				break
			}
			return
		}
	}
	proc := &process{
		icon:        icon,
		key:         key,
		dir:         cwd,
		title:       title,
		args:        args,
		killable:    killable,
		env:         env,
		scrollStart: -1,
	}
	renderer := &renderer{
		cursor: func(x, y int) {
			proc.cursorX = x
			proc.cursorY = y
			if s.selectedProcess() == proc {
				s.screen.PostEvent(&drawEvent{})
			}
		},
		render: func() {
			if s.selectedProcess() == proc {
				s.screen.PostEvent(&drawEvent{})
			}
		},
	}
	p := pane.NewPane(renderer, args, cwd, env...)
	p.SetRenderRect(s.mainRect())
	p.SetDeathHandler(func(err error) {
		if s.processes[s.selected] == proc {
			s.blur()
		}
		s.sort()
		s.Draw()
	})
	proc.pane = p
	if index == -1 {
		// adding new process
		s.processes = append(s.processes, proc)
		p.UpdateSelection(false)
		if len(s.processes) == 1 {
			// activate first process to be added
			s.move(-99)
		}
	} else {
		p.UpdateSelection(true)
		s.processes[index] = proc
	}
	s.sort()
	s.Draw()
}

func (s *process) scrollUp(offset int) {
	if !s.isScrolling() {
		s.scrollStart = len(s.pane.VT.Scrollback)
	}
	s.scrollStart = s.scrollStart - offset
	s.scrollStart = max(0, s.scrollStart)
	slog.Info("scroll up", "scroll", s.scrollStart, "max", len(s.pane.VT.Scrollback))
}

func (s *process) scrollDown(offset int) {
	if !s.isScrolling() {
		return
	}
	s.scrollStart = s.scrollStart + offset
	if s.scrollStart >= len(s.pane.VT.Scrollback) {
		s.scrollReset()
	}
}

func (s *process) scrollReset() {
	s.scrollStart = -1
}

func (s *process) isScrolling() bool {
	return s.scrollStart != -1
}

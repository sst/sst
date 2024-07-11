package multiplexer

import "github.com/sst/ion/cmd/sst/mosaic/multiplexer2/switcher/pane"

type process struct {
	key      string
	args     []string
	title    string
	dir      string
	killable bool
	env      []string
	pane     *pane.Pane
}

func (s *Multiplexer) AddProcess(key string, args []string, title string, cwd string, killable bool, env ...string) {
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
		key:      key,
		dir:      cwd,
		title:    title,
		args:     args,
		killable: killable,
		env:      env,
	}
	p := pane.NewPane(s.renderer, args, cwd, env...)
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
		p.UpdateSelection(false)
		p.SetRenderRect(s.mainRect())
		p.SetPaused(true)
		s.processes = append(s.processes, proc)
		if len(s.processes) == 1 {
			// activate first process to be added
			s.move(-99)
		} else {
			s.selectedProcess().pane.Redraw()
		}
	} else {
		// restarting dead process
		p.SetPaused(false)
		p.UpdateSelection(true)
		p.SetRenderRect(s.mainRect())
		s.processes[index] = proc
	}
	s.sort()
	s.Draw()
}

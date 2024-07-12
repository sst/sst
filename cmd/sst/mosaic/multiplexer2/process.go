package multiplexer

import (
	"os"
	"os/exec"

	"github.com/gdamore/tcell/v2"
	tcellterm "github.com/sst/ion/cmd/sst/mosaic/multiplexer2/tcell-term"
)

type vterm struct {
	Resize func(int, int)
	Start  func(cmd *exec.Cmd) error
}

type process struct {
	icon     string
	key      string
	args     []string
	title    string
	dir      string
	killable bool
	env      []string
	vt       *tcellterm.VT
	dead     bool
}

func (s *Multiplexer) AddProcess(key string, args []string, icon string, title string, cwd string, killable bool, env ...string) {
	for _, p := range s.processes {
		if p.key == key {
			return
		}
	}
	proc := &process{
		icon:     icon,
		key:      key,
		dir:      cwd,
		title:    title,
		args:     args,
		killable: killable,
		env:      env,
	}
	term := tcellterm.New()
	term.SetSurface(s.main)
	term.Attach(func(ev tcell.Event) {
		s.screen.PostEvent(ev)
	})
	proc.vt = term
	proc.start()
	s.processes = append(s.processes, proc)
	s.sort()
	s.draw()
}

func (p *process) start() error {
	cmd := exec.Command(p.args[0], p.args[1:]...)
	cmd.Env = append(p.env, os.Environ()...)
	if p.dir != "" {
		cmd.Dir = p.dir
	}
	err := p.vt.Start(cmd)
	if err != nil {
		return err
	}
	p.dead = false
	return nil
}

func (s *process) scrollUp(offset int) {
	s.vt.ScrollUp(offset)
}

func (s *process) scrollDown(offset int) {
	s.vt.ScrollDown(offset)
}

func (s *process) scrollReset() {
	s.vt.ScrollReset()
}

func (s *process) isScrolling() bool {
	return s.vt.IsScrolling()
}

func (s *process) scrollable() bool {
	return s.vt.Scrollable()
}

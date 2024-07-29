package multiplexer

import (
	"os"
	"os/exec"

	"github.com/gdamore/tcell/v2"
	tcellterm "github.com/sst/ion/cmd/sst/mosaic/multiplexer/tcell-term"
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

type EventProcess struct {
	tcell.EventTime
	Key       string
	Args      []string
	Icon      string
	Title     string
	Cwd       string
	Killable  bool
	Autostart bool
	Env       []string
}

func (s *Multiplexer) AddProcess(key string, args []string, icon string, title string, cwd string, killable bool, autostart bool, env ...string) {
	s.screen.PostEvent(&EventProcess{
		Key:       key,
		Args:      args,
		Icon:      icon,
		Title:     title,
		Cwd:       cwd,
		Killable:  killable,
		Autostart: autostart,
		Env:       env,
	})
}

func (p *process) start() error {
	cmd := exec.Command(p.args[0], p.args[1:]...)
	cmd.Env = append(p.env, os.Environ()...)
	if p.dir != "" {
		cmd.Dir = p.dir
	}
	p.vt.Clear()
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

// forked from https://github.com/aaronjanse/3mux/blob/master/wm/pane.go

package pane

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime/debug"
	"syscall"

	"github.com/aaronjanse/3mux/wm"
	"github.com/charmbracelet/x/xpty"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"
	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/vterm"
)

// A Pane is a tiling unit representing a terminal
type Pane struct {
	born bool

	ptmx xpty.Pty
	cmd  *exec.Cmd
	VT   *vterm.VTerm

	selected   bool
	renderRect wm.Rect
	renderer   ecma48.Renderer

	Dead    bool
	OnDeath func(error)
}

func NewPane(renderer ecma48.Renderer, args []string, dir string, env ...string) *Pane {
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Env = append(os.Environ(), env...)
	cmd.Env = append(cmd.Env, "TERM=xterm-256color")
	cmd.Dir = dir
	t := &Pane{
		born:     false,
		renderer: renderer,
		cmd:      cmd,
	}
	ptmx, err := xpty.NewPty(100, 100)
	if err != nil {
		panic(err)
	}
	log.Println("ptmx", ptmx.Fd())
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid:  true,
		Setctty: true,
		Ctty:    1,
	}
	ptmx.Start(t.cmd)
	t.ptmx = ptmx
	parentSetCursor := func(x, y int) {
		if t.selected {
			renderer.SetCursor(x+t.renderRect.X, y+t.renderRect.Y)
		}
	}
	t.VT = vterm.NewVTerm(renderer, parentSetCursor)
	return t
}

func (t *Pane) SetRenderRect(fullscreen bool, x, y, w, h int) {
	t.renderRect = wm.Rect{X: x, Y: y, W: w, H: h}

	if !t.born {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Println("process exited", t.cmd.Args[0])
					t.Dead = true
					t.OnDeath(fmt.Errorf("%s\n%s",
						r.(error), debug.Stack(),
					))
				}
			}()

			go t.VT.ProcessStdout(t.ptmx)
			t.cmd.Wait()
			log.Println("process exited", t.cmd.Args[0])

			t.Dead = true
			t.OnDeath(nil)
		}()
		t.born = true
	}

	if !t.VT.IsPaused {
		t.VT.Reshape(x, y, w, h)
		t.VT.RedrawWindow()
	}

	t.resizeShell(w, h)
}

func (t *Pane) resizeShell(w, h int) {
	err := t.ptmx.Resize(w, h)
	if err != nil {
		panic(err)
	}
}

func (t *Pane) ScrollDown() {
	t.VT.ScrollbackDown()
}

func (t *Pane) ScrollUp() {
	t.VT.ScrollbackUp()
}

func (t *Pane) IsDead() bool {
	return t.Dead
}

func (t *Pane) SetDeathHandler(onDeath func(error)) {
	t.OnDeath = onDeath
}

func (t *Pane) GetCursor() (int, int) {
	return t.VT.Cursor.X, t.VT.Cursor.Y
}

func (t *Pane) UpdateSelection(selected bool) {
	t.selected = selected
	if selected {
		t.VT.RefreshCursor()
	}
}

func (t *Pane) Write(p []byte) (n int, err error) {
	return t.ptmx.Write(p)
}

func (t *Pane) HandleStdin(in ecma48.Output) {
	t.VT.ScrollbackReset()
	_, err := t.ptmx.Write(t.VT.ProcessStdin(in))
	if err != nil {
		panic(err)
	}
	t.VT.RefreshCursor()
}

func (t *Pane) Kill() {
	t.VT.Kill()
	// FIXME: handle error
	t.ptmx.Close()
	// FIXME: handle error
	t.cmd.Process.Kill()
	t.Dead = true
}

func (t *Pane) Redraw() {
	t.VT.RedrawWindow()
}

func (t *Pane) SetPaused(pause bool) {
	t.VT.ChangePause <- pause
	t.VT.IsPaused = pause
}

func (t *Pane) Serialize() string {
	out := fmt.Sprintf("Term[%d,%d %dx%d]", t.renderRect.X, t.renderRect.Y, t.renderRect.W, t.renderRect.H)
	if t.selected {
		return out + "*"
	}
	return out
}

func (t *Pane) GetRenderRect() wm.Rect {
	return t.renderRect
}

package tcellterm

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
)

func (vt *VT) handleMouse(ev *tcell.EventMouse) string {
	if vt.mode&mouseButtons == 0 && vt.mode&mouseDrag == 0 && vt.mode&mouseMotion == 0 && vt.mode&mouseSGR == 0 {
		if vt.mode&altScroll != 0 && vt.mode&smcup != 0 {
			// Translate wheel motion into arrows up and down
			// 3x rows
			if ev.Buttons()&tcell.WheelUp != 0 {
				vt.pty.WriteString(info.KeyUp)
				vt.pty.WriteString(info.KeyUp)
				vt.pty.WriteString(info.KeyUp)
			}
			if ev.Buttons()&tcell.WheelDown != 0 {
				vt.pty.WriteString(info.KeyDown)
				vt.pty.WriteString(info.KeyDown)
				vt.pty.WriteString(info.KeyDown)
			}
		}
		return ""
	}
	// Return early if we aren't reporting motion or drag events
	if vt.mode&mouseButtons != 0 && vt.mouseBtn == ev.Buttons() {
		// motion or drag
		return ""
	}

	if vt.mode&mouseDrag != 0 && vt.mouseBtn == tcell.ButtonNone && ev.Buttons() == tcell.ButtonNone {
		// Motion event
		return ""
	}

	// Encode the button
	var b int
	if ev.Buttons()&tcell.Button1 != 0 {
		b += 0
	}
	if ev.Buttons()&tcell.Button3 != 0 {
		b += 1
	}
	if ev.Buttons()&tcell.Button2 != 0 {
		b += 2
	}
	if ev.Buttons() == tcell.ButtonNone {
		b += 3
	}
	if ev.Buttons()&tcell.WheelUp != 0 {
		b += 0 + 64
	}
	if ev.Buttons()&tcell.WheelDown != 0 {
		b += 1 + 64
	}
	if ev.Modifiers()&tcell.ModShift != 0 {
		b += 4
	}
	if ev.Modifiers()&tcell.ModAlt != 0 {
		b += 8
	}
	if ev.Modifiers()&tcell.ModCtrl != 0 {
		b += 16
	}

	if vt.mode&mouseButtons == 0 && vt.mouseBtn != tcell.ButtonNone && ev.Buttons() != tcell.ButtonNone {
		// drag event
		b += 32
	}

	col, row := ev.Position()

	if vt.mode&mouseSGR != 0 {
		switch {
		case ev.Buttons()&tcell.WheelUp != 0:
			return fmt.Sprintf("\x1b[<%d;%d;%dM", b, col+1, row+1)

		case ev.Buttons()&tcell.WheelDown != 0:
			return fmt.Sprintf("\x1b[<%d;%d;%dM", b, col+1, row+1)

		case ev.Buttons() == tcell.ButtonNone && vt.mouseBtn != tcell.ButtonNone:
			// Button was in, and now it's not
			var button int
			switch vt.mouseBtn {
			case tcell.Button1:
				button = 0
			case tcell.Button3:
				button = 1
			case tcell.Button2:
				button = 2
			}
			vt.mouseBtn = ev.Buttons()
			return fmt.Sprintf("\x1b[<%d;%d;%dm", button, col+1, row+1)

		default:
			vt.mouseBtn = ev.Buttons()
			return fmt.Sprintf("\x1b[<%d;%d;%dM", b, col+1, row+1)
		}
	}

	encodedCol := 32 + col + 1
	encodedRow := 32 + row + 1
	b += 32

	vt.mouseBtn = ev.Buttons()
	return fmt.Sprintf("\x1b[M%c%c%c", b, encodedCol, encodedRow)
}

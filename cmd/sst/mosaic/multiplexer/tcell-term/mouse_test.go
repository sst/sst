package tcellterm

import (
	"testing"

	"github.com/gdamore/tcell/v2"
	"github.com/stretchr/testify/assert"
)

func TestHandleMouse(t *testing.T) {
	tests := []struct {
		name     string
		mode     mode
		button   tcell.ButtonMask
		event    *tcell.EventMouse
		expected string
	}{
		{
			name:     "button 1",
			mode:     mouseButtons,
			button:   tcell.ButtonNone,
			event:    tcell.NewEventMouse(0, 0, tcell.Button1, tcell.ModNone),
			expected: "\x1b[M !!",
		},
		{
			name:     "button 1 + shift",
			mode:     mouseButtons,
			button:   tcell.ButtonNone,
			event:    tcell.NewEventMouse(0, 0, tcell.Button1, tcell.ModShift),
			expected: "\x1b[M$!!",
		},
		{
			name:     "button 1 drag, in normal mode",
			mode:     mouseButtons,
			button:   tcell.Button1,
			event:    tcell.NewEventMouse(0, 0, tcell.Button1, tcell.ModNone),
			expected: "",
		},
		{
			name:     "button 1 release, in normal mode",
			mode:     mouseButtons,
			button:   tcell.Button1,
			event:    tcell.NewEventMouse(0, 0, tcell.ButtonNone, tcell.ModNone),
			expected: "\x1b[M#!!",
		},
		{
			name:     "button 1 drag, in drag mode",
			mode:     mouseDrag,
			button:   tcell.Button1,
			event:    tcell.NewEventMouse(0, 0, tcell.Button1, tcell.ModNone),
			expected: "\x1b[M@!!",
		},
		{
			name:     "button 1 sgr",
			mode:     mouseSGR,
			button:   tcell.ButtonNone,
			event:    tcell.NewEventMouse(0, 0, tcell.Button1, tcell.ModNone),
			expected: "\x1b[<0;1;1M",
		},
		{
			name:     "no button motion sgr",
			mode:     mouseSGR,
			button:   tcell.ButtonNone,
			event:    tcell.NewEventMouse(0, 0, tcell.ButtonNone, tcell.ModNone),
			expected: "\x1b[<3;1;1M",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			vt := New()
			vt.mouseBtn = test.button
			vt.mode |= test.mode
			actual := vt.handleMouse(test.event)
			assert.Equal(t, test.expected, actual)
		})
	}
}

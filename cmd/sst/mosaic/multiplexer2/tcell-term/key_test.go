package tcellterm

import (
	"testing"

	"github.com/gdamore/tcell/v2"
	"github.com/stretchr/testify/assert"
)

func TestKey(t *testing.T) {
	tests := []struct {
		name     string
		event    *tcell.EventKey
		expected string
	}{
		{
			name: "rune",
			event: tcell.NewEventKey(
				tcell.KeyRune,
				'j',
				tcell.ModNone,
			),
			expected: "j",
		},
		{
			name: "F1",
			event: tcell.NewEventKey(
				tcell.KeyF1,
				0,
				tcell.ModNone,
			),
			expected: "\x1bOP",
		},
		{
			name: "Shift-right",
			event: tcell.NewEventKey(
				tcell.KeyRight,
				0,
				tcell.ModShift,
			),
			expected: "\x1b[1;2C",
		},
		{
			name: "Ctrl-Shift-right",
			event: tcell.NewEventKey(
				tcell.KeyRight,
				0,
				tcell.ModShift|tcell.ModCtrl,
			),
			expected: "\x1b[1;6C",
		},
		{
			name: "Alt-Shift-right",
			event: tcell.NewEventKey(
				tcell.KeyRight,
				0,
				tcell.ModShift|tcell.ModAlt,
			),
			expected: "\x1b[1;4C",
		},
		{
			name: "rune + mod alt",
			event: tcell.NewEventKey(
				tcell.KeyRune,
				'j',
				tcell.ModAlt,
			),
			expected: "\x1Bj",
		},
		{
			name: "rune + mod ctrl",
			event: tcell.NewEventKey(
				tcell.KeyCtrlJ,
				0x0A,
				tcell.ModCtrl,
			),
			expected: "\n",
		},
		{
			name: "shift + f5",
			event: tcell.NewEventKey(
				tcell.KeyF5,
				0,
				tcell.ModShift,
			),
			expected: "\x1B[15;2~",
		},
		{
			name: "shift + arrow",
			event: tcell.NewEventKey(
				tcell.KeyRight,
				0,
				tcell.ModShift,
			),
			expected: "\x1B[1;2C",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual := keyCode(test.event)
			assert.Equal(t, test.expected, actual)
		})
	}
}

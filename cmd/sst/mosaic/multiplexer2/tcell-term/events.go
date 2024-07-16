package tcellterm

import (
	"time"

	"github.com/gdamore/tcell/v2"
)

// EventTerminal is a generic terminal event
type EventTerminal struct {
	when time.Time
	vt   *VT
}

func newEventTerminal(vt *VT) *EventTerminal {
	return &EventTerminal{
		when: time.Now(),
		vt:   vt,
	}
}

func (ev *EventTerminal) When() time.Time {
	return ev.when
}

func (ev *EventTerminal) VT() *VT {
	return ev.vt
}

// EventRedraw is emitted when the terminal requires redrawing
type EventRedraw struct {
	*EventTerminal
}

// EventClosed is emitted when the terminal exits
type EventClosed struct {
	*EventTerminal
}

// EventTitle is emitted when the terminal's title changes
type EventTitle struct {
	*EventTerminal
	title string
}

func (ev *EventTitle) Title() string {
	return ev.title
}

// EventMouseMode is emitted when the terminal mouse mode changes
type EventMouseMode struct {
	modes []tcell.MouseFlags

	*EventTerminal
}

func (ev *EventMouseMode) Flags() []tcell.MouseFlags {
	return ev.modes
}

// EventBell is emitted when BEL is received
type EventBell struct {
	*EventTerminal
}

type EventPanic struct {
	*EventTerminal
	Error error
}

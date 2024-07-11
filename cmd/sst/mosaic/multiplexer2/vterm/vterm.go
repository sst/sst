/*
Package vterm provides a layer of abstraction between a channel of incoming text (possibly containing ANSI escape codes, et al) and a channel of outbound Char's.

A Char is a character printed using a given cursor (which is stored alongside the Char).
*/
package vterm

import "github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"

// ScrollingRegion holds the state for an ANSI scrolling region
type ScrollingRegion struct {
	// cursor within when cursor.Y >= top
	top int
	// cursor within when cursor.Y < bottom
	bottom int
}

/*
VTerm acts as a virtual terminal emulator between a shell and the host terminal emulator

It both transforms an inbound stream of bytes into Char's and provides the option of dumping all the Char's that need to be rendered to display the currently visible terminal window from scratch.
*/
type VTerm struct {
	// starting at (0, 0) in top left
	x, y int
	// x < w && y < h
	w, h int

	// visible screen; char cursor coords are ignored
	Screen [][]ecma48.StyledChar

	// Scrollback[0] is the line farthest from the screen
	Scrollback    [][]ecma48.StyledChar // disabled when using alt screen; char cursor coords are ignored
	ScrollbackPos int                   // ScrollbackPos is the number of lines of scrollback visible

	UsingAltScreen bool
	screenBackup   [][]ecma48.StyledChar

	NeedsRedraw bool

	runeCounter      uint64
	usingSlowRefresh bool

	Cursor ecma48.Cursor

	renderer ecma48.Renderer

	// parentSetCursor sets physical host's cursor taking the pane location into account
	parentSetCursor func(x, y int)

	storedCursorX, storedCursorY int

	scrollingRegion ScrollingRegion

	ChangePause   chan bool
	IsPaused      bool
	DebugSlowMode bool
}

// NewVTerm returns a VTerm ready to be used by its exported methods
func NewVTerm(renderer ecma48.Renderer, parentSetCursor func(x, y int)) *VTerm {
	w := 20
	h := 20

	screen := [][]ecma48.StyledChar{}
	for j := 0; j < h; j++ {
		row := []ecma48.StyledChar{}
		for i := 0; i < w; i++ {
			row = append(row, ecma48.StyledChar{
				Rune:  ' ',
				Style: ecma48.Style{},
			})
		}
		screen = append(screen, row)
	}

	v := &VTerm{
		x: 0, y: 0,
		w:                w,
		h:                h,
		Screen:           screen,
		Scrollback:       [][]ecma48.StyledChar{},
		UsingAltScreen:   false,
		Cursor:           ecma48.Cursor{},
		usingSlowRefresh: false,
		renderer:         renderer,
		parentSetCursor:  parentSetCursor,
		scrollingRegion:  ScrollingRegion{top: 0, bottom: h},
		NeedsRedraw:      false,
		ChangePause:      make(chan bool, 1),
		IsPaused:         false,
		DebugSlowMode:    false,
	}

	return v
}

// Kill safely shuts down all vterm processes for the instance
func (v *VTerm) Kill() {
	v.usingSlowRefresh = false
}

// Reshape safely updates a VTerm's width & height
func (v *VTerm) Reshape(x, y, w, h int) {
	v.x = x
	v.y = y

	if len(v.Screen) > h {
		diff := len(v.Screen) - h
		v.Scrollback = append(v.Scrollback, v.Screen[:diff]...)
		v.Screen = v.Screen[diff:]
	}

	for y := 0; y < len(v.Screen); y++ {
		for x := 0; x <= w; x++ {
			if x >= len(v.Screen[y]) {
				v.Screen[y] = append(v.Screen[y], ecma48.StyledChar{Rune: ' ', Style: ecma48.Style{}})
			}
		}
	}

	if v.scrollingRegion.top == 0 && v.scrollingRegion.bottom == v.h {
		v.scrollingRegion.bottom = h
	}

	v.w = w
	v.h = h

	if v.Cursor.Y >= h {
		v.setCursorY(h - 1)
	}

	if v.Cursor.X >= w {
		v.setCursorX(w - 1)
	}

	v.RedrawWindow()
}

package vterm

import (
	"log"

	"github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"
)

func (v *VTerm) handleEraseInDisplay(directive int) {
	switch directive {
	case 0: // clear from Cursor to end of screen
		for i := v.Cursor.X; i < len(v.Screen[v.Cursor.Y]); i++ {
			v.setChar(i, v.Cursor.Y, ' ')
		}
		if v.Cursor.Y+1 < len(v.Screen) {
			for j := v.Cursor.Y + 1; j < len(v.Screen); j++ {
				for i := 0; i < len(v.Screen[j]); i++ {
					v.setChar(i, j, ' ')
				}
			}
		}
	case 1: // clear from Cursor to beginning of screen
		for j := 0; j < v.Cursor.Y; j++ {
			for i := 0; i < len(v.Screen[j]); i++ {
				v.setChar(i, j, ' ')
			}
		}
	case 2: // clear entire screen (and move Cursor to top left?)
		for i := 0; i < v.h; i++ {
			if i >= len(v.Screen) {
				newLine := make([]ecma48.StyledChar, v.w)
				for x := range newLine {
					newLine[x].Style = v.Cursor.Style
				}
				v.Screen = append(v.Screen, newLine)
			}
			for j := range v.Screen[i] {
				v.setChar(j, i, ' ')
			}
		}
		v.setCursorPos(0, 0)
	case 3: // clear entire screen and delete all lines saved in scrollback buffer
		v.Scrollback = [][]ecma48.StyledChar{}
		for j := range v.Screen {
			for i := range v.Screen[j] {
				v.setChar(i, j, ' ')
			}
		}
		v.setCursorPos(0, 0)
	default:
		log.Printf("Unrecognized erase in display directive: %d", directive)
	}
	v.RedrawWindow()
}

func (v *VTerm) handleEraseInLine(directive int) {
	var min, max int
	switch directive {
	case 0: // clear from Cursor to end of line
		min = v.Cursor.X
		max = len(v.Screen[v.Cursor.Y])
	case 1: // clear from Cursor to beginning of line
		min = 0
		max = v.Cursor.X + 1
	case 2: // clear entire line; Cursor position remains the same
		min = 0
		max = len(v.Screen[v.Cursor.Y])
	default:
		log.Printf("Unrecognized erase in line directive: %d", directive)
		return
	}

	for i := min; i < max; i++ {
		v.setChar(i, v.Cursor.Y, ' ')
	}
}

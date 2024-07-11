package vterm

import "github.com/sst/ion/cmd/sst/mosaic/multiplexer2/ecma48"

// TODO: handle DEC private modes

func (v *VTerm) ProcessStdin(in ecma48.Output) []byte {
	switch x := in.Parsed.(type) {
	case ecma48.CursorMovement:
		switch x.Direction {
		case ecma48.Up:
			return []byte("\x1bOA")
		case ecma48.Down:
			return []byte("\x1bOB")
		case ecma48.Right:
			return []byte("\x1bOC")
		case ecma48.Left:
			return []byte("\x1bOD")
		}
	}
	return []byte(string(in.Raw))
}

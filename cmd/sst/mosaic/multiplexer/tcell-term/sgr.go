package tcellterm

import "github.com/gdamore/tcell/v2"

func (vt *VT) sgr(params []int) {
	if len(params) == 0 {
		params = []int{0}
	}
	for i := 0; i < len(params); i += 1 {
		switch params[i] {
		case 0:
			vt.cursor.attrs = tcell.StyleDefault
		case 1:
			vt.cursor.attrs = vt.cursor.attrs.Bold(true)
		case 2:
			vt.cursor.attrs = vt.cursor.attrs.Dim(true)
		case 3:
			vt.cursor.attrs = vt.cursor.attrs.Italic(true)
		case 4:
			vt.cursor.attrs = vt.cursor.attrs.Underline(true)
		case 5:
			vt.cursor.attrs = vt.cursor.attrs.Blink(true)
		case 7:
			vt.cursor.attrs = vt.cursor.attrs.Reverse(true)
		case 8:
			// Invisible, not supported
		case 9:
			vt.cursor.attrs = vt.cursor.attrs.StrikeThrough(true)
		case 21:
			// Double underlined, not supported
		case 22:
			vt.cursor.attrs = vt.cursor.attrs.Bold(false).Dim(false)
		case 23:
			vt.cursor.attrs = vt.cursor.attrs.Italic(false)
		case 24:
			vt.cursor.attrs = vt.cursor.attrs.Underline(false)
		case 25:
			vt.cursor.attrs = vt.cursor.attrs.Blink(false)
		case 27:
			vt.cursor.attrs = vt.cursor.attrs.Reverse(false)
		case 28:
			// Not invisible, not supported
		case 29:
			vt.cursor.attrs = vt.cursor.attrs.StrikeThrough(false)
		case 30, 31, 32, 33, 34, 35, 36, 37:
			color := tcell.PaletteColor(params[i] - 30)
			vt.cursor.attrs = vt.cursor.attrs.Foreground(color)
		case 38:
			var color tcell.Color
			if len(params[i:]) < 3 {
				// Malformed without at least 3 params. Don't
				// set any more attributes at this point
				return
			}
			switch params[i+1] {
			case 2:
				if len(params[i:]) < 5 {
					// Malformed without at least5 params.
					// Don't set any more attributes at this
					// point
					return
				}
				color = tcell.NewRGBColor(
					int32(params[i+2]),
					int32(params[i+3]),
					int32(params[i+4]),
				)
				i += 4
			case 5:
				color = tcell.PaletteColor(params[i+2])
				i += 2
			default:
				// Malformed
				return
			}
			vt.cursor.attrs = vt.cursor.attrs.Foreground(color)
		case 39:
			vt.cursor.attrs = vt.cursor.attrs.Foreground(tcell.ColorDefault)
		case 40, 41, 42, 43, 44, 45, 46, 47:
			color := tcell.PaletteColor(params[i] - 40)
			vt.cursor.attrs = vt.cursor.attrs.Background(color)
		case 48:
			var color tcell.Color
			if len(params[i:]) < 3 {
				// Malformed without at least 3 params. Don't
				// set any more attributes at this point
				return
			}
			switch params[i+1] {
			case 2:
				if len(params[i:]) < 5 {
					// Malformed without at least5 params.
					// Don't set any more attributes at this
					// point
					return
				}
				color = tcell.NewRGBColor(
					int32(params[i+2]),
					int32(params[i+3]),
					int32(params[i+4]),
				)
				i += 4
			case 5:
				color = tcell.PaletteColor(params[i+2])
				i += 2
			default:
				// Malformed
				return
			}
			vt.cursor.attrs = vt.cursor.attrs.Background(color)
		case 49:
			vt.cursor.attrs = vt.cursor.attrs.Background(tcell.ColorDefault)
		case 90, 91, 92, 93, 94, 95, 96, 97:
			color := tcell.PaletteColor(params[i] - 90 + 8)
			vt.cursor.attrs = vt.cursor.attrs.Foreground(color)
		case 100, 101, 102, 103, 104, 105, 106, 107:
			color := tcell.PaletteColor(params[i] - 100 + 8)
			vt.cursor.attrs = vt.cursor.attrs.Background(color)
		}
	}
}

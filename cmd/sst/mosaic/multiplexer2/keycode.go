package multiplexer

import (
	"strings"

	"github.com/gdamore/tcell/v2"
)

func keyCode(ev *tcell.EventKey) string {
	key := strings.Builder{}
	switch ev.Modifiers() {
	case tcell.ModNone:
		switch ev.Key() {
		case tcell.KeyRune:
			key.WriteRune(ev.Rune())
		default:
			if str, ok := keyCodes[ev.Key()]; ok {
				key.WriteString(str)
			} else {
				key.WriteRune(rune(ev.Key()))
			}
		}
	case tcell.ModShift:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(info.KeyShfUp)
		case tcell.KeyDown:
			key.WriteString(info.KeyShfDown)
		case tcell.KeyRight:
			key.WriteString(info.KeyShfRight)
		case tcell.KeyLeft:
			key.WriteString(info.KeyShfLeft)
		case tcell.KeyHome:
			key.WriteString(info.KeyShfHome)
		case tcell.KeyEnd:
			key.WriteString(info.KeyShfEnd)
		case tcell.KeyInsert:
			key.WriteString(info.KeyShfInsert)
		case tcell.KeyDelete:
			key.WriteString(info.KeyShfDelete)
		case tcell.KeyPgUp:
			key.WriteString(info.KeyShfPgUp)
		case tcell.KeyPgDn:
			key.WriteString(info.KeyShfPgDn)
		case tcell.KeyF1:
			key.WriteString(info.KeyF13)
		case tcell.KeyF2:
			key.WriteString(info.KeyF14)
		case tcell.KeyF3:
			key.WriteString(info.KeyF15)
		case tcell.KeyF4:
			key.WriteString(info.KeyF16)
		case tcell.KeyF5:
			key.WriteString(info.KeyF17)
		case tcell.KeyF6:
			key.WriteString(info.KeyF18)
		case tcell.KeyF7:
			key.WriteString(info.KeyF19)
		case tcell.KeyF8:
			key.WriteString(info.KeyF20)
		case tcell.KeyF9:
			key.WriteString(info.KeyF21)
		case tcell.KeyF10:
			key.WriteString(info.KeyF22)
		case tcell.KeyF11:
			key.WriteString(info.KeyF23)
		case tcell.KeyF12:
			key.WriteString(info.KeyF24)
		}
	case tcell.ModAlt:
		switch ev.Key() {
		case tcell.KeyRune:
			key.WriteString("\x1b")
			key.WriteRune(ev.Rune())
		case tcell.KeyUp:
			key.WriteString(info.KeyAltUp)
		case tcell.KeyDown:
			key.WriteString(info.KeyAltDown)
		case tcell.KeyRight:
			key.WriteString(info.KeyAltRight)
		case tcell.KeyLeft:
			key.WriteString(info.KeyAltLeft)
		case tcell.KeyHome:
			key.WriteString(info.KeyAltHome)
		case tcell.KeyEnd:
			key.WriteString(info.KeyAltEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyAltInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyAltDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyAltPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyAltPgDown)
		case tcell.KeyF1:
			key.WriteString(info.KeyF49)
		case tcell.KeyF2:
			key.WriteString(info.KeyF50)
		case tcell.KeyF3:
			key.WriteString(info.KeyF51)
		case tcell.KeyF4:
			key.WriteString(info.KeyF53)
		case tcell.KeyF5:
			key.WriteString(info.KeyF54)
		case tcell.KeyF6:
			key.WriteString(info.KeyF55)
		case tcell.KeyF7:
			key.WriteString(info.KeyF56)
		case tcell.KeyF8:
			key.WriteString(info.KeyF57)
		case tcell.KeyF9:
			key.WriteString(info.KeyF58)
		case tcell.KeyF10:
			key.WriteString(info.KeyF59)
		case tcell.KeyF11:
			key.WriteString(info.KeyF60)
		case tcell.KeyF12:
			key.WriteString(info.KeyF61)
		}
	case tcell.ModCtrl:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(info.KeyCtrlUp)
		case tcell.KeyDown:
			key.WriteString(info.KeyCtrlDown)
		case tcell.KeyRight:
			key.WriteString(info.KeyCtrlRight)
		case tcell.KeyLeft:
			key.WriteString(info.KeyCtrlLeft)
		case tcell.KeyHome:
			key.WriteString(info.KeyCtrlHome)
		case tcell.KeyEnd:
			key.WriteString(info.KeyCtrlEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyCtrlInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyCtrlDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyCtrlPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyCtrlPgDown)
		case tcell.KeyF1:
			key.WriteString(info.KeyF25)
		case tcell.KeyF2:
			key.WriteString(info.KeyF26)
		case tcell.KeyF3:
			key.WriteString(info.KeyF27)
		case tcell.KeyF4:
			key.WriteString(info.KeyF28)
		case tcell.KeyF5:
			key.WriteString(info.KeyF29)
		case tcell.KeyF6:
			key.WriteString(info.KeyF30)
		case tcell.KeyF7:
			key.WriteString(info.KeyF31)
		case tcell.KeyF8:
			key.WriteString(info.KeyF32)
		case tcell.KeyF9:
			key.WriteString(info.KeyF33)
		case tcell.KeyF10:
			key.WriteString(info.KeyF34)
		case tcell.KeyF11:
			key.WriteString(info.KeyF35)
		case tcell.KeyF12:
			key.WriteString(info.KeyF36)
		default:
			key.WriteRune(ev.Rune())
		}
	case tcell.ModCtrl | tcell.ModShift:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(info.KeyCtrlShfUp)
		case tcell.KeyDown:
			key.WriteString(info.KeyCtrlShfDown)
		case tcell.KeyRight:
			key.WriteString(info.KeyCtrlShfRight)
		case tcell.KeyLeft:
			key.WriteString(info.KeyCtrlShfLeft)
		case tcell.KeyHome:
			key.WriteString(info.KeyCtrlShfHome)
		case tcell.KeyEnd:
			key.WriteString(info.KeyCtrlShfEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyCtrlShfInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyCtrlShfDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyCtrlShfPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyCtrlShfPgDown)
		case tcell.KeyF1:
			key.WriteString(info.KeyF37)
		case tcell.KeyF2:
			key.WriteString(info.KeyF38)
		case tcell.KeyF3:
			key.WriteString(info.KeyF39)
		case tcell.KeyF4:
			key.WriteString(info.KeyF40)
		case tcell.KeyF5:
			key.WriteString(info.KeyF41)
		case tcell.KeyF6:
			key.WriteString(info.KeyF42)
		case tcell.KeyF7:
			key.WriteString(info.KeyF43)
		case tcell.KeyF8:
			key.WriteString(info.KeyF44)
		case tcell.KeyF9:
			key.WriteString(info.KeyF45)
		case tcell.KeyF10:
			key.WriteString(info.KeyF46)
		case tcell.KeyF11:
			key.WriteString(info.KeyF47)
		case tcell.KeyF12:
			key.WriteString(info.KeyF48)
		}
	case tcell.ModAlt | tcell.ModShift:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(info.KeyAltShfUp)
		case tcell.KeyDown:
			key.WriteString(info.KeyAltShfDown)
		case tcell.KeyRight:
			key.WriteString(info.KeyAltShfRight)
		case tcell.KeyLeft:
			key.WriteString(info.KeyAltShfLeft)
		case tcell.KeyHome:
			key.WriteString(info.KeyAltShfHome)
		case tcell.KeyEnd:
			key.WriteString(info.KeyAltShfEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyAltShfInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyAltShfDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyAltShfPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyAltShfPgDown)
		case tcell.KeyF1:
			key.WriteString(info.KeyF61)
		case tcell.KeyF2:
			key.WriteString(info.KeyF62)
		case tcell.KeyF3:
			key.WriteString(info.KeyF63)
		case tcell.KeyF4:
			key.WriteString(info.KeyF64)
		}
	case tcell.ModAlt | tcell.ModCtrl:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(extendedInfo.KeyCtrlAltUp)
		case tcell.KeyDown:
			key.WriteString(extendedInfo.KeyCtrlAltDown)
		case tcell.KeyRight:
			key.WriteString(extendedInfo.KeyCtrlAltRight)
		case tcell.KeyLeft:
			key.WriteString(extendedInfo.KeyCtrlAltLeft)
		case tcell.KeyHome:
			key.WriteString(extendedInfo.KeyCtrlAltHome)
		case tcell.KeyEnd:
			key.WriteString(extendedInfo.KeyCtrlAltEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyCtrlAltInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyCtrlAltDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyCtrlAltPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyCtrlAltPgDown)
		}
	case tcell.ModAlt | tcell.ModCtrl | tcell.ModShift:
		switch ev.Key() {
		case tcell.KeyUp:
			key.WriteString(extendedInfo.KeyCtrlAltShfUp)
		case tcell.KeyDown:
			key.WriteString(extendedInfo.KeyCtrlAltShfDown)
		case tcell.KeyRight:
			key.WriteString(extendedInfo.KeyCtrlAltShfRight)
		case tcell.KeyLeft:
			key.WriteString(extendedInfo.KeyCtrlAltShfLeft)
		case tcell.KeyHome:
			key.WriteString(extendedInfo.KeyCtrlAltShfHome)
		case tcell.KeyEnd:
			key.WriteString(extendedInfo.KeyCtrlAltShfEnd)
		case tcell.KeyInsert:
			key.WriteString(extendedInfo.KeyCtrlAltShfInsert)
		case tcell.KeyDelete:
			key.WriteString(extendedInfo.KeyCtrlAltShfDelete)
		case tcell.KeyPgUp:
			key.WriteString(extendedInfo.KeyCtrlAltShfPgUp)
		case tcell.KeyPgDn:
			key.WriteString(extendedInfo.KeyCtrlAltShfPgDown)
		}
	case tcell.ModMeta:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";9~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;9")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModShift:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";10~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;10")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModAlt:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";11~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;11")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModAlt | tcell.ModShift:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";12~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;12")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModCtrl:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";13~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;13")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModCtrl | tcell.ModShift:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";14~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;14")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModCtrl | tcell.ModAlt:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";15~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;15")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	case tcell.ModMeta | tcell.ModCtrl | tcell.ModAlt | tcell.ModShift:
		// Meta keys we just do the math, only allowing modifiable keys
		switch ev.Key() {
		case tcell.KeyUp:
		case tcell.KeyDown:
		case tcell.KeyRight:
		case tcell.KeyLeft:
		case tcell.KeyHome:
		case tcell.KeyEnd:
		case tcell.KeyInsert:
		case tcell.KeyDelete:
		case tcell.KeyPgUp:
		case tcell.KeyPgDn:
		case tcell.KeyF1:
		case tcell.KeyF2:
		case tcell.KeyF3:
		case tcell.KeyF4:
		case tcell.KeyF5:
		case tcell.KeyF6:
		case tcell.KeyF7:
		case tcell.KeyF8:
		case tcell.KeyF9:
		case tcell.KeyF10:
		case tcell.KeyF11:
		case tcell.KeyF12:
		default:
			return ""
		}
		kc := keyCodes[ev.Key()]
		switch {
		case strings.HasSuffix(kc, "~"):
			key.WriteString(strings.TrimSuffix(kc, "~"))
			key.WriteString(";16~")
		default:
			// Tcell is using khome etc instead of home, these are
			// different codes (\x1b0H vs \x1b[H)
			key.WriteString("\x1b[1;16")
			key.WriteString(strings.TrimPrefix(kc, "\x1bO"))
		}
	}
	return key.String()
}

var keyCodes = map[tcell.Key]string{
	tcell.KeyBackspace: info.KeyBackspace,
	tcell.KeyF1:        info.KeyF1,
	tcell.KeyF2:        info.KeyF2,
	tcell.KeyF3:        info.KeyF3,
	tcell.KeyF4:        info.KeyF4,
	tcell.KeyF5:        info.KeyF5,
	tcell.KeyF6:        info.KeyF6,
	tcell.KeyF7:        info.KeyF7,
	tcell.KeyF8:        info.KeyF8,
	tcell.KeyF9:        info.KeyF9,
	tcell.KeyF10:       info.KeyF10,
	tcell.KeyF11:       info.KeyF11,
	tcell.KeyF12:       info.KeyF12,
	tcell.KeyF13:       info.KeyF13,
	tcell.KeyF14:       info.KeyF14,
	tcell.KeyF15:       info.KeyF15,
	tcell.KeyF16:       info.KeyF16,
	tcell.KeyF17:       info.KeyF17,
	tcell.KeyF18:       info.KeyF18,
	tcell.KeyF19:       info.KeyF19,
	tcell.KeyF20:       info.KeyF20,
	tcell.KeyF21:       info.KeyF21,
	tcell.KeyF22:       info.KeyF22,
	tcell.KeyF23:       info.KeyF23,
	tcell.KeyF24:       info.KeyF24,
	tcell.KeyF25:       info.KeyF25,
	tcell.KeyF26:       info.KeyF26,
	tcell.KeyF27:       info.KeyF27,
	tcell.KeyF28:       info.KeyF28,
	tcell.KeyF29:       info.KeyF29,
	tcell.KeyF30:       info.KeyF30,
	tcell.KeyF31:       info.KeyF31,
	tcell.KeyF32:       info.KeyF32,
	tcell.KeyF33:       info.KeyF33,
	tcell.KeyF34:       info.KeyF34,
	tcell.KeyF35:       info.KeyF35,
	tcell.KeyF36:       info.KeyF36,
	tcell.KeyF37:       info.KeyF37,
	tcell.KeyF38:       info.KeyF38,
	tcell.KeyF39:       info.KeyF39,
	tcell.KeyF40:       info.KeyF40,
	tcell.KeyF41:       info.KeyF41,
	tcell.KeyF42:       info.KeyF42,
	tcell.KeyF43:       info.KeyF43,
	tcell.KeyF44:       info.KeyF44,
	tcell.KeyF45:       info.KeyF45,
	tcell.KeyF46:       info.KeyF46,
	tcell.KeyF47:       info.KeyF47,
	tcell.KeyF48:       info.KeyF48,
	tcell.KeyF49:       info.KeyF49,
	tcell.KeyF50:       info.KeyF50,
	tcell.KeyF51:       info.KeyF51,
	tcell.KeyF52:       info.KeyF52,
	tcell.KeyF53:       info.KeyF53,
	tcell.KeyF54:       info.KeyF54,
	tcell.KeyF55:       info.KeyF55,
	tcell.KeyF56:       info.KeyF56,
	tcell.KeyF57:       info.KeyF57,
	tcell.KeyF58:       info.KeyF58,
	tcell.KeyF59:       info.KeyF59,
	tcell.KeyF60:       info.KeyF60,
	tcell.KeyF61:       info.KeyF61,
	tcell.KeyF62:       info.KeyF62,
	tcell.KeyF63:       info.KeyF63,
	tcell.KeyF64:       info.KeyF64,
	tcell.KeyInsert:    info.KeyInsert,
	tcell.KeyDelete:    info.KeyDelete,
	tcell.KeyHome:      info.KeyHome,
	tcell.KeyEnd:       info.KeyEnd,
	tcell.KeyHelp:      info.KeyHelp,
	tcell.KeyPgUp:      info.KeyPgUp,
	tcell.KeyPgDn:      info.KeyPgDn,
	tcell.KeyUp:        info.KeyUp,
	tcell.KeyDown:      info.KeyDown,
	tcell.KeyLeft:      info.KeyLeft,
	tcell.KeyRight:     info.KeyRight,
	tcell.KeyBacktab:   info.KeyBacktab,
	tcell.KeyExit:      info.KeyExit,
	tcell.KeyClear:     info.KeyClear,
	tcell.KeyPrint:     info.KeyPrint,
	tcell.KeyCancel:    info.KeyCancel,
}

package tcellterm

type mode int

const (
	// ANSI-Standardized modes
	//
	// Keyboard Action mode
	kam mode = 1 << iota
	// Insert/Replace mode
	irm
	// Send/Receive mode
	srm
	// Line feed/new line mode
	lnm

	// ANSI-Compatible DEC Private Modes
	//
	// Cursor Key mode
	decckm
	// ANSI/VT52 mode
	decanm
	// Column mode
	deccolm
	// Scroll mode
	decsclm
	// Origin mode
	decom
	// Autowrap mode
	decawm
	// Autorepeat mode
	decarm
	// Printer form feed mode
	decpff
	// Printer extent mode
	decpex
	// Text Cursor Enable mode
	dectcem
	// National replacement character sets
	decnrcm

	// xterm
	//
	// Use alternate screen
	smcup
	// Bracketed paste
	paste
	// vt220 mouse
	mouseButtons
	// vt220 + drag
	mouseDrag
	// vt220 + all motion
	mouseMotion
	// Mouse SGR mode
	mouseSGR
	// Alternate scroll
	altScroll
)

func (vt *VT) sm(params []int) {
	for _, param := range params {
		switch param {
		case 2:
			vt.mode |= kam
		case 4:
			vt.mode |= irm
		case 12:
			vt.mode |= srm
		case 20:
			vt.mode |= lnm
		}
	}
}

func (vt *VT) rm(params []int) {
	for _, param := range params {
		switch param {
		case 2:
			vt.mode &^= kam
		case 4:
			vt.mode &^= irm
		case 12:
			vt.mode &^= srm
		case 20:
			vt.mode &^= lnm
		}
	}
}

func (vt *VT) decset(params []int) {
	for _, param := range params {
		switch param {
		case 1:
			vt.mode |= decckm
		case 2:
			vt.mode |= decanm
		case 3:
			vt.mode |= deccolm
		case 4:
			vt.mode |= decsclm
		case 5:
		case 6:
			vt.mode |= decom
		case 7:
			vt.mode |= decawm
			vt.lastCol = false
		case 8:
			vt.mode |= decarm
		case 25:
			vt.mode |= dectcem
		case 1000:
			vt.mode |= mouseButtons
		case 1002:
			vt.mode |= mouseDrag
		case 1003:
			vt.mode |= mouseMotion
		case 1006:
			vt.mode |= mouseSGR
		case 1007:
			vt.mode |= altScroll
		case 1049:
			vt.decsc()
			vt.activeScreen = vt.altScreen
			vt.mode |= smcup
			// Enable altScroll in the alt screen. This is only used
			// if the application doesn't enable mouse
			vt.mode |= altScroll
		case 2004:
			vt.mode |= paste
		}
	}
}

func (vt *VT) decrst(params []int) {
	for _, param := range params {
		switch param {
		case 1:
			vt.mode &^= decckm
		case 2:
			vt.mode &^= decanm
		case 3:
			vt.mode &^= deccolm
		case 4:
			vt.mode &^= decsclm
		case 5:
		case 6:
			vt.mode &^= decom
		case 7:
			vt.mode &^= decawm
			vt.lastCol = false
		case 8:
			vt.mode &^= decarm
		case 25:
			vt.mode &^= dectcem
		case 1000:
			vt.mode &^= mouseButtons
		case 1002:
			vt.mode &^= mouseDrag
		case 1003:
			vt.mode &^= mouseMotion
		case 1006:
			vt.mode &^= mouseSGR
		case 1007:
			vt.mode &^= altScroll
		case 1049:
			if vt.mode&smcup != 0 {
				// Only clear if we were in the alternate
				vt.ed(2)
			}
			vt.activeScreen = vt.primaryScreen
			vt.mode &^= smcup
			vt.mode &^= altScroll
			vt.decrc()
		case 2004:
			vt.mode &^= paste
		}
	}
}

package ecma48

// Direction is Up, Down, Left, or Right
type Direction int

// Directions!
const (
	Up = iota
	Down
	Right
	Left
)

// ColorMode is the type of color associated with a cursor
type ColorMode int

const (
	// ColorNone is the default unset color state
	ColorNone ColorMode = iota
	// ColorBit3Normal is for the 8 default non-bright colors
	ColorBit3Normal
	// ColorBit3Bright is for the 8 default bright colors
	ColorBit3Bright
	// ColorBit8 is specified at https://en.wikipedia.org/w/index.php?title=ANSI_escape_code&oldid=873901864#8-bit
	ColorBit8
	// ColorBit24 is specified at https://en.wikipedia.org/w/index.php?title=ANSI_escape_code&oldid=873901864#24-bit
	ColorBit24
)

// Color stores sufficient data to reproduce an ANSI-encodable color
type Color struct {
	ColorMode
	Code int32
}

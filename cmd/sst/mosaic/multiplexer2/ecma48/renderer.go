package ecma48

type Renderer interface {
	HandleCh(PositionedChar)
	SetCursor(x, y int)
}

// A PositionedChar is a Char with a specific location on the screen
type PositionedChar struct {
	Rune     rune
	IsWide   bool
	PrevWide bool
	Cursor
}

// A Char is a rune with a visual style associated with it
type StyledChar struct {
	Rune     rune
	IsWide   bool
	PrevWide bool
	Style
}

// Cursor is Style along with position. Coordinates are relative to top left
type Cursor struct {
	X, Y int
	Style
}

// Style is the state of the terminal's drawing modes when printing a given character
type Style struct {
	Bold, Faint, Italic, Underline, Conceal, CrossedOut, Reverse bool

	Fg Color // foreground color
	Bg Color // background color
}

// Reset sets all rendering attributes of a cursor to their default values
func (s *Style) Reset() {
	s.Bold = false
	s.Faint = false
	s.Italic = false
	s.Underline = false
	s.Conceal = false
	s.CrossedOut = false
	s.Reverse = false

	s.Fg.ColorMode = ColorNone
	s.Bg.ColorMode = ColorNone

	// Resetting the codes makes styles easier to compare
	s.Fg.Code = 0
	s.Bg.Code = 0
}

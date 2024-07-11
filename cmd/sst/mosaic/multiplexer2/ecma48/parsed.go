package ecma48

// Output is the output of the parser
type Output struct {
	Raw []rune
	Parsed
}

// Parsed could be a simple character or maybe an escape sequence
type Parsed interface {
	// Debug() string
	// Raw() []byte
}

type EOF struct{}

// Unrecognized is when we don't understand the input
type Unrecognized string

type Esc struct{}

// Char is a single character that may occupy multiple cells
type Char struct {
	Rune   rune
	IsWide bool
}

type OSCCursorQuery struct{}

// CtrlChar is for ctrl+[character]
type CtrlChar struct {
	Char rune
}

// AltChar is for alt+[character]
type AltChar struct {
	Char rune
}

// AltShiftChar is for alt+shift+[character]
type AltShiftChar struct {
	Char rune
}

// Tab ('\t')
type Tab struct{}

// Newline ('\n')
type Newline struct{}

// CarriageReturn ('\r')
type CarriageReturn struct{}

// Backspace ('\b')
type Backspace struct{}

// Delete (0x7F)
type Delete struct{}

// CursorMovement is possibly caused by an arrow key
type CursorMovement struct {
	Direction
	N int

	Alt   bool
	Shift bool
	Ctrl  bool
}

// RI (Reverse Index)
type RI struct{}

// PrivateDEC is DECSET/DECRST (DEC Private Mode Set/Reset)
type PrivateDEC struct {
	On   bool
	Code int
}

// VPA (Vertical Line Position Absolute)
type VPA struct {
	Y int
}

// CNL (Cursor Next Line)
type CNL struct {
	YDiff uint
}

// CPL (Cursor Previous Line)
type CPL struct {
	YDiff uint
}

// CHA (Cursor Horizontal Absolute)
type CHA struct {
	X int
}

// CUP (Cursor Position)
type CUP struct {
	X int
	Y int
}

// ED (Erase in Display)
type ED struct {
	Directive int
}

// EL (Erase in Line)
type EL struct {
	Directive int
}

// ECH (Erase Characters)
type ECH struct {
	N int
}

// IL (Insert Lines)
type IL struct {
	N int
}

// ICH (Insert Characters)
type ICH struct {
	N int
}

// DL (Delete Lines)
type DL struct {
	N int
}

// DCH (Delete Characters)
type DCH struct {
	N int
}

// DECSTBM (Set Scrolling Region). Bottom is -1 if it should be the bottom of the screen
type DECSTBM struct {
	Top    int
	Bottom int
}

// SU (Scroll Up)
type SU struct {
	N uint
}

// SD (Scroll Down)
type SD struct {
	N uint
}

// SCOSC (Save Cursor Position)
type SCOSC struct{}

// SCORC (Restore Cursor Position)
type SCORC struct{}

type StyleReset struct{}

type StyleBold bool

type StyleConceal bool

type StyleCrossedOut bool

type StyleItalic bool

type StyleUnderline bool

type StyleFaint bool

type StyleReverse bool

type StyleForeground Color

type StyleBackground Color

type ScrollDown int

type ScrollUp int

type MouseDown struct {
	X, Y int
}

type MouseUp struct {
	X, Y int
}

type MouseDrag struct {
	X, Y int
}

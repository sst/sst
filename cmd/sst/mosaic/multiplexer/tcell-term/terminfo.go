package tcellterm

import "github.com/gdamore/tcell/v2/terminfo"

// extended terminfo defines additional keys in a singular place, if missing
// from the terminfo.Terminfo struct
type extendedTerminfo struct {
	KeyAltInsert string
	KeyAltDelete string
	KeyAltPgUp   string
	KeyAltPgDown string

	KeyCtrlInsert string
	KeyCtrlDelete string
	KeyCtrlPgUp   string
	KeyCtrlPgDown string

	KeyCtrlShfInsert string
	KeyCtrlShfDelete string
	KeyCtrlShfPgUp   string
	KeyCtrlShfPgDown string

	KeyAltShfInsert string
	KeyAltShfDelete string
	KeyAltShfPgUp   string
	KeyAltShfPgDown string

	KeyCtrlAltUp     string
	KeyCtrlAltDown   string
	KeyCtrlAltRight  string
	KeyCtrlAltLeft   string
	KeyCtrlAltHome   string
	KeyCtrlAltEnd    string
	KeyCtrlAltInsert string
	KeyCtrlAltDelete string
	KeyCtrlAltPgUp   string
	KeyCtrlAltPgDown string

	KeyCtrlAltShfUp     string
	KeyCtrlAltShfDown   string
	KeyCtrlAltShfRight  string
	KeyCtrlAltShfLeft   string
	KeyCtrlAltShfHome   string
	KeyCtrlAltShfEnd    string
	KeyCtrlAltShfInsert string
	KeyCtrlAltShfDelete string
	KeyCtrlAltShfPgUp   string
	KeyCtrlAltShfPgDown string
}

var extendedInfo = &extendedTerminfo{
	KeyAltInsert: "\x1b[2;3~",
	KeyAltDelete: "\x1b[3;3~",
	KeyAltPgUp:   "\x1b[5;3~",
	KeyAltPgDown: "\x1b[6;3~",

	KeyCtrlInsert: "\x1b[2;5~",
	KeyCtrlDelete: "\x1b[3;5~",
	KeyCtrlPgUp:   "\x1b[5;5~",
	KeyCtrlPgDown: "\x1b[6;5~",

	KeyCtrlShfInsert: "\x1b[2;6~",
	KeyCtrlShfDelete: "\x1b[3;6~",
	KeyCtrlShfPgUp:   "\x1b[5;6~",
	KeyCtrlShfPgDown: "\x1b[6;6~",

	KeyAltShfInsert: "\x1b[2;4~",
	KeyAltShfDelete: "\x1b[3;4~",
	KeyAltShfPgUp:   "\x1b[5;4~",
	KeyAltShfPgDown: "\x1b[6;4~",

	KeyCtrlAltUp:     "\x1b[1;7A",
	KeyCtrlAltDown:   "\x1b[1;7B",
	KeyCtrlAltRight:  "\x1b[1;7C",
	KeyCtrlAltLeft:   "\x1b[1;7D",
	KeyCtrlAltHome:   "\x1b[1;7H",
	KeyCtrlAltEnd:    "\x1b[1;7F",
	KeyCtrlAltInsert: "\x1b[2;7~",
	KeyCtrlAltDelete: "\x1b[3;7~",
	KeyCtrlAltPgUp:   "\x1b[5;7~",
	KeyCtrlAltPgDown: "\x1b[6;7~",

	KeyCtrlAltShfUp:     "\x1b[1;8A",
	KeyCtrlAltShfDown:   "\x1b[1;8B",
	KeyCtrlAltShfRight:  "\x1b[1;8C",
	KeyCtrlAltShfLeft:   "\x1b[1;8D",
	KeyCtrlAltShfHome:   "\x1b[1;8H",
	KeyCtrlAltShfEnd:    "\x1b[1;8F",
	KeyCtrlAltShfInsert: "\x1b[2;8~",
	KeyCtrlAltShfDelete: "\x1b[3;8~",
	KeyCtrlAltShfPgUp:   "\x1b[5;8~",
	KeyCtrlAltShfPgDown: "\x1b[6;8~",
}

var info = &terminfo.Terminfo{
	Name:        "tcell-term",
	Aliases:     []string{},
	Columns:     80,                   // cols
	Lines:       24,                   // lines
	Colors:      256,                  // colors
	Bell:        "\a",                 // bell
	Clear:       "\x1b[H\x1b[2J",      // clear
	EnterCA:     "\x1b[?1049h",        // smcup
	ExitCA:      "\x1b[?1049l",        // rmcup
	ShowCursor:  "\x1b[?12l\x1b[?25h", // cnorm
	HideCursor:  "\x1b[?25l",          // civis
	AttrOff:     "\x1b(B\x1b[m",       // sgr0
	Underline:   "\x1b[4m",            // smul
	Bold:        "\x1b[1m",            // bold
	Blink:       "\x1b[5m",            // blink
	Reverse:     "\x1b[7m",            // rev
	Dim:         "\x1b[2m",            // dim
	Italic:      "\x1b[3m",            // sitm
	EnterKeypad: "",                   // smkx
	ExitKeypad:  "",                   // rmkx

	SetFg: "\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38:5:%p1%d%;m",  // setaf
	SetBg: "\x1b[%?%p1%{8}%<%t4%p1%d%e%p1%{16}%<%t10%p1%{8}%-%d%e48:5:%p1%d%;m", // setab

	ResetFgBg:    "\x1b[39;49m",         // op
	SetCursor:    "\x1b[%i%p1%d;%p2%dH", // cup
	CursorBack1:  "\b",                  // cub1
	CursorUp1:    "\x1b[A",              // cuu1
	PadChar:      "\x00",                // pad
	KeyBackspace: "\x7F",                // kbs
	KeyF1:        "\x1bOP",              // kf1
	KeyF2:        "\x1bOQ",              // kf2
	KeyF3:        "\x1bOR",              // kf3
	KeyF4:        "\x1bOS",              // kf4
	KeyF5:        "\x1b[15~",            // kf5
	KeyF6:        "\x1b[17~",            // kf6
	KeyF7:        "\x1b[18~",            // kf7
	KeyF8:        "\x1b[19~",            // kf8
	KeyF9:        "\x1b[20~",            // kf9
	KeyF10:       "\x1b[21~",            // kf10
	KeyF11:       "\x1b[23~",            // kf11
	KeyF12:       "\x1b[24~",            // kf12
	KeyF13:       "\x1b[1;2P",           // kf13
	KeyF14:       "\x1b[1;2Q",           // kf14
	KeyF15:       "\x1b[1;2R",           // kf15
	KeyF16:       "\x1b[1;2S",           // kf16
	KeyF17:       "\x1b[15;2~",          // kf17
	KeyF18:       "\x1b[17;2~",          // kf18
	KeyF19:       "\x1b[18;2~",          // kf19
	KeyF20:       "\x1b[19;2~",          // kf20
	KeyF21:       "\x1b[20;2~",          // kf21
	KeyF22:       "\x1b[21;2~",          // kf22
	KeyF23:       "\x1b[23;2~",          // kf23
	KeyF24:       "\x1b[24;2~",          // kf24
	KeyF25:       "\x1b[1;5P",           // kf25
	KeyF26:       "\x1b[1;5Q",           // kf26
	KeyF27:       "\x1b[1;5R",           // kf27
	KeyF28:       "\x1b[1;5S",           // kf28
	KeyF29:       "\x1b[15;5~",          // kf29
	KeyF30:       "\x1b[17;5~",          // kf30
	KeyF31:       "\x1b[18;5~",          // kf31
	KeyF32:       "\x1b[19;5~",          // kf32
	KeyF33:       "\x1b[20;5~",          // kf33
	KeyF34:       "\x1b[21;5~",          // kf34
	KeyF35:       "\x1b[23;5~",          // kf35
	KeyF36:       "\x1b[24;5~",          // kf36
	KeyF37:       "\x1b[1;6P",           // kf37
	KeyF38:       "\x1b[1;6Q",           // kf38
	KeyF39:       "\x1b[1;6R",           // kf39
	KeyF40:       "\x1b[1;6S",           // kf40
	KeyF41:       "\x1b[15;6~",          // kf41
	KeyF42:       "\x1b[17;6~",          // kf42
	KeyF43:       "\x1b[18;6~",          // kf43
	KeyF44:       "\x1b[19;6~",          // kf44
	KeyF45:       "\x1b[20;6~",          // kf45
	KeyF46:       "\x1b[21;6~",          // kf46
	KeyF47:       "\x1b[23;6~",          // kf47
	KeyF48:       "\x1b[24;6~",          // kf48
	KeyF49:       "\x1b[1;3P",           // kf49
	KeyF50:       "\x1b[1;3Q",           // kf50
	KeyF51:       "\x1b[1;3R",           // kf51
	KeyF52:       "\x1b[1;3S",           // kf52
	KeyF53:       "\x1b[15;3~",          // kf53
	KeyF54:       "\x1b[17;3~",          // kf54
	KeyF55:       "\x1b[18;3~",          // kf55
	KeyF56:       "\x1b[19;3~",          // kf56
	KeyF57:       "\x1b[20;3~",          // kf57
	KeyF58:       "\x1b[21;3~",          // kf58
	KeyF59:       "\x1b[23;3~",          // kf59
	KeyF60:       "\x1b[24;3~",          // kf60
	KeyF61:       "\x1b[1;4P",           // kf61
	KeyF62:       "\x1b[1;4Q",           // kf62
	KeyF63:       "\x1b[1;4R",           // kf63
	KeyF64:       "\x1b[1;4S",           // kf64
	KeyInsert:    "\x1b[2~",             // kich1
	KeyDelete:    "\x1b[3~",             // kdch1
	KeyHome:      "\x1bOH",              // khome
	KeyEnd:       "\x1bOF",              // kend
	KeyHelp:      "",                    // khlp
	KeyPgUp:      "\x1b[5~",             // kpp
	KeyPgDn:      "\x1b[6~",             // knp
	KeyUp:        "\x1bOA",              // kcuu1
	KeyDown:      "\x1bOB",              // kcud1
	KeyRight:     "\x1bOC",              // kcuf1
	KeyLeft:      "\x1bOD",              // kcub1
	KeyBacktab:   "\x1b[Z",              // kcbt
	KeyExit:      "",                    // kext
	KeyClear:     "",                    // kclr
	KeyPrint:     "",                    // kprt
	KeyCancel:    "",                    // kcan
	Mouse:        "\x1b[<",              // kmous
	AltChars:     "",                    // acsc
	EnterAcs:     "\x1b(0",              // smacs
	ExitAcs:      "\x1b(B",              // rmacs
	EnableAcs:    "",                    // enacs
	KeyShfUp:     "\x1b[1;2A",           // kri
	KeyShfDown:   "\x1b[1;2B",           // kind
	KeyShfRight:  "\x1b[1;2C",           // kRIT
	KeyShfLeft:   "\x1b[1;2D",           // kLFT
	KeyShfHome:   "\x1b[1;2H",           // kHOM
	KeyShfEnd:    "\x1b[1;2F",           // kEND
	KeyShfInsert: "\x1b[2;2~",           // kIC
	KeyShfDelete: "\x1b[3;2~",           // kDC

	// These are non-standard extensions to terminfo.  This includes
	// true color support, and some additional keys.  Its kind of bizarre
	// that shifted variants of left and right exist, but not up and down.
	// Terminal support for these are going to vary amongst XTerm
	// emulations, so don't depend too much on them in your application.

	StrikeThrough: "", // smxx

	SetFgBg: "\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38:5:%p1%d%;;%?%p2%{8}%<%t4%p2%d%e%p2%{16}%<%t10%p2%{8}%-%d%e48:5:%p2%d%;m", // setfgbg

	SetFgBgRGB:              "",          // setfgbgrgb
	SetFgRGB:                "",          // setfrgb
	SetBgRGB:                "",          // setbrgb
	KeyShfPgUp:              "\x1b[5;2~", // kPRV
	KeyShfPgDn:              "\x1b[6;2~", // kNXT
	KeyCtrlUp:               "\x1b[1;5A", // ctrl-up
	KeyCtrlDown:             "\x1b[1;5B", // ctrl-left
	KeyCtrlRight:            "\x1b[1;5C", // ctrl-right
	KeyCtrlLeft:             "\x1b[1;5D", // ctrl-left
	KeyMetaUp:               "\x1b[1;9A", // meta-up
	KeyMetaDown:             "\x1b[1;9B", // meta-left
	KeyMetaRight:            "\x1b[1;9C", // meta-right
	KeyMetaLeft:             "\x1b[1;9D", // meta-left
	KeyAltUp:                "\x1b[1;3A", // alt-up
	KeyAltDown:              "\x1b[1;3B", // alt-left
	KeyAltRight:             "\x1b[1;3C", // alt-right
	KeyAltLeft:              "\x1b[1;3D", // alt-left
	KeyCtrlHome:             "\x1b[1;5H",
	KeyCtrlEnd:              "\x1b[1;5F",
	KeyMetaHome:             "\x1b[1;9H",
	KeyMetaEnd:              "\x1b[1;9F",
	KeyAltHome:              "\x1b[1;3H",
	KeyAltEnd:               "\x1b[1;3F",
	KeyAltShfUp:             "\x1b[1;4A",
	KeyAltShfDown:           "\x1b[1;4B",
	KeyAltShfRight:          "\x1b[1;4C",
	KeyAltShfLeft:           "\x1b[1;4D",
	KeyMetaShfUp:            "\x1b[1;10A",
	KeyMetaShfDown:          "\x1b[1;10B",
	KeyMetaShfLeft:          "\x1b[1;10C",
	KeyMetaShfRight:         "\x1b[1;10D",
	KeyCtrlShfUp:            "\x1b[1;6A",
	KeyCtrlShfDown:          "\x1b[1;6B",
	KeyCtrlShfRight:         "\x1b[1;6C",
	KeyCtrlShfLeft:          "\x1b[1;6D",
	KeyCtrlShfHome:          "\x1b[1;6H",
	KeyCtrlShfEnd:           "\x1b[1;6F",
	KeyAltShfHome:           "\x1b[1;4H",
	KeyAltShfEnd:            "\x1b[1;4F",
	KeyMetaShfHome:          "\x1b[1;10H",
	KeyMetaShfEnd:           "\x1b[1;10F",
	EnablePaste:             "\x1b[?2004h", // BE
	DisablePaste:            "\x1b[?2004l", // BD
	PasteStart:              "\x1b[200~",   // PS
	PasteEnd:                "\x1b[201~",   // PE
	Modifiers:               1,
	InsertChar:              "\x1b[@",   // string to insert a character (ich1)
	AutoMargin:              true,       // true if writing to last cell in line advances
	TrueColor:               true,       // true if the terminal supports direct color
	CursorDefault:           "\x1b[0 q", // Se
	CursorBlinkingBlock:     "\x1b[1 q",
	CursorSteadyBlock:       "\x1b[2 q",
	CursorBlinkingUnderline: "\x1b[3 q",
	CursorSteadyUnderline:   "\x1b[4 q",
	CursorBlinkingBar:       "\x1b[5 q",
	CursorSteadyBar:         "\x1b[6 q",
	EnterUrl:                "\x1b]8;%p2%s;%p1%s\x1b\\",
	ExitUrl:                 "\x1b]8;;\x1b\\",
	SetWindowSize:           "",
}

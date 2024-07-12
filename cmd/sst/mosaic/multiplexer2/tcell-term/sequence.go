package tcellterm

import (
	"fmt"
	"strings"
)

// Sequence is the generic data type of items emitted from the parser. These can
// be control sequences, escape sequences, or printable characters.
type Sequence interface{}

// A character which should be printed to the screen
type Print rune

func (seq Print) String() string {
	return fmt.Sprintf("Print: codepoint=0x%X rune='%c'", rune(seq), rune(seq))
}

// A C0 control code
type C0 rune

func (seq C0) String() string {
	return fmt.Sprintf("C0 0x%X", rune(seq))
}

// An escape sequence with intermediate characters
type ESC struct {
	Final        rune
	Intermediate []rune
}

func (seq ESC) String() string {
	return fmt.Sprintf("ESC %s %s", string(seq.Intermediate), string(seq.Final))
}

// A CSI Sequence
type CSI struct {
	Final        rune
	Intermediate []rune
	Parameters   []int
}

func (seq CSI) String() string {
	ps := []string{}
	for _, p := range seq.Parameters {
		ps = append(ps, fmt.Sprintf("%d", p))
	}
	params := strings.Join(ps, ";")
	s := fmt.Sprintf("CSI %s %s %s", string(seq.Intermediate), params, string(seq.Final))
	return s
}

// An OSC sequence. The Payload is the raw runes received, and must be parsed
// externally
type OSC struct {
	Payload []rune
}

func (seq OSC) String() string {
	return "OSC " + string(seq.Payload)
}

// Sent at the beginning of a DCS passthrough sequence.
type DCS struct {
	Final        rune
	Intermediate []rune
	Parameters   []int
}

// A rune which is passed through during a DCS passthrough sequence
type DCSData rune

// Sent at the end of a DCS passthrough sequence
type DCSEndOfData struct{}

// Sent when the underlying PTY is closed
type EOF struct{}

func (seq EOF) String() string {
	return "EOF"
}

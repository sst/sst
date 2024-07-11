package ecma48

import (
	"fmt"
)

// Formats into ANSI escape code
func (c *Color) ToANSI(bg bool) string {
	var offset int32
	if bg {
		offset = 10
	} else {
		offset = 0
	}

	switch c.ColorMode {
	case ColorNone:
		return fmt.Sprintf("\033[%dm", 39+offset)
	case ColorBit3Normal:
		return fmt.Sprintf("\033[%dm", 30+offset+c.Code)
	case ColorBit3Bright:
		return fmt.Sprintf("\033[%dm", 90+offset+c.Code)
	case ColorBit8:
		return fmt.Sprintf("\033[%d;5;%dm", 38+offset, c.Code)
	case ColorBit24:
		return fmt.Sprintf(
			"\033[%d;2;%d;%d;%dm", 38+offset,
			(c.Code>>16)&0xff, (c.Code>>8)&0xff, c.Code&0xff,
		)
	default:
		panic(fmt.Sprintf("Unexpected ColorMode: %v", c.ColorMode))
	}
}

package tcellterm

import "github.com/gdamore/tcell/v2"

// Surface represents a logical view on an area. It uses a subset of methods
// from a tcell.Screen or a views.View, in order to be a more broad
// implementation. Both a Screen and a View are also a Surface
type Surface interface {
	// SetContent is used to update the content of the Surface at the given
	// location.
	SetContent(x int, y int, ch rune, comb []rune, style tcell.Style)

	// Size represents the visible size.
	Size() (int, int)
}

package tcellterm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBS(t *testing.T) {
	vt := New()
	vt.Resize(4, 1)
	vt.cursor.col = 1
	vt.bs()
	assert.Equal(t, column(0), vt.cursor.col)
	vt.bs()
	assert.Equal(t, column(0), vt.cursor.col)
}

func TestLF(t *testing.T) {
	t.Run("LNM reset", func(t *testing.T) {
		vt := New()
		vt.Resize(2, 2)
		vt.print('v')
		vt.print('t')
		assert.Equal(t, "vt\n  ", vt.String())
		vt.lf()
		assert.Equal(t, "vt\n  ", vt.String())
		assert.Equal(t, column(1), vt.cursor.col)
		assert.Equal(t, row(1), vt.cursor.row)
	})

	t.Run("LNM set", func(t *testing.T) {
		vt := New()
		vt.Resize(2, 2)
		vt.print('v')
		vt.print('t')
		assert.Equal(t, "vt\n  ", vt.String())
		vt.mode |= lnm
		vt.lf()
		assert.Equal(t, "vt\n  ", vt.String())
		assert.Equal(t, column(0), vt.cursor.col)
		assert.Equal(t, row(1), vt.cursor.row)

		vt.print('x')
		vt.lf()
		assert.Equal(t, "x \n  ", vt.String())
		assert.Equal(t, column(0), vt.cursor.col)
		assert.Equal(t, row(1), vt.cursor.row)
	})
}

// // Linefeed 0x10
// func (vt *vt) LF() {
// 	switch {
// 	case vt.cursor.row == vt.margin.bottom:
// 		vt.ScrollUp(1)
// 	default:
// 		vt.cursor.row += 1
// 	}
//
// 	if vt.mode&LNM != LNM {
// 		return
// 	}
// 	vt.cursor.col = vt.margin.left
// }

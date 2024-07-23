package tcellterm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResize(t *testing.T) {
	vt := New()
	w := 4
	h := 1
	vt.Resize(w, h)
	assert.Equal(t, h, len(vt.activeScreen))
	assert.Equal(t, w, len(vt.activeScreen[0]))
}

func TestString(t *testing.T) {
	vt := New()
	w := 2
	h := 1
	vt.Resize(w, h)
	assert.Equal(t, "  ", vt.String())

	vt.activeScreen[0][0].content = 'v'
	vt.activeScreen[0][1].content = 't'
	assert.Equal(t, "vt", vt.String())
}

func TestPrint(t *testing.T) {
	t.Run("No modes", func(t *testing.T) {
		vt := New()
		vt.mode = 0
		w := 2
		h := 1
		vt.Resize(w, h)

		vt.print('v')
		vt.print('t')
		assert.Equal(t, "vt", vt.String())
		assert.Equal(t, column(1), vt.cursor.col)
		vt.print('x')
		assert.Equal(t, "vx", vt.String())
	})

	t.Run("IRM = set", func(t *testing.T) {
		vt := New()
		w := 4
		h := 1
		vt.Resize(w, h)

		vt.print('v')
		vt.print('t')
		vt.bs()
		vt.bs()
		assert.Equal(t, column(0), vt.cursor.col)
		assert.Equal(t, "vt  ", vt.String())
		vt.mode |= irm
		vt.print('i')
		assert.Equal(t, "ivt ", vt.String())
		vt.print('j')
		vt.print('k')
		assert.Equal(t, "ijkv", vt.String())
	})

	t.Run("DECAWM = set", func(t *testing.T) {
		vt := New()
		w := 3
		h := 2
		vt.Resize(w, h)
		vt.mode |= decawm

		vt.print('v')
		vt.print('t')
		assert.Equal(t, "vt \n   ", vt.String())
		vt.print('i')
		assert.Equal(t, "vti\n   ", vt.String())
		vt.print('j')
		assert.Equal(t, "vti\nj  ", vt.String())
	})

	t.Run("Wide character", func(t *testing.T) {
		vt := New()
		w := 1
		h := 1
		vt.Resize(w, h)

		vt.print('つ')
		assert.Equal(t, "つ", vt.String())
	})
}

func TestScrollUp(t *testing.T) {
	vt := New()
	vt.mode = 0
	w := 2
	h := 2
	vt.Resize(w, h)

	vt.print('v')
	vt.print('t')
	assert.Equal(t, "vt\n  ", vt.String())
	vt.scrollUp(1)
	assert.Equal(t, "  \n  ", vt.String())

	vt = New()
	w = 1
	h = 8
	vt.Resize(w, h)

	vt.cursor.row = 4
	vt.print('v')
	vt.lastCol = false
	vt.cursor.row = 7
	vt.print('t')
	vt.margin.bottom = 5
	assert.Equal(t, " \n \n \n \nv\n \n \nt", vt.String())
	vt.scrollUp(1)
	assert.Equal(t, " \n \n \nv\n \n \n \nt", vt.String())
}

func TestScrollDown(t *testing.T) {
	vt := New()
	w := 2
	h := 2
	vt.Resize(w, h)

	vt.print('v')
	vt.print('t')
	assert.Equal(t, "vt\n  ", vt.String())
	vt.scrollDown(1)
	assert.Equal(t, "  \nvt", vt.String())
	vt.lastCol = false
	vt.print('b')
	assert.Equal(t, " b\nvt", vt.String())
	vt.scrollDown(1)
	assert.Equal(t, "  \n b", vt.String())
}

func TestCombiningRunes(t *testing.T) {
	vt := New()
	vt.Resize(2, 2)
	vt.print('h')
	vt.print(0x337)
	vt.print(0x317)

	assert.Equal(t, "h̷̗ \n  ", vt.String())
}

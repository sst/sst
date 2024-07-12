package tcellterm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestICH(t *testing.T) {
	vt := New()
	vt.Resize(2, 1)
	vt.mode = 0

	vt.print('a')
	vt.print('b')
	assert.Equal(t, "ab", vt.String())
	vt.cursor.col = 0
	vt.ich(0)
	assert.Equal(t, " a", vt.String())
	assert.Equal(t, column(0), vt.cursor.col)
}

func TestCUU(t *testing.T) {
	vt := New()
	vt.Resize(2, 2)

	vt.cursor.row = 1
	vt.cursor.col = 1
	assert.Equal(t, column(1), vt.cursor.col)
	assert.Equal(t, row(1), vt.cursor.row)
	vt.cuu(0)

	assert.Equal(t, row(0), vt.cursor.row)
	assert.Equal(t, column(1), vt.cursor.col)
	vt.cuu(0)
	assert.Equal(t, row(0), vt.cursor.row)
	assert.Equal(t, column(1), vt.cursor.col)
}

func TestIL(t *testing.T) {
	vt := New()
	vt.Resize(2, 2)
	vt.print('a')
	vt.print('b')
	vt.cursor.col = 0
	vt.cursor.row = 0

	vt.il(1)
	assert.Equal(t, "  \nab", vt.String())

	vt = New()
	vt.Resize(2, 2)
	vt.print('a')
	vt.print('b')
	vt.cursor.col = 0
	vt.cursor.row = 0

	vt.il(2)
	assert.Equal(t, "  \n  ", vt.String())
}

func TestDL(t *testing.T) {
	vt := New()
	vt.Resize(2, 2)
	vt.cursor.row = 1
	vt.print('a')
	vt.print('b')
	assert.Equal(t, "  \nab", vt.String())
	vt.cursor.col = 0
	vt.cursor.row = 0

	vt.dl(1)
	assert.Equal(t, "ab\n  ", vt.String())

	vt = New()
	vt.Resize(2, 2)
	vt.cursor.row = 1
	vt.print('a')
	vt.print('b')
	assert.Equal(t, "  \nab", vt.String())
	vt.cursor.col = 0
	vt.cursor.row = 0
	vt.dl(2)
	assert.Equal(t, "  \n  ", vt.String())
}

func TestDCH(t *testing.T) {
	vt := New()
	vt.Resize(4, 1)
	vt.print('a')
	vt.print('b')
	vt.print('c')
	vt.print('d')
	assert.Equal(t, "abcd", vt.String())

	vt.dch(1)
	assert.Equal(t, "abc ", vt.String())
	vt.dch(2)
	assert.Equal(t, "abc ", vt.String())
	vt.print('d')
	assert.Equal(t, "abcd", vt.String())
	vt.cursor.col = 1
	vt.dch(2)
	assert.Equal(t, "ad  ", vt.String())
}

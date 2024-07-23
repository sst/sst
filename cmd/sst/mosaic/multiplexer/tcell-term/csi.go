package tcellterm

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
)

func (vt *VT) csi(csi string, params []int) {
	switch csi {
	case "@":
		vt.ich(ps(params))
	case "A":
		vt.cuu(ps(params))
	case "B":
		vt.cud(ps(params))
	case "C":
		vt.cuf(ps(params))
	case "D":
		vt.cub(ps(params))
	case "E":
		vt.cnl(ps(params))
	case "F":
		vt.cpl(ps(params))
	case "G":
		vt.cha(ps(params))
	case "H":
		vt.cup(params)
	case "I":
		vt.cht(ps(params))
	case "J":
		vt.ed(ps(params))
	case "K":
		vt.el(ps(params))
	case "L":
		vt.il(ps(params))
	case "M":
		vt.dl(ps(params))
	case "P":
		vt.dch(ps(params))
	case "S":
		ps := ps(params)
		if ps == 0 {
			ps = 1
		}
		vt.scrollUp(ps)
	case "T":
		// 5 params is XTHIMOUSE, ignore
		if len(params) == 5 {
			return
		}
		ps := ps(params)
		if ps == 0 {
			ps = 1
		}
		vt.scrollDown(ps)
	case "X":
		vt.ech(ps(params))
	case "Z":
		vt.cbt(ps(params))
	case "`":
		vt.hpa(ps(params))
	case "a":
		vt.hpr(ps(params))
	case "b":
		vt.rep(ps(params))
	case "c":
		// Send device attributes
		resp := strings.Builder{}
		// Response introducer
		resp.WriteString("\x1B[?")
		// We are a vt220
		resp.WriteString("62;")
		// We have sixel support
		resp.WriteString("4;")
		// We have ANSI color support
		resp.WriteString("22")
		// Response terminator
		resp.WriteString("c")
		vt.pty.WriteString(resp.String())
	case "d":
		vt.vpa(ps(params))
	case "e":
		vt.vpr(ps(params))
	case "f":
		// Same as CUP
		vt.cup(params)
	case "g":
		vt.tbc(ps(params))
	case "h":
		vt.sm(params)
	case "?h":
		vt.decset(params)
	case "l":
		vt.rm(params)
	case "?l":
		vt.decrst(params)
	case "m":
		vt.sgr(params)
	case "n":
		// Send device status report
		switch ps(params) {
		case 5:
			// "Ok"
			vt.pty.WriteString("\x1B[0n")
		case 6:
			// report cursor position
			// This sequence can be identical to a function key?
			// CSI r ; c R
			resp := fmt.Sprintf("\x1B[%d;%dR", vt.cursor.row+1, vt.cursor.col+1)
			vt.pty.WriteString(resp)
		}
	case "r":
		vt.decstbm(params)
	case "s":
		vt.decsc()
	case "u":
		vt.decrc()
	case " q":
		ps(params)
		vt.cursor.style = tcell.CursorStyle(ps(params))
	}
}

// Returns a single parameter from a slice of parameters, or 0 if the slice is
// empty
func ps(params []int) int {
	var ps int
	if len(params) > 0 {
		ps = params[0]
	}
	return ps
}

// Insert Blank Character (ICH) CSI Ps @
// Insert Ps blank characters. Cursor does not change position.
func (vt *VT) ich(ps int) {
	if ps == 0 {
		ps = 1
	}
	col := vt.cursor.col
	row := vt.cursor.row
	line := vt.activeScreen[row]
	for i := vt.margin.right; i > col; i -= 1 {
		if col+i > column(vt.width()-1) {
			break
		}
		if (i - column(ps)) < 0 {
			continue
		}
		line[i] = line[i-column(ps)]
	}
	for i := 0; i < ps; i += 1 {
		if int(col)+i >= (vt.width() - 1) {
			break
		}
		line[col+column(i)] = cell{
			content: ' ',
			width:   1,
		}
	}
}

// Cursur Up (CUU) CSI Ps A
// Move cursor up in same column, stopping at top margin
func (vt *VT) cuu(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	clamp := row(0)
	if vt.cursor.row >= vt.margin.top {
		clamp = vt.margin.top
	}
	vt.cursor.row -= row(ps)
	if vt.cursor.row < clamp {
		vt.cursor.row = clamp
	}
}

// Cursur Down (CUD) CSI Ps B
// Move cursor down in same column, stopping at bottom margin
func (vt *VT) cud(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.row += row(ps)
	if vt.cursor.row > vt.margin.bottom {
		vt.cursor.row = vt.margin.bottom
	}
}

// Cursur Forward (CUF) CSI Ps C
// Move cursor forward Ps columns, stopping at the right margin
func (vt *VT) cuf(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.col += column(ps)
	if vt.cursor.col > vt.margin.right {
		vt.cursor.col = vt.margin.right
	}
}

// Cursur Backward (CUB) CSI Ps D
// Move cursor backward Ps columns, stopping at the left margin
func (vt *VT) cub(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.col -= column(ps)
	if vt.cursor.col < vt.margin.left {
		vt.cursor.col = vt.margin.left
	}
}

// Cursor Next Line (CNL) CSI Ps E
// Move cursor to left margin Ps lines down, scrolling if necessary
func (vt *VT) cnl(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	for i := 0; i < ps; i += 1 {
		vt.nel()
	}
}

// Cursor Preceding Line (CPL) CSI Ps F
// Move cursor to left margin Ps lines down, scrolling if necessary
func (vt *VT) cpl(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	for i := 0; i < ps; i += 1 {
		vt.ri()
	}
	vt.cursor.col = vt.margin.left
}

// Cursor Character Absolute (CHA) CSI Ps G
// Move cursor to Ps column, stopping at right/left margin. Default is 1, but we
// default to 0 since our columns our 0 indexed
func (vt *VT) cha(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.col = column(ps - 1)
	if vt.cursor.col > vt.margin.right {
		vt.cursor.col = vt.margin.right
	}
	if vt.cursor.col < vt.margin.left {
		vt.cursor.col = vt.margin.left
	}
}

// Cursor Position (CUP) CSI Ps;Ps H
// Move cursor to the absolute position
func (vt *VT) cup(pm []int) {
	vt.lastCol = false
	switch len(pm) {
	case 0:
		pm = []int{1, 1}
	case 1:
		pm = []int{pm[0], 1}
	case 2:
	default:
		return
	}
	vt.cursor.row = row(pm[0] - 1)
	vt.cursor.col = column(pm[1] - 1)
	if vt.cursor.col > column(vt.width()-1) {
		vt.cursor.col = column(vt.width() - 1)
	}
	if vt.cursor.row > row(vt.height()-1) {
		vt.cursor.row = row(vt.height() - 1)
	}
}

// Cursor Forward Tabulation (CHT) CSI Ps I
// Move cursor forward Ps tab stops
func (vt *VT) cht(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	n := 0
	for _, ts := range vt.tabStop {
		if n == ps {
			break
		}
		if vt.cursor.col > ts {
			continue
		}
		vt.cursor.col = ts
		n += 1
	}
}

// Erase in Display (ED) CSI Ps J
func (vt *VT) ed(ps int) {
	switch ps {

	// Erases from the cursor to the end of the screen, including the cursor
	// position. Line attribute becomes single-height, single-width for all
	// completely erased lines.
	case 0:
		vt.lastCol = false
		for r := vt.cursor.row; r < row(vt.height()); r += 1 {
			for col := column(0); col < column(vt.width()); col += 1 {
				if r == vt.cursor.row && col < vt.cursor.col {
					// Don't erase current row before cursor
					continue
				}
				vt.activeScreen[r][col].erase(vt.cursor.attrs)
			}
		}

	// Erases from the beginning of the screen to the cursor, including the
	// cursor position. Line attribute becomes single-height, single-width
	// for all completely erased lines.
	case 1:
		vt.lastCol = false
		for r := row(0); r <= vt.cursor.row; r += 1 {
			for col := column(0); col < column(vt.width()); col += 1 {
				if r == vt.cursor.row && col > vt.cursor.col {
					// Don't erase current row after current
					// column
					break
				}
				vt.activeScreen[r][col].erase(vt.cursor.attrs)
			}
		}

	// Erases the complete display. All lines are erased and changed to
	// single-width. The cursor does not move.
	case 2:
		vt.lastCol = false
		for r := row(0); r < row(vt.height()); r += 1 {
			for col := column(0); col < column(vt.width()); col += 1 {
				vt.activeScreen[r][col].erase(vt.cursor.attrs)
			}
		}
	}
}

// Erase in Line (EL) CSI Ps K
func (vt *VT) el(ps int) {
	r := vt.cursor.row
	vt.lastCol = false
	switch ps {
	// Erases from the cursor to the end of the line, including the cursor
	// position. Line attribute is not affected.
	case 0:
		for col := vt.cursor.col; col < column(vt.width()); col += 1 {
			vt.activeScreen[r][col].erase(vt.cursor.attrs)
		}

	// Erases from the beginning of the line to the cursor, including the
	// cursor position. Line attribute is not affected.
	case 1:
		for col := column(0); col <= vt.cursor.col; col += 1 {
			vt.activeScreen[r][col].erase(vt.cursor.attrs)
		}

	// Erases the complete line.
	case 2:
		for col := column(0); col < column(vt.width()); col += 1 {
			vt.activeScreen[r][col].erase(vt.cursor.attrs)
		}
	}
}

// Insert Lines (IL) CSI Ps L
//
// Insert Ps lines at the cursor. If fewer than Ps lines remain from the current
// line to the end of the scrolling region, the number of lines inserted is the
// lesser number. Lines within the scrolling region at and below the cursor move
// down. Lines moved past the bottom margin are lost. The cursor is reset to the
// first column. This sequence is ignored when the cursor is outside the
// scrolling region.
func (vt *VT) il(ps int) {
	vt.lastCol = false
	if vt.cursor.row < vt.margin.top {
		return
	}
	if vt.cursor.row > vt.margin.bottom {
		return
	}
	if vt.cursor.col < vt.margin.left {
		return
	}
	if vt.cursor.col > vt.margin.right {
		return
	}

	if ps == 0 {
		ps = 1
	}

	if int(vt.margin.bottom-vt.cursor.row) < (ps - 1) {
		ps = int(vt.margin.bottom - vt.cursor.row)
	}

	// move the lines first
	for r := vt.margin.bottom; r >= (vt.cursor.row + row(ps)); r -= 1 {
		copy(vt.activeScreen[r], vt.activeScreen[r-row(ps)])
	}

	// insert the blank lines (we do this by erasing the cells)
	for r := row(0); r < row(ps); r += 1 {
		for col := vt.margin.left; col <= vt.margin.right; col += 1 {
			vt.activeScreen[vt.cursor.row+r][col].erase(vt.cursor.attrs)
		}
	}
	vt.cursor.col = vt.margin.left
}

// Delete Line (DL) CSI Ps M
//
// Deletes Ps lines starting at the line with the cursor. If fewer than Ps lines
// remain from the current line to the end of the scrolling region, the number
// of lines deleted is the lesser number. As lines are deleted, lines within the
// scrolling region and below the cursor move up, and blank lines are added at
// the bottom of the scrolling region. The cursor is reset to the first column.
// This sequence is ignored when the cursor is outside the scrolling region.
func (vt *VT) dl(ps int) {
	vt.lastCol = false
	if vt.cursor.row < vt.margin.top {
		return
	}
	if vt.cursor.row > vt.margin.bottom {
		return
	}
	if vt.cursor.col < vt.margin.left {
		return
	}
	if vt.cursor.col > vt.margin.right {
		return
	}

	if ps == 0 {
		ps = 1
	}

	if int(vt.margin.bottom-vt.cursor.row) < (ps - 1) {
		ps = int(vt.margin.bottom - vt.cursor.row)
	}

	for r := vt.cursor.row; r <= vt.margin.bottom; r += 1 {
		if r <= vt.margin.bottom-row(ps) {
			copy(vt.activeScreen[r], vt.activeScreen[r+row(ps)])
			continue
		}
		for col := vt.margin.left; col <= vt.margin.right; col += 1 {
			vt.activeScreen[r][col].erase(vt.cursor.attrs)
		}
	}
	vt.cursor.col = vt.margin.left
}

// Delete Characters (DCH) CSI Ps P
//
// Deletes Ps characters starting with the character at the cursor position.
// When a character is deleted, all characters to the right of the cursor move
// to the left. This creates a space character at the right margin for each
// character deleted. Character attributes move with the characters. The spaces
// created at the end of the line have all their character attributes off.
func (vt *VT) dch(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	row := vt.cursor.row
	for col := vt.cursor.col; col <= vt.margin.right; col += 1 {
		if col+column(ps) > vt.margin.right {
			vt.activeScreen[row][col].erase(vt.cursor.attrs)
			continue
		}
		vt.activeScreen[row][col] = vt.activeScreen[row][col+column(ps)]
	}
}

// Erase Characters (ECH) CSI Ps X
//
// Erases characters at the cursor position and the next Ps-1 characters. A
// parameter of 0 or 1 erases a single character. Character attributes are set
// to normal. No reformatting of data on the line occurs. The cursor remains in
// the same position.
func (vt *VT) ech(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}

	for i := column(0); i < column(ps); i += 1 {
		if vt.cursor.col+i == column(vt.width())-1 {
			return
		}
		vt.activeScreen[vt.cursor.row][vt.cursor.col+i].erase(vt.cursor.attrs)
	}
}

// Cursor Backward Tabulation (CBT) CSI Ps Z
//
// Move cursor backward Ps tabulations
func (vt *VT) cbt(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	n := 0
	for i := len(vt.tabStop) - 1; i >= 0; i -= 1 {
		if n == ps {
			break
		}
		if vt.cursor.col < vt.tabStop[i] {
			break
		}
		vt.cursor.col = vt.tabStop[i]
		n += 1
	}
}

// Tab Clear (TBC) CSI Ps g
func (vt *VT) tbc(ps int) {
	switch ps {
	case 0:
		tabs := []column{}
		for _, tab := range vt.tabStop {
			if tab == vt.cursor.col {
				continue
			}
			tabs = append(tabs, tab)
		}
		vt.tabStop = tabs
	case 3:
		vt.tabStop = []column{}
	}
}

// Line Position Absolute (VPA) CSI Ps d
//
// Move cursor to line Ps
func (vt *VT) vpa(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.row = row(ps - 1)
	if vt.cursor.row > row(vt.height()-1) {
		vt.cursor.row = row(vt.height() - 1)
	}
}

// Line Position Relative (VPR) CSI Ps e
//
// Move down Ps lines
func (vt *VT) vpr(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.row += row(ps)
	if vt.cursor.row > row(vt.height()-1) {
		vt.cursor.row = row(vt.height() - 1)
	}
}

// Character Position Absolute (HPA) CSI Ps `
//
// Move cursor to column Ps
func (vt *VT) hpa(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.col = column(ps - 1)
	if vt.cursor.col > column(vt.width()-1) {
		vt.cursor.col = column(vt.width() - 1)
	}
}

// Character Position Relative (HPR) CSI Ps a
//
// Move cursor to the right Ps times
func (vt *VT) hpr(ps int) {
	vt.lastCol = false
	if ps == 0 {
		ps = 1
	}
	vt.cursor.col += column(ps)
	if vt.cursor.col > column(vt.width()-1) {
		vt.cursor.col = column(vt.width() - 1)
	}
}

// Repeat (REP) CSI Ps b
//
// Repeat preceding graphic character Ps times
func (vt *VT) rep(ps int) {
	vt.lastCol = false
	col := vt.cursor.col
	if col == 0 {
		return
	}
	ch := vt.activeScreen[vt.cursor.row][col-1]
	for i := 0; i < ps; i += 1 {
		if col+column(i) == vt.margin.right {
			return
		}
		vt.activeScreen[vt.cursor.row][vt.cursor.col+column(i)].content = ch.content
	}
}

// Set top and bottom margins CSI Ps ; Ps r
func (vt *VT) decstbm(pm []int) {
	vt.lastCol = false
	if len(pm) != 2 {
		vt.margin.top = 0
		vt.margin.bottom = row(vt.height()) - 1
		return
	}
	vt.margin.top = row(pm[0]) - 1
	vt.margin.bottom = row(pm[1]) - 1
	vt.cursor.row = 0
	vt.cursor.col = 0
}

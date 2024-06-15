package main

import (
	"fmt"
	"io"
)

type AnsiWriter struct {
	writer io.Writer
}

func NewAnsiWriter(w io.Writer) *AnsiWriter {
	return &AnsiWriter{writer: w}
}

func (w *AnsiWriter) Write(data []byte) (n int, err error) {
	return w.writer.Write(data)
}

// ClearLine clears the current terminal line at the cursor position
func (w *AnsiWriter) ClearLine() {
	_, _ = fmt.Fprintf(w.writer, "\x1b[K")
}

// Clear clears all content from the terminal
func (w *AnsiWriter) Clear() {
	_, _ = fmt.Fprintf(w.writer, "\x1b[2J")
}

// Reset performs a full reset on the terminal
func (w *AnsiWriter) Reset() {
	_, _ = fmt.Fprintf(w.writer, "\x1bc")
}

// SaveCursorPosition pushes the cursor position to the stack
func (w *AnsiWriter) SaveCursorPosition() {
	_, _ = fmt.Fprintf(w.writer, "\x1b[s")
}

// RestoreCursorPosition pops the cursor position from the stack
func (w *AnsiWriter) RestoreCursorPosition() {
	_, _ = fmt.Fprintf(w.writer, "\x1b[u")
}

// MoveCursorTo a 0-indexed position
func (w *AnsiWriter) MoveCursorTo(row, col uint16) {
	_, _ = fmt.Fprintf(w.writer, "\x1b[%d;%dH", row+1, col+1)
}

func (w *AnsiWriter) ResetFormatting() {
	_, _ = w.Write([]byte("\x1b[0m"))
}

func (w *AnsiWriter) SetCursorVisible(visible bool) {
	ctrl := "\x1b[?25"
	if visible {
		ctrl += "h"
	} else {
		ctrl += "l"
	}
	_, _ = w.Write([]byte(ctrl)) // 1-indexed
}

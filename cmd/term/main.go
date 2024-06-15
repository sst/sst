package main

import (
	"context"
	"io"
	"os"

	"github.com/liamg/termutil/pkg/termutil"
	"golang.org/x/crypto/ssh/terminal"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	t := termutil.New()

	width := uint16(50)
	height := uint16(25)
	// Set stdin in raw mode.
	oldState, err := terminal.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		panic(err)
	}
	defer func() { _ = terminal.Restore(int(os.Stdin.Fd()), oldState) }() // Best effort restore.

	updateChan := make(chan struct{}, 1)
	go func() {
		var lastCellAttr termutil.CellAttributes
		w := NewAnsiWriter(os.Stdout)
		w.Reset()
		w.ResetFormatting()
		// replace mode!
		_, _ = w.Write([]byte("\x1b[?4l"))

		for {
			select {
			case <-updateChan:
				buf := t.GetActiveBuffer()
				cursorX, cursorY := buf.CursorColumn(), buf.CursorLine()
				w.SetCursorVisible(false)

				for y := uint16(0); y < height; y++ {
					for x := uint16(0); x < width; x++ {
						w.MoveCursorTo(y+1, x+1)
						cell := buf.GetCell(uint16(x), uint16(y))
						if cell != nil {
							measuredRune := cell.Rune()
							if measuredRune.Rune < 0x20 {
								measuredRune.Rune = 0x20
							}

							sgr := cell.Attr().GetDiffANSI(lastCellAttr)
							_, _ = w.Write([]byte(sgr + string(measuredRune.Rune)))
							lastCellAttr = cell.Attr()

						} else {
							attr := termutil.CellAttributes{}
							sgr := attr.GetDiffANSI(lastCellAttr)
							lastCellAttr = attr
							_, _ = w.Write([]byte(sgr))
							_, _ = w.Write([]byte{0x20})
						}
					}
				}
				w.MoveCursorTo(cursorY+1, cursorX+1)
				w.SetCursorVisible(buf.IsCursorVisible())
			}
		}
	}()
	go func() {
		defer cancel()
		buffer := make([]byte, 1024) // A buffer of 1024 bytes
		for {
			n, err := os.Stdin.Read(buffer)
			if err != nil {
				if err == io.EOF {
					break // End of file (or input stream)
				}
				os.Stderr.WriteString("Error reading from stdin: " + err.Error() + "\n")
				break
			}
			if n > 0 {
				_, err = t.Pty().Write(buffer[:n])
				if err != nil {
					os.Stderr.WriteString("Error writing to stdout: " + err.Error() + "\n")
					break
				}
			}
		}
	}()
	err = t.Run(updateChan, height, width)
	updateChan <- struct{}{}
	if err != nil {
		panic(err)
	}

	<-ctx.Done()
}

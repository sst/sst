package tcellterm

// type sixel struct {
// 	X    int
// 	Y    int // raw line
// 	Data []byte
// }
//
// type visibleSixel struct {
// 	ViewLineOffset int
// 	Sixel          sixel
// }
//
// func (b *buffer) addSixel(data []byte) {
// 	b.sixels = append(b.sixels, sixel{
// 		X:    b.cursorColumn(),
// 		Y:    b.cursorPosition.Line,
// 		Data: data,
// 	})
// }
//
// func (b *buffer) getVisibleSixels() []visibleSixel {
// 	firstLine := b.convertViewLineToRawLine(0)
// 	lastLine := b.convertViewLineToRawLine(b.viewHeight - 1)
//
// 	var visible []visibleSixel
//
// 	for _, sixelImage := range b.sixels {
// 		if sixelImage.Y < firstLine {
// 			continue
// 		}
// 		if sixelImage.Y > lastLine {
// 			continue
// 		}
//
// 		visible = append(visible, visibleSixel{
// 			ViewLineOffset: int(sixelImage.Y) - int(firstLine),
// 			Sixel:          sixelImage,
// 		})
// 	}
//
// 	return visible
// }
//
// func (t *Terminal) handleSixel(readChan chan measuredRune) (renderRequired bool) {
// 	var data []rune
//
// 	var inEscape bool
//
// 	for {
// 		r := <-readChan
//
// 		switch r.rune {
// 		case 0x1b:
// 			inEscape = true
// 			continue
// 		case 0x5c:
// 			if inEscape {
// 				t.activeBuffer.addSixel([]byte(string(data)))
// 				return true
// 			}
// 		}
//
// 		inEscape = false
//
// 		data = append(data, r.rune)
// 	}
// }

//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"os"

	tcellterm "git.sr.ht/~rockorager/tcell-term"
)

func main() {
	fmt.Println("----- tcell-term parser example -----")
	fmt.Println("reading from stdin")
	parser := tcellterm.NewParser(os.Stdin)
	for {
		seq := parser.Next()
		fmt.Printf("%s\n", seq)
		switch seq.(type) {
		case tcellterm.EOF:
			return
		}

	}
}

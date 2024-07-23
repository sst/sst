//go:build ignore
// +build ignore

package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("must pass a filename")
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}
	buf := bufio.NewReader(f)
	for {
		r, _, err := buf.ReadRune()
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("%c", r)
		time.Sleep(10 * time.Millisecond)
	}
}

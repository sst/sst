//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	tcellterm "git.sr.ht/~rockorager/tcell-term"
	"github.com/gdamore/tcell/v2"
	"github.com/gdamore/tcell/v2/views"
)

type model struct {
	term      *tcellterm.VT
	s         tcell.Screen
	termView  views.View
	title     *views.TextBar
	titleView views.View
}

// Update is the main event handler. It should only be called by the main thread
func (m *model) Update(ev tcell.Event) {
	switch ev := ev.(type) {
	case *tcell.EventKey:
		switch ev.Key() {
		case tcell.KeyCtrlC:
			m.term.Close()
			m.s.Fini()
			return
		}
		if m.term != nil {
			m.term.HandleEvent(ev)
		}
		m.term.Draw()
		m.s.Show()
	case *tcell.EventResize:
		if m.term != nil {
			m.termView.Resize(0, 2, -1, -1)
			m.term.Resize(m.termView.Size())
		}
		m.titleView.Resize(0, 0, -1, 2)
		m.title.Resize()
		m.title.Draw()
		m.term.Draw()
		m.s.Sync()
		return
	case *tcellterm.EventRedraw:
		m.term.Draw()
		m.title.Draw()

		row, col, style, vis := m.term.Cursor()
		if vis {
			m.s.SetCursorStyle(style)
			m.s.ShowCursor(col, row+2)

		} else {
			m.s.HideCursor()
		}
		m.s.Show()
		return
	case *tcellterm.EventClosed:
		m.s.Clear()
		m.s.Fini()
		return
	case *tcell.EventPaste:
		m.term.HandleEvent(ev)
		return
	case *tcell.EventMouse:
		// Translate the coordinates to our global coordinates (y-2)
		x, y := ev.Position()
		if y-2 < 0 {
			// Event is outside our view
			return
		}
		e := tcell.NewEventMouse(x, y-2, ev.Buttons(), ev.Modifiers())
		m.term.HandleEvent(e)
		return
	case *tcellterm.EventMouseMode:
		m.s.EnableMouse(ev.Flags()...)
	case *tcellterm.EventPanic:
		m.s.Clear()
		m.s.Fini()
		fmt.Println(ev.Error)
	}
	return
}

// HandleEvent is used to handle events from underlying widgets. Any events
// which redraw must be executed in the main goroutine by posting the event back
// to tcell
func (m *model) HandleEvent(ev tcell.Event) {
	m.s.PostEvent(ev)
}

func main() {
	f, _ := os.Create("recording.log")
	log.SetOutput(f)
	var err error
	m := &model{}
	m.s, err = tcell.NewScreen()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
	if err = m.s.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
	m.s.EnablePaste()

	m.title = views.NewTextBar()
	m.title.SetCenter(
		"Welcome to tcell-term",
		tcell.StyleDefault.Foreground(tcell.ColorBlue).
			Bold(true).
			Underline(true),
	)

	m.titleView = views.NewViewPort(m.s, 0, 0, -1, 2)
	m.title.SetView(m.titleView)

	m.termView = views.NewViewPort(m.s, 0, 2, -1, -1)
	// m.term = tcellterm.New(tcellterm.WithWriter(recorder))
	// m.term.Watch(m)
	m.term = tcellterm.New()
	m.term.SetSurface(m.termView)
	m.term.Attach(m.HandleEvent)
	m.term.Logger = log.New(f, "", log.Flags())
	m.s.EnableMouse()

	cmd := exec.Command(os.Getenv("SHELL"))
	err = m.term.Start(cmd)
	if err != nil {
		panic(err)
	}
	for {
		ev := m.s.PollEvent()
		if ev == nil {
			break
		}
		m.Update(ev)
	}
}

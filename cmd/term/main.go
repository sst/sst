package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"

	"github.com/ActiveState/vt10x"
	"github.com/gdamore/tcell"
	"github.com/kr/pty"
)

func main() {
	err := goterm()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

func goterm() error {
	cmd1 := exec.Command("node") // First process
	cmd2 := exec.Command("bash") // Second process

	ptm1, err := pty.Start(cmd1)
	if err != nil {
		return err
	}
	ptm2, err := pty.Start(cmd2)
	if err != nil {
		return err
	}

	state1, term1 := setupTerminal(ptm1)
	defer term1.Close()
	state2, term2 := setupTerminal(ptm2)
	defer term2.Close()

	s, err := tcell.NewScreen()
	if err != nil {
		return err
	}
	defer s.Fini()

	err = s.Init()
	if err != nil {
		return err
	}

	s.Clear()

	width, height := s.Size()
	mainWidth := width - 20 // Reserve 20 columns for the sidebar
	setupScreenSize(ptm1, term1, mainWidth, height)
	setupScreenSize(ptm2, term2, mainWidth, height)

	currentTerminal := 1
	terminals := []*os.File{ptm1, ptm2}
	states := []*vt10x.State{state1, state2}

	endc := make(chan bool)
	updatec := make(chan struct{}, 1)
	setupTerminalUpdate(term1, endc, updatec)
	setupTerminalUpdate(term2, endc, updatec)

	eventc := make(chan tcell.Event, 4)
	go func() {
		for {
			eventc <- s.PollEvent()
		}
	}()

	for {
		select {
		case event := <-eventc:
			switch ev := event.(type) {
			case *tcell.EventKey:
				if ev.Key() == tcell.KeyF1 {
					currentTerminal = 1
				} else if ev.Key() == tcell.KeyF2 {
					currentTerminal = 2
				} else {
					ptm := terminals[currentTerminal-1]
					io.WriteString(ptm, string(ev.Rune()))
				}
				updateScreen(s, states[currentTerminal-1], 20, 0, width-20, height) // Adjust parameters as necessary
				drawSidebar(s, width, height, currentTerminal)
			case *tcell.EventResize:
				width, height = ev.Size()
				mainWidth = width - 20
				setupScreenSize(ptm1, term1, mainWidth, height)
				setupScreenSize(ptm2, term2, mainWidth, height)
				s.Sync()
			}
		case <-endc:
			return nil
		case <-updatec:
			updateScreen(s, states[currentTerminal-1], 20, 0, mainWidth, height) // Shift main area to right of sidebar
			drawSidebar(s, width, height, currentTerminal)
		}
	}
}

func drawSidebar(s tcell.Screen, totalWidth, height, current int) {
	for i := 0; i < height; i++ {
		for j := 0; j < 20; j++ { // Sidebar width is 20 columns
			style := tcell.StyleDefault.Foreground(tcell.ColorSilver)
			if j < 19 { // Draw background for sidebar
				s.SetContent(j, i, ' ', nil, style)
			}
		}
	}
	// Highlight current selection
	highlight := tcell.StyleDefault.Background(tcell.ColorDarkCyan).Foreground(tcell.ColorWhite)
	s.SetContent(2, 1, 'N', nil, highlight)
	s.SetContent(3, 1, 'o', nil, highlight)
	s.SetContent(4, 1, 'd', nil, highlight)
	s.SetContent(5, 1, 'e', nil, highlight)

	s.SetContent(2, 3, 'B', nil, highlight)
	s.SetContent(3, 3, 'a', nil, highlight)
	s.SetContent(4, 3, 's', nil, highlight)
	s.SetContent(5, 3, 'h', nil, highlight)

	if current == 1 {
		s.SetContent(1, 1, '>', nil, highlight)
	} else {
		s.SetContent(1, 3, '>', nil, highlight)
	}
	s.Show()
}

func setupScreenSize(ptm *os.File, term *vt10x.VT, width, height int) {
	vt10x.ResizePty(ptm, width, height)
	term.Resize(width, height)
}

func setupTerminal(ptm *os.File) (*vt10x.State, *vt10x.VT) {
	var state vt10x.State
	term, err := vt10x.Create(&state, ptm)
	if err != nil {
		panic(err) // Handle this error more gracefully in production
	}
	return &state, term
}

func setupTerminalUpdate(term *vt10x.VT, endc chan bool, updatec chan struct{}) {
	go func() {
		defer close(endc)
		for {
			err := term.Parse()
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				break
			}
			select {
			case updatec <- struct{}{}:
			default:
			}
		}
	}()
}

func updateCentered(s tcell.Screen, state *vt10x.State, startX, startY, width, height int) {
	state.Lock()
	defer state.Unlock()
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			c, fg, bg := state.Cell(x, y)
			style := tcell.StyleDefault
			if fg != vt10x.DefaultFG {
				style = style.Foreground(tcell.Color(fg))
			}
			if bg != vt10x.DefaultBG {
				style = style.Background(tcell.Color(bg))
			}
			s.SetContent(startX+x, startY+y, c, nil, style)
		}
	}
	if state.CursorVisible() {
		curx, cury := state.Cursor()
		s.ShowCursor(startX+curx, startY+cury)
	} else {
		s.HideCursor()
	}
	s.Show()
}

func updateScreen(s tcell.Screen, state *vt10x.State, startX, startY, width, height int) {
	state.Lock()
	defer state.Unlock()
	// Clear the area where the terminal will be displayed to ensure no leftover characters
	for y := startY; y < startY+height; y++ {
		for x := startX; x < startX+width; x++ {
			s.SetContent(x, y, ' ', nil, tcell.StyleDefault)
		}
	}
	// Render the terminal content within the specified bounds
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			c, fg, bg := state.Cell(x, y)
			style := tcell.StyleDefault
			if fg != vt10x.DefaultFG {
				style = style.Foreground(tcell.Color(fg))
			}
			if bg != vt10x.DefaultBG {
				style = style.Background(tcell.Color(bg))
			}
			s.SetContent(startX+x, startY+y, c, nil, style)
		}
	}
	// Show the cursor if it's within the visible region
	if state.CursorVisible() {
		curx, cury := state.Cursor()
		if curx < width && cury < height {
			s.ShowCursor(startX+curx, startY+cury)
		} else {
			s.HideCursor()
		}
	} else {
		s.HideCursor()
	}
	s.Show() // Refresh the screen to display the updated content
}


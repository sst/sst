package main

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/manifoldco/promptui"
	"github.com/sst/ion/pkg/project"
)

func CmdInit(cli *Cli) error {
	if _, err := os.Stat("sst.config.ts"); err == nil {
		color.New(color.FgRed, color.Bold).Print("×")
		color.New(color.FgWhite, color.Bold).Println(" SST project already exists")
		return nil
	}

	color.New(color.FgYellow).Println(`
  ███████╗███████╗████████╗
  ██╔════╝██╔════╝╚══██╔══╝
  ███████╗███████╗   ██║   
  ╚════██║╚════██║   ██║   
  ███████║███████║   ██║   
  ╚══════╝╚══════╝   ╚═╝   
  `)
//	color.New(color.FgYellow).Println(`
//  ███████ ███████ ████████ 
//  ██      ██         ██    
//  ███████ ███████    ██    
//       ██      ██    ██    
//  ███████ ███████    ██    
//  `)
	fmt.Println()

	var template string
	if _, err := os.Stat("next.config.js"); err == nil {
		fmt.Println("  Next.js detected - initializing an sst project will")
		fmt.Println("  - create an sst.config.ts file")
		fmt.Println("  - add the sst sdk to your package.json")
		fmt.Println("  - modify your tsconfig.json")
		fmt.Println()
		template = "nextjs"
	}

	if template == "" {
		fmt.Println("  Creating a new sst project - this will")
		fmt.Println("  - create an sst.config.ts file")
		fmt.Println("  - install dependencies")
		fmt.Println()
		template = "vanilla"
	}

	p := promptui.Select{
		Label:        "Do you want to continue?",
		HideSelected: true,
		Items:        []string{"Yes", "No"},
		HideHelp:     true,
	}

	_, confirm, err := p.Run()
	if err != nil {
		return err
	}
	if confirm == "No" {
		return nil
	}

	color.New(color.FgGreen, color.Bold).Print("✓")
	color.New(color.FgWhite).Println(" Using ", template, " template")

	p = promptui.Select{
		Label:        "Where do you want to store the state of your app?",
		HideSelected: true,
		Items:        []string{"aws", "cloudflare"},
		HideHelp:     true,
	}
	_, home, err := p.Run()
	if err != nil {
		return err
	}

	color.New(color.FgGreen, color.Bold).Print("✓")
	color.New(color.FgWhite).Println(" Setting home to " + home)

	err = project.Create(template, home)
	if err != nil {
		return err
	}
	initProject(cli)
	color.New(color.FgGreen, color.Bold).Print("✓")
	color.New(color.FgWhite).Println(" Created new project with '", template, "' template")
	return nil
}

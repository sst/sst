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

	var template string
	if _, err := os.Stat("next.config.js"); err == nil {
    color.New(color.FgBlue, color.Bold).Print(">")
		fmt.Println(" Next.js detected...")
		fmt.Println("  - creating an sst.config.ts")
		fmt.Println("  - adding the sst sdk to package.json")
		fmt.Println("  - modifying tsconfig.json")
		fmt.Println()
		template = "nextjs"
	}

	if template == "" {
    color.New(color.FgBlue, color.Bold).Print(">")
		fmt.Println(" Adding a new sst.config.ts...")
		fmt.Println()
		template = "vanilla"
	}

	p := promptui.Select{
		Label:        "Continue",
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

//	color.New(color.FgGreen, color.Bold).Print("✓")
//	color.New(color.FgWhite).Println(" Using ", template, " template")

	p = promptui.Select{
		Label:        "Where do you want to deploy your app? You can change this later",
		HideSelected: true,
		Items:        []string{"aws", "cloudflare"},
		HideHelp:     true,
	}
	_, home, err := p.Run()
	if err != nil {
		return err
	}

//	color.New(color.FgGreen, color.Bold).Print("✓")
//	color.New(color.FgWhite).Println(" Setting home to " + home)

	err = project.Create(template, home)
	if err != nil {
		return err
	}
	initProject(cli)
	color.New(color.FgGreen, color.Bold).Print("✓")
	color.New(color.FgWhite).Println(" Created new project with template: ", template)
  fmt.Println()
	return nil
}

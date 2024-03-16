package main

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"time"

	"github.com/briandowns/spinner"
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

	logo := []string{
		``,
		`   ███████╗███████╗████████╗`,
		`   ██╔════╝██╔════╝╚══██╔══╝`,
		`   ███████╗███████╗   ██║   `,
		`   ╚════██║╚════██║   ██║   `,
		`   ███████║███████║   ██║   `,
		`   ╚══════╝╚══════╝   ╚═╝   `,
		``,
	}

	fmt.Print("\033[?25l")
	for _, line := range logo {
		for _, char := range line {
			color.New(color.FgYellow).Print(string(char))
			time.Sleep(5 * time.Millisecond)
		}
		fmt.Println()
	}
	fmt.Print("\033[?25h")

	var template string
	files := []string{"next.config.js", "next.config.mjs"}
	for _, file := range files {
		if _, err := os.Stat(file); err == nil {
			color.New(color.FgBlue, color.Bold).Print(">")
			fmt.Println("  Next.js detected...")
			fmt.Println("   - creating an sst.config.ts")
			fmt.Println("   - adding the sst sdk to package.json")
			fmt.Println("   - modifying tsconfig.json")
			fmt.Println()
			template = "nextjs"
			break
		}
	}

	if template == "" {
		color.New(color.FgBlue, color.Bold).Print(">")
		fmt.Println("  Adding a new sst.config.ts...")
		fmt.Println()
		template = "vanilla"
	}

	p := promptui.Select{
		Label:        "‏‏‎ ‎Continue",
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

	color.New(color.FgGreen, color.Bold).Print("✓ ")
	color.New(color.FgWhite).Println(" Template: ", template)
	fmt.Println()

	home := "aws"
	if template != "nextjs" {
		p = promptui.Select{
			Label:        "‏‏‎ ‎Where do you want to deploy your app? You can change this later",
			HideSelected: true,
			Items:        []string{"aws", "cloudflare"},
			HideHelp:     true,
		}
		_, home, err = p.Run()
		if err != nil {
			return err
		}
	}

	color.New(color.FgGreen, color.Bold).Print("✓ ")
	color.New(color.FgWhite).Println(" Using: " + home)
	fmt.Println()

	err = project.Create(template, home)
	if err != nil {
		return err
	}
	var cmd *exec.Cmd

	if _, err := os.Stat("yarn.lock"); err == nil {
		cmd = exec.Command("yarn", "install")
	}
	if _, err := os.Stat("pnpm-lock.yaml"); err == nil {
		cmd = exec.Command("pnpm", "install")
	}
	if _, err := os.Stat("bun.lockb"); err == nil {
		cmd = exec.Command("bun", "install")
	}
	if cmd != nil {
		spin := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
		spin.Suffix = "  Installing dependencies..."
		spin.Start()
		slog.Info("installing deps", "args", cmd.Args)
		cmd.Run()
		spin.Stop()
	}

	slog.Info("initializing project", "template", template)
	_, err = initProject(cli)
	if err != nil {
		return err
	}
	color.New(color.FgGreen, color.Bold).Print("✓ ")
	color.New(color.FgWhite).Println(" Success 🎉")
	fmt.Println()
	return nil
}

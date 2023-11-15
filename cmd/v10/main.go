package main

import (
	"fmt"
	"log"
	"log/slog"

	"github.com/sst/v10/pkg/js"
	"github.com/sst/v10/pkg/project"
)

func main() {
	p, err := project.New()
	if err != nil {
		panic(err)
	}

	if p.Stage() == "" {
		p.StagePersonalLoad()
		if p.Stage() == "" {
			for {
				var stage string
				fmt.Print("Enter a stage name for your personal stage: ")
				_, err := fmt.Scanln(&stage)
				if err != nil {
					continue
				}
				if stage == "" {
					continue
				}
				p.StagePersonalSet(stage)
				break
			}
		}
	}

	slog.Info("using", "stage", p.Stage())

	output, err := js.Eval(p.PathTemp(), fmt.Sprintf(`
    console.log("here")
    import mod from '%s';
    import * as aws from "@pulumi/aws";
    globalThis.aws = aws
    console.log("here")
    import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";
    const cfg = mod.config()
    console.log("workspace", LocalWorkspace)
    const stack = await LocalWorkspace.createOrSelectStack({
      program: mod.run,
      projectName: "%s",
      stackName: "%s",
    })

    await stack.destroy({
      onOutput: console.log,
    })

    await stack.up({
      onOutput: console.log,
    })
  `,
		p.PathConfig(),
		p.Name(),
		p.Stage(),
	))
	log.Println(string(output))

	if err != nil {
		panic(err)
	}

}

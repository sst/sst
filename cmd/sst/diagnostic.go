package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/sst/ion/cmd/sst/cli"
)

var CmdDiagnostic = &cli.Command{
	Name: "diagnostic",
	Description: cli.Description{
		Short: "Generates a zip of diagnostics",
		Long:  "Generates a zip of diagnostic information useful for debugging issues",
	},
	Run: func(c *cli.Cli) error {
		p, err := c.InitProject()
		if err != nil {
			return err
		}
		fmt.Println("Generating diagnostic report from last run...")
		statePath, err := p.PullState()
		if err != nil {
			return err
		}
		filesToZip := []struct {
			Path string
			Name string
		}{
			{statePath, "state.json"},
		}
		logPath := p.PathLog("")
		logFiles, err := os.ReadDir(logPath)
		if err != nil {
			return err
		}
		for _, file := range logFiles {
			if !file.IsDir() {
				filePath := filepath.Join(logPath, file.Name())
				filesToZip = append(filesToZip, struct {
					Path string
					Name string
				}{filePath, file.Name()})
			}
		}
		zipFile, err := os.Create(filepath.Join(p.PathWorkingDir(), "report.zip"))
		if err != nil {
			return err
		}
		defer zipFile.Close()
		archive := zip.NewWriter(zipFile)
		defer archive.Close()
		for _, file := range filesToZip {
			fileToZip, err := os.Open(file.Path)
			if err != nil {
				return err
			}
			defer fileToZip.Close()
			info, err := fileToZip.Stat()
			if err != nil {
				return err
			}
			header, err := zip.FileInfoHeader(info)
			if err != nil {
				return err
			}
			header.Name = file.Name
			header.Method = zip.Deflate
			writer, err := archive.CreateHeader(header)
			if err != nil {
				return err
			}
			_, err = io.Copy(writer, fileToZip)
			if err != nil {
				return err
			}
		}
		fmt.Println("Diagnostic report generated successfully: " + zipFile.Name())
		return nil
	},
}

package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
)

var languages map[string]string = map[string]string{
	"csharp":     "cs",
	"go":         "go",
	"python":     "py",
	"typescript": "ts",
}

func main() {

	pulumi, err := exec.LookPath("pulumi")
	if err != nil {
		fmt.Println("Could not find pulumi in path", err)
		panic(err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		fmt.Println("Could not get current working directory", err)
		panic(err)
	}

	for language, dir := range languages {
		fmt.Println("Creating project in " + language)

		langDir := fmt.Sprintf("%s/azure-%s-aks-managed-identity", cwd, dir)
		err = os.RemoveAll(langDir)
		if err != nil {
			fmt.Println("Could not remove directory", err)
			panic(err)
		}

		cmd := exec.Command(
			pulumi,
			"convert",
			"--generate-only",
			"--language", language,
			"--out", langDir,
		)

		buf := bytes.Buffer{}
		cmd.Stderr = &buf

		if err = cmd.Run(); err != nil {
			fmt.Println("Could not generate program", err)
			fmt.Println(buf.String())
			panic(err)
		}

		fmt.Println("Created project in " + language)
	}
}

# Math and Collection and String Manipulation in YAML

In addition to programming languages such as Python, Go, Typescript, C#, Pulumi also supports YAML.
However, YAML is limited when it comes to constructs such as loops and conditionals and it is not always obvious how one can do math in a Pulumi YAML program.
Similarly, using the `pulumi-std` library can be a little tricky.

This project is meant to provide some YAML program examples for these use-cases.

## References
* [Pulumi YAML Docs Page](https://www.pulumi.com/docs/iac/languages-sdks/yaml/)
* [Pulumi YAML Language Reference](https://www.pulumi.com/docs/iac/languages-sdks/yaml/yaml-language-reference/)
* [pulum-std Function List](https://github.com/pulumi/pulumi-std/blob/master/FUNCTION_LIST.md)
  * These are functions that are available to YAML programs.
  
## Tips and Tricks for Using the pulumi-std Functions
Start with the functions list page in the `pulumi-std` repo, [pulum-std Function List](https://github.com/pulumi/pulumi-std/blob/master/FUNCTION_LIST.md)
Here you will find the list of functions that are available.

To understand how to use a given function, click on the link from the function list page.
This will take you to the go code for the function.
From here you can learn two important things:
* What the function does.
* What the function's input parameters are.

To understand what the function does, look for the `Annotate` function code block. This will provide an explanation of what the function does.

To understand the function's inputs, look for the `...Args` structure code block. This will list the inputs' names and types (e.g. string, array, etc).

For example, look at [std-merge](https://github.com/pulumi/pulumi-std/blob/master/std/merge.go).
You'll see it expects a single parameter named `input` that is an array of map of strings.
So something like: `[goo:"foo", moo:"boo"]` and if you look at the Pulumi YAML program in this folder you'll see how that is represented in YAML.

Now, look at [std-split](https://github.com/pulumi/pulumi-std/blob/master/std/split.go) and you'll see it wants two parameters: `separator` and `text`.

## Using the Pulumi Program
Read the `Pulumi.yaml` file to see what the program does and how it does it.

Then, from the folder containing the program:
```bash
$ pulumi stack init dev
$ pulumi up
```

This creates a random string and outputs some values used in the code.

Now, tinker with the stack config values in `Pulumi.yaml` or via `pulumi config set` commands to see what happens when you:
* Change the length of the string.
  * Change `length` to, say, `32`
  * Run `pulumi up` and you should see that `minLower` is now set to one-fourth(ish) of whatever value you set for the length and there are at least that many lowercase letters in the string.
* Disable using lowercase characters.
  * Change `useLowerCase` to `false`
  * Run `pulumi up` and you should see that there are no lowercase characters and the stack output show `minLower` set to 0.
* Change one of the key-value pairs in `configKeepersArray`.
  * Run `pulumi up` and see that the array map is updated and that a new string is generated since that's what the `keepers` property is for - to trigger a regeneration of the key even though no property directly related to the resource like length, etc is changed..

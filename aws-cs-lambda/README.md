# AWS C# Lambda Example
Creates a lambda that does a simple `.toUpper` on the string input and returns it. 


## Instructions

From this directory:
```bash
# build publish the lambda function
cd dotnetLambda/src/dotnetLambda/ && dotnet restore && dotnet build && dotnet publish && cd ../../../
```

```bash
# execute the pulumi program to deploy the lambda
cd ./pulumi/ && pulumi up && cd ../
```
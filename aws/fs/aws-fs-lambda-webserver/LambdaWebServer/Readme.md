# Giraffe Serverless Application

This project shows how to run a [Giraffe](https://github.com/giraffe-fsharp/Giraffe) project as an AWS Lambda exposed through Amazon API Gateway. The NuGet package [Amazon.Lambda.AspNetCoreServer](https://www.nuget.org/packages/Amazon.Lambda.AspNetCoreServer) contains a Lambda function that is used to translate requests from API Gateway into the ASP.NET Core framework and then the responses from ASP.NET Core back to API Gateway.


### Project Files ###

* serverless.template - an AWS CloudFormation Serverless Application Model template file for declaring your Serverless functions and other AWS resources
* aws-lambda-tools-defaults.json - default argument settings for use with Visual Studio and command line deployment tools for AWS
* Setup.fs - Code file that contains the bootstrap for configuring ASP.NET Core and Giraffe. It contains a main function for local development and the LambdaEntryPoint type for executing from Lambda. The LambdaEntryPoint type inherits from **Amazon.Lambda.AspNetCoreServer.APIGatewayProxyFunction** which contains the logic of converting requests and response back and forth between API Gateway and ASP.NET Core.
* AppHandlers.fs - Code file that defines the HTTP handler functions and routing function.
* web.config - used for local development.

You may also have a test project depending on the options selected.

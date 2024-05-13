open Pulumi
open Pulumi.FSharp
open Pulumi.Aws
open Pulumi.Aws.ApiGateway
open Pulumi.Aws.Iam
open Pulumi.Aws.Lambda

module ManagedPolicies =
    let AWSLambdaBasicExecutionRole = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    let AWSLambdaExecute         = "arn:aws:iam::aws:policy/AWSLambdaExecute"

let openApiSpec (name, arn) =
    let quotedTitle = "\"" + name + "api\""
    let quotedUri   = sprintf "\"arn:aws:apigateway:%s:lambda:path/2015-03-31/functions/%s/invocations\"" Pulumi.Aws.Config.Region arn
    """{
  "openapi": "3.0.1",
  "info": {
    "title": """ + quotedTitle + """,
    "version": "1.0"
  },
  "paths": {
    "/{proxy+}": {
      "x-amazon-apigateway-any-method": {
        "x-amazon-apigateway-integration": {
          "uri": """ + quotedUri + """,
          "passthroughBehavior": "when_no_match",
          "httpMethod": "POST",
          "type": "aws_proxy"
        }
      }
    },
    "/": {
      "x-amazon-apigateway-any-method": {
        "x-amazon-apigateway-integration": {
          "uri": """ + quotedUri + """,
          "passthroughBehavior": "when_no_match",
          "httpMethod": "POST",
          "type": "aws_proxy"
        }
      }
    }
  },
  "components": {}
}"""

let restApiArgs lambdaName lambdaArn =
    let openApiSpec =
        Outputs.pair lambdaName lambdaArn
        |> Outputs.apply openApiSpec

    RestApiArgs(Body = io openApiSpec)

let addInvokePermission name accountId functionArn executionArn =
    Permission(
        name,
        PermissionArgs(
            Action = input "lambda:InvokeFunction",
            Function = functionArn,
            Principal = input "apigateway.amazonaws.com",
            SourceArn = executionArn,
            StatementIdPrefix = input "lambdaPermission"
        )
    )
    |> ignore

let infra () =
    let accountId = Output.Create<GetCallerIdentityResult>(Pulumi.Aws.GetCallerIdentity.InvokeAsync()).Apply(fun r -> r.AccountId)

    let lambdaRole =
        Role (
            "lambdaRole",
            RoleArgs(
                AssumeRolePolicy = input
                    """{
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Action": "sts:AssumeRole",
                                "Principal": {
                                    "Service": "lambda.amazonaws.com"
                                },
                                "Effect": "Allow",
                                "Sid": ""
                            }
                        ]
                    }"""
                )
            )

    RolePolicyAttachment("lambdaS3ReadOnlyAccess", RolePolicyAttachmentArgs(Role = io lambdaRole.Id, PolicyArn = input ManagedPolicies.AWSLambdaExecute))            |> ignore
    RolePolicyAttachment("lambdaBasicExecution",   RolePolicyAttachmentArgs(Role = io lambdaRole.Id, PolicyArn = input ManagedPolicies.AWSLambdaBasicExecutionRole)) |> ignore

    let lambda =
        Function(
            "basicLambda",
            FunctionArgs(
                Runtime = inputUnion2Of2 Pulumi.Aws.Lambda.Runtime.DotnetCore3d1,
                Code    = input (FileArchive "../LambdaWebServer/bin/Debug/net6.0/publish" :> Archive),
                Handler = input "LambdaWebServer::Setup+LambdaEntryPoint::FunctionHandlerAsync",
                Role    = io lambdaRole.Arn,
                Timeout = input 30
            )
        )

    let restApi =
        RestApi(
            "websiteApi",
            (restApiArgs lambda.Name lambda.Arn)
        )

    let deployment =
        Deployment(
            "websiteApiDeployment",
            DeploymentArgs(
                RestApi   = io restApi.Id,
                StageName = input ""
            )
        )

    let prodStage =
        Stage(
            "websiteApiProd",
            StageArgs(
                RestApi    = io restApi.Id,
                Deployment = io deployment.Id,
                StageName  = input "Prod"
            )
        )

    addInvokePermission "lambdaPermission1" (io accountId) (io lambda.Arn) (deployment.ExecutionArn |> Outputs.apply (fun arn -> arn + "*/*/")  |> io)
    addInvokePermission "lambdaPermission2" (io accountId) (io lambda.Arn) (deployment.ExecutionArn |> Outputs.apply (fun arn -> arn + "*/*/*") |> io)

    let urlWithTrailingSlash =
        prodStage.InvokeUrl
        |> Outputs.apply (fun url -> url + "/")

    dict [
        ("account",    accountId :> obj);
        ("websiteUrl", urlWithTrailingSlash :> obj)
    ]

[<EntryPoint>]
let main _argv =
    Deployment.run infra

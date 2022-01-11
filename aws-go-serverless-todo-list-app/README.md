# AWS Golang Serverless To-Do list app

This example creates a simple serverless To-Do list application. The application consists of API Gateway HTTP API, Lambda, DynamoDB and S3. The frontend web application is delivered from S3 web hosting and the frontend web applicaion accesses To-Do management API hosted as Lambda-backed HTTP API. The Lambda function handles the To-Do data stored on DynamoDB table.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Clone aws-go-lambda](https://github.com/aws/aws-lambda-go)

### Steps

After cloning this repo, run these commands from the working directory:

1. Build the handler:

	- For developers on Linux and macOS:

		```bash
		make build
		```
		
	- For developers on Windows:
		
		- Get the `build-lambda-zip` tool:
			
			```bash
			set GO111MODULE=on
			go.exe get -u github.com/aws/aws-lambda-go/cmd/build-lambda-zip
			```
		
		- Use the tool from your GOPATH:
				
			```bash
			set GOOS=linux
			set GOARCH=amd64
			set CGO_ENABLED=0
			go build -o handler\handler handler\handler.go
			%USERPROFILE%\Go\bin\build-lambda-zip.exe -o handler\handler.zip handler\handler
			```
		

1. Create a new Pulumi stack, which is an isolated deployment target for this example:

	```bash
	pulumi stack init
	```

1. Set the required configuration variables for this program:
	```bash
	$ pulumi config set aws:region us-west-2
	```

1. Execute the Pulumi program to create a serverless application:

	```bash
	$ pulumi up                              
	Previewing update (dev)
     Type                             Name                                 Plan       
    +   pulumi:pulumi:Stack              aws-go-serverless-todo-list-app-dev  create.    
    +   ├─ aws:dynamodb:Table            dynamodb                             create     
    +   ├─ aws:s3:Bucket                 s3-website-bucket                    create     
    +   pulumi:pulumi:Stack              aws-go-serverless-todo-list-app-dev  create     
    +   ├─ aws:iam:Policy                iam-pilicy                           create     
    +   ├─ aws:iam:Role                  iam-role                             create     
    +   ├─ aws:s3:BucketObject           index.html                           create     
    +   ├─ aws:s3:BucketObject           style.css                            create     
    +   ├─ aws:s3:BucketObject           index.js                             create     
    +   ├─ aws:lambda:Function           lambda-function                      create     
    +   ├─ aws:apigatewayv2:Integration  apigateway-lambda-integration        create     
    +   ├─ aws:lambda:Permission         invoke-lambda-permission             create     
    +   ├─ aws:apigatewayv2:Route        route-to-delete-todo                 create     
    +   ├─ aws:apigatewayv2:Route        route-to-get-todo                    create     
    +   ├─ aws:apigatewayv2:Route        route-to-post-todo                   create     
    +   ├─ aws:apigatewayv2:Deployment   api-deployment                       create     
    +   ├─ aws:apigatewayv2:Stage        api-stage                            create     
    +   └─ aws:s3:BucketObject           config.js                            create     
 
    Resources:
        + 18 to create

    Do you want to perform this update? yes
    Updating (dev)
        Type                             Name                                 Status       
    +   pulumi:pulumi:Stack              aws-go-serverless-todo-list-app-dev  creating..   
    +   pulumi:pulumi:Stack              aws-go-serverless-todo-list-app-dev  creating...  
    +   pulumi:pulumi:Stack              aws-go-serverless-todo-list-app-dev  creating.    
    +   ├─ aws:s3:Bucket                 s3-website-bucket                    created     
    +   ├─ aws:s3:BucketObject           style.css                            created     
    +   ├─ aws:s3:BucketObject           index.js                             created     
    +   ├─ aws:s3:BucketObject           index.html                           created     
    +   ├─ aws:iam:Policy                iam-pilicy                           created     
    +   ├─ aws:iam:Role                  iam-role                             created     
    +   ├─ aws:lambda:Function           lambda-function                      created     
    +   ├─ aws:apigatewayv2:Integration  apigateway-lambda-integration        created     
    +   ├─ aws:lambda:Permission         invoke-lambda-permission             created     
    +   ├─ aws:apigatewayv2:Route        route-to-post-todo                   created     
    +   ├─ aws:apigatewayv2:Route        route-to-get-todo                    created     
    +   ├─ aws:apigatewayv2:Route        route-to-delete-todo                 created     
    +   ├─ aws:apigatewayv2:Deployment   api-deployment                       created     
    +   ├─ aws:apigatewayv2:Stage        api-stage                            created     
    +   └─ aws:s3:BucketObject           config.js                            created     
    
    Outputs:
        Application URL: "http://s3-website-bucket-xxxxxx.s3-website-us-west-2.amazonaws.com"

    Resources:
        + 18 created

    Duration: 37s
	```

1. Open the Applicaiton URL `http://s3-website-bucket-xxxxxx.s3-website-us-west-2.amazonaws.com` in your browser. You can add, delete items.

1. Afterwards, destroy your stack and remove it:

	```bash
	pulumi destroy --yes
	pulumi stack rm --yes
	```
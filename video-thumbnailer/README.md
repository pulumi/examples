# Video Thumbnailer

A video thumbnail extractor using serverless functions + containers.

Loosely derived from the example at https://serverless.com/blog/serverless-application-for-long-running-process-fargate-lambda/.

## Running the App

Create a new stack:

```
$ pulumi stack init --local
Enter a stack name: testing
```

Configure the app deployment:

```
$ pulumi config set aws:region us-east-1
$ pulumi config set cloud-aws:ecsAutoCluster true
```

Preview the deployment of the application:

``` 
$ pulumi preview
Previewing changes:
info: Building container image 'pulum-dc8d99de-container': context=./docker-ffmpeg-thumb
+ pulumi:pulumi:Stack: (create)
    [urn=urn:pulumi:testing::video-thumbnailer::pulumi:pulumi:Stack::video-thumbnailer-testing]
warning: aws:index/getRegion:getRegion verification warning: "current": [DEPRECATED] Defaults to current provider region if no other filtering is enabled
    + aws:ecs/cluster:Cluster: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ecs/cluster:Cluster::pulumi-testing-global]
        name: "pulumi-testing-global-2c26db9"
    + aws:efs/fileSystem:FileSystem: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/fileSystem:FileSystem::pulumi-testing-global]
    + aws:s3/bucket:Bucket: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:s3/bucket:Bucket::pulumi-testing-global]
        acl         : "private"
        bucket      : "pulumi-testing-global-19f5420"
        forceDestroy: false
    + cloud:global:infrastructure: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure::global-infrastructure]
    + aws:ecr/repository:Repository: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ecr/repository:Repository::pulum-dc8d99de-container]
        name: "pulum-dc8d99de-container-cfeccb4"
    + cloud:bucket:Bucket: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket::bucket]
    + aws:iam/role:Role: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/role:Role::pulumi-testing-global]
        assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":[\"sts:AssumeRole\"],\"Effect\":\"Allow\",\"Principal\":{\"Service\":[\"ec2.amazonaws.com\"]}}]}"
        forceDetachPolicies: false
        name               : "pulumi-testing-global-76e71bc"
        path               : "/"
    + cloud:task:Task: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task::ffmpegThumbTask]
        container: {
            build            : "./docker-ffmpeg-thumb"
            memoryReservation: 128
        }
    + aws:ec2/vpc:Vpc: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/vpc:Vpc::pulumi-testing-global]
        assignGeneratedIpv6CidrBlock: false
        cidrBlock                   : "10.10.0.0/16"
        enableDnsHostnames          : true
        enableDnsSupport            : true
        tags                        : {
            Name: "pulumi-testing-global"
        }
        + aws:sns/topic:Topic: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:sns/topic:Topic::pulumi-t-unhandled-error]
            name: "pulumi-t-unhandled-error-cdfccec"
        + aws:iam/role:Role: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/role:Role::pulumi-testing-task]
            assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"ecs-tasks.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
            forceDetachPolicies: false
            name               : "pulumi-testing-task-b24de5d"
            path               : "/"
    + cloud:logCollector:LogCollector: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector::pulumi-testing]
        parent: {
            urn: "urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure::global-infrastructure"
        }
        + cloud:function:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function::onNewVideo]
        + cloud:function:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function::onNewThumbnail]
        + aws:s3/bucket:Bucket: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:s3/bucket:Bucket::bucket]
            acl                              : "private"
            bucket                           : "bucket-ae14656"
            forceDestroy                     : false
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256"
                    }
                }
            }
    + aws:iam/instanceProfile:InstanceProfile: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/instanceProfile:InstanceProfile::pulumi-testing-global]
        name: "pulumi-testing-global-3c252f9"
        path: "/"
        role: computed<string>
---outputs:---
bucketName: computed<string>
    + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-global-5e4162cd]
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
        role     : computed<string>
    + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-global-efc8f10d]
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
        role     : computed<string>
        + aws:cloudwatch/logGroup:LogGroup: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:cloudwatch/logGroup:LogGroup::ffmpegThumbTask]
            name           : "ffmpegThumbTask-cbeff32"
            retentionInDays: 1
    + aws:ec2/internetGateway:InternetGateway: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/internetGateway:InternetGateway::pulumi-testing-global]
        tags : {
            Name: "pulumi-testing-global"
        }
        vpcId: computed<string>
    + aws:ec2/securityGroup:SecurityGroup: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/securityGroup:SecurityGroup::pulumi-testing-global]
        description        : "Managed by Pulumi"
        egress             : [
            [0]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 0
                protocol  : "-1"
                self      : false
                toPort    : 0
            }
        ]
        ingress            : [
            [0]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 22
                protocol  : "TCP"
                self      : false
                toPort    : 22
            }
            [1]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 0
                protocol  : "TCP"
                self      : false
                toPort    : 65535
            }
        ]
        name               : "pulumi-testing-global-c8249a5"
        revokeRulesOnDelete: false
        tags               : {
            Name: "pulumi-testing-global"
        }
        vpcId              : computed<string>
        + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-tes-task-32be53a2]
            policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
            role     : computed<string>
        + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-tes-task-fd1a00e5]
            policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
            role     : computed<string>
        + aws:serverless:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function::pulumi-testing]
            options: {
                policies: [
                    [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                ]
            }
            + aws:serverless:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function::onNewVideo]
                options: {
                    deadLetterConfig: {
                        targetArn: computed<string>
                    }
                    memorySize      : 128
                    policies        : [
                        [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                        [1]: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    ]
                }
            + aws:serverless:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function::onNewThumbnail]
                options: {
                    deadLetterConfig: {
                        targetArn: computed<string>
                    }
                    memorySize      : 128
                    policies        : [
                        [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                        [1]: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    ]
                }
    + aws:ec2/routeTable:RouteTable: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTable:RouteTable::pulumi-testing-global]
        routes: [
            [0]: {
                cidrBlock: "0.0.0.0/0"
                gatewayId: computed<string>
            }
        ]
        tags  : {
            Name: "pulumi-testing-global"
        }
        vpcId : computed<string>
    + aws:ec2/securityGroup:SecurityGroup: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/securityGroup:SecurityGroup::pulumi-testing-global-fs]
        description        : "Managed by Pulumi"
        ingress            : [
            [0]: {
                fromPort      : 2049
                protocol      : "TCP"
                securityGroups: [
                    [0]: computed<string>
                ]
                self          : false
                toPort        : 2049
            }
        ]
        name               : "pulumi-testing-global-fs-501a002"
        revokeRulesOnDelete: false
        tags               : {
            Name: "pulumi-testing-global-fs"
        }
        vpcId              : computed<string>
            + aws:iam/role:Role: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:iam/role:Role::pulumi-testing]
                assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                forceDetachPolicies: false
                name               : "pulumi-testing-acb73b6"
                path               : "/"
                + aws:iam/role:Role: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/role:Role::onNewVideo]
                    assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                    forceDetachPolicies: false
                    name               : "onNewVideo-65644a3"
                    path               : "/"
                + aws:iam/role:Role: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/role:Role::onNewThumbnail]
                    assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                    forceDetachPolicies: false
                    name               : "onNewThumbnail-adbe6bb"
                    path               : "/"
            + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-32be53a2]
                policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                role     : computed<string>
            + aws:lambda/function:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:lambda/function:Function::pulumi-testing]
                code      : archive(assets:63a6174) {
                    ".": archive(file:4a03558) { . }
                    "__index.js": asset(text:ef016fa) {
                        function (thisArg, _arguments, P, generator) {
                            return new (P || (P = Promise))(function (resolve, reject) {
                                function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                                function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                                function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                                step((generator = generator.apply(thisArg, _arguments || [])).next());
                            });
                        }

                        (ev, ctx, cb) => __awaiter(this, void 0, void 0, function* () {
                                    try {
                                        const zlib = yield Promise.resolve().then(() => require("zlib"));
                                        const payload = new Buffer(ev.awslogs.data, "base64");
                                        const result = zlib.gunzipSync(payload);
                                        console.log(result.toString("utf8"));
                                        cb(null, {});
                                    }
                                    catch (err) {
                                        cb(err);
                                    }
                                })

                    }
                }
                handler   : "__index.handler"
                memorySize: 128
                name      : "pulumi-testing-b4ef30c"
                publish   : false
                role      : computed<string>
                runtime   : "nodejs6.10"
                timeout   : 180
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewVideo-32be53a2]
                    policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                    role     : computed<string>
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewVideo-fd1a00e5]
                    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    role     : computed<string>
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewThumbnail-32be53a2]
                    policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                    role     : computed<string>
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewThumbnail-fd1a00e5]
                    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    role     : computed<string>
                + aws:lambda/function:Function: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:lambda/function:Function::onNewThumbnail]
                    code            : archive(assets:81c65ed) {
                        ".": archive(file:4a03558) { . }
                        "__index.js": asset(text:3ae1af7) {
                            bucketArgs => {
                                console.log(`A new ${bucketArgs.size}B thumbnail was saved to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
                                return Promise.resolve();
                            }

                            function /*eventHandler*/(event, context, callback) {
                                        const records = event.Records || [];
                                        const promises = [];
                                        for (const record of records) {
                                            // Construct an event arguments object.
                                            const args = {
                                                key: record.s3.object.key,
                                                size: record.s3.object.size,
                                                eventTime: record.eventTime,
                                            };
                                            // Call the user handler.
                                            const promise = handler(args);
                                            promises.push(promise);
                                        }
                                        // Combine the results of all user handlers, and invoke the Lambda callback with results.
                                        Promise.all(promises)
                                            .then(() => callback(undefined, undefined))
                                            .catch(err => callback(err, undefined));
                                    }

                        }
                    }
                    deadLetterConfig: {
                        targetArn: computed<string>
                    }
                    handler         : "__index.handler"
                    memorySize      : 128
                    name            : "onNewThumbnail-0ba2ce5"
                    publish         : false
                    role            : computed<string>
                    runtime         : "nodejs6.10"
                    timeout         : 180
        + aws:cloudwatch/logGroup:LogGroup: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:cloudwatch/logGroup:LogGroup::pulumi-testing]
            name           : "/aws/lambda/pulumi-testing-b4ef30c"
            retentionInDays: 0
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:lambda/permission:Permission::pulumi-testing]
            action     : "lambda:invokeFunction"
            function   : computed<string>
            principal  : "logs.us-east-1.amazonaws.com"
            statementId: "pulumi-testing-272bced"
        + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::ffmpegThumbTask]
            destinationArn: computed<string>
            logGroup      : computed<string>
            name          : "ffmpegThumbTask-a9691c4"
            + aws:cloudwatch/logGroup:LogGroup: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logGroup:LogGroup::onNewThumbnail]
                name           : "/aws/lambda/onNewThumbnail-0ba2ce5"
                retentionInDays: 1
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:lambda/permission:Permission::onNewThumbnail]
            action     : "lambda:InvokeFunction"
            function   : computed<string>
            principal  : "s3.amazonaws.com"
            sourceArn  : computed<string>
            statementId: "onNewThumbnail-1ba7027"
            + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::onNewThumbnail]
                destinationArn: computed<string>
                logGroup      : computed<string>
                name          : "onNewThumbnail-1424142"
info: Sending build context to Docker daemon  4.096kB
info: Step 1/7 : FROM jrottenberg/ffmpeg
info:  ---> d84693c6bbc0
info: Step 2/7 : RUN apt-get update &&     apt-get install python-dev python-pip -y &&     apt-get clean
info:  ---> Using cache
info:  ---> e0a5204c82a3
info: Step 3/7 : RUN pip install awscli
info:  ---> Using cache
info:  ---> 62b2f1294cc2
info: Step 4/7 : WORKDIR /tmp/workdir
info:  ---> Using cache
info:  ---> 481b0e5c5a44
info: Step 5/7 : COPY copy_thumb.sh /tmp/workdir
info:  ---> Using cache
info:  ---> 0f154d69e581
info: Step 6/7 : COPY copy_video.sh /tmp/workdir
info:  ---> Using cache
info:  ---> 84e34c4550d8
info: Step 7/7 : ENTRYPOINT echo "Starting..." &&   ./copy_video.sh &&   ffmpeg -i ./${INPUT_VIDEO_FILE_NAME} -ss ${POSITION_TIME_DURATION} -vframes 1 -vcodec png -an -y ${OUTPUT_THUMBS_FILE_NAME} &&   ./copy_thumb.sh
info:  ---> Using cache
info:  ---> 9882ba937d38
info: Successfully built 9882ba937d38
info: Successfully tagged pulum-dc8d99de-container:latest
        + aws:ecs/taskDefinition:TaskDefinition: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:ecs/taskDefinition:TaskDefinition::ffmpegThumbTask]
            containerDefinitions: computed<string>
            family              : "ffmpegThumbTask"
            taskRoleArn         : computed<string>
                + aws:lambda/function:Function: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:lambda/function:Function::onNewVideo]
                    code            : archive(assets:f69633b) {
                        ".": archive(file:4a03558) { . }
                        "__index.js": asset(text:a002755) {
                            function (thisArg, _arguments, P, generator) {
                                return new (P || (P = Promise))(function (resolve, reject) {
                                    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                                    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                                    function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                                });
                            }

                            function /*constructor*/(value) {
                                    this.value = value;
                                }

                            function /*apply*/(func) {
                                    throw new Error("'apply' is not allowed from inside a cloud-callback. Use 'get' to retrieve the value of this Output directly.");
                                }

                            function /*get*/() {
                                    return this.value;
                                }

                            function /*placementConstraintsForHost*/(host) {
                                const os = (host && host.os) || "linux";
                                return [{
                                        type: "memberOf",
                                        expression: `attribute:ecs.os-type == ${os}`,
                                    }];
                            }

                            function (options) {
                                        return __awaiter(this, void 0, void 0, function* () {
                                            const awssdk = yield Promise.resolve().then(() => require("aws-sdk"));
                                            const ecs = new awssdk.ECS();
                                            // Extract the envrionment values from the options
                                            const env = [];
                                            yield addEnvironmentVariables(containerEnv.get());
                                            yield addEnvironmentVariables(options && options.environment);
                                            // Run the task
                                            const res = yield ecs.runTask({
                                                cluster: clusterARN.get(),
                                                taskDefinition: taskDefinitionArn.get(),
                                                placementConstraints: placementConstraintsForHost(options && options.host),
                                                overrides: {
                                                    containerOverrides: [
                                                        {
                                                            name: "container",
                                                            environment: env,
                                                        },
                                                    ],
                                                },
                                            }).promise();
                                            if (res.failures && res.failures.length > 0) {
                                                throw new Error("Failed to start task:" + JSON.stringify(res.failures, null, ""));
                                            }
                                            return;
                                            // Local functions
                                            function addEnvironmentVariables(e) {
                                                return __awaiter(this, void 0, void 0, function* () {
                                                    if (e) {
                                                        for (const key of Object.keys(e)) {
                                                            const envVal = e[key];
                                                            if (envVal) {
                                                                env.push({ name: key, value: envVal });
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }

                            bucketArgs => {
                                console.log(`A new ${bucketArgs.size}B video was uploaded to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
                                let key = bucketArgs.key;
                                let thumbnailFile = key.substring(0, key.indexOf('_')) + '.png';
                                let framePos = key.substring(key.indexOf('_')+1, key.indexOf('.')).replace('-',':');
                                return ffmpegThumbnailTask.run({
                                    environment: {
                                        "S3_BUCKET": bucketName.get(),
                                        "INPUT_VIDEO_FILE_NAME": key,
                                        "POSITION_TIME_DURATION": framePos,
                                        "OUTPUT_THUMBS_FILE_NAME": thumbnailFile,
                                    },
                                }).then(() => {
                                    console.log(`Running thumbnailer task.`);
                                });
                            }

                            function /*eventHandler*/(event, context, callback) {
                                        const records = event.Records || [];
                                        const promises = [];
                                        for (const record of records) {
                                            // Construct an event arguments object.
                                            const args = {
                                                key: record.s3.object.key,
                                                size: record.s3.object.size,
                                                eventTime: record.eventTime,
                                            };
                                            // Call the user handler.
                                            const promise = handler(args);
                                            promises.push(promise);
                                        }
                                        // Combine the results of all user handlers, and invoke the Lambda callback with results.
                                        Promise.all(promises)
                                            .then(() => callback(undefined, undefined))
                                            .catch(err => callback(err, undefined));
                                    }

                        }
                    }
                    deadLetterConfig: {
                        targetArn: computed<string>
                    }
                    handler         : "__index.handler"
                    memorySize      : 128
                    name            : "onNewVideo-2361e7f"
                    publish         : false
                    role            : computed<string>
                    runtime         : "nodejs6.10"
                    timeout         : 180
    + aws:ec2/subnet:Subnet: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/subnet:Subnet::pulumi-testing-global-0]
        assignIpv6AddressOnCreation: false
        availabilityZone           : "us-east-1a"
        cidrBlock                  : "10.10.0.0/24"
        mapPublicIpOnLaunch        : true
        tags                       : {
            Name: "pulumi-testing-global-0"
        }
        vpcId                      : computed<string>
            + aws:cloudwatch/logGroup:LogGroup: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logGroup:LogGroup::onNewVideo]
                name           : "/aws/lambda/onNewVideo-2361e7f"
                retentionInDays: 1
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:lambda/permission:Permission::onNewVideo]
            action     : "lambda:InvokeFunction"
            function   : computed<string>
            principal  : "s3.amazonaws.com"
            sourceArn  : computed<string>
            statementId: "onNewVideo-c57e69e"
    + aws:ec2/routeTableAssociation:RouteTableAssociation: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTableAssociation:RouteTableAssociation::pulumi-testing-global-0]
        routeTableId: computed<string>
        subnetId    : computed<string>
            + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::onNewVideo]
                destinationArn: computed<string>
                logGroup      : computed<string>
                name          : "onNewVideo-4b75ae9"
    + aws:efs/mountTarget:MountTarget: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/mountTarget:MountTarget::pulumi-testing-global-0]
        fileSystemId  : computed<string>
        securityGroups: [
            [0]: computed<string>
        ]
        subnetId      : computed<string>
    + aws:ec2/subnet:Subnet: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/subnet:Subnet::pulumi-testing-global-1]
        assignIpv6AddressOnCreation: false
        availabilityZone           : "us-east-1b"
        cidrBlock                  : "10.10.1.0/24"
        mapPublicIpOnLaunch        : true
        tags                       : {
            Name: "pulumi-testing-global-1"
        }
        vpcId                      : computed<string>
    + aws:ec2/routeTableAssociation:RouteTableAssociation: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTableAssociation:RouteTableAssociation::pulumi-testing-global-1]
        routeTableId: computed<string>
        subnetId    : computed<string>
    + aws:efs/mountTarget:MountTarget: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/mountTarget:MountTarget::pulumi-testing-global-1]
        fileSystemId  : computed<string>
        securityGroups: [
            [0]: computed<string>
        ]
        subnetId      : computed<string>
    + aws:ec2/launchConfiguration:LaunchConfiguration: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/launchConfiguration:LaunchConfiguration::pulumi-testing-global]
        associatePublicIpAddress: false
        ebsBlockDevices         : [
            [0]: {
                deleteOnTermination: true
                deviceName         : "/dev/xvdb"
                volumeSize         : 5
                volumeType         : "gp2"
            }
            [1]: {
                deleteOnTermination: true
                deviceName         : "/dev/xvdcz"
                volumeSize         : 50
                volumeType         : "gp2"
            }
        ]
        enableMonitoring        : true
        iamInstanceProfile      : computed<string>
        imageId                 : "ami-20ff515a"
        instanceType            : "t2.micro"
        name                    : "pulumi-testing-global-923c36e"
        placementTenancy        : "default"
        rootBlockDevice         : {
            deleteOnTermination: true
            volumeSize         : 8
            volumeType         : "gp2"
        }
        securityGroups          : [
            [0]: computed<string>
        ]
        userData                : computed<string>
    + aws:cloudformation/stack:Stack: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:cloudformation/stack:Stack::pulumi-testing-global]
        name        : computed<string>
        templateBody: computed<string>
        + aws:s3/bucketNotification:BucketNotification: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:s3/bucketNotification:BucketNotification::bucket]
            bucket         : computed<string>
            lambdaFunctions: [
                [0]: {
                    events           : [
                        [0]: "s3:ObjectCreated:*"
                    ]
                    filterPrefix     : computed<string>
                    filterSuffix     : ".mp4"
                    lambdaFunctionArn: computed<string>
                }
                [1]: {
                    events           : [
                        [0]: "s3:ObjectCreated:*"
                    ]
                    filterPrefix     : computed<string>
                    filterSuffix     : ".png"
                    lambdaFunctionArn: computed<string>
                }
            ]
info: 59 changes previewed:
    + 59 resources to create
```

Perform the deployment:

```
$ pulumi update
Performing changes:
info: Building container image 'pulum-dc8d99de-container': context=./docker-ffmpeg-thumb
+ pulumi:pulumi:Stack: (create)
    [urn=urn:pulumi:testing::video-thumbnailer::pulumi:pulumi:Stack::video-thumbnailer-testing]
warning: aws:index/getRegion:getRegion verification warning: "current": [DEPRECATED] Defaults to current provider region if no other filtering is enabled
    + aws:ecs/cluster:Cluster: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ecs/cluster:Cluster::pulumi-testing-global]
        name: "pulumi-testing-global-3626496"
info: Sending build context to Docker daemon  4.096kB
info: Step 1/7 : FROM jrottenberg/ffmpeg
info:  ---> d84693c6bbc0
info: Step 2/7 : RUN apt-get update &&     apt-get install python-dev python-pip -y &&     apt-get clean
info:  ---> Using cache
info:  ---> e0a5204c82a3
info: Step 3/7 : RUN pip install awscli
info:  ---> Using cache
info:  ---> 62b2f1294cc2
info: Step 4/7 : WORKDIR /tmp/workdir
info:  ---> Using cache
info:  ---> 481b0e5c5a44
info: Step 5/7 : COPY copy_thumb.sh /tmp/workdir
info:  ---> Using cache
info:  ---> 0f154d69e581
info: Step 6/7 : COPY copy_video.sh /tmp/workdir
info:  ---> Using cache
info:  ---> 84e34c4550d8
info: Step 7/7 : ENTRYPOINT echo "Starting..." &&   ./copy_video.sh &&   ffmpeg -i ./${INPUT_VIDEO_FILE_NAME} -ss ${POSITION_TIME_DURATION} -vframes 1 -vcodec png -an -y ${OUTPUT_THUMBS_FILE_NAME} &&   ./copy_thumb.sh
info:  ---> Using cache
info:  ---> 9882ba937d38
info: Successfully built 9882ba937d38
info: Successfully tagged pulum-dc8d99de-container:latest
    ---outputs:---
    arn : "arn:aws:ecs:us-east-1:153052954103:cluster/pulumi-testing-global-3626496"
    id  : "arn:aws:ecs:us-east-1:153052954103:cluster/pulumi-testing-global-3626496"
    + aws:efs/fileSystem:FileSystem: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/fileSystem:FileSystem::pulumi-testing-global]
    ---outputs:---
    creationToken  : "terraform-20180319235552106200000001"
    dnsName        : "fs-106ba658.efs.us-east-1.amazonaws.com"
    encrypted      : false
    id             : "fs-106ba658"
    performanceMode: "generalPurpose"
    + aws:s3/bucket:Bucket: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:s3/bucket:Bucket::pulumi-testing-global]
        acl         : "private"
        bucket      : "pulumi-testing-global-a04a7ae"
        forceDestroy: false
    ---outputs:---
    arn                              : "arn:aws:s3:::pulumi-testing-global-a04a7ae"
    bucketDomainName                 : "pulumi-testing-global-a04a7ae.s3.amazonaws.com"
    hostedZoneId                     : "Z3AQBSTGFYJSTF"
    id                               : "pulumi-testing-global-a04a7ae"
    region                           : "us-east-1"
    requestPayer                     : "BucketOwner"
    versioning                       : {
        enabled  : false
        mfaDelete: false
    }
    + cloud:global:infrastructure: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure::global-infrastructure]
    + aws:ecr/repository:Repository: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ecr/repository:Repository::pulum-dc8d99de-container]
        name: "pulum-dc8d99de-container-b31b8ee"
    ---outputs:---
    arn          : "arn:aws:ecr:us-east-1:153052954103:repository/pulum-dc8d99de-container-b31b8ee"
    id           : "pulum-dc8d99de-container-b31b8ee"
    registryId   : "153052954103"
    repositoryUrl: "153052954103.dkr.ecr.us-east-1.amazonaws.com/pulum-dc8d99de-container-b31b8ee"
    + cloud:bucket:Bucket: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket::bucket]
    + aws:iam/role:Role: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/role:Role::pulumi-testing-global]
        assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":[\"sts:AssumeRole\"],\"Effect\":\"Allow\",\"Principal\":{\"Service\":[\"ec2.amazonaws.com\"]}}]}"
        forceDetachPolicies: false
        name               : "pulumi-testing-global-2fde61d"
        path               : "/"
    ---outputs:---
    arn                : "arn:aws:iam::153052954103:role/pulumi-testing-global-2fde61d"
    assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
    createDate         : "2018-03-19T23:56:14Z"
    id                 : "pulumi-testing-global-2fde61d"
    uniqueId           : "AROAJT6UEPIYJSCIDPRY4"
    + cloud:task:Task: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task::ffmpegThumbTask]
        container: {
            build            : "./docker-ffmpeg-thumb"
            memoryReservation: 128
        }
    + aws:ec2/vpc:Vpc: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/vpc:Vpc::pulumi-testing-global]
        assignGeneratedIpv6CidrBlock: false
        cidrBlock                   : "10.10.0.0/16"
        enableDnsHostnames          : true
        enableDnsSupport            : true
        tags                        : {
            Name: "pulumi-testing-global"
        }
info: Login Succeeded
info: The push refers to repository [153052954103.dkr.ecr.us-east-1.amazonaws.com/pulum-dc8d99de-container-b31b8ee]
info: c7601d47af4c: Preparing
info: 784c641e8ee8: Preparing
info: eeaa6c7d4f9c: Preparing
info: 83dc4fb3f991: Preparing
info: 6bc0d28ce32c: Preparing
info: 1400524d11ff: Preparing
info: 9f27dcb23c0e: Preparing
info: 6f4ce6b88849: Preparing
info: 92914665e7f6: Preparing
info: c98ef191df4b: Preparing
info: 9c7183e0ea88: Preparing
info: ff986b10a018: Preparing
info: 1400524d11ff: Waiting
info: 9f27dcb23c0e: Waiting
info: 6f4ce6b88849: Waiting
info: 92914665e7f6: Waiting
info: c98ef191df4b: Waiting
info: 9c7183e0ea88: Waiting
info: ff986b10a018: Waiting
info: c7601d47af4c: Pushed
info: 784c641e8ee8: Pushed
info: 9f27dcb23c0e: Pushed
    ---outputs:---
    defaultNetworkAclId         : "acl-035f4678"
    defaultRouteTableId         : "rtb-9be75be7"
    defaultSecurityGroupId      : "sg-c1e991b7"
    dhcpOptionsId               : "dopt-ea21cb8c"
    enableClassiclink           : false
    enableClassiclinkDnsSupport : false
    id                          : "vpc-d81192a3"
    instanceTenancy             : "default"
    mainRouteTableId            : "rtb-9be75be7"
        + aws:sns/topic:Topic: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:sns/topic:Topic::pulumi-t-unhandled-error]
            name: "pulumi-t-unhandled-error-a9ed479"
        ---outputs:---
        applicationSuccessFeedbackSampleRate: "0"
        arn                                 : "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
        httpSuccessFeedbackSampleRate       : "0"
        id                                  : "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
        lambdaSuccessFeedbackSampleRate     : "0"
        policy                              : "{\"Version\":\"2008-10-17\",\"Id\":\"__default_policy_ID\",\"Statement\":[{\"Sid\":\"__default_statement_ID\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"*\"},\"Action\":[\"SNS:GetTopicAttributes\",\"SNS:SetTopicAttributes\",\"SNS:AddPermission\",\"SNS:RemovePermission\",\"SNS:DeleteTopic\",\"SNS:Subscribe\",\"SNS:ListSubscriptionsByTopic\",\"SNS:Publish\",\"SNS:Receive\"],\"Resource\":\"arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479\",\"Condition\":{\"StringEquals\":{\"AWS:SourceOwner\":\"153052954103\"}}}]}"
        sqsSuccessFeedbackSampleRate        : "0"
        + aws:iam/role:Role: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/role:Role::pulumi-testing-task]
            assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"ecs-tasks.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
            forceDetachPolicies: false
            name               : "pulumi-testing-task-dc3f102"
            path               : "/"
        ---outputs:---
        arn                : "arn:aws:iam::153052954103:role/pulumi-testing-task-dc3f102"
        assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ecs-tasks.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
        createDate         : "2018-03-19T23:56:26Z"
        id                 : "pulumi-testing-task-dc3f102"
        uniqueId           : "AROAJ6AVYPC3UXFUO36TO"
    + cloud:logCollector:LogCollector: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector::pulumi-testing]
        parent: {
            urn: "urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure::global-infrastructure"
        }
        + cloud:function:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function::onNewVideo]
        + cloud:function:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function::onNewThumbnail]
        + aws:s3/bucket:Bucket: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:s3/bucket:Bucket::bucket]
            acl                              : "private"
            bucket                           : "bucket-6120251"
            forceDestroy                     : false
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256"
                    }
                }
            }
info: 6f4ce6b88849: Pushed
info: 92914665e7f6: Pushed
info: c98ef191df4b: Pushed
info: 9c7183e0ea88: Pushed
info: eeaa6c7d4f9c: Pushed
info: 6bc0d28ce32c: Pushed
info: 1400524d11ff: Pushed
        ---outputs:---
        arn                              : "arn:aws:s3:::bucket-6120251"
        bucketDomainName                 : "bucket-6120251.s3.amazonaws.com"
        hostedZoneId                     : "Z3AQBSTGFYJSTF"
        id                               : "bucket-6120251"
        region                           : "us-east-1"
        requestPayer                     : "BucketOwner"
        serverSideEncryptionConfiguration: {
            rule: {
                applyServerSideEncryptionByDefault: {
                    sseAlgorithm  : "AES256"
                }
            }
        }
        versioning                       : {
            enabled  : false
            mfaDelete: false
        }
    + aws:iam/instanceProfile:InstanceProfile: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/instanceProfile:InstanceProfile::pulumi-testing-global]
        name: "pulumi-testing-global-852e005"
        path: "/"
        role: "pulumi-testing-global-2fde61d"
    ---outputs:---
    arn     : "arn:aws:iam::153052954103:instance-profile/pulumi-testing-global-852e005"
    id      : "pulumi-testing-global-852e005"
    uniqueId: "AIPAI6QZFLPCJO2SNJGKO"
---outputs:---
bucketName: "bucket-6120251"
    + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-global-5e4162cd]
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
        role     : "pulumi-testing-global-2fde61d"
    ---outputs:---
    id       : "pulumi-testing-global-2fde61d-20180319235656155400000002"
    + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-global-efc8f10d]
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
        role     : "pulumi-testing-global-2fde61d"
    ---outputs:---
    id       : "pulumi-testing-global-2fde61d-20180319235657887400000003"
        + aws:cloudwatch/logGroup:LogGroup: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:cloudwatch/logGroup:LogGroup::ffmpegThumbTask]
            name           : "ffmpegThumbTask-2526c76"
            retentionInDays: 1
        ---outputs:---
        arn            : "arn:aws:logs:us-east-1:153052954103:log-group:ffmpegThumbTask-2526c76:*"
        id             : "ffmpegThumbTask-2526c76"
        retentionInDays: "1"
    + aws:ec2/internetGateway:InternetGateway: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/internetGateway:InternetGateway::pulumi-testing-global]
        tags : {
            Name: "pulumi-testing-global"
        }
        vpcId: "vpc-d81192a3"
    ---outputs:---
    id   : "igw-af3b9fd7"
    + aws:ec2/securityGroup:SecurityGroup: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/securityGroup:SecurityGroup::pulumi-testing-global]
        description        : "Managed by Pulumi"
        egress             : [
            [0]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 0
                protocol  : "-1"
                self      : false
                toPort    : 0
            }
        ]
        ingress            : [
            [0]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 22
                protocol  : "TCP"
                self      : false
                toPort    : 22
            }
            [1]: {
                cidrBlocks: [
                    [0]: "0.0.0.0/0"
                ]
                fromPort  : 0
                protocol  : "TCP"
                self      : false
                toPort    : 65535
            }
        ]
        name               : "pulumi-testing-global-33599e7"
        revokeRulesOnDelete: false
        tags               : {
            Name: "pulumi-testing-global"
        }
        vpcId              : "vpc-d81192a3"
    ---outputs:---
    egress             : [
        [0]: {
            cidrBlocks    : [
                [0]: "0.0.0.0/0"
            ]
            fromPort      : "0"
            protocol      : "-1"
            self          : false
            toPort        : "0"
        }
    ]
    id                 : "sg-88f38bfe"
    ingress            : [
        [0]: {
            cidrBlocks    : [
                [0]: "0.0.0.0/0"
            ]
            fromPort      : "0"
            protocol      : "TCP"
            self          : false
            toPort        : "65535"
        }
        [1]: {
            cidrBlocks    : [
                [0]: "0.0.0.0/0"
            ]
            fromPort      : "22"
            protocol      : "TCP"
            self          : false
            toPort        : "22"
        }
    ]
    ownerId            : "153052954103"
    + aws:ec2/subnet:Subnet: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/subnet:Subnet::pulumi-testing-global-0]
        assignIpv6AddressOnCreation: false
        availabilityZone           : "us-east-1a"
        cidrBlock                  : "10.10.0.0/24"
        mapPublicIpOnLaunch        : true
        tags                       : {
            Name: "pulumi-testing-global-0"
        }
        vpcId                      : "vpc-d81192a3"
info: ff986b10a018: Pushed
    ---outputs:---
    id                         : "subnet-ff6e789b"
    + aws:ec2/subnet:Subnet: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/subnet:Subnet::pulumi-testing-global-1]
        assignIpv6AddressOnCreation: false
        availabilityZone           : "us-east-1b"
        cidrBlock                  : "10.10.1.0/24"
        mapPublicIpOnLaunch        : true
        tags                       : {
            Name: "pulumi-testing-global-1"
        }
        vpcId                      : "vpc-d81192a3"
info: 83dc4fb3f991: Pushed
    ---outputs:---
    id                         : "subnet-b372429c"
        + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-tes-task-32be53a2]
            policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
            role     : "pulumi-testing-task-dc3f102"
info: latest: digest: sha256:1d4b74fffdcbc8ee45d17a81ef5194aeb720c31d4900e647b68a588d5b8fcd68 size: 2827
        ---outputs:---
        id       : "pulumi-testing-task-dc3f102-20180319235720165600000004"
        + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:global:infrastructure$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-tes-task-fd1a00e5]
            policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
            role     : "pulumi-testing-task-dc3f102"
        ---outputs:---
        id       : "pulumi-testing-task-dc3f102-20180319235722005500000005"
        + aws:serverless:Function: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function::pulumi-testing]
            options: {
                policies: [
                    [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                ]
            }
            + aws:serverless:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function::onNewVideo]
                options: {
                    deadLetterConfig: {
                        targetArn: "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
                    }
                    memorySize      : 128
                    policies        : [
                        [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                        [1]: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    ]
                }
            + aws:serverless:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function::onNewThumbnail]
                options: {
                    deadLetterConfig: {
                        targetArn: "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
                    }
                    memorySize      : 128
                    policies        : [
                        [0]: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                        [1]: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    ]
                }
    + aws:ec2/routeTable:RouteTable: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTable:RouteTable::pulumi-testing-global]
        routes: [
            [0]: {
                cidrBlock: "0.0.0.0/0"
                gatewayId: "igw-af3b9fd7"
            }
        ]
        tags  : {
            Name: "pulumi-testing-global"
        }
        vpcId : "vpc-d81192a3"
    ---outputs:---
    id             : "rtb-28df6354"
    routes         : [
        [0]: {
            cidrBlock             : "0.0.0.0/0"
            gatewayId             : "igw-af3b9fd7"
        }
    ]
    + aws:ec2/launchConfiguration:LaunchConfiguration: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/launchConfiguration:LaunchConfiguration::pulumi-testing-global]
        associatePublicIpAddress: false
        ebsBlockDevices         : [
            [0]: {
                deleteOnTermination: true
                deviceName         : "/dev/xvdb"
                volumeSize         : 5
                volumeType         : "gp2"
            }
            [1]: {
                deleteOnTermination: true
                deviceName         : "/dev/xvdcz"
                volumeSize         : 50
                volumeType         : "gp2"
            }
        ]
        enableMonitoring        : true
        iamInstanceProfile      : "pulumi-testing-global-852e005"
        imageId                 : "ami-20ff515a"
        instanceType            : "t2.micro"
        name                    : "pulumi-testing-global-07da6d7"
        placementTenancy        : "default"
        rootBlockDevice         : {
            deleteOnTermination: true
            volumeSize         : 8
            volumeType         : "gp2"
        }
        securityGroups          : [
            [0]: "sg-88f38bfe"
        ]
        userData                : "#cloud-config\n        repo_upgrade_exclude:\n            - kernel*\n        packages:\n            - aws-cfn-bootstrap\n            - aws-cli\n            - nfs-utils\n        mounts:\n            - ['/dev/xvdb', 'none', 'swap', 'sw', '0', '0']\n        bootcmd:\n            - mkswap /dev/xvdb\n            - swapon /dev/xvdb\n            - echo ECS_CLUSTER='arn:aws:ecs:us-east-1:153052954103:cluster/pulumi-testing-global-3626496' >> /etc/ecs/ecs.config\n            - echo ECS_ENGINE_AUTH_TYPE=docker >> /etc/ecs/ecs.config\n        runcmd:\n            # Set and use variables in the same command, since it's not obvious if\n            # different commands will run in different shells.\n            - |\n                # Knock one letter off of availability zone to get region.\n                AWS_AVAILABILITY_ZONE=$(curl -s 169.254.169.254/2016-09-02/meta-data/placement/availability-zone)\n                AWS_REGION=$(echo $AWS_AVAILABILITY_ZONE | sed 's/.$//')\n\n                \n                # Create EFS mount path\n                mkdir /mnt/efs\n                chown ec2-user:ec2-user /mnt/efs\n                # Create environment variables\n                EFS_FILE_SYSTEM_ID=fs-106ba658\n                DIR_SRC=$AWS_AVAILABILITY_ZONE.$EFS_FILE_SYSTEM_ID.efs.$AWS_REGION.amazonaws.com\n                DIR_TGT=/mnt/efs\n                # Update /etc/fstab with the new NFS mount\n                cp -p /etc/fstab /etc/fstab.back-$(date +%F)\n                echo -e \"$DIR_SRC:/ $DIR_TGT nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 0 0\" | tee -a /etc/fstab\n                mount -a -t nfs4\n                # Restart Docker\n                docker ps\n                service docker stop\n                service docker start\n            \n\n                # Disable container access to EC2 metadata instance\n                # See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html\n                iptables --insert FORWARD 1 --in-interface docker+ --destination 169.254.169.254/32 --jump DROP\n                service iptables save\n\n                /opt/aws/bin/cfn-signal                     --region \"${AWS_REGION}\"                     --stack \"pulumi-testing-global-a04a7ae\"                     --resource Instances\n        "
    ---outputs:---
    ebsBlockDevices             : [
        [0]: {
            deleteOnTermination: true
            deviceName         : "/dev/xvdcz"
            encrypted          : false
            iops               : "0"
            volumeSize         : "50"
            volumeType         : "gp2"
        }
        [1]: {
            deleteOnTermination: true
            deviceName         : "/dev/xvdb"
            encrypted          : false
            iops               : "0"
            volumeSize         : "5"
            volumeType         : "gp2"
        }
    ]
    ebsOptimized                : false
    id                          : "pulumi-testing-global-07da6d7"
    rootBlockDevice             : {
        deleteOnTermination: true
        iops               : "0"
        volumeSize         : "8"
        volumeType         : "gp2"
    }
    + aws:ec2/securityGroup:SecurityGroup: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/securityGroup:SecurityGroup::pulumi-testing-global-fs]
        description        : "Managed by Pulumi"
        ingress            : [
            [0]: {
                fromPort      : 2049
                protocol      : "TCP"
                securityGroups: [
                    [0]: "sg-88f38bfe"
                ]
                self          : false
                toPort        : 2049
            }
        ]
        name               : "pulumi-testing-global-fs-65889b4"
        revokeRulesOnDelete: false
        tags               : {
            Name: "pulumi-testing-global-fs"
        }
        vpcId              : "vpc-d81192a3"
    ---outputs:---
    id                 : "sg-4ef18938"
    ingress            : [
        [0]: {
            fromPort      : "2049"
            protocol      : "TCP"
            securityGroups: [
                [0]: "sg-88f38bfe"
            ]
            self          : false
            toPort        : "2049"
        }
    ]
    ownerId            : "153052954103"
        + aws:ecs/taskDefinition:TaskDefinition: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:ecs/taskDefinition:TaskDefinition::ffmpegThumbTask]
            containerDefinitions: "[{\"name\":\"container\",\"image\":\"153052954103.dkr.ecr.us-east-1.amazonaws.com/pulum-dc8d99de-container-b31b8ee\",\"memoryReservation\":128,\"portMappings\":[],\"environment\":[{\"name\":\"IMAGE_DIGEST\",\"value\":\"sha256:9882ba937d384fb64fd09c3fa8cb58f21e8596689b5004d598aaf0a8a335da81\"}],\"mountPoints\":[],\"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"ffmpegThumbTask-2526c76\",\"awslogs-region\":\"us-east-1\",\"awslogs-stream-prefix\":\"container\"}}}]"
            family              : "ffmpegThumbTask"
            taskRoleArn         : "arn:aws:iam::153052954103:role/pulumi-testing-task-dc3f102"
        ---outputs:---
        arn                    : "arn:aws:ecs:us-east-1:153052954103:task-definition/ffmpegThumbTask:3"
        containerDefinitions   : "[{\"cpu\":0,\"environment\":[{\"name\":\"IMAGE_DIGEST\",\"value\":\"sha256:9882ba937d384fb64fd09c3fa8cb58f21e8596689b5004d598aaf0a8a335da81\"}],\"essential\":true,\"image\":\"153052954103.dkr.ecr.us-east-1.amazonaws.com/pulum-dc8d99de-container-b31b8ee\",\"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"ffmpegThumbTask-2526c76\",\"awslogs-region\":\"us-east-1\",\"awslogs-stream-prefix\":\"container\"}},\"memoryReservation\":128,\"mountPoints\":[],\"name\":\"container\",\"portMappings\":[],\"volumesFrom\":[]}]"
        id                     : "ffmpegThumbTask"
        revision               : "3"
            + aws:iam/role:Role: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:iam/role:Role::pulumi-testing]
                assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                forceDetachPolicies: false
                name               : "pulumi-testing-383cb59"
                path               : "/"
            ---outputs:---
            arn                : "arn:aws:iam::153052954103:role/pulumi-testing-383cb59"
            assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
            createDate         : "2018-03-19T23:57:36Z"
            id                 : "pulumi-testing-383cb59"
            uniqueId           : "AROAIAOT2LDYTI7ZBENRW"
                + aws:iam/role:Role: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/role:Role::onNewVideo]
                    assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                    forceDetachPolicies: false
                    name               : "onNewVideo-514b071"
                    path               : "/"
                ---outputs:---
                arn                : "arn:aws:iam::153052954103:role/onNewVideo-514b071"
                assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
                createDate         : "2018-03-19T23:57:37Z"
                id                 : "onNewVideo-514b071"
                uniqueId           : "AROAIMCG2X5OTKIR2HVQS"
                + aws:iam/role:Role: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/role:Role::onNewThumbnail]
                    assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Effect\":\"Allow\",\"Sid\":\"\"}]}"
                    forceDetachPolicies: false
                    name               : "onNewThumbnail-e53c472"
                    path               : "/"
                ---outputs:---
                arn                : "arn:aws:iam::153052954103:role/onNewThumbnail-e53c472"
                assumeRolePolicy   : "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"
                createDate         : "2018-03-19T23:57:38Z"
                id                 : "onNewThumbnail-e53c472"
                uniqueId           : "AROAIDDK35LILXCHWCF7G"
    + aws:ec2/routeTableAssociation:RouteTableAssociation: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTableAssociation:RouteTableAssociation::pulumi-testing-global-0]
        routeTableId: "rtb-28df6354"
        subnetId    : "subnet-ff6e789b"
    ---outputs:---
    id          : "rtbassoc-a1ed0bde"
    + aws:ec2/routeTableAssociation:RouteTableAssociation: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:ec2/routeTableAssociation:RouteTableAssociation::pulumi-testing-global-1]
        routeTableId: "rtb-28df6354"
        subnetId    : "subnet-b372429c"
    ---outputs:---
    id          : "rtbassoc-7de00602"
            + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::pulumi-testing-32be53a2]
                policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                role     : "pulumi-testing-383cb59"
            ---outputs:---
            id       : "pulumi-testing-383cb59-20180319235740493300000006"
            + aws:lambda/function:Function: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:serverless:Function$aws:lambda/function:Function::pulumi-testing]
                code      : archive(assets:0c68ade) {
                    ".": archive(file:06ee47a) { . }
                    "__index.js": asset(text:ef016fa) {
                        function (thisArg, _arguments, P, generator) {
                            return new (P || (P = Promise))(function (resolve, reject) {
                                function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                                function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                                function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                                step((generator = generator.apply(thisArg, _arguments || [])).next());
                            });
                        }

                        (ev, ctx, cb) => __awaiter(this, void 0, void 0, function* () {
                                    try {
                                        const zlib = yield Promise.resolve().then(() => require("zlib"));
                                        const payload = new Buffer(ev.awslogs.data, "base64");
                                        const result = zlib.gunzipSync(payload);
                                        console.log(result.toString("utf8"));
                                        cb(null, {});
                                    }
                                    catch (err) {
                                        cb(err);
                                    }
                                })

                    }
                }
                handler   : "__index.handler"
                memorySize: 128
                name      : "pulumi-testing-c05b0f4"
                publish   : false
                role      : "arn:aws:iam::153052954103:role/pulumi-testing-383cb59"
                runtime   : "nodejs6.10"
                timeout   : 180
            ---outputs:---
            arn                         : "arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4"
            code                        : "/var/folders/h7/n3r2j28517g5bbvlkn1l_h_80000gn/T/pulumi-asset-0c68ade32535eb903e9d36b9ac2749362a0a23e233ed65849680ce2e4e0ec05e"
            id                          : "pulumi-testing-c05b0f4"
            invokeArn                   : "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4/invocations"
            lastModified                : "2018-03-19T23:57:47.666+0000"
            memorySize                  : "128"
            qualifiedArn                : "arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4:$LATEST"
            reservedConcurrentExecutions: "0"
            sourceCodeHash              : "2pc1Y45jBooFxRnr8PRkMLO5t1hHyfNxiB2prXw9lnQ="
            timeout                     : "180"
            tracingConfig               : {
                mode: "PassThrough"
            }
            version                     : "$LATEST"
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewVideo-32be53a2]
                    policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                    role     : "onNewVideo-514b071"
                ---outputs:---
                id       : "onNewVideo-514b071-20180319235749486100000007"
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewVideo-fd1a00e5]
                    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    role     : "onNewVideo-514b071"
                ---outputs:---
                id       : "onNewVideo-514b071-20180319235751093300000008"
                + aws:lambda/function:Function: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:lambda/function:Function::onNewVideo]
                    code            : archive(assets:41f1335) {
                        ".": archive(file:06ee47a) { . }
                        "__index.js": asset(text:bf89ef0) {
                            function (thisArg, _arguments, P, generator) {
                                return new (P || (P = Promise))(function (resolve, reject) {
                                    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                                    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                                    function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
                                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                                });
                            }

                            function /*constructor*/(value) {
                                    this.value = value;
                                }

                            function /*apply*/(func) {
                                    throw new Error("'apply' is not allowed from inside a cloud-callback. Use 'get' to retrieve the value of this Output directly.");
                                }

                            function /*get*/() {
                                    return this.value;
                                }

                            function /*placementConstraintsForHost*/(host) {
                                const os = (host && host.os) || "linux";
                                return [{
                                        type: "memberOf",
                                        expression: `attribute:ecs.os-type == ${os}`,
                                    }];
                            }

                            function (options) {
                                        return __awaiter(this, void 0, void 0, function* () {
                                            const awssdk = yield Promise.resolve().then(() => require("aws-sdk"));
                                            const ecs = new awssdk.ECS();
                                            // Extract the envrionment values from the options
                                            const env = [];
                                            yield addEnvironmentVariables(containerEnv.get());
                                            yield addEnvironmentVariables(options && options.environment);
                                            // Run the task
                                            const res = yield ecs.runTask({
                                                cluster: clusterARN.get(),
                                                taskDefinition: taskDefinitionArn.get(),
                                                placementConstraints: placementConstraintsForHost(options && options.host),
                                                overrides: {
                                                    containerOverrides: [
                                                        {
                                                            name: "container",
                                                            environment: env,
                                                        },
                                                    ],
                                                },
                                            }).promise();
                                            if (res.failures && res.failures.length > 0) {
                                                throw new Error("Failed to start task:" + JSON.stringify(res.failures, null, ""));
                                            }
                                            return;
                                            // Local functions
                                            function addEnvironmentVariables(e) {
                                                return __awaiter(this, void 0, void 0, function* () {
                                                    if (e) {
                                                        for (const key of Object.keys(e)) {
                                                            const envVal = e[key];
                                                            if (envVal) {
                                                                env.push({ name: key, value: envVal });
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }

                            bucketArgs => {
                                console.log(`A new ${bucketArgs.size}B video was uploaded to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
                                let key = bucketArgs.key;
                                let thumbnailFile = key.substring(0, key.indexOf('_')) + '.png';
                                let framePos = key.substring(key.indexOf('_')+1, key.indexOf('.')).replace('-',':');
                                return ffmpegThumbnailTask.run({
                                    environment: {
                                        "S3_BUCKET": bucketName.get(),
                                        "INPUT_VIDEO_FILE_NAME": key,
                                        "POSITION_TIME_DURATION": framePos,
                                        "OUTPUT_THUMBS_FILE_NAME": thumbnailFile,
                                    },
                                }).then(() => {
                                    console.log(`Running thumbnailer task.`);
                                });
                            }

                            function /*eventHandler*/(event, context, callback) {
                                        const records = event.Records || [];
                                        const promises = [];
                                        for (const record of records) {
                                            // Construct an event arguments object.
                                            const args = {
                                                key: record.s3.object.key,
                                                size: record.s3.object.size,
                                                eventTime: record.eventTime,
                                            };
                                            // Call the user handler.
                                            const promise = handler(args);
                                            promises.push(promise);
                                        }
                                        // Combine the results of all user handlers, and invoke the Lambda callback with results.
                                        Promise.all(promises)
                                            .then(() => callback(undefined, undefined))
                                            .catch(err => callback(err, undefined));
                                    }

                        }
                    }
                    deadLetterConfig: {
                        targetArn: "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
                    }
                    handler         : "__index.handler"
                    memorySize      : 128
                    name            : "onNewVideo-89ff1a6"
                    publish         : false
                    role            : "arn:aws:iam::153052954103:role/onNewVideo-514b071"
                    runtime         : "nodejs6.10"
                    timeout         : 180
                ---outputs:---
                arn                         : "arn:aws:lambda:us-east-1:153052954103:function:onNewVideo-89ff1a6"
                code                        : "/var/folders/h7/n3r2j28517g5bbvlkn1l_h_80000gn/T/pulumi-asset-41f13353dc3be16d7bd9124ac08a58b1631ccf6483d3e445106473d2ef2d9035"
                id                          : "onNewVideo-89ff1a6"
                invokeArn                   : "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:153052954103:function:onNewVideo-89ff1a6/invocations"
                lastModified                : "2018-03-19T23:57:58.675+0000"
                memorySize                  : "128"
                qualifiedArn                : "arn:aws:lambda:us-east-1:153052954103:function:onNewVideo-89ff1a6:$LATEST"
                reservedConcurrentExecutions: "0"
                sourceCodeHash              : "b3+URdgBCKzZNIivQLTZUSfPVVOooKc3B7gk7dzjX38="
                timeout                     : "180"
                tracingConfig               : {
                    mode: "PassThrough"
                }
                version                     : "$LATEST"
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewThumbnail-32be53a2]
                    policyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
                    role     : "onNewThumbnail-e53c472"
                ---outputs:---
                id       : "onNewThumbnail-e53c472-20180319235800794000000009"
                + aws:iam/rolePolicyAttachment:RolePolicyAttachment: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:iam/rolePolicyAttachment:RolePolicyAttachment::onNewThumbnail-fd1a00e5]
                    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess"
                    role     : "onNewThumbnail-e53c472"
                ---outputs:---
                id       : "onNewThumbnail-e53c472-2018031923580240510000000a"
                + aws:lambda/function:Function: (create)
                    [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:serverless:Function$aws:lambda/function:Function::onNewThumbnail]
                    code            : archive(assets:fd62175) {
                        ".": archive(file:06ee47a) { . }
                        "__index.js": asset(text:3ae1af7) {
                            bucketArgs => {
                                console.log(`A new ${bucketArgs.size}B thumbnail was saved to ${bucketArgs.key} at ${bucketArgs.eventTime}.`);
                                return Promise.resolve();
                            }

                            function /*eventHandler*/(event, context, callback) {
                                        const records = event.Records || [];
                                        const promises = [];
                                        for (const record of records) {
                                            // Construct an event arguments object.
                                            const args = {
                                                key: record.s3.object.key,
                                                size: record.s3.object.size,
                                                eventTime: record.eventTime,
                                            };
                                            // Call the user handler.
                                            const promise = handler(args);
                                            promises.push(promise);
                                        }
                                        // Combine the results of all user handlers, and invoke the Lambda callback with results.
                                        Promise.all(promises)
                                            .then(() => callback(undefined, undefined))
                                            .catch(err => callback(err, undefined));
                                    }

                        }
                    }
                    deadLetterConfig: {
                        targetArn: "arn:aws:sns:us-east-1:153052954103:pulumi-t-unhandled-error-a9ed479"
                    }
                    handler         : "__index.handler"
                    memorySize      : 128
                    name            : "onNewThumbnail-e912801"
                    publish         : false
                    role            : "arn:aws:iam::153052954103:role/onNewThumbnail-e53c472"
                    runtime         : "nodejs6.10"
                    timeout         : 180
                ---outputs:---
                arn                         : "arn:aws:lambda:us-east-1:153052954103:function:onNewThumbnail-e912801"
                code                        : "/var/folders/h7/n3r2j28517g5bbvlkn1l_h_80000gn/T/pulumi-asset-fd6217574d44aaeb66d488044c3038645378459ff6376c26d07ae1f2bfed1901"
                id                          : "onNewThumbnail-e912801"
                invokeArn                   : "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:153052954103:function:onNewThumbnail-e912801/invocations"
                lastModified                : "2018-03-19T23:58:09.763+0000"
                memorySize                  : "128"
                qualifiedArn                : "arn:aws:lambda:us-east-1:153052954103:function:onNewThumbnail-e912801:$LATEST"
                reservedConcurrentExecutions: "0"
                sourceCodeHash              : "x0n7THRmDC0mcWUUu3cSihLHYzi8Jm4KKlgcvaT02J0="
                timeout                     : "180"
                tracingConfig               : {
                    mode: "PassThrough"
                }
                version                     : "$LATEST"
    + aws:efs/mountTarget:MountTarget: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/mountTarget:MountTarget::pulumi-testing-global-0]
        fileSystemId  : "fs-106ba658"
        securityGroups: [
            [0]: "sg-4ef18938"
        ]
        subnetId      : "subnet-ff6e789b"
    ---outputs:---
    dnsName           : "fs-106ba658.efs.us-east-1.amazonaws.com"
    id                : "fsmt-db5a8693"
    ipAddress         : "10.10.0.175"
    networkInterfaceId: "eni-b8342d38"
    + aws:efs/mountTarget:MountTarget: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:efs/mountTarget:MountTarget::pulumi-testing-global-1]
        fileSystemId  : "fs-106ba658"
        securityGroups: [
            [0]: "sg-4ef18938"
        ]
        subnetId      : "subnet-b372429c"
    ---outputs:---
    dnsName           : "fs-106ba658.efs.us-east-1.amazonaws.com"
    id                : "fsmt-685b8720"
    ipAddress         : "10.10.1.97"
    networkInterfaceId: "eni-8bb0740a"
    + aws:cloudformation/stack:Stack: (create)
        [urn=urn:pulumi:testing::video-thumbnailer::aws:cloudformation/stack:Stack::pulumi-testing-global]
        name        : "pulumi-testing-global-a04a7ae"
        templateBody: "\n    AWSTemplateFormatVersion: '2010-09-09'\n    Outputs:\n        Instances:\n            Value: !Ref Instances\n    Resources:\n        Instances:\n            Type: AWS::AutoScaling::AutoScalingGroup\n            Properties:\n                Cooldown: 300\n                DesiredCapacity: 2\n                HealthCheckGracePeriod: 120\n                HealthCheckType: EC2\n                LaunchConfigurationName: \"pulumi-testing-global-07da6d7\"\n                MaxSize: 100\n                MetricsCollection:\n                -   Granularity: 1Minute\n                MinSize: 2\n                VPCZoneIdentifier: [\"subnet-ff6e789b\",\"subnet-b372429c\"]\n                Tags:\n                -   Key: Name\n                    Value: pulumi-testing-global\n                    PropagateAtLaunch: true\n            CreationPolicy:\n                ResourceSignal:\n                    Count: 2\n                    Timeout: PT15M\n            UpdatePolicy:\n                AutoScalingRollingUpdate:\n                    MaxBatchSize: 1\n                    MinInstancesInService: 2\n                    PauseTime: PT15M\n                    SuspendProcesses:\n                    -   ScheduledActions\n                    WaitOnResourceSignals: true\n    "
    ---outputs:---
    disableRollback: false
    id             : "arn:aws:cloudformation:us-east-1:153052954103:stack/pulumi-testing-global-a04a7ae/26074fa0-2bd2-11e8-b302-50fae98974c5"
    outputs        : {
        Instances: "pulumi-testing-global-a04a7ae-Instances-Q4G7D2C913VZ"
    }
        + aws:cloudwatch/logGroup:LogGroup: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:cloudwatch/logGroup:LogGroup::pulumi-testing]
            name           : "/aws/lambda/pulumi-testing-c05b0f4"
            retentionInDays: 0
        ---outputs:---
        arn            : "arn:aws:logs:us-east-1:153052954103:log-group:/aws/lambda/pulumi-testing-c05b0f4:*"
        id             : "/aws/lambda/pulumi-testing-c05b0f4"
        retentionInDays: "0"
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:logCollector:LogCollector$aws:lambda/permission:Permission::pulumi-testing]
            action     : "lambda:invokeFunction"
            function   : "pulumi-testing-c05b0f4"
            principal  : "logs.us-east-1.amazonaws.com"
            statementId: "pulumi-testing-e6efe1d"
        ---outputs:---
        id         : "pulumi-testing-e6efe1d"
        + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:task:Task$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::ffmpegThumbTask]
            destinationArn: "arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4"
            logGroup      : "ffmpegThumbTask-2526c76"
            name          : "ffmpegThumbTask-1e4a1eb"
        ---outputs:---
        id            : "cwlsf-966762783"
            + aws:cloudwatch/logGroup:LogGroup: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logGroup:LogGroup::onNewVideo]
                name           : "/aws/lambda/onNewVideo-89ff1a6"
                retentionInDays: 1
            ---outputs:---
            arn            : "arn:aws:logs:us-east-1:153052954103:log-group:/aws/lambda/onNewVideo-89ff1a6:*"
            id             : "/aws/lambda/onNewVideo-89ff1a6"
            retentionInDays: "1"
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:lambda/permission:Permission::onNewVideo]
            action     : "lambda:InvokeFunction"
            function   : "onNewVideo-89ff1a6"
            principal  : "s3.amazonaws.com"
            sourceArn  : "arn:aws:s3:::bucket-6120251"
            statementId: "onNewVideo-6411e28"
        ---outputs:---
        id         : "onNewVideo-6411e28"
            + aws:cloudwatch/logGroup:LogGroup: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logGroup:LogGroup::onNewThumbnail]
                name           : "/aws/lambda/onNewThumbnail-e912801"
                retentionInDays: 1
            ---outputs:---
            arn            : "arn:aws:logs:us-east-1:153052954103:log-group:/aws/lambda/onNewThumbnail-e912801:*"
            id             : "/aws/lambda/onNewThumbnail-e912801"
            retentionInDays: "1"
        + aws:lambda/permission:Permission: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:lambda/permission:Permission::onNewThumbnail]
            action     : "lambda:InvokeFunction"
            function   : "onNewThumbnail-e912801"
            principal  : "s3.amazonaws.com"
            sourceArn  : "arn:aws:s3:::bucket-6120251"
            statementId: "onNewThumbnail-6077317"
        ---outputs:---
        id         : "onNewThumbnail-6077317"
            + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::onNewVideo]
                destinationArn: "arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4"
                logGroup      : "/aws/lambda/onNewVideo-89ff1a6"
                name          : "onNewVideo-88c34a1"
            ---outputs:---
            id            : "cwlsf-2911267443"
            + aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter: (create)
                [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$cloud:function:Function$aws:cloudwatch/logSubscriptionFilter:LogSubscriptionFilter::onNewThumbnail]
                destinationArn: "arn:aws:lambda:us-east-1:153052954103:function:pulumi-testing-c05b0f4"
                logGroup      : "/aws/lambda/onNewThumbnail-e912801"
                name          : "onNewThumbnail-0aef74c"
            ---outputs:---
            id            : "cwlsf-1411744962"
        + aws:s3/bucketNotification:BucketNotification: (create)
            [urn=urn:pulumi:testing::video-thumbnailer::cloud:bucket:Bucket$aws:s3/bucketNotification:BucketNotification::bucket]
            bucket         : "bucket-6120251"
            lambdaFunctions: [
                [0]: {
                    events           : [
                        [0]: "s3:ObjectCreated:*"
                    ]
                    filterSuffix     : ".mp4"
                    lambdaFunctionArn: "arn:aws:lambda:us-east-1:153052954103:function:onNewVideo-89ff1a6"
                }
                [1]: {
                    events           : [
                        [0]: "s3:ObjectCreated:*"
                    ]
                    filterSuffix     : ".png"
                    lambdaFunctionArn: "arn:aws:lambda:us-east-1:153052954103:function:onNewThumbnail-e912801"
                }
            ]
        ---outputs:---
        id             : "bucket-6120251"
        lambdaFunctions: [
            [0]: {
                events           : [
                    [0]: "s3:ObjectCreated:*"
                ]
                filterSuffix     : ".mp4"
                id               : "tf-s3-lambda-2018032000054751630000000b"
                lambdaFunctionArn: "arn:aws:lambda:us-east-1:153052954103:function:onNewVideo-89ff1a6"
            }
            [1]: {
                events           : [
                    [0]: "s3:ObjectCreated:*"
                ]
                filterSuffix     : ".png"
                id               : "tf-s3-lambda-2018032000054751630000000c"
                lambdaFunctionArn: "arn:aws:lambda:us-east-1:153052954103:function:onNewThumbnail-e912801"
            }
        ]
info: 59 changes performed:
    + 59 resources created
Update duration: 9m59.754811909s
```

See the outputs:

```
$ pulumi stack output
Current stack outputs (1):
    OUTPUT                                           VALUE
    bucketName                                       bucket-6120251
```

Upload a vide:

```
$ aws s3 cp ~/Downloads/small.mp4 s3://$(pulumi stack output bucketName)/small1_00-02.mp4
upload: ../../../../../../Downloads/small.mp4 to s3://bucket-6120251/small1_00-02.mp4
```

See the logs from the application:

```
$ pulumi logs -f
Collecting logs since 2018-03-19T16:17:45.000-07:00.

 2018-03-19T17:17:39.121-07:00[                    onNewVideo] A new 383631B video was uploaded to small1_00-02.mp4 at 2018-03-20T00:17:38.734Z.
 2018-03-19T17:17:43.939-07:00[                    onNewVideo] Running thumbnailer task.
 2018-03-19T17:18:02.341-07:00[               ffmpegThumbTask] Starting...
 2018-03-19T17:18:02.341-07:00[               ffmpegThumbTask] Copying from S3 bucket-6120251/small1_00-02.mp4 to small1_00-02.mp4 ...
download: s3://bucket-6120251/small1_00-02.mp4 to ./small1_00-02.mp4eted 256.0 KiB/374.6 KiB (3.0 MiB/s) with 1 file(s) remaining
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask] ffmpeg version 3.4.2 Copyright (c) 2000-2018 the FFmpeg developers
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   built with gcc 5.4.0 (Ubuntu 5.4.0-6ubuntu1~16.04.9) 20160609
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   configuration: --disable-debug --disable-doc --disable-ffplay --enable-shared --enable-avresample --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-gpl --enable-libass --enable-libfreetype --enable-libvidstab --enable-libmp3lame --enable-libopenjpeg --enable-libopus --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx265 --enable-libxvid --enable-libx264 --enable-nonfree --enable-openssl --enable-libfdk_aac --enable-libkvazaar --enable-postproc --enable-small --enable-version3 --extra-cflags=-I/opt/ffmpeg/include --extra-ldflags=-L/opt/ffmpeg/lib --extra-libs=-ldl --prefix=/opt/ffmpeg
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavutil      55. 78.100 / 55. 78.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavcodec     57.107.100 / 57.107.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavformat    57. 83.100 / 57. 83.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavdevice    57. 10.100 / 57. 10.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavfilter     6.107.100 /  6.107.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavresample   3.  7.  0 /  3.  7.  0
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libswscale      4.  8.100 /  4.  8.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libswresample   2.  9.100 /  2.  9.100
 2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libpostproc    54.  7.100 / 54.  7.100
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Input #0, mov,mp4,m4a,3gp,3g2,mj2, from './small1_00-02.mp4':
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Metadata:
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     major_brand     : mp42
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     minor_version   : 0
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     compatible_brands: mp42isomavc1
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     creation_time   : 2010-03-20T21:29:11.000000Z
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     encoder         : HandBrake 0.9.4 2009112300
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Duration: 00:00:05.57, start: 0.000000, bitrate: 551 kb/s
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Stream #0:0(und): Video: h264 (avc1 / 0x31637661), yuv420p(tv, bt709), 560x320, 465 kb/s, 30 fps, 30 tbr, 90k tbn, 60 tbc (default)
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Metadata:
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]       creation_time   : 2010-03-20T21:29:11.000000Z
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]       encoder         : JVT/AVC Coding
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Stream #0:1(eng): Audio: aac (mp4a / 0x6134706D), 48000 Hz, mono, fltp, 83 kb/s (default)
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Stream mapping:
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Stream #0:0 -> #0:0 (h264 (native) -> png (native))
 2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Press [q] to stop, [?] for help
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask] Output #0, image2, to 'small1.png':
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]   Metadata:
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     major_brand     : mp42
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     minor_version   : 0
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     compatible_brands: mp42isomavc1
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     encoder         : Lavf57.83.100
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     Stream #0:0(und): Video: png, rgb24, 560x320, q=2-31, 200 kb/s, 30 fps, 30 tbn, 30 tbc (default)
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     Metadata:
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]       creation_time   : 2010-03-20T21:29:11.000000Z
 2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]       encoder         : Lavc57.107.100 png
 2018-03-19T17:18:03.005-07:00[               ffmpegThumbTask] frame=    1 fps=0.0 q=-0.0 Lsize=N/A time=00:00:00.03 bitrate=N/A speed=0.494x
 2018-03-19T17:18:03.005-07:00[               ffmpegThumbTask] video:182kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
 2018-03-19T17:18:03.007-07:00[               ffmpegThumbTask] Copying small1.png to S3 at bucket-6120251/small1.png ...
upload: ./small1.png to s3://bucket-6120251/small1.png            pleted 182.2 KiB/182.2 KiB (1.7 MiB/s) with 1 file(s) remaining
 2018-03-19T17:18:03.761-07:00[                onNewThumbnail] A new 186620B thumbnail was saved to small1.png at 2018-03-20T00:18:03.389Z.
```

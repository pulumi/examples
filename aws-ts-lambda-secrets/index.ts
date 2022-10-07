import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface LambdaConfig {
    envvars: string[];
    secrets: pulumi.Output<string>[];
}

const config = new pulumi.Config();
const lambdaconfig = config.requireObject<LambdaConfig>("lambdawithsecrets");

let secretsArnArray: pulumi.Output<string>[] = new Array();
let secretArray: aws.secretsmanager.Secret[] = new Array();
for (let key in lambdaconfig.secrets) {
    const secret = new aws.secretsmanager.Secret(`${key}`);
    new aws.secretsmanager.SecretVersion(`secretversion-${key}`, {
        secretId: secret.id,
        secretString: lambdaconfig.secrets[key]
    });
    secretArray.push(secret);
    secretsArnArray[key.toLocaleUpperCase()] = secret.id;
}

const role = new aws.iam.Role("roleLambdaWithSecrets", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.LambdaPrincipal)
});

new aws.iam.RolePolicyAttachment("rpa-basic", {
    role: role,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole
});



const secretManagerPolicyDoc = aws.iam.getPolicyDocumentOutput({
    statements: [
        {
            effect: "Allow",
            actions: [
                "secretsmanager:GetSecretValue",
            ],
            resources: secretArray.map(x => pulumi.interpolate`${x.arn}`)
        }
    ]
});

const secretManagerPolicy = new aws.iam.Policy("secretsPolicy", {
    policy: secretManagerPolicyDoc.apply(doc => doc.json)
});

new aws.iam.RolePolicyAttachment("rpa-secrets", {
    role: role,
    policyArn: secretManagerPolicy.arn
});

let lambdaEnvVars: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
}> = {};

for (let key in secretsArnArray) {
    lambdaEnvVars[key] = secretsArnArray[key];
}

for (let key in lambdaconfig.envvars) {
    lambdaEnvVars[key.toLocaleUpperCase()] = lambdaconfig.envvars[key];
}

const lambda = new aws.lambda.Function("lambdaWithSecrets", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./app")
    }),
    role: role.arn,
    handler: "index.handler",
    runtime: aws.lambda.Runtime.NodeJS16dX,
    environment: {
        variables: lambdaEnvVars
    },
    timeout: 15
})

export const lambdaName = lambda.name;
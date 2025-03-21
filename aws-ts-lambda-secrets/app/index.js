import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
const client = new SecretsManagerClient();

const getSecretForLambda = async (secretId) => {
    const input = { "SecretId": secretId };
    const command = new GetSecretValueCommand(input);
    console.log('Retrieving secret during top-level await');
    return await client.send(command);
}

const secret1 = getSecretForLambda(process.env.SECRET1);
const secret2 = getSecretForLambda(process.env.SECRET2)

export async function handler() {
    console.log('Using secret in handler')
    return {
        secret1: (await secret1).SecretString,
        secret2: (await secret2).SecretString,
    };
};
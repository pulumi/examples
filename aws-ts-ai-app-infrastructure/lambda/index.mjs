import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
    const body = event.body ? JSON.parse(event.body) : {};
    const prompt = body.prompt || "Say hello from Bedrock.";

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 256,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };

    const response = await client.send(new InvokeModelCommand({
        modelId: process.env.MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: result.content?.[0]?.text ?? "" }),
    };
};

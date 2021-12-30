import * as aws from "@pulumi/aws";

export const handlerFactory = () => {
  const lambda = new aws.sdk.Lambda();
  return async (ev: unknown): Promise<void> => {
    const opponentFunction = process.env.OPPONENT_FN_NAME;
    if (!opponentFunction) {
      return console.log("No one to play against");
    }
    if (Math.random() > 0.3) {
      await lambda
        .invoke({
          FunctionName: opponentFunction,
          InvocationType: "Event",
        })
        .promise();
      console.log(`Returned to ${opponentFunction}`);
    } else {
      console.log(`Missed! ${opponentFunction} wins!`);
    }
  };
};

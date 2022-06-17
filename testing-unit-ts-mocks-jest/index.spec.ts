// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import "jest";

function promiseOf<T>(output: pulumi.Output<T>): Promise<T> {
    return new Promise(resolve => output.apply(resolve));
}

describe("My speaking clock", () => {

    // Define the infra variable as a type whose shape matches the that of the
    // to-be-defined resources module.
    // https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
    let infra: typeof import("./resources");

    beforeAll(() => {

        // Put Pulumi in unit-test mode, mocking all calls to cloud-provider APIs.
        pulumi.runtime.setMocks({

            // Mock calls to create new resources and return a canned response.
            newResource: (args: pulumi.runtime.MockResourceArgs): {id: string, state: any} => {

                // Here, we're returning a same-shaped object for all resource types.
                // We could, however, use the arguments passed into this function to
                // customize the mocked-out properties of a particular resource.
                // See the unit-testing docs for details:
                // https://www.pulumi.com/docs/guides/testing/unit
                return {
                    id: `${args.name}-id`,
                    state: args.inputs,
                };
            },

            // Mock function calls and return whatever input properties were provided.
            call: (args: pulumi.runtime.MockCallArgs) => {
                return args.inputs;
            },
        });
    });

    beforeEach(async () => {

        // Dynamically import the resources module.
        infra = await import("./resources");
    });

    describe("function URL", () => {

        it("is publicly accessible", async () => {
            const authType = await promiseOf(infra.timeURL.authorizationType);
            expect(authType).toBe("NONE");
        });

        it("is CORS-friendly", async () => {
            const authType = await promiseOf(infra.timeURL.cors);
            expect(authType).toEqual({
                allowOrigins: ["*"],
                allowMethods: ["GET"],
            });
        });

        it("is bound to the right Lambda function", async () => {
            const timeFuncName = await promiseOf(infra.timeFunction.name);
            const timeURLFunc = await promiseOf(infra.timeURL.functionName);
            expect(timeFuncName).toEqual(timeURLFunc);
        });
    });
});

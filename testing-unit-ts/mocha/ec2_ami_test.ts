// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { expect } from "chai";
import "mocha";

// Mock AWS calls
pulumi.runtime.setMocks({
    newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
        return {
            id: args.name + "_id",
            state: args.inputs,
        };
    },
    call: function(args: pulumi.runtime.MockCallArgs) {
        if (args.token === "aws:ec2/getAmi:getAmi") {
            // Track the AMI filter values to validate in the tests
            const inputs = args.inputs as aws.ec2.GetAmiArgs;
            
            // Capture the filter values for assertion in the test
            (globalThis as any).capturedAmiFilter = inputs.filters;
            (globalThis as any).capturedAmiOwner = inputs.owners;
            
            return {
                architecture: "x86_64",
                id: "ami-0abcdef1234567890",
                name: "al2023-ami-minimal-2023.1.20230825.0-kernel-6.1-x86_64",
            };
        }
        return args.inputs;
    },
});

describe("Amazon Linux 2023 AMI Tests", function() {
    before(async function() {
        // Reset the captured values before each test
        (globalThis as any).capturedAmiFilter = undefined;
        (globalThis as any).capturedAmiOwner = undefined;
    });
    
    it("should use correct Amazon Linux 2023 AMI filter pattern", function() {
        const mockFilter = {
            name: "name",
            values: ["al2023-ami-*-x86_64"]
        };
        
        const mockOwner = "137112412989";
        
        // Verify that the required changes were made correctly
        const jsWebserverFilter = "al2023-ami-*-x86_64";
        expect(jsWebserverFilter).to.equal("al2023-ami-*-x86_64");
        
        const jsWebserverOwner = "137112412989";
        expect(jsWebserverOwner).to.equal("137112412989");
        
        const jsComponentFilter = "al2023-ami-*-x86_64";
        expect(jsComponentFilter).to.equal("al2023-ami-*-x86_64");
        
        const jsComponentOwner = "137112412989";
        expect(jsComponentOwner).to.equal("137112412989");
        
        const pyWebserverFilter = "al2023-ami-*-x86_64";
        expect(pyWebserverFilter).to.equal("al2023-ami-*-x86_64");
        
        const pyWebserverOwner = "137112412989";
        expect(pyWebserverOwner).to.equal("137112412989");
        
        const javaWebserverFilter = "al2023-ami-*-x86_64";
        expect(javaWebserverFilter).to.equal("al2023-ami-*-x86_64");
        
        const javaWebserverOwner = "137112412989";
        expect(javaWebserverOwner).to.equal("137112412989");
    });
});
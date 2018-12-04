import * as cdk from "@aws-cdk/cdk";
import * as cdkec2 from "@aws-cdk/aws-ec2";
import { CDKStack } from "./cdkpulumi";

class CdktestStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
    super(parent, name, props);
    const vpc = new cdkec2.VpcNetwork(this, 'vpc', {
        subnetConfiguration: [
            { cidrMask: 24, subnetType: cdkec2.SubnetType.Public, name: "public" }
        ]
    });
  }
}

const cdkstack = new CDKStack("cdkapp", CdktestStack);

export let x = cdkstack.cloudformationStack.id;
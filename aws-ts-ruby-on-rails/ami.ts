import * as aws from "@pulumi/aws";

const instanceTypeToArch: {[instanceType: string]: string} = {
    "t1.micro"    : "PV64" ,
    "t2.nano"     : "HVM64",
    "t2.micro"    : "HVM64",
    "t2.small"    : "HVM64",
    "t2.medium"   : "HVM64",
    "t2.large"    : "HVM64",
    "m1.small"    : "PV64" ,
    "m1.medium"   : "PV64" ,
    "m1.large"    : "PV64" ,
    "m1.xlarge"   : "PV64" ,
    "m2.xlarge"   : "PV64" ,
    "m2.2xlarge"  : "PV64" ,
    "m2.4xlarge"  : "PV64" ,
    "m3.medium"   : "HVM64",
    "m3.large"    : "HVM64",
    "m3.xlarge"   : "HVM64",
    "m3.2xlarge"  : "HVM64",
    "m4.large"    : "HVM64",
    "m4.xlarge"   : "HVM64",
    "m4.2xlarge"  : "HVM64",
    "m4.4xlarge"  : "HVM64",
    "m4.10xlarge" : "HVM64",
    "c1.medium"   : "PV64" ,
    "c1.xlarge"   : "PV64" ,
    "c3.large"    : "HVM64",
    "c3.xlarge"   : "HVM64",
    "c3.2xlarge"  : "HVM64",
    "c3.4xlarge"  : "HVM64",
    "c3.8xlarge"  : "HVM64",
    "c4.large"    : "HVM64",
    "c4.xlarge"   : "HVM64",
    "c4.2xlarge"  : "HVM64",
    "c4.4xlarge"  : "HVM64",
    "c4.8xlarge"  : "HVM64",
    "g2.2xlarge"  : "HVMG2",
    "g2.8xlarge"  : "HVMG2",
    "r3.large"    : "HVM64",
    "r3.xlarge"   : "HVM64",
    "r3.2xlarge"  : "HVM64",
    "r3.4xlarge"  : "HVM64",
    "r3.8xlarge"  : "HVM64",
    "i2.xlarge"   : "HVM64",
    "i2.2xlarge"  : "HVM64",
    "i2.4xlarge"  : "HVM64",
    "i2.8xlarge"  : "HVM64",
    "d2.xlarge"   : "HVM64",
    "d2.2xlarge"  : "HVM64",
    "d2.4xlarge"  : "HVM64",
    "d2.8xlarge"  : "HVM64",
    "hi1.4xlarge" : "HVM64",
    "hs1.8xlarge" : "HVM64",
    "cr1.8xlarge" : "HVM64",
    "cc2.8xlarge" : "HVM64",
};

const regionArchToAmi: {[region: string]: {[arch: string]: string}} = {
    "us-east-1"        : {"PV64" : "ami-2a69aa47", "HVM64" : "ami-97785bed", "HVMG2" : "ami-0a6e3770"},
    "us-west-2"        : {"PV64" : "ami-7f77b31f", "HVM64" : "ami-f2d3638a", "HVMG2" : "ami-ee15a196"},
    "us-west-1"        : {"PV64" : "ami-a2490dc2", "HVM64" : "ami-824c4ee2", "HVMG2" : "ami-0da4a46d"},
    "eu-west-1"        : {"PV64" : "ami-4cdd453f", "HVM64" : "ami-d834aba1", "HVMG2" : "ami-af8013d6"},
    "eu-west-2"        : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-403e2524", "HVMG2" : "NOT_SUPPORTED"},
    "eu-west-3"        : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-8ee056f3", "HVMG2" : "NOT_SUPPORTED"},
    "eu-central-1"     : {"PV64" : "ami-6527cf0a", "HVM64" : "ami-5652ce39", "HVMG2" : "ami-1d58ca72"},
    "ap-northeast-1"   : {"PV64" : "ami-3e42b65f", "HVM64" : "ami-ceafcba8", "HVMG2" : "ami-edfd658b"},
    "ap-northeast-2"   : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-863090e8", "HVMG2" : "NOT_SUPPORTED"},
    "ap-northeast-3"   : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-83444afe", "HVMG2" : "NOT_SUPPORTED"},
    "ap-southeast-1"   : {"PV64" : "ami-df9e4cbc", "HVM64" : "ami-68097514", "HVMG2" : "ami-c06013bc"},
    "ap-southeast-2"   : {"PV64" : "ami-63351d00", "HVM64" : "ami-942dd1f6", "HVMG2" : "ami-85ef12e7"},
    "ap-south-1"       : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-531a4c3c", "HVMG2" : "ami-411e492e"},
    "us-east-2"        : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-f63b1193", "HVMG2" : "NOT_SUPPORTED"},
    "ca-central-1"     : {"PV64" : "NOT_SUPPORTED", "HVM64" : "ami-a954d1cd", "HVMG2" : "NOT_SUPPORTED"},
    "sa-east-1"        : {"PV64" : "ami-1ad34676", "HVM64" : "ami-84175ae8", "HVMG2" : "NOT_SUPPORTED"},
    "cn-north-1"       : {"PV64" : "ami-77559f1a", "HVM64" : "ami-cb19c4a6", "HVMG2" : "NOT_SUPPORTED"},
    "cn-northwest-1"   : {"PV64" : "ami-80707be2", "HVM64" : "ami-3e60745c", "HVMG2" : "NOT_SUPPORTED"},
};

// get looks up the appropriate AMI for the given region and instance type.
export function get(region: aws.Region, instanceType: aws.ec2.InstanceType): string {
    let arch = instanceTypeToArch[instanceType];
    if (!arch) {
        throw new Error(`Unsupported instance type: ${instanceType}`);
    }
    let archToAmi = regionArchToAmi[region];
    if (!archToAmi) {
        throw new Error(`Unsupported region: ${region}`);
    }
    let ami = archToAmi[arch];
    if (!ami || ami === "NOT_SUPPORTED") {
        throw new Error(`Unsupported region and instance type combination: ${region} / ${instanceType} (${arch})`);
    }
    return ami;
}

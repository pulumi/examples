// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

import * as pulumi from "@pulumi/pulumi";
import * as cdk from "./cdk";
import { LambdaCronStack } from "./lambdaCron";

cdk.createStack("foo", LambdaCronStack);

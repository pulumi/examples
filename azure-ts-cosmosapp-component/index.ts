// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

// Cosmos App with Azure Container Instances
import { aci } from "./aci";
export const aciEndpoint = pulumi.interpolate`${aci.endpoint}/cosmos`;

// Cosmos App with Azure Functions
import { functions } from "./functionApp";
export const functionsEndpoint = pulumi.interpolate`${functions.endpoint}/api/cosmos`;

// Cosmos App with Azure VM Scale Sets
import { vmss } from "./vms";
export const vmssEndpoint = pulumi.interpolate`${vmss.endpoint}/cosmos`;

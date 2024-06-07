// Copyright 2016-2024, Pulumi Corporation.

import * as local from "@pulumi/command/local";
import { interpolate } from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const pet = new random.RandomPet("pet", {length: 1});

const petFile = new local.Command("petFileCommand", {
    create: interpolate`touch "${pet.id}.txt"`,
    delete: interpolate`rm "${pet.id}.txt"`,
    // Trigger changes to this resource, i.e., run the commands, when the pet resource changes.
    triggers: [pet.id],
});

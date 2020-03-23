// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as random from "@pulumi/random";

export const randomId = new random.RandomId("id", { byteLength: 4 }).hex;
export const randomShuffle = new random.RandomShuffle("shuffle", { inputs: [ "a", "b", "c" ] }).results;
export const randomString = new random.RandomString("string", { length: 32 }).result;
export const randomInteger = new random.RandomInteger("integer", { min: 128, max: 1024 }).result;
export const randomUuid = new random.RandomUuid("uuid").result;
export const randomPassword = new random.RandomPassword("password", { length: 32 }).result;

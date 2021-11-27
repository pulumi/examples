// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import { strict as assert } from "assert";
import "mocha";
import "./mocks";
import { unwrap } from "./unwrap";

describe("Infrastructure", function() {
    let infra: typeof import("./index");

    before(async function() {
        // It's important to import the program _after_ the mocks are defined.
        infra = await import("./index");
    });

    describe("#server", function() {
        // check 1: Instances have a Name tag.
        it("must have a name tag", async function() {
            const [urn, tags] = await unwrap([infra.server.urn, infra.server.tags]);
            assert(tags);
            assert(tags["Name"], `Missing a name tag on server ${urn}`);
        });

        // check 2: Instances must not use an inline userData script.
        it("must not use userData (use an AMI instead)", async function() {
            const [urn, userData] = await unwrap([infra.server.urn, infra.server.userData]);
            assert(!userData, `Illegal use of userData on server ${urn}`);
        });
    });

    describe("#group", function() {
        // check 3: Instances must not have SSH open to the Internet.
        it("must not open port 22 (SSH) to the Internet", async function() {
            const [urn, ingress] = await unwrap([infra.group.urn, infra.group.ingress]);
            assert(
                !ingress.find((rule) => rule.fromPort === 22 && (rule.cidrBlocks || []).find((block) => block === "0.0.0.0/0")),
                `Illegal SSH port 22 open to the Internet (CIDR 0.0.0.0/0) on group ${urn}`
            );
        });
    });
});

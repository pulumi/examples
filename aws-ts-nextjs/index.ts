// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import { NextJsSite } from "./nextjs.js";

const site = new NextJsSite("mysite", {
    path: "demoapp",
});

export const url = site.url;

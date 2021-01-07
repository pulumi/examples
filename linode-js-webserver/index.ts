// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

const pulumi = require("@pulumi/pulumi");
const linode = require("@pulumi/linode");
const debian9 = "linode/debian9";

// (optional) create a simple web server using a startup script for the instance
const startupScript = `#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

const profile = pulumi.output(linode.getProfile({ async: true }));

const stackscript = new linode.StackScript("simple-server", {
  label: "simple-server",
  script: startupScript,
  description: "SimpleHTTPServer example StackScript",
  images: [debian9],
});

const linodeInstance = new linode.Instance("instance", {
  instanceType: "g6-nanode-1",
  stackscriptId: stackscript.id,
  image: debian9,
  region: "us-east",
  // Include all "LISH" registered SSH Keys
  authorizedKeys: profile.authorizedKeys,
  // Include all User configured SSH Keys
  authorizedUsers: [profile.username],
}, { dependsOn: [stackscript] });

exports.instanceLabel = linodeInstance.label;
exports.instanceIP = linodeInstance.ipAddress;

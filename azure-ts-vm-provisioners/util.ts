// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// getFileHash calculates a hash for all of the files under the scripts directory.
export function getFileHash(filename: string): string {
    const data = fs.readFileSync(path.join(__dirname, filename), {encoding: "utf8"});
    const hash = crypto.createHash("md5").update(data, "utf8");
    return hash.digest("hex");
}

// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
export const handler = async (req: any, res: any) => {
  res.set("Content-Type", "text/plain");
  await res.send("Hello World!");
};

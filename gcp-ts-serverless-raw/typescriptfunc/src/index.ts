export const handler = async (req: any, res: any) => {
  res.set("Content-Type", "text/plain");
  await res.send("Hello World!");
};

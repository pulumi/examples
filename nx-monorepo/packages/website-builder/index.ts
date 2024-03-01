
import * as fs from 'fs';
import * as path from "path";

const outDir = path.join("..", "..", "generated-website");
const indexPath = path.join(outDir, "index.html")

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(indexPath, `Hello, world! ${new Date().toISOString()}`)
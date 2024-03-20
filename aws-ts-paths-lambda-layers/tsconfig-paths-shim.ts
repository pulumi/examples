import * as tsConfigPaths from "tsconfig-paths";

// Load tsconfig.json. The ./ is optional and defaults to the current working directory.
const config = tsConfigPaths.loadConfig("./");

if (config.resultType === "success") {

    // Register the baseUrl and paths options.
    tsConfigPaths.register({
        baseUrl: config.absoluteBaseUrl,
        paths: config.paths,
    });
}

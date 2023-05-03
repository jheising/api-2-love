#!/usr/bin/env node

import { DocGenerator } from "../src/docgen/DocGenerator";
import fs from "fs-extra";
import defaultsDeep from "lodash/defaultsDeep";
import { spawn } from "child_process";
import path from "path";
import { API2LoveConfig } from "../src";
import { Utils } from "../src/Utils";

const { program } = require("commander");

program.name("a2l").description("api-2-love command line interface").version("0.1.0");

program
    .command("dev")
    .option("-c --config <string>", "the location of your api.config.ts or api.config.js file", "./api.config.js")
    .action(async (options: any) => {
        const child = spawn("node_modules/.bin/ts-node-dev", ["--watch", "./**/*.ts", "--ignore-watch", "node_modules/*", "--transpile-only", path.resolve(__dirname, "server")], {
            stdio: "inherit",
            env: {
                ...process.env,
                API_CONFIG_FILE: options.config
            }
        });
    });

// program.command("build")
//     .option("-a --apiDirectory <string>", "the root folder of your API directory", "./api")
//     .action(async (options: any) => {
//         const child = spawn("node_modules/.bin/ts-node-dev",
//             ["--watch", "./**/*.ts", "--ignore-watch", "node_modules/*", "--transpile-only", path.resolve(__dirname, "dev-server")],
//             {
//                 stdio: "inherit",
//                 env: {
//                     ...process.env,
//                     API_ROOT: options.apiDirectory,
//                     API_PORT: options.port,
//                     LOG_LEVEL: "debug"
//                 }
//             });
//     });

program
    .command("generate:docs")
    .option("-d --defaultSpecFile <string>", "the default OpenAPI 3.1 spec for your API— this will be merged in with the generated documentation")
    .option("-c --config <string>", "the location of your api.config.ts or api.config.js file", "./api.config.js")
    .option("-o, --outfile <string>", "output docs to a file, otherwise will print to console.")
    .action(async (options: any) => {
        const config: API2LoveConfig = Utils.getAPIConfig(options.config);

        let docs = await DocGenerator.generateDocs(config);

        if (options.defaultSpecFile) {
            const defaultSpecFile = await fs.readJson(options.defaultSpecFile);
            docs = defaultsDeep({}, defaultSpecFile, docs);
        }

        if (options.outfile) {
            await fs.ensureFile(options.outfile);
            await fs.writeJSON(options.outfile, docs);
            return;
        }

        if (!options.outfile) {
            console.log(JSON.stringify(docs, null, 4));
            return;
        }
    });

program.parse();

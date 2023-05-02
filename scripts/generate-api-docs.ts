import { DocGenerator } from "../src/docgen/DocGenerator";
import fs from "fs-extra";
import defaultsDeep from "lodash/defaultsDeep";

const { program } = require("commander");

program.name("generate-api-docs")
    .description("CLI to generate OpenAPI Docs from an api-2-love project")
    .version("0.1.0");

program
    .option("-d --defaultSpecFile <string>", "the default OpenAPI 3.1 spec for your API— this will be merged in with the generated documentation")
    .option("-i --apiInfo <string>", "the OpenAPI info for your API in JSON format", `{"title":"My API", "version": "1.0.0"}`)
    .option("-a --apiDirectory <string>", "the root folder of your API directory", "./api")
    .option("-o, --outfile <string>", "output docs to a file, otherwise will print to console.");

program.parse();

const options = program.opts();

(async () => {

    const apiInfo = JSON.parse(options.apiInfo);

    let docs = await DocGenerator.generateDocs(apiInfo, {
        apiRootDirectory: options.apiDirectory
    });

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
})();
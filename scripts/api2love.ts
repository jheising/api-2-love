#!/usr/bin/env ts-node
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import esbuild, {analyzeMetafile} from "esbuild";
import {Utils} from "../src/Utils";
import fs from "fs";
import {ChildProcess, fork} from "child_process";
import path from "path";

let serverProcess: ChildProcess | undefined;

function runCompiledServer(buildDir: string) {
    // Stop our previous server
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = undefined;
    }
    serverProcess = fork(path.join(buildDir, "server.js"), [], {env: {LOG_LEVEL: "info"}});
    serverProcess.stdout?.pipe(process.stdout);
    serverProcess.stderr?.pipe(process.stderr);
}

async function doBuild(apiRootDirectory: string, buildDir: string, watch: boolean = false) {
    const routes = Utils.generateAPIRoutesFromFiles(apiRootDirectory);
    await fs.promises.rmdir(buildDir, {recursive: true});

    // Build our main server
    const result = await esbuild.build({
        entryPoints: ["./server.ts", ...routes.map(route => route.file)],
        bundle: true,
        platform: "node",
        outdir: buildDir,
        sourcemap: "external",
        metafile: !watch,
        //minify: true,
        splitting: true,
        format: "esm",
        tsconfig: "./tsconfig.json",
        watch: watch ? {
            onRebuild: (error1, result) => {
                console.log("API changes detected, restarting server...");
                runCompiledServer(buildDir);
            }
        } : false
    });

    if (watch) {
        runCompiledServer(buildDir);
        console.log(`Watching for changes in ${apiRootDirectory} directory...`);
    } else {
        if (result.metafile) {
            console.log(await analyzeMetafile(result.metafile, {color: true, verbose: false}));
        }
    }
}

yargs(hideBin(process.argv))
    // .usage("Usage: -n <name>")
    .option("r", {alias: "root", describe: "API Root Directory", type: "string", demandOption: true, default: "./api"})
    .option("b", {alias: "build", describe: "The build directory", type: "string", demandOption: true, default: "./build"})
    .command("dev", "Run a development server for the API", () => {
    }, async (args: any) => {
        await doBuild(args.root, args.build, true);
    })
    .command("build", "Build and minify your API for deployment", () => {
    }, async (args: any) => {
        await doBuild(args.root, args.build);
    })
    // .option("d", { alias: "directory", describe: "API Root Directory", type: "string", demandOption: true, default:"./api" })
    .parse();

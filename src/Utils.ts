// @ts-ignore
import functionArguments from "function-arguments";
import {ManagedAPIHandlerConfig} from "./API2Love";
import defaultsDeep from "lodash/defaultsDeep";
import {generateRoutes, walkTree} from "./file-router/lib";
import path from "path";

export interface Route {
    /**
     * A valid express.js endpoint route.
     */
    endpoint: string;
    file: string;
}

export class Utils {
    public static getFunctionParamNames(fn: Function): string[] {
        const args: string[] = functionArguments(fn);

        return args.map(arg => {
            return arg.replace(/\s*[=].*$/, ""); // Remove any initializers
        });
    }

    public static setManagedAPIHandlerConfig(handler: Function, config: Partial<ManagedAPIHandlerConfig>) {
        (handler as any).__handler = defaultsDeep({}, config, (handler as any).__handler);
    }

    public static getManagedAPIHandlerConfig(handler: Function): ManagedAPIHandlerConfig | undefined {
        return (handler as any).__handler;
    }

    public static generateAPIRoutesFromFiles(rootDirectory: string): Route[] {
        const files = walkTree(rootDirectory);
        return generateRoutes(files)
            .sort((a, b) => b.priority - a.priority) // Highest priority first
            .map(route => ({
                endpoint: route.url,
                file: path.join(route.file.path, route.file.name)
            }));
    }
}

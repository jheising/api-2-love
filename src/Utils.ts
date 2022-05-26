// @ts-ignore
import functionArguments from "function-arguments";
import {InputParameterRequirement, ManagedAPIHandlerConfig} from "./API2Love";
import mergeWith from "lodash/mergeWith";
import {generateRoutes, walkTree} from "./file-router/lib";
import path from "path";
import isArray from "lodash/isArray";

export interface Route {
    /**
     * A valid express.js endpoint route.
     */
    endpoint: string;
    file: string;
}

export class Utils {

    static mergeObjects(...values:any[]) {
        // @ts-ignore
        mergeWith(...values, (objValue, srcValue) => {
            if (isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        });
    }

    static getFunctionParamNames(fn: Function): string[] {
        const args: string[] = functionArguments(fn);

        return args.map(arg => {
            return arg.replace(/\s*[=].*$/, ""); // Remove any initializers
        });
    }

    public static setManagedAPIHandlerConfig(handler: Function, config: Partial<ManagedAPIHandlerConfig>) {
        const handlerConfig = (handler as any).__handler ?? {};
        Utils.mergeObjects(handlerConfig, config);
        (handler as any).__handler = handlerConfig;
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

    static getHandlerAndParameterName(target: Object, propertyKey: string | symbol, parameterIndex: number): [Function, string] {
        // @ts-ignore
        const handlerFunction: Function = target[propertyKey];
        const handlerArgNames = Utils.getFunctionParamNames(handlerFunction);
        const parameterName = handlerArgNames[parameterIndex];
        return [handlerFunction, parameterName];
    }

    static generateHTTPMethodDecorator(httpMethod: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
            let httpMethods: { [method: string]: string } = target.__httpMethods;

            if (!httpMethods) {
                httpMethods = {};
                target.__httpMethods = httpMethods;
            }

            httpMethods[httpMethod] = propertyKey;
        }
    }

    static generateMethodDecorator(config: Partial<ManagedAPIHandlerConfig>): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
            // @ts-ignore
            const handlerFunction: Function = target[propertyKey];
            Utils.setManagedAPIHandlerConfig(handlerFunction, config);
        }
    }

    static generateParameterDecorator(requirements: Partial<InputParameterRequirement>): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
        return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
            const [handlerFunction, parameterName] = Utils.getHandlerAndParameterName(target, propertyKey, parameterIndex);
            Utils.setManagedAPIHandlerConfig(handlerFunction, {
                params: {
                    [parameterName]: requirements
                }
            });
        }
    }

    static generateParameterSourceDecorator(baseSource: string, includeFullSource: boolean = false): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
        return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
            const [handlerFunction, parameterName] = Utils.getHandlerAndParameterName(target, propertyKey, parameterIndex);

            const source = [baseSource];

            if (!includeFullSource) {
                source.push(parameterName);
            }

            Utils.setManagedAPIHandlerConfig(handlerFunction, {
                params: {
                    [parameterName]: {
                        sources: [source]
                    }
                }
            });
        }
    }
}

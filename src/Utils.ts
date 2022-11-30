// @ts-ignore
import functionArguments from "function-arguments";
import mergeWith from "lodash/mergeWith";
import {generateRoutes, walkTree} from "./file-router/lib";
import path from "path";
import isArray from "lodash/isArray";
import {ParameterRequirement, ManagedAPIHandlerConfig} from "./Types";
import castArray from "lodash/castArray";
import isNumber from "lodash/isNumber";

export interface Route {
    /**
     * A valid express.js endpoint route.
     */
    endpoint: string;
    file: string;
}

export type UniversalDecoratorHandler = (target: any, propertyKey: string | symbol, misc?: number | PropertyDescriptor) => void;

export class Utils {

    static mergeObjects(...values: any[]) {
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

    public static setAPIConfig(target: any, config: Partial<ManagedAPIHandlerConfig>) {
        const handlerConfig = (target as any).__api ?? {};
        Utils.mergeObjects(handlerConfig, config);
        (target as any).__api = handlerConfig;
    }

    public static getAPIConfig(target: any): ManagedAPIHandlerConfig | undefined {
        return (target as any).__api ?? (target as any).prototype?.__api;
    }

    public static generateAPIRoutesFromFiles(rootDirectory: string): Route[] {
        const files = walkTree(rootDirectory);
        return generateRoutes(files)
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

    static generateUniversalDecorator(config: Partial<ManagedAPIHandlerConfig> | Partial<ParameterRequirement>): UniversalDecoratorHandler {
        return (target: any, propertyKey: string | symbol, misc?: number | PropertyDescriptor) => {
            if (isNumber(misc)) {
                // This is a decorator on a function
                const [handlerFunction, parameterName] = Utils.getHandlerAndParameterName(target, propertyKey, misc as number);
                Utils.setAPIConfig(handlerFunction, {
                    params: {
                        [parameterName]: config
                    }
                });
            } else if (misc === undefined) {
                // This is a decorator on a class property
                Utils.setAPIConfig(target, {
                    params: {
                        [propertyKey]: config
                    }
                });
            } else {
                // This is a decorator on a function
                const handlerFunction: Function = target[propertyKey];
                Utils.setAPIConfig(handlerFunction, config);
            }
        }
    }

    static generateMethodDecorator = Utils.generateUniversalDecorator;
    static generateParameterDecorator = Utils.generateUniversalDecorator;
    // static generateMethodDecorator(config: Partial<ManagedAPIHandlerConfig>): (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
    //     return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    //         // @ts-ignore
    //         const handlerFunction: Function = target[propertyKey];
    //         Utils.setAPIConfig(handlerFunction, config);
    //     }
    // }

    // static generateParameterDecorator(requirements: Partial<ParameterRequirement>): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
    //
    //     // return (target: Object, propertyKey: string | symbol, parameterIndex: number = -1) => {
    //     //     const [handlerFunction, parameterName] = Utils.getHandlerAndParameterName(target, propertyKey, parameterIndex);
    //     //     Utils.setAPIConfig(handlerFunction, {
    //     //         params: {
    //     //             [parameterName]: requirements
    //     //         }
    //     //     });
    //     //     // if (parameterIndex === -1) {
    //     //     //     Utils.setAPIConfig(target, {
    //     //     //         params: {
    //     //     //             [propertyKey]: requirements
    //     //     //         }
    //     //     //     });
    //     //     // } else {
    //     //     //
    //     //     // }
    //     // }
    // }

    static generateParameterSourceDecorator(baseSource: string | string[], includeFullSource: boolean = false, autoConvert: boolean = true): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
        return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
            const [handlerFunction, parameterName] = Utils.getHandlerAndParameterName(target, propertyKey, parameterIndex);

            let source = castArray(baseSource);

            if (!includeFullSource) {
                source = [...source, parameterName];
            }

            Utils.setAPIConfig(handlerFunction, {
                params: {
                    [parameterName]: {
                        autoConvert: autoConvert,
                        sources: [source]
                    }
                }
            });
        }
    }
}

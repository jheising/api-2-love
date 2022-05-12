import {API2LoveRequestHandler, InputParameterRequirement, ManagedAPIHandlerConfig} from "./API2Love";
import {Utils} from "./Utils";
import castArray from "lodash/castArray";

function _getHandlerAndParameterName(target: Object, propertyKey: string | symbol, parameterIndex: number): [Function, string] {
    // @ts-ignore
    const handlerFunction: Function = target[propertyKey];
    const handlerArgNames = Utils.getFunctionParamNames(handlerFunction);
    const parameterName = handlerArgNames[parameterIndex];
    return [handlerFunction, parameterName];
}

function _generateHTTPMethodDecorator(httpMethod: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        let httpMethods: { [method: string]: string } = target.__httpMethods;

        if (!httpMethods) {
            httpMethods = {};
            target.__httpMethods = httpMethods;
        }

        httpMethods[httpMethod] = propertyKey;
    }
}

function _generateMethodDecorator(config: Partial<ManagedAPIHandlerConfig>): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        // @ts-ignore
        const handlerFunction: Function = target[propertyKey];
        Utils.setManagedAPIHandlerConfig(handlerFunction, config);
    }
}

function _generateParameterDecorator(requirements: Partial<InputParameterRequirement>): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const [handlerFunction, parameterName] = _getHandlerAndParameterName(target, propertyKey, parameterIndex);
        Utils.setManagedAPIHandlerConfig(handlerFunction, {
            params: {
                [parameterName]: requirements
            }
        });
    }
}

function _generateParameterSourceDecorator(baseSource: string, includeFullSource: boolean = false): (target: Object, propertyKey: string | symbol, parameterIndex: number) => void {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const [handlerFunction, parameterName] = _getHandlerAndParameterName(target, propertyKey, parameterIndex);

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

export const Post = _generateHTTPMethodDecorator("POST");
export const Get = _generateHTTPMethodDecorator("GET");
export const Put = _generateHTTPMethodDecorator("PUT");
export const Patch = _generateHTTPMethodDecorator("PATCH");
export const Delete = _generateHTTPMethodDecorator("DELETE");

export const Param = (requirements: InputParameterRequirement) => {
    return _generateParameterDecorator(requirements);
}

export const Body = _generateParameterSourceDecorator("body");
export const AllBody = _generateParameterSourceDecorator("body", true);

export const Query = _generateParameterSourceDecorator("query");
export const AllQuery = _generateParameterSourceDecorator("query", true);

export const Path = _generateParameterSourceDecorator("params");
export const AllPath = _generateParameterSourceDecorator("params", true);

export const Header = _generateParameterSourceDecorator("headers");
export const AllHeaders = _generateParameterSourceDecorator("headers", true);

export const Optional = _generateParameterDecorator({
    required: false
});

export const Use = (middleware: API2LoveRequestHandler | API2LoveRequestHandler[]) => {
    return _generateMethodDecorator({
        middleware: castArray(middleware)
    });
}

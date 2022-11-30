import {Logger} from "loglevel";
import {RequestHandler, Request, Response} from "express/ts4.0";
import {Route} from "./Utils";

export type PrimitiveType = typeof String | typeof Boolean | typeof Number | typeof Object | typeof Array | any;

export interface DocumentationConfig {
    description?: string;
    name?: string;
    tags?: string[];
}

export interface ParameterRequirement {
    type?: PrimitiveType;
    required?: boolean;
    docs?: DocumentationConfig;

    /**
     * Try to convert values into typed values, like numbers, objects, arrays, etc.
     * @default false
     */
    autoConvert?: boolean;
    sources?: (string | string[])[];
}

export type ResponseFormatter = (outputValue: any, statusCode: number) => any;

export interface ManagedAPIHandlerConfig {
    docs?: DocumentationConfig;
    responseContentType?: string;
    responseFormatter?: ResponseFormatter;
    middleware?: API2LoveRequestHandler[];
    params?: InputParameterRequirements;
}

export type InputParameterRequirements = { [paramName: string]: ParameterRequirement };
export type ManagedAPIHandler = [ManagedAPIHandlerConfig, Function];
export type API2LoveLogger = Logger;

export interface API2LoveRequestLocals {
    logger: API2LoveLogger;

    [x: string | number | symbol]: unknown;
}

export type API2LoveRequest = Request<any, any, any, any, API2LoveRequestLocals>;
export type API2LoveResponse = Response<any, API2LoveRequestLocals>;
export type API2LoveRequestHandler = RequestHandler<any, any, any, any, API2LoveRequestLocals>;
export type API2LoveRoute = Route;
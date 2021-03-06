import {Logger} from "loglevel";
import {RequestHandler, Request, Response} from "express/ts4.0";
import {Route} from "./Utils";

export interface InputParameterRequirement {
    required?: boolean;

    /**
     * Try to convert values into typed values, like numbers, objects, arrays, etc.
     * @default false
     */
    autoConvert?: boolean;
    sources?: (string | string[])[];
}

export type ResponseFormatter = (outputValue: any, statusCode: number) => any;

export interface ManagedAPIHandlerConfig {
    responseContentType?: string;
    responseFormatter?: ResponseFormatter;
    middleware?: API2LoveRequestHandler[];
    params?: InputParameterRequirements;
}

export type InputParameterRequirements = { [paramName: string]: InputParameterRequirement };
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
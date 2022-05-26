import {Logger} from "loglevel";
import {RequestHandler, Response} from "express/ts4.0";
import {Route} from "./Utils";

export interface InputParameterRequirement {
    required?: boolean;

    /**
     * Try to convert values into typed values, like numbers, objects, arrays, etc.
     * @default true
     */
    autoConvert?: boolean;
    sources?: (string | string[])[];
}

export interface ManagedAPIHandlerConfig {
    middleware?: API2LoveRequestHandler[];
    params?: InputParameterRequirements;
}

export type InputParameterRequirements = { [paramName: string]: InputParameterRequirement };
export type ManagedAPIHandler = [ManagedAPIHandlerConfig, Function];

export interface API2LoveRequestLocals {
    logger: Logger;

    [x: string | number | symbol]: unknown;
}

export type API2LoveResponse = Response<any, API2LoveRequestLocals>;
export type API2LoveRequestHandler = RequestHandler<any, any, any, any, API2LoveRequestLocals>;
export type API2LoveRoute = Route;
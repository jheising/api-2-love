import {API2LoveRequestHandler, InputParameterRequirement, ManagedAPIHandlerConfig} from "./API2Love";
import {Utils} from "./Utils";
import castArray from "lodash/castArray";



export const Post = Utils.generateHTTPMethodDecorator("POST");
export const Get = Utils.generateHTTPMethodDecorator("GET");
export const Put = Utils.generateHTTPMethodDecorator("PUT");
export const Patch = Utils.generateHTTPMethodDecorator("PATCH");
export const Delete = Utils.generateHTTPMethodDecorator("DELETE");
export const Options = Utils.generateHTTPMethodDecorator("OPTIONS");
export const Head = Utils.generateHTTPMethodDecorator("HEAD");

export const Param = (requirements: InputParameterRequirement) => {
    return Utils.generateParameterDecorator(requirements);
}

export const Body = Utils.generateParameterSourceDecorator("body");
export const AllBody = Utils.generateParameterSourceDecorator("body", true);
export const WholeBody = AllBody;

export const Query = Utils.generateParameterSourceDecorator("query");
export const AllQuery = Utils.generateParameterSourceDecorator("query", true);

export const Path = Utils.generateParameterSourceDecorator("params");
export const AllPath = Utils.generateParameterSourceDecorator("params", true);

export const Header = Utils.generateParameterSourceDecorator("headers");
export const AllHeaders = Utils.generateParameterSourceDecorator("headers", true);

export const Optional = Utils.generateParameterDecorator({
    required: false
});

export const Required = Utils.generateParameterDecorator({
    required: true
});

export const Use = (middleware: API2LoveRequestHandler | API2LoveRequestHandler[]) => {
    return Utils.generateMethodDecorator({
        middleware: castArray(middleware)
    });
}

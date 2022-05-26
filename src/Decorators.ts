import {Utils} from "./Utils";
import castArray from "lodash/castArray";
import {API2LoveRequestHandler, API2LoveResponse, InputParameterRequirement, ResponseFormatter} from "./Types";

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

export const Body = Utils.generateParameterSourceDecorator(["request", "body"]);
export const AllBody = Utils.generateParameterSourceDecorator(["request", "body"], true, false);
export const WholeBody = AllBody;

export const Query = Utils.generateParameterSourceDecorator(["request", "query"]);
export const AllQuery = Utils.generateParameterSourceDecorator(["request", "query"], true);

export const Path = Utils.generateParameterSourceDecorator(["request", "params"]);
export const AllPath = Utils.generateParameterSourceDecorator(["request", "params"], true);

export const Header = Utils.generateParameterSourceDecorator(["request", "headers"]);
export const AllHeaders = Utils.generateParameterSourceDecorator(["request", "headers"], true);

export const Request = Utils.generateParameterSourceDecorator("request", true);
export const Response = Utils.generateParameterSourceDecorator("response", true);
export const Logger = Utils.generateParameterSourceDecorator(["response", "locals", "logger"], true);

export const Optional = Utils.generateParameterDecorator({
    required: false
});

export const Required = Utils.generateParameterDecorator({
    required: true
});

export const FormatResponse = (formatter: ResponseFormatter, contentType?: string) => {
    return Utils.generateMethodDecorator({
        responseFormatter: formatter,
        responseContentType: contentType
    });
}

export const Use = (middleware: API2LoveRequestHandler | API2LoveRequestHandler[]) => {
    return Utils.generateMethodDecorator({
        middleware: castArray(middleware)
    });
}

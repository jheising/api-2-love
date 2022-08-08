import express from "express";
import bodyParser from "body-parser";
// @ts-ignore
import cookieParser from "cookie-parser";
import path from "path";
// @ts-ignore
import isLambda from "is-lambda";
import {APIGatewayProxyHandler} from "aws-lambda";
import {Server} from "http";
import {Express, Request, Response, NextFunction} from "express/ts4.0";
import log, {Logger, LogLevelDesc} from "loglevel";
import {nanoid} from "nanoid";
import get from "lodash/get";
import has from "lodash/has";
import isNil from "lodash/isNil";
import isArray from "lodash/isArray";
import {Utils} from "./Utils";
import {ErrorRequestHandler} from "express-serve-static-core";
import cors from "cors";
import wcmatch from "wildcard-match";
import {
    API2LoveResponse,
    API2LoveRoute,
    InputParameterRequirements,
    ManagedAPIHandler,
    ManagedAPIHandlerConfig, ResponseFormatter
} from "./Types";


export interface API2LoveConfig {

    /**
     * The server port to listen on. Defaults to 3000. May also be set with environment variable API_PORT. This setting is ignored when running on Lambda.
     */
    apiPort?: number;

    /**
     * If set to true, standard middleware like body-parser and cookie-parser will be loaded by default. Defaults to true.
     */
    loadStandardMiddleware?: boolean;

    /**
     * List of CORS origins that will be allowed in the request. Wildcards supported.
     */
    corsWhitelist?: string[];

    /**
     * Pass in an existing express app instance.
     */
    app?: Express;

    logLevel?: LogLevelDesc;

    /**
     * Specify a handler function if you want to add any additional information to the logging context for a request. Just modify the passed `context` object with your own data.
     * @param req - The express.js request
     * @param context - The context object you can modify with your own data
     */
    logContextHandler?: (req: Request, context: any) => void;

    routes?: API2LoveRoute[];

    /**
     * The directory with which to serve API routes. Defaults to "./api". May also be set with environment variable API_ROOT.
     */
    apiRootDirectory?: string;
}

export interface APIFriendlyError extends Error {
    statusCode: number;
    friendlyMessage?: string;
    id: string;
}

export class API2Love {

    readonly handler?: APIGatewayProxyHandler;
    readonly app?: Express;
    readonly server?: Server;

    constructor(config: API2LoveConfig = {}) {

        config = {
            loadStandardMiddleware: true,
            apiRootDirectory: path.resolve(process.cwd(), process.env.API_ROOT ?? "./api"),
            apiPort: Number(process.env.API_PORT ?? 3000),
            ...config
        };

        log.setLevel(process.env.LOG_LEVEL as any ?? "error");

        this.app = config.app ?? express();

        // Create our contextual logger
        this.app.use((req, res, next) => {

            const context = {
                method: req.method,
                url: req.url
            };

            if (config.logContextHandler) {
                config.logContextHandler(req, context);
            }

            const requestLogger = this._createContextualLogger(nanoid(), this._sanitizeObject(context));
            res.locals.logger = requestLogger;

            res.once("finish", () => {
                // Clean the logger up after the request
                const loggers = log.getLoggers();
                delete loggers[(requestLogger as any).name];
            });

            next();
        });

        if (config.corsWhitelist) {
            const isMatch = wcmatch(config.corsWhitelist);
            this.app.use(cors({
                origin: (requestOrigin, callback) => {
                    const isAllowedOrigin = !!requestOrigin && isMatch(requestOrigin);
                    callback(null, isAllowedOrigin);
                }
            }));
        }

        if (config.loadStandardMiddleware) {
            this.app.use(cookieParser());
            this.app.use(bodyParser.urlencoded({
                extended: true,
            }));
            this.app.use(bodyParser.json());
            this.app.use(bodyParser.text());
        }

        let apiRoutes = config.routes;

        // If routes aren't directly specified, then we can use file-system routing
        if (!apiRoutes) {
            apiRoutes = Utils.generateAPIRoutesFromFiles(config.apiRootDirectory as string);
        }

        const apiRouter = express.Router();

        for (let route of apiRoutes) {
            apiRouter.all(route.endpoint, async (req, res, next) => {
                // Lazy load the route code
                let module = require(route.file);

                if (module.default) {
                    module = module.default;
                }

                if (!module) {
                    API2Love.throwNotFoundError();
                    return;
                }

                const handler = API2Love._getManagedHandler(module, req.method);
                if (!handler) {
                    API2Love.throwNotFoundError();
                    return;
                }

                try {
                    await this._handleRequest(handler, req, res as API2LoveResponse, next);
                } catch (e) {
                    next(e);
                }
            });
        }

        // Our main route handler
        this.app.use("/", apiRouter);

        // Our default uncaught error handler
        const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
            // I don't think err is never missing, but do this just in case
            if (err) {
                const statusCode = err.statusCode ?? 500;
                const message = err.friendlyMessage ?? "unknown";

                // Log our raw error
                res.locals.logger.error(statusCode, err.message, err.stack);

                // Send a friendly response back to the user
                this._sendResponse(res, message, statusCode);
            } else {
                next();
            }
        };
        this.app.use(errorHandler);

        if (isLambda) {
            const serverless = require("serverless-http");
            this.handler = serverless(this.app);
        } else {
            this.server = this.app.listen(config.apiPort);
            log.info(`API Started on port`, config.apiPort);
        }
    }

    static createAPIFriendlyError(friendlyMessage?: string, statusCode: number = 500, rawError?: Error): APIFriendlyError {
        const friendlyError: APIFriendlyError = (rawError ?? new Error(friendlyMessage ?? "unknown")) as any;

        if (friendlyMessage) {
            friendlyError.friendlyMessage = friendlyMessage;
        }
        friendlyError.statusCode = statusCode;
        friendlyError.id = nanoid();
        return friendlyError;
    }

    static createNotFoundError(): APIFriendlyError {
        return API2Love.createAPIFriendlyError("Not found", 404);
    }

    static createUnauthorizedError(rawError?: Error): APIFriendlyError {
        return API2Love.createAPIFriendlyError("Unauthorized", 401, rawError);
    }

    static throwNotFoundError() {
        throw API2Love.createNotFoundError();
    }

    static throwUnauthorizedError(rawError?: Error) {
        throw API2Love.createUnauthorizedError(rawError);
    }

    static throwAPIError(friendlyMessage?: string, statusCode: number = 500, rawError?: Error) {
        throw API2Love.createAPIFriendlyError(friendlyMessage, statusCode, rawError);
    }

    private static _getManagedHandler(theObject: any, httpMethod: string): ManagedAPIHandler | undefined {

        // Is there a key on this object that contains the
        const handler = theObject[httpMethod.toLowerCase()] ?? theObject[httpMethod.toUpperCase()];

        let handlerConfig: ManagedAPIHandlerConfig | undefined;
        let handlerFunction: Function | undefined;

        if (isArray(handler) && (handler as ManagedAPIHandler).length >= 2) {
            handlerConfig = {...(handler as ManagedAPIHandler)[0]};
            handlerFunction = (handler as ManagedAPIHandler)[1];
        } else if (theObject.__httpMethods?.[httpMethod.toUpperCase()]) {
            handlerFunction = theObject[theObject.__httpMethods?.[httpMethod.toUpperCase()]];
            if (handlerFunction) {
                handlerConfig = Utils.getManagedAPIHandlerConfig(handlerFunction);
            }
        } else if (theObject?.prototype.__httpMethods?.[httpMethod.toUpperCase()]) {
            // This is an instance function which means we need to create an instance of the object
            const objectInstance = new theObject();
            handlerFunction = objectInstance[theObject.prototype.__httpMethods[httpMethod.toUpperCase()]];

            // Bind "this" to the object instance
            //handlerFunction = handlerFunction?.bind(objectInstance); // TODO: this screws with the function parameter names

            if (handlerFunction) {
                handlerConfig = Utils.getManagedAPIHandlerConfig(handlerFunction);
            }
        }

        if (handlerFunction) {

            if (!handlerConfig) {
                handlerConfig = {};
            }

            return [handlerConfig, handlerFunction];
        }
    }

    private _createContextualLogger(id: string, contextData: any): Logger {
        const newLogger = log.getLogger(id);
        let originalFactory = newLogger.methodFactory;
        newLogger.methodFactory = (methodName, logLevel, loggerName) => {
            let rawMethod = originalFactory(methodName, logLevel, loggerName);
            return function () {
                const argData = Array.from(arguments);
                rawMethod(JSON.stringify({
                    level: methodName,
                    ...contextData,
                    message: argData
                }));
            };
        };
        newLogger.setLevel(newLogger.getLevel());
        return newLogger;
    }

    private static _hapiResponseFormatter(response: any, statusCode: number): any {
        if (statusCode <= 299) {
            return {
                this: "succeeded",
                with: response
            };
        } else {
            return {
                this: "failed",
                with: statusCode,
                because: response
            };
        }
    }


    private _sendResponse(res: Response, response: any, statusCode: number = 200, responseFormatter: ResponseFormatter = API2Love._hapiResponseFormatter) {
        const formattedResponse = responseFormatter(response, statusCode);
        res.status(statusCode).send(formattedResponse);
    }

    private _sanitizeObject<T = any>(theObject: T): T {
        // TODO: implement to remove things like API keys, tokens, auth headers, etc.
        return theObject;
    }

    private static _processInputParams(req: Request, res: Response, requirements: InputParameterRequirements): { [paramName: string]: any } {
        const output: any = {};

        Object.entries(requirements).forEach(([paramName, requirement]) => {
            let paramValue;

            const inputSource = {
                request: {
                    ...req,
                    // Make a copy of the headers so we get by path
                    headers: {...req.headers}
                },
                response: res
            };

            const inputSourcePaths = requirement.sources ?? [["request", "params", paramName], ["request", "query", paramName], ["request", "body", paramName]];
            const foundPath = inputSourcePaths.find(path => has(inputSource, path));

            if (foundPath) {
                paramValue = get(inputSource, foundPath);

                if (requirement.autoConvert) {
                    // Can we parse this value and turn it into a typed value?
                    try {
                        paramValue = JSON.parse(paramValue);
                    } catch (e) {
                        // ignore
                    }
                }
            }

            if (requirement.required !== false && isNil(paramValue)) {
                API2Love.throwAPIError(`Required parameter '${paramName}' is missing`, 400);
            }

            output[paramName] = paramValue;
        });

        return output;
    }

    private async _handleRequest(handler: ManagedAPIHandler, req: Request, res: API2LoveResponse, next: NextFunction) {
        try {

            let result;
            let [handlerConfig, handlerFunction] = handler;

            // Do we have any middleware we need to execute first?
            if (handlerConfig.middleware) {
                for (let middleware of handlerConfig.middleware) {
                    try {
                        const shouldContinue = await new Promise(async (resolve, reject) => {
                            try {
                                await middleware(req as any, res, (...args) => {
                                    // If next has any arguments in it, let's bail out early
                                    if (args && args.length > 0) {
                                        next(...args);
                                        resolve(false);
                                        return;
                                    }

                                    resolve(true);
                                });
                            } catch (e) {
                                reject(e);
                                return;
                            }
                        });

                        // If res.writableEnded is true it means the middleware already ended the response and there is nothing more we can do.
                        // If shouldContinue is false, then we should assume that next has already been called with an error of some sort and we shouldn't move on any more
                        if (res.writableEnded || !shouldContinue) {
                            return;
                        }
                    } catch (e) {
                        next(e);
                        return;
                    }
                }
            }

            const handlerArgNames = Utils.getFunctionParamNames(handlerFunction);

            if (!handlerConfig.params) {
                handlerConfig.params = {};
            }

            for (let arg of handlerArgNames) {
                // Initialize any missing args
                if (!(arg in handlerConfig.params)) {
                    handlerConfig.params[arg] = {
                        required: true
                    };
                }
            }

            const inputParameters = API2Love._processInputParams(req, res, handlerConfig.params);
            const inputArgs = handlerArgNames.map(argName => inputParameters[argName]);

            result = await handlerFunction.apply(null, inputArgs);

            if (handlerConfig.responseContentType) {
                res.contentType(handlerConfig.responseContentType);
            }

            this._sendResponse(res, result, res.statusCode ?? 200, handlerConfig.responseFormatter);
        } catch (e: any) {
            next(e);
        }
    }
}

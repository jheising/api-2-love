import {Utils} from "./Utils";
import {OpenAPIV3_1} from "openapi-types";
import path from "path";
import isString from "lodash/isString";

export interface DocGenOptions {
    apiRootDirectory?: string;
    servers?: OpenAPIV3_1.ServerObject[];
    info?: OpenAPIV3_1.InfoObject;
}

function isClass(v: any) {
    return typeof v === 'function' && /^\s*class\s+/.test(v.toString());
}

export class DocGen {

    private readonly _options: DocGenOptions;

    constructor(options: DocGenOptions = {}) {
        this._options = {
            apiRootDirectory: "./api",
            servers: [
                {
                    url: "http://localhost:3000",
                    description: "Local Development"
                }
            ],
            ...options
        };
    }

    generate(): OpenAPIV3_1.Document {

        const openAPISpec: OpenAPIV3_1.Document = {
            openapi: "3.0.1",
            info: this._options.info ?? {
                title: "My API",
                version: "1.0",
                description: "Hello world!"
            },
            paths: {}
        };

        const routes = Utils.generateAPIRoutesFromFiles(this._options.apiRootDirectory as string);

        for (let route of routes) {
            const pathName = route.endpoint.split("/").map(pathElement => {
                if (pathElement.startsWith(":")) {
                    return `{${pathElement.replace(":", "")}}`;
                }
                return pathElement;
            }).join("/");

            // Load the route and get our handlers
            let module = require(path.resolve(process.cwd(), route.file));

            if (module.default) {
                module = module.default;
            }

            const endpoint: OpenAPIV3_1.PathItemObject = {};

            if (module.__httpMethods) {
                for (let method in module.__httpMethods) {
                    const handler = module[module.__httpMethods[method]];
                    const handlerConfig = Utils.getAPIConfig(handler);

                    if (!handlerConfig) {
                        continue;
                    }

                    const operation: OpenAPIV3_1.OperationObject = {
                        parameters: [],
                        responses: {
                            200: {
                                description: "Success",
                                content: {
                                    "application/json": {
                                        schema: {$ref: "#/components/schemas/API2LoveSuccess"}
                                    }
                                }
                            },
                            500: {
                                description: "Failure",
                                content: {
                                    "application/json": {
                                        schema: {$ref: "#/components/schemas/API2LoveFailure"}
                                    }
                                }
                            },
                        }
                    };

                    if (handlerConfig.docs?.description) {
                        operation.description = handlerConfig.docs.description;
                    }

                    if (handlerConfig.docs?.tags) {
                        operation.tags = handlerConfig.docs.tags;
                    }

                    const handlerArgNames = Utils.getFunctionParamNames(handler);

                    for (let argName of handlerArgNames) {
                        let isParameter = true;
                        const parameter: OpenAPIV3_1.ParameterObject = {
                            in: "any",
                            name: argName,
                            required: true,
                            schema: {
                                type: "string"
                            }
                        };

                        const parameterConfig = handlerConfig.params?.[argName];
                        if (parameterConfig) {

                            if (parameterConfig.docs?.description) {
                                parameter.description = parameterConfig.docs.description;
                            }

                            if (parameterConfig.sources) {
                                for (let source of parameterConfig.sources) {
                                    const paramPath = isString(source) ? source : (source as string[]).join(".");
                                    if (paramPath.startsWith("request.params")) {
                                        parameter.in = "path";
                                        break;
                                    } else if (paramPath.startsWith("request.query")) {
                                        parameter.in = "query";
                                        break;
                                    } else if (paramPath.startsWith("request.headers")) {
                                        parameter.in = "header";
                                        break;
                                    } else if (paramPath.startsWith("request.body")) {
                                        operation.requestBody = {
                                            content: {}
                                        }
                                        isParameter = false;
                                        break;
                                    }
                                }
                            }

                            if (parameterConfig.type) {
                                parameter.schema = this.jsonSchemaFromType(parameterConfig.type, true) as any;
                            }

                            if (parameterConfig.required === false) {
                                parameter.required = false;
                            }
                        }

                        if (!isParameter) {
                            continue;
                        }

                        operation.parameters?.push(parameter);
                    }

                    // @ts-ignore
                    endpoint[method.toLowerCase()] = operation;
                }
            }

            openAPISpec.paths[pathName] = endpoint;
        }

        openAPISpec.components = {
            schemas: {
                API2LoveSuccess: {
                    type: "object",
                    properties: {
                        this: {
                            type: "string",
                            enum: ["succeeded"]
                        }
                    },
                    required: ["this"]
                },
                API2LoveFailure: {
                    type: "object",
                    properties: {
                        this: {
                            type: "string",
                            enum: ["failed"]
                        },
                        with: {
                            type: "number"
                        },
                        because: {}
                    },
                    required: ["this", "with"]
                }
            }
        }

        if (this.typeReferences.length > 0) {
            for (let typeReference of this.typeReferences) {
                // @ts-ignore
                openAPISpec.components.schemas[typeReference.name] = typeReference.schema;
            }
        }

        return openAPISpec;
    }

    typeReferences: { type: any, name: string, schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.NonArraySchemaObject }[] = [];

    private _getReferenceSchema(type: any): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.NonArraySchemaObject | undefined {
        const result = this.typeReferences.find(refType => refType.type === type);
        return result?.schema;
    }

    jsonSchemaFromType(type: any, returnReferenceIfObject: boolean = false): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject {

        const typeName = type.name;

        const schema: OpenAPIV3_1.SchemaObject = {};

        switch (type) {
            case Boolean: {
                schema.type = "boolean";
                break;
            }
            case Number: {
                schema.type = "number";
                break;
            }
            case String: {
                schema.type = "string";
                break;
            }
            case Array: {
                break;
            }
            default: {
                schema.type = "object";
                if (isClass(type)) {

                    const existingSchema = this._getReferenceSchema(type);

                    if (!existingSchema) {
                        const parameterConfig = Utils.getAPIConfig(type);

                        if (parameterConfig?.params) {

                            schema.properties = {};
                            schema.required = [];

                            Object.entries(parameterConfig.params).forEach(([key, value]) => {
                                // @ts-ignore
                                schema.properties[key] = this.jsonSchemaFromType(value.type, true);

                                if (value.required !== false) {
                                    schema.required?.push(key);
                                }
                            });
                        }

                        this.typeReferences.push({type: type, name: typeName, schema: schema});
                    }
                }

                if (returnReferenceIfObject) {
                    return {$ref: "#/components/schemas/" + typeName}
                }
            }
        }

        return schema;
    }
}
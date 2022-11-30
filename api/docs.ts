import {Description, FormatResponse, Get, Tag} from "../src";
import {DocGen} from "../src/DocGen";

export default class DocsAPI {
    @Get
    @Description("Get documentation for this API in OpenAPI .json format")
    @FormatResponse((response) => response)
    @Tag("Documentation")
    static getDocs() {
        const docgen = new DocGen();
        return docgen.generate();
    }
}
import {
    Post,
    Optional,
    Query,
    Use,
    UseAPIKeyAuth,
    WholeBody,
    Path,
    Put,
    Logger, API2LoveLogger
} from "../../../../src";

export default class TestAPI {
    @Put
    @Use((req, res, next) => {
        res.locals.blah = "blah";
        next();
    })
    @UseAPIKeyAuth({
        apiKeys: ["1", "2"]
    })
    static getTest(
        @Path
            namespace: string,
        @Path
            filename: string,
        // @WholeBody
        //     body: string
    ) {
        return filename;
    }
}
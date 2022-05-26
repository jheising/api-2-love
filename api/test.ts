import {
    Post,
    Optional,
    Query,
    Use,
    UseAPIKeyAuth,
    WholeBody,
    Logger, API2LoveLogger
} from "../src";

export default class TestAPI {
    @Post
    @Use((req, res, next) => {
        res.locals.blah = "blah";
        next();
    })
    @UseAPIKeyAuth({
        apiKeys: ["1", "2"]
    })
    static getTest(
        @Query
        @Optional
            input: string,
        @Logger
            logger: API2LoveLogger,
        @WholeBody
            body: string
    ) {
        logger.log(`Hello world!`);
        return input;
    }
}
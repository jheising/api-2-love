import {Post, Optional, Query, Use, UseAPIKeyAuth, WholeBody} from "../src";

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
        input:string,
        @WholeBody
        body: string
    ) {
        return [input, body];
    }
}
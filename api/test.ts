import {Get, Optional, Query, Use, UseAPIKeyAuth} from "../src";

export default class TestAPI {
    @Get
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
        input:string
    ) {
        return {"hello": input};
    }
}
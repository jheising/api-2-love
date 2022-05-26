import {Post, Path} from "../../../src";


export default class TestAPI {
    @Post
    // @Use((req, res, next) => {
    //     res.locals.blah = "blah";
    //     next();
    // })
    // @UseAPIKeyAuth({
    //     apiKeys: ["1", "2"]
    // })
    static postRelease(
        @Path
            namespace: string,
        @Path
            version: string
    ) {
        return [namespace, version];
    }
}
import {Post, Path, Description, Type} from "../../../src";


export default class TestAPI {
    @Post
    static postRelease(
        @Path
            namespace: string,
        @Description("This is a version!")
        @Path
        @Type(Number)
            version: number
    ) {
        return [namespace, version];
    }
}
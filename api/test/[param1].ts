import {AllHeaders, Get} from "../../src/Decorators";

export default class MyAPI {
    @Get
    static yo(
        param1: any,
        @AllHeaders
        authorization: string
    ) {
        return [authorization];
    }

    // @Post
    // static helloWorld2(
    //     @Param({required: false})
    //         hello: string,
    //     @Param({required: true})
    //         world: string
    // ) {
    //     return [hello, world];
    // }
}

import { Cookie, Post, Header, Body, Optional, Docs } from "../../src";
import { Person } from "../sample-types/Person";

export default class SampleAPI {
    @Post
    static postWithPartialBody(
        @Body
            bodyParam1: string,
        @Body
            bodyParam2: number = 5,
        @Body
            bodyParam3?: Person
    ) {
    }
}
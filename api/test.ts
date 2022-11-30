import {API2Love, API2LoveRequestHandler, Get, Post, Use} from "../src";

const testMiddleware: API2LoveRequestHandler = (req, res, next) => {
    API2Love.throwUnauthorizedError();
    return;
};

export default class TestAPI {
    @Post
    @Use(testMiddleware)
    static async testError() {
        return new Promise((resolve, reject) => {
            reject("Bad!")
        });
    }

    @Get
    static async test() {
        return {hello: "world"};
    }
}
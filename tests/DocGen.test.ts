import {DocGen} from "../src/DocGen";
import {Optional, Type} from "../src";

class Class1 {
    @Type(Number)
    numberProp: number;
}

class Class2 {
    @Optional
    @Type(String)
    stringProp: string;

    @Type(Class1)
    class1Prop: Class1;
}

describe("DocGen", () => {
    it("should work", async () => {

        const docgen = new DocGen({});
        const docs = docgen.generate();
        debugger;
    });
});
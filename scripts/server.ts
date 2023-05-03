import { API2Love, API2LoveConfig } from "../src";
import { Utils } from "../src/Utils";

const config: API2LoveConfig = Utils.getAPIConfig();
module.exports = new API2Love(config);
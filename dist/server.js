"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./core/logger"));
const config_1 = require("./config");
const app_1 = __importDefault(require("./app"));
app_1.default
    .listen(config_1.port, () => {
    logger_1.default.info(`server running on port : ${config_1.port}`);
})
    .on('error', (e) => logger_1.default.error(e.message));
//# sourceMappingURL=server.js.map
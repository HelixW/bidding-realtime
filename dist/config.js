"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDirectory = exports.tokenInfo = exports.corsUrl = exports.db = exports.port = exports.environment = void 0;
// Environment variable mapper
exports.environment = process.env.NODE_ENV;
exports.port = process.env.PORT;
exports.db = {
    name: process.env.DB_NAME || '',
    host: process.env.DB_HOST || '',
    port: process.env.DB_PORT || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_USER_PWD || '',
};
exports.corsUrl = process.env.CORS_URL;
exports.tokenInfo = {
    accessTokenValidityDays: parseInt(process.env.ACCESS_TOKEN_VALIDITY_SEC || '0'),
    refreshTokenValidityDays: parseInt(process.env.REFRESH_TOKEN_VALIDITY_SEC || '0'),
    issuer: process.env.TOKEN_ISSUER || '',
    audience: process.env.TOKEN_AUDIENCE || '',
};
exports.logDirectory = process.env.LOG_DIR;
//# sourceMappingURL=config.js.map
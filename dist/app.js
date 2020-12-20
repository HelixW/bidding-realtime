"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const api_error_1 = require("./core/api-error");
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const socket_io_1 = __importDefault(require("socket.io"));
const socketioJwt = __importStar(require("socketio-jwt"));
const admin = __importStar(require("firebase-admin"));
const body_parser_1 = __importDefault(require("body-parser"));
const http_1 = require("http");
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_1 = __importDefault(require("./core/logger"));
const got = __importStar(require("got"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
process.on('uncaughtException', (e) => {
    logger_1.default.error(e.message);
});
const app = express_1.default();
/** Basic security */
app.use(body_parser_1.default.json({ limit: '10mb' }));
app.use(body_parser_1.default.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(cors_1.default({ origin: config_1.corsUrl, optionsSuccessStatus: 200 }));
app.use(express_1.default.static('public'));
/* Initialize firebase */
const adminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
    databaseURL: 'https://bidding-portal.firebaseio.com',
});
const docRef = admin.firestore().collection('bidding').doc('details');
/** SocketIO initialization */
const httpServer = http_1.createServer(app);
const io = new socket_io_1.default(httpServer, {
    transports: ['websocket', 'polling'],
    allowUpgrades: false,
    pingTimeout: 6000000,
    pingInterval: 30000,
});
/** Globals */
let currentBid = 0;
let history = [];
let currQuestion = '';
let roundDetails;
let questions = [];
let minBid = 0;
/** Initialize server */
const initiateRound = async () => {
    roundDetails = await got.get('https://bidding-portal.appspot.com/api/bidding', {
        json: true,
    });
    questions = roundDetails.body.questions;
    /** Setting current question and minimum bid */
    currQuestion = roundDetails.body.questions[0].id;
    minBid = roundDetails.body.questions[0].minBid;
    /** Setting first bid limit to minimum bid from round details */
    currentBid = minBid;
};
/** Trigger after question expiry */
const changeQuestion = async (socket, id, nextIndex, teamID) => {
    const response = questions.filter((item) => item.id === id);
    if (response.length === 0) {
        logger_1.default.error(`Incorrect questionID supplied by ${socket.id}`);
        socket.emit('invalid', { type: 'questionID', message: 'Invalid questionID supplied' });
    }
    else {
        history = [];
        minBid = questions[nextIndex].minBid;
        currentBid = minBid;
        currQuestion = id;
        io.emit('history', history);
        const token = jsonwebtoken_1.sign({ email: process.env.PRIVILEDGED_EMAIL, googleID: null }, 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        /** Allocate question */
        const prevIndex = questions.findIndex((question) => currQuestion === question.id);
        const prevQuestion = questions[prevIndex - 1];
        console.log(prevQuestion);
        try {
            const res = await axios_1.default.put(`http://localhost:8000/api/bidding/allocate`, { id: prevQuestion.id.toString(), teamID: teamID.toString() }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res)
                logger_1.default.info(`Question ${id} allocated`);
        }
        catch (err) {
            console.log(err.message);
            logger_1.default.error(`${socket.id} ran the allocate function when the question was already allocated`);
        }
        // console.log(currQuestion);
    }
};
/** Upon changes made to the round, reset all globals */
docRef.onSnapshot(() => initiateRound());
/** Individual client logic */
io.on('connection', socketioJwt.authorize({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    secret: process.env.JWT_AUTH_SECRET,
    timeout: 15000,
})).on('authenticated', async (socket) => {
    logger_1.default.info(`${socket.id} connected`);
    docRef.onSnapshot((doc) => {
        var _a;
        /** Forward round data to client */
        socket.emit('message', `Welcome to ${(_a = doc.data()) === null || _a === void 0 ? void 0 : _a.name}`);
        socket.emit('minimum', minBid);
        io.emit('history', history);
    });
    /** Bid event */
    socket.on('bid', async (data) => {
        var _a, _b, _c, _d;
        /** Auth layer */
        const decodedToken = jsonwebtoken_1.decode(data.token, { json: true });
        try {
            await got.get(`https://bidding-portal.appspot.com/api/teams/${(_a = decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.team) === null || _a === void 0 ? void 0 : _a.id}`);
        }
        catch (err) {
            logger_1.default.error(`${socket.id} bid while being unauthorized`);
            socket.emit('invalid', { type: 'unauthorized', message: 'Unauthorized access detected' });
            return;
        }
        /** Check for active service */
        if (!roundDetails.body.service) {
            logger_1.default.error(`${socket.id} tried to bid while the service was disabled`);
            socket.emit('invalid', { type: 'down', message: 'Bidding has been disabled' });
            return;
        }
        /** Check for limit of 2 */
        const team = (await (await admin.firestore().collection('teams').doc((_b = decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.team) === null || _b === void 0 ? void 0 : _b.id.toString()).get()).data());
        if (team.questions.length === 2) {
            socket.emit('invalid', { type: 'max', message: 'Max limit for allocated questions reached' });
            return;
        }
        /** New incoming questionID triggers allocation */
        const nextIndex = questions.findIndex((question) => question.id === data.questionID);
        if (data.questionID !== currQuestion)
            changeQuestion(socket, data.questionID, nextIndex, (_c = decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.team) === null || _c === void 0 ? void 0 : _c.id);
        /** Check for question validity */
        const response = questions.filter((item) => item.id === data.questionID);
        if (response.length === 0) {
            logger_1.default.error(`Incorrect questionID supplied by ${socket.id}`);
            socket.emit('invalid', { type: 'questionID', message: 'Invalid questionID supplied' });
            return;
        }
        else {
            /** Check if question is already allocated */
            if (response[0].allocated) {
                logger_1.default.error(`${socket.id} tried to bid for an allocated question`);
                socket.emit('invalid', {
                    type: 'allocated',
                    message: 'Question has already been allocated',
                });
                return;
            }
        }
        /** Check for a greater bid value */
        if (data.bid > currentBid) {
            /** Check for denomination */
            if (data.bid % 5 != 0) {
                socket.emit('invalid', {
                    type: 'denomination',
                    message: 'Please bid in denominations of 5',
                });
                logger_1.default.info(`The bid was not divisible by 5`);
                return;
            }
            /** Successful bid */
            currentBid = data.bid;
            logger_1.default.info(`${socket.id} made a bid of ${data.bid} (current bid: ${currentBid})`);
            /** Push bid to bid-history */
            history.push({ id: (_d = decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.team) === null || _d === void 0 ? void 0 : _d.id, bid: data.bid });
            /** Send successful response to all clients */
            io.emit('history', history);
            socket.emit('alert', 'Bid placed');
        }
        else {
            /** Bid made was smaller than current bid */
            logger_1.default.info(`${socket.id} made a bid too small`);
            socket.emit('invalid', {
                type: 'current',
                message: 'The bid you placed was too small',
                yourBid: data.bid,
            });
        }
    });
    socket.on('disconnect', () => {
        logger_1.default.info(`${socket.id} disconnected`);
    });
});
/** Catch 404s */
app.use((_req, _res, next) => next(new api_error_1.NotFoundError()));
/** Error handler */
app.use((err, _req, res, _next) => {
    if (err instanceof api_error_1.ApiError) {
        api_error_1.ApiError.handle(err, res);
    }
    else {
        if (config_1.environment === 'development') {
            logger_1.default.error(err);
            return res.status(500).send(err.message);
        }
        api_error_1.ApiError.handle(new api_error_1.InternalError(), res);
    }
});
exports.default = httpServer;
//# sourceMappingURL=app.js.map
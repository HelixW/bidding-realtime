import { NotFoundError, ApiError, InternalError } from './core/api-error';
import express, { Request, Response, NextFunction } from 'express';
import { corsUrl, environment } from './config';
import { ServiceAccount } from 'firebase-admin';
import { History, Question, Team } from './types';
import Server, { Socket } from 'socket.io';
import * as socketioJwt from 'socketio-jwt';
import * as admin from 'firebase-admin';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { sign, decode } from 'jsonwebtoken';
import Logger from './core/logger';
import * as got from 'got';
import cors from 'cors';
import Axios from 'axios';

process.on('uncaughtException', (e) => {
  Logger.error(e.message);
});

const app = express();

/** Basic security */
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(cors({ origin: corsUrl, optionsSuccessStatus: 200 }));
app.use(express.static('public'));

/* Initialize firebase */
const adminConfig: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
admin.initializeApp({
  credential: admin.credential.cert(adminConfig),
  databaseURL: 'https://bidding-portal.firebaseio.com',
});
const docRef = admin.firestore().collection('bidding').doc('details');

/** SocketIO initialization */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingTimeout: 6000000,
  pingInterval: 30000,
});

/** Globals */
let currentBid = 0;
let history: Array<History> = [];
let currQuestion = '';
let roundDetails: any;
let questions: Array<Question> = [];
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
const changeQuestion = async (socket: Socket, id: string, nextIndex: number, teamID: string) => {
  const response = questions.filter((item: Question) => item.id === id);
  if (response.length === 0) {
    Logger.error(`Incorrect questionID supplied by ${socket.id}`);
    socket.emit('invalid', { type: 'questionID', message: 'Invalid questionID supplied' });
  } else {
    history = [];
    minBid = questions[nextIndex].minBid;
    currentBid = minBid;
    currQuestion = id;
    io.emit('history', history);

    const token: string = sign(
      { email: process.env.PRIVILEDGED_EMAIL, googleID: null },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
      },
    );

    /** Allocate question */
    const prevIndex = questions.findIndex((question) => currQuestion === question.id);
    const prevQuestion = questions[prevIndex - 1];
    console.log(prevQuestion);
    try {
      const res = await Axios.put(
        `http://localhost:8000/api/bidding/allocate`,
        { id: prevQuestion.id.toString(), teamID: teamID.toString() },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res) Logger.info(`Question ${id} allocated`);
    } catch (err) {
      console.log(err.message);
      Logger.error(
        `${socket.id} ran the allocate function when the question was already allocated`,
      );
    }
    // console.log(currQuestion);
  }
};

/** Upon changes made to the round, reset all globals */
docRef.onSnapshot(() => initiateRound());

/** Individual client logic */
io.on(
  'connection',
  socketioJwt.authorize({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    secret: process.env.JWT_AUTH_SECRET!,
    timeout: 15000,
  }),
).on('authenticated', async (socket: Socket) => {
  Logger.info(`${socket.id} connected`);

  docRef.onSnapshot((doc) => {
    /** Forward round data to client */
    socket.emit('message', `Welcome to ${doc.data()?.name}`);
    socket.emit('minimum', minBid);
    io.emit('history', history);
  });

  /** Bid event */
  socket.on('bid', async (data) => {
    /** Auth layer */
    const decodedToken = decode(data.token, { json: true });
    try {
      await got.get(`https://bidding-portal.appspot.com/api/teams/${decodedToken?.team?.id}`);
    } catch (err) {
      Logger.error(`${socket.id} bid while being unauthorized`);
      socket.emit('invalid', { type: 'unauthorized', message: 'Unauthorized access detected' });
      return;
    }

    /** Check for active service */
    if (!roundDetails.body.service) {
      Logger.error(`${socket.id} tried to bid while the service was disabled`);
      socket.emit('invalid', { type: 'down', message: 'Bidding has been disabled' });
      return;
    }

    /** Check for limit of 2 */
    const team = (await (
      await admin.firestore().collection('teams').doc(decodedToken?.team?.id.toString()).get()
    ).data()) as Team;
    if (team.questions.length === 2) {
      socket.emit('invalid', { type: 'max', message: 'Max limit for allocated questions reached' });
      return;
    }

    /** New incoming questionID triggers allocation */
    const nextIndex = questions.findIndex((question) => question.id === data.questionID);
    if (data.questionID !== currQuestion)
      changeQuestion(socket, data.questionID, nextIndex, decodedToken?.team?.id);

    /** Check for question validity */
    const response = questions.filter((item: Question) => item.id === data.questionID);
    if (response.length === 0) {
      Logger.error(`Incorrect questionID supplied by ${socket.id}`);
      socket.emit('invalid', { type: 'questionID', message: 'Invalid questionID supplied' });
      return;
    } else {
      /** Check if question is already allocated */
      if (response[0].allocated) {
        Logger.error(`${socket.id} tried to bid for an allocated question`);
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
        Logger.info(`The bid was not divisible by 5`);
        return;
      }

      /** Successful bid */
      currentBid = data.bid;
      Logger.info(`${socket.id} made a bid of ${data.bid} (current bid: ${currentBid})`);

      /** Push bid to bid-history */
      history.push({ id: decodedToken?.team?.id, bid: data.bid });

      /** Send successful response to all clients */
      io.emit('history', history);
      socket.emit('alert', 'Bid placed');
    } else {
      /** Bid made was smaller than current bid */
      Logger.info(`${socket.id} made a bid too small`);
      socket.emit('invalid', {
        type: 'current',
        message: 'The bid you placed was too small',
        yourBid: data.bid,
      });
    }
  });

  socket.on('disconnect', () => {
    Logger.info(`${socket.id} disconnected`);
  });
});

/** Catch 404s */
app.use((_req, _res, next) => next(new NotFoundError()));

/** Error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    ApiError.handle(err, res);
  } else {
    if (environment === 'development') {
      Logger.error(err);
      return res.status(500).send(err.message);
    }
    ApiError.handle(new InternalError(), res);
  }
});

export default httpServer;

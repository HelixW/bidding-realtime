import { NotFoundError, ApiError, InternalError } from './core/api-error';
import express, { Request, Response, NextFunction } from 'express';
import { corsUrl, environment } from './config';
import { ServiceAccount } from 'firebase-admin';
import Server, { Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import Logger from './core/logger';
import cors from 'cors';

process.on('uncaughtException', (e) => {
  Logger.error(e.message);
});

const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(cors({ origin: corsUrl, optionsSuccessStatus: 200 }));
app.use(express.static('public'));

// Initialize firebase
const adminConfig: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
admin.initializeApp({
  credential: admin.credential.cert(adminConfig),
  databaseURL: 'https://bidding-portal.firebaseio.com',
});

// Initialize sockets
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingTimeout: 6000000,
  pingInterval: 30000,
});

io.on('connection', (socket: Socket) => {
  Logger.info(`${socket.id} connected`);
  let currentBid = 0;

  // Database connection
  admin
    .firestore()
    .collection('bidding')
    .doc('details')
    .onSnapshot((doc) => {
      socket.emit('message', `Welcome to ${doc.data()?.name}`);
    });

  socket.on('bid', (bid) => {
    console.log(currentBid);
    if (bid > currentBid) {
      Logger.info(`${socket.id} made a bid of ${bid}`);
      currentBid = bid;
      io.emit('update history', `${socket.id} made a bid of ${bid}`);
    } else {
      Logger.info(`${socket.id} made a smaller bid too small`);
      io.emit('update history', `${socket.id} made a smaller bid too small`);
    }
  });

  socket.on('disconnect', () => {
    Logger.info(`${socket.id} disconnected`);
  });
});

// Catch 404 and forward to error handler
app.use((_req, _res, next) => next(new NotFoundError()));

// Middleware Error Handler
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

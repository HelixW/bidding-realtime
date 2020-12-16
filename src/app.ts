import express, { Request, Response, NextFunction } from 'express';
import Logger from './core/logger';
import bodyParser from 'body-parser';
import cors from 'cors';
import { corsUrl, environment } from './config';
import { NotFoundError, ApiError, InternalError } from './core/api-error';
import { createServer } from 'http';
import Server, { Socket } from 'socket.io';

process.on('uncaughtException', (e) => {
  Logger.error(e.message);
});

const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(cors({ origin: corsUrl, optionsSuccessStatus: 200 }));
app.use(express.static('public'));

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

  socket.emit('message', 'Welcome to Pluto (Round 1)');

  socket.on('bid', (bid) => {
    Logger.info(`${socket.id} made a bid of ${bid}`);
    socket.emit('update history', `${socket.id} made a bid of ${bid}`);
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

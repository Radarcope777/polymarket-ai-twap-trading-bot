import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { router } from './routes/index.js';
import { startTwapStream, setSocketIO } from './services/engine.js';
import { botState, logger } from './services/state.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' },
});

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', router);

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Dashboard connected');
  socket.emit('bot:state', botState);

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Dashboard disconnected');
  });
});

setSocketIO(io);
startTwapStream();

setInterval(async () => {
  io.emit('bot:state', botState);
}, 5000);

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => {
  logger.info(`API server running on http://localhost:${PORT}`);
});

export { app, io };

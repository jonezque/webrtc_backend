import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { v4 } from 'uuid';

const PORT = process.env.PORT || 4000;
const server = createServer();
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

const wss = new WebSocket.Server({ server });

server.on('request', app);

interface IData {
    offer: any;
    candidate: any;
    answer: any;
    id: string;
    userId: string;
    type: string;
}

const map = new Map<string, Pick<IData, 'offer' | 'userId'>>();
const users = new Map<string, WebSocket>();
const sockets = new Map<WebSocket, string>();
const candidates = new Map<string, any[]>();

wss.on('connection', (ws, req) => {
    const { url } = req;
    if (!url) {
        return;
    }
    const [, currentUserId] = url.split('=');

    ws.on('message', (message) => {
        const { id: channelId, userId: reqUserId, offer, type, candidate, answer } = JSON.parse(message.toString()) as IData;
        if (type === 'offer') {
            const user = map.get(channelId);
            if (user) {
                const socket = users.get(user.userId);
                if (socket) {
                    socket.send(JSON.stringify({ message: 'offer', data: { offer, id: channelId, userId: reqUserId } }));
                }
            }

            map.set(channelId, { offer, userId: reqUserId });
            users.set(reqUserId, ws);
            sockets.set(ws, reqUserId);
        }

        if (type === 'answer') {
            const data = users.get(reqUserId);
            if (!data) {
                return;
            }
            data.send(JSON.stringify({ message: 'answer', data: answer }));
            data.send(JSON.stringify({ message: 'candidates', data: candidates.get(currentUserId) }));
        }

        if (type === 'candidate') {
            const arr = candidates.get(reqUserId);
            if (arr) {
                arr.push(candidate);
            } else {
                candidates.set(reqUserId, [candidate]);
            }
        }
    });

    ws.on('close', () => {
        users.delete(currentUserId);
        sockets.delete(ws);
        candidates.delete(currentUserId);
    });
});

app.post('/channel', (req, response) => {
    const id = v4();
    response.send(id);
});

server.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import { v4 } from 'uuid';

const PORT = process.env.PORT || 4000;
const WS_PORT = process.env.WS_PORT ? +process.env.WS_PORT : 4001;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

const wss = new WebSocket.Server({ port: WS_PORT });


interface IData {
    offer: any;
    id: string;
    userId: string;
}

const map = new Map<string, Pick<IData, 'offer' | 'userId'>[]>();
const users = new Map<string, WebSocket>();
const sockets = new Map<WebSocket, string>();

const add = <T>(map: Map<any, T[]>, id: string | WebSocket, data: T) => {
    if (map.has(id)) {
        const arr = map.get(id)!;
        arr.push(data);
    } else {
        map.set(id, [data]);
    }
};

wss.on('connection', (ws, req) => {
    const { url } = req;
    if (!url) {
        return;
    }
    const [, id] = url.split('=');

    ws.on('message', (message) => {
        const { id, userId, offer } = JSON.parse(message.toString()) as IData;
        add(map, id, { offer, userId });
        users.set(userId, ws);
        sockets.set(ws, userId);
        const data = map.get(id)!;
        data.forEach(user => {
            if (userId === user.userId) {
                return;
            }

            const socket = users.get(user.userId);
            if (!socket) {
                return
            }

            socket.send(JSON.stringify({ message: 'offer', data:  { offer, id, userId } }));
        });
    });

    ws.on('close', () => {
        const userId = sockets.get(ws)!;
        users.delete(userId);
        const data = map.get(id);
        if (!data) {
            return;
        }
        const arr = data.filter(o => o.userId !== userId);
        arr.length ? map.set(id, arr) : map.delete(id);
    });
});

app.post('/channel', (req, response) => {
    const id = v4();
    response.send(id);
});

app.post('/answer', ({body: { userId, answer}}, response) => {
    console.log('answer', userId, answer);
    const data = users.get(userId);
    if (data) {
        data.send(JSON.stringify({ message: 'answer', data: answer}));
    }
    response.send();
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});

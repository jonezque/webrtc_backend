"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const helmet_1 = tslib_1.__importDefault(require("helmet"));
const ws_1 = tslib_1.__importDefault(require("ws"));
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const uuid_1 = require("uuid");
const PORT = process.env.PORT || 4000;
const WS_PORT = process.env.WS_PORT ? +process.env.WS_PORT : 4001;
const app = express_1.default();
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use(helmet_1.default());
app.use(cors_1.default());
app.use(morgan_1.default('dev'));
const wss = new ws_1.default.Server({ port: WS_PORT });
const map = new Map();
const users = new Map();
const sockets = new Map();
const add = (map, id, data) => {
    if (map.has(id)) {
        const arr = map.get(id);
        arr.push(data);
    }
    else {
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
        const { id, userId, offer } = JSON.parse(message.toString());
        add(map, id, { offer, userId });
        users.set(userId, ws);
        sockets.set(ws, userId);
        const data = map.get(id);
        data.forEach(user => {
            if (userId === user.userId) {
                return;
            }
            const socket = users.get(user.userId);
            if (!socket) {
                return;
            }
            socket.send(JSON.stringify({ message: 'offer', data: { offer, id, userId } }));
        });
    });
    ws.on('close', () => {
        const userId = sockets.get(ws);
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
    const id = uuid_1.v4();
    response.send(id);
});
app.post('/answer', ({ body: { userId, answer } }, response) => {
    console.log('answer', userId, answer);
    const data = users.get(userId);
    if (data) {
        data.send(JSON.stringify({ message: 'answer', data: answer }));
    }
    response.send();
});
app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});

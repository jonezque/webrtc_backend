"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var morgan_1 = __importDefault(require("morgan"));
var helmet_1 = __importDefault(require("helmet"));
var ws_1 = __importDefault(require("ws"));
var body_parser_1 = __importDefault(require("body-parser"));
var uuid_1 = require("uuid");
var PORT = process.env.PORT || 4000;
var WS_PORT = process.env.WS_PORT ? +process.env.WS_PORT : 4001;
var app = express_1.default();
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use(helmet_1.default());
app.use(cors_1.default());
app.use(morgan_1.default('dev'));
var wss = new ws_1.default.Server({ port: WS_PORT });
var map = new Map();
var users = new Map();
var sockets = new Map();
var add = function (map, id, data) {
    if (map.has(id)) {
        var arr = map.get(id);
        arr.push(data);
    }
    else {
        map.set(id, [data]);
    }
};
wss.on('connection', function (ws, req) {
    var url = req.url;
    if (!url) {
        return;
    }
    var _a = url.split('='), id = _a[1];
    ws.on('message', function (message) {
        var _a = JSON.parse(message.toString()), id = _a.id, userId = _a.userId, offer = _a.offer;
        add(map, id, { offer: offer, userId: userId });
        users.set(userId, ws);
        sockets.set(ws, userId);
        var data = map.get(id);
        data.forEach(function (user) {
            if (userId === user.userId) {
                return;
            }
            var socket = users.get(user.userId);
            if (!socket) {
                return;
            }
            socket.send(JSON.stringify({ message: 'offer', data: { offer: offer, id: id, userId: userId } }));
        });
    });
    ws.on('close', function () {
        var userId = sockets.get(ws);
        users.delete(userId);
        var data = map.get(id);
        if (!data) {
            return;
        }
        var arr = data.filter(function (o) { return o.userId !== userId; });
        arr.length ? map.set(id, arr) : map.delete(id);
    });
});
app.post('/channel', function (req, response) {
    var id = uuid_1.v4();
    response.send(id);
});
app.post('/answer', function (_a, response) {
    var _b = _a.body, userId = _b.userId, answer = _b.answer;
    console.log('answer', userId, answer);
    var data = users.get(userId);
    if (data) {
        data.send(JSON.stringify({ message: 'answer', data: answer }));
    }
    response.send();
});
app.listen(PORT, function () {
    console.log("Listening on " + PORT);
});

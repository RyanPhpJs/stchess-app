const { WebSocketServer } = require("ws");
const http = require("http");
const Config = require("./conf/options.json");
const Analysis = require("./src/analysis");
const { URLSearchParams } = require("url");
const manager = new Analysis("engine/src/stockfish", Config);

const WebServer = new WebSocketServer({
    noServer: true
})

WebServer.on("connection", function(ws){

    ws.on("message", (message) => {
        const json = JSON.parse(message);
        if(json.action == "analysis"){
            const game = manager.create();
            game.setPgn(json.pgn);

            game.on("progress", function(progress){
                ws.send(JSON.stringify({
                    type: "progress",
                    data: progress
                }))
            });

            game.go().then((result) => {

                const ResultArrayMoves = [];

                for(const move of result.moves){
                    ResultArrayMoves.push({
                        type: move.type,
                        move: {
                            san: move.move.san,
                            lan: move.move.lan
                        },
                        description: move.description
                    })
                }

                ws.send(JSON.stringify({
                    action: "analysis_result",
                    data: {
                        precision: result.precision,
                        precisionPerPiece: result.precisionPerPiece,
                        moves: ResultArrayMoves
                    }
                }));

            }).catch(err => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: err.stack
                }));
            })
        }
    })

});

const httpServer = http.createServer((_, res) => {
    res.write("<html><head><title>Chess Analysis Server</title></head><body><h1>Chess Analysis Server</h1><p><a href='https://github.com/RyanMatheusRamello/stchess-app'>GitHub</a><p></body></html>");
    res.end();
}).on("upgrade", (req, socket, head) => {
    console.log("upgrade inited");
    const query = new URLSearchParams((req.url || "/").split("?")[1] || "");
    if(Config.appToken){
        if(query.has("api_key")){
            if(query.get("api_key") !== Config.appToken){
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n{"message":"Auth Token Invalid"}');
                console.log("> Connection Recused because auth token invalid (with query)");
                socket.end();
                return;
            }
        }else if(!req.headers.authorization || req.headers.authorization !== `Bearer ${Config.appToken}`){
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n{"message":"Auth Token Invalid"}');
            console.log("> Connection Recused because auth token invalid");
            socket.end();
            return;
        }
    }
    console.log("> Connection accept");
    WebServer.handleUpgrade(req, socket, head, function done(ws) {
        WebServer.emit('connection', ws, req);
    });
}).listen(Config.port || 3000, () => {
    console.log(`Chess Analysis server running in ${Config.port || 3000}`)
})
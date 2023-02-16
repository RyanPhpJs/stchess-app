const EventEmitter = require("events");
const { Chess } = require("chess.js");
const Move = require("./Move");
const { Engine } = require("node-uci");
const MoveAnalysis = require("./MoveAnalysis");
const Piece = require("./Piece");
const { getInfo } = require("chessy");
const TaticalTheme = require("../tatical/TaticalTheme");
const Position = require("../tatical/Position");

/**
 * 
 * @param {import("chess.js").PieceSymbol} e 
 * @returns 
 */
 function getPiecePointsAcc(e){
    if(e == "p") return 1;
    if(e == "b") return 3;
    if(e == "n") return 3;
    if(e == "r") return 5;
    if(e == "q") return 9;
    if(e == "k") return 0;
}

module.exports = class Game extends EventEmitter {

    /**
     * 
     * @param {import("./index")} client 
     */
    constructor(client){

        super();
        this.client = client;
        this.depth = client.depth;
        this.game = null;
        this.console = console;

    }

    setPgn(pgn){
        
        this.game = new Chess();
        this.game.loadPgn(pgn);
        this.opening = null;
        return this;

    }

    /**
     * 
     * @param {number} depth 
     */
    setDepth(depth){
        this.depth = depth;
        return this;
    }

    /**
     * @private
     */
    getStockStartCount(history){
        if(this.client.instances <= 0) return 1;
        if(history.length <= 10) return 1
        if(history.length <= 20) return Math.min(this.client.instances, 2);
        if(history.length <= 30) return Math.min(this.client.instances, 3);
        if(history.length <= 40) return Math.min(this.client.instances, 4);
        return Math.min(this.client.instances, 5);
    }

    async initStockfish(){
        const engine = new Engine("engine/src/stockfish");
        await engine.init();
        await engine.setoption('MultiPV', '3')
        await engine.isready()
        return engine;
    }

    start(size){
        const prom = [];
        for(let i=0; i<size; i++){
            prom.push(this.initStockfish())
        }
        return Promise.all(prom);
    }

    /**
     * 
     * @param {{ bestmove: string, info: { depth: number, string?: string, seldepth: number, time: number, nodes: number, hashfull: number, nps: number, tbhits: number, score: { unit: "mate"|"cp", value: number }, multipv: number, pv: string }[]}} response 
     */
    getScore(response){
        let index = -1;
        let score = [];
        for(const info of response.info){
            if(!info.string){
                if(info.depth > index){
                    index = info.depth;
                    score = [];
                    if(info.score)
                        score.push(info);
                }else if(info.depth === index){
                    if(info.score)
                        score.push(info);
                }
            }
        }
        score.sort((a, b) => {
            
            if(!a.score)
            //this.console.log(score);
            if(a.score.unit != "cp" && b.score.unit != "cp"){
                if(a.score.value >= 0 && b.score.value >= 0) return ( a.score.value - b.score.value ) * -1
                if(a.score.value >= 0) return 1;
                if(b.score.value >= 0) return -1;
                return ( a.score.value - b.score.value ) * -1
            }
            if(a.score.unit != "cp" && b.score.unit == "cp"){
                if(a.score.value >= 0) return 1;
                return -1;
            }
            if(a.score.unit == "cp" && b.score.unit != "cp"){
                if(b.score.value >= 0) return -1;
                return 1;
            }
            return a.score.value - b.score.value
        })

        score.reverse();

        return score;
    }

    /**
     * 
     * @param {Engine} engine 
     * @param {(import("chess.js").Move & { _moves: string[], _index: number }) [] } moves 
     */
    async analysis(engine, moves){

        let _res = [];

        for(const move of moves){
            
            await engine.position(this.InitalFen, move._moves);
            const response = await engine.go({ depth: this.depth });
            const score = this.getScore(response);
            _res.push(new MoveAnalysis(score, response.bestmove, move));
            this.progress();

        }

        return _res;

    }

    progress(){
        this.complete++;
        this.emit("progress", ((this.complete/this.total)*100).toFixed(1));
    }

    async go(){

        const ramUsage = require("os").freemem();

        const ResponseMoves = [];
        const EngineMoves = [];
        

        let history = this.game.history({ verbose: true });
        const InitalFen = this.game.header()["Fen"] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.InitalFen = InitalFen;
        const game = new Chess();
        game.load(InitalFen);
        this.total = history.length;
        this.complete = 0;

        const MovePositions = {}
        const board = game.board();
        const _MoveResult = [];
        for(const lines of board){
            for(const piece of lines){
                if(piece){
                    MovePositions[piece.square] = 0;
                }
            }
        }

        if(InitalFen === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"){

            let i = 0;

            for(const move of history){

                game.move(move.san);
                const book = this.client.getBook(game.pgn());
                if(book){
                    if(!MovePositions[move.from]) MovePositions[move.from] = 2;
                    else MovePositions[move.from]++;
                    if(move.san == "O-O" || move.san == "O-O-O"){
                        if(move.san == "O-O"){
                            MovePositions[move.from.replace(/[0-9]$/, "8")]++;
                        }else{
                            MovePositions[move.from.replace(/[0-9]$/, "1")]++;
                        }
                    }
                    i++;
                    const _m = new Move(move)
                        .setDescription(book.description || (MovePositions[move.from] === 1 ? (move.piece == "p" ? `Esse lance avança o peão para ele participar da partida` : `Esse lance desenvolve uma peça`) : `Executa o lance do(a) ${book.name}`))
                        .setType("BOOK")
                    ResponseMoves.push(_m);
                    EngineMoves.push(move.lan);
                    _MoveResult.push(null);
                    this.progress();
                }else{
                    game.undo();
                    break;
                }

            }

            history = history.slice(i);

        }
        
        const count = this.getStockStartCount(history);

        

        const Stocks = await this.start(count);

        const sep = [];

        for(let i=0; i<count; i++){
            sep.push([]);
        }

        for(let i=0; i<history.length; i++){
            history[i]._index = i;
            history[i]._moves = EngineMoves.slice(0);
            sep[i % count].push(history[i]);
            EngineMoves.push(history[i].lan)
        }

        const prom = [];

        for(let i=0; i<count; i++){
            prom.push(this.analysis(Stocks[i], sep[i]));
        }

        const _res = await (Promise.all(prom));

        /**
         * @type {{[p: string]: MoveAnalysis}}
         */
        let _moves = {};
        for(const r of _res){
            for(const i of r){
                _moves[i.move._index] = i;
            }
        }

        // await Stocks[0].position(this.InitalFen, en);
        // const response = await Stocks[0].go({ depth: this.depth });
        // const score = this.getScore(response);

        const MoveResult = Object.values(_moves);

        let pv = [];

        let nextMoveAnalysis = null;

        for(let i=0; i<MoveResult.length; i++){

            if(ResponseMoves[i-1]){
                ResponseMoves[ResponseMoves.length-1].score = pv[0];
                ResponseMoves[ResponseMoves.length-1].next = pv[1];
            }
            const MoveRes = MoveResult[i];
            let _nextScore = MoveResult[i+1]?.score || { unit: "finalized", value: 1 };
            let nextScore = {
                unit: _nextScore.unit,
                value: Number(_nextScore.value)*-1
            }
            pv = [MoveRes.score, nextScore];

            let previousFen = game.fen();
            let previousMoves = game.moves();
            game.move(MoveRes.move.san);
            if(!MovePositions[MoveRes.move.from]) MovePositions[MoveRes.move.from] = 2;
            else MovePositions[MoveRes.move.from]++;

            if(MoveRes.move.san == "O-O" || MoveRes.move.san == "O-O-O"){
                if(MoveRes.move.san == "O-O"){
                    MovePositions[MoveRes.move.from.replace(/[0-9]$/, "8")]++;
                }else{
                    MovePositions[MoveRes.move.from.replace(/[0-9]$/, "1")]++;
                }
            }

            if(nextScore.unit == "finalized"){
                if(game.isCheckmate() || game.isDraw()){
                    if(game.isCheckmate()){
                        const _m = new Move(MoveRes.move)
                                .setType("BEST")
                                .setDescription(`Esse lance aplica o xeque-mate`);
                        ResponseMoves.push(_m);
                        continue;
                    }else{
                        nextScore = {
                            unit: "cp",
                            value: 0
                        }
                    }
                    nextMoveAnalysis = nextScore;
                }else{
                    await Stocks[0].position(this.InitalFen, [...MoveRes.move._moves, MoveRes.move.lan]);
                    const res = await Stocks[0].go({ depth: this.depth });
                    const score = this.getScore(res);
                    nextScore = score[0].score;
                    nextScore.value *= -1;
                    nextMoveAnalysis = nextScore;
                }
                
            }

            if(previousMoves.length === 1){
                const _m = new Move(MoveRes.move)
                        .setType("FORCADO")
                        .setDescription(`Esse é o unico lance da posição`);
                ResponseMoves.push(_m);
                continue;
            }

            if(nextScore.unit == "cp" && MoveRes.score.unit == "cp"){
                if(nextScore.value >= 0){
                    const m = MoveRes.result.filter(e => e.score.value > 0);
                    if(m.length === 1 && m[0].pv.split(" ")[0] == MoveRes.move.lan){
                        const _m = new Move(MoveRes.move)
                            .setDescription(`Esse é o unico lance bom na posição`)
                            .setType("CRITICAL")
                        ResponseMoves.push(_m);
                        continue;
                    }
                }
            }else if(nextScore.unit == "mate" && MoveRes.score.unit == "mate"){
                if(nextScore.value >= 0 && MoveRes.score.value >= 0){
                    const m = MoveRes.result.filter(e => e.score.unit == "mate" && e.score.value >= 0);
                    if(m.length === 1 && m[0].pv.split(" ")[0] == MoveRes.move.lan){
                        if(ResponseMoves[ResponseMoves.length-1].type == "CRITICAL"){
                            const _m = new Move(MoveRes.move)
                                .setDescription(`Esse lance continua a cadeia xeque-mate, é o unico lance bom`)
                                .setType("BEST")
                            ResponseMoves.push(_m);
                        }else{
                            const _m = new Move(MoveRes.move)
                                .setDescription(`Esse lance continua a cadeia xeque-mate, é o unico lance que resulta`)
                                .setType("CRITICAL")
                            ResponseMoves.push(_m);
                        }
                        continue;
                    }
                }
            }else if(nextScore.unit == "cp" && MoveRes.score.unit == "mate"){

                if(MoveRes.score.value >= 0){

                    const _m = new Move(MoveRes.move)
                        .setDescription(`Esse lance perde um movimento que levava ao xeque-mate`)
                        .setType("VITORIA_PERDIDA")
                    ResponseMoves.push(_m);
                    continue;

                }else{

                    let alM = false;
                    const m = MoveRes.result.filter(e => {
                        if(e.score.unit == "mate"){
                            if(e.score.value > 0) {
                                alM = true;
                                return true;
                            }
                        }
                        if(e.score.unit == "cp" && !alM){
                            if(e.score.value > 0) return true;
                        }
                        return false;
                    });
                    if(m.length === 1 && m[0].pv.split(" ")[0] == MoveRes.move.lan){

                        const _m = new Move(MoveRes.move)
                            .setType("CRITICAL");
                        if(m[0].score.unit == "cp"){
                            _m.setDescription(`Esse lance é o unico que evita o xeque-mate adversario`)
                        }else{
                            _m.setDescription(`Esse lance inicia a cadeia de xeque-mate, é o unico lance bom`)
                        }
                            
                        ResponseMoves.push(_m);
                        continue;

                    }

                }

            }else if(nextScore.unit == "mate" && MoveRes.score.unit == "cp"){
                
                if(nextScore.value >= 0){

                    const m = MoveRes.result.filter(e => e.score.unit == "mate" && e.score.value >= 0);
                    if(m.length === 1 && m[0].pv.split(" ")[0] == MoveRes.move.lan){

                        const _m = new Move(MoveRes.move)
                            .setType("CRITICAL")
                            .setDescription(`Esse lance inicia a cadeia de xeque-mate, é o unico lance bom`);
                            
                        ResponseMoves.push(_m);
                        continue;

                    }

                }else{

                    
                    const _m = new Move(MoveRes.move);

                    if(nextScore.value > -3){
                        _m.setDescription(`Esse lance permite um xeque-mate forçado em ${nextScore.value > 0 ? nextScore.value : nextScore.value * -1} lances`)
                            .setType("CAPIVARADA")
                    }else{
                        _m.setDescription(`Esse lance permite um xeque-mate forçado em ${nextScore.value > 0 ? nextScore.value : nextScore.value * -1} lances`)
                            .setType("MISTAKE")
                    }

                    _m.__isMate = true;
                        
                    ResponseMoves.push(_m);
                    continue;

                }

            }

            if(MoveRes.move.lan === MoveRes.bestmove){
                const _m = new Move(MoveRes.move).setType("BEST");
                if(MovePositions[MoveRes.move.from] === 1){
                    _m.setDescription(`Esse lance desenvolve uma peça`)
                }else{
                    _m.setDescription(`Esse é o melhor movimento na posição`)
                }
                ResponseMoves.push(_m);
                continue;
            }

            if(MoveRes.score.unit == "cp" && nextScore.unit == "cp"){
                
                if(MoveRes.score.value < nextScore.value){

                    const _m = new Move(MoveRes.move).setType("EXCELENT");
                    if(MovePositions[MoveRes.move.from] === 1){
                        _m.setDescription(`Esse lance desenvolve uma peça`)
                    }else{
                        _m.setDescription(`Esse é um dos melhores lance na posição`)
                    }
                    ResponseMoves.push(_m);
                    continue;

                }

                if(MoveRes.score.value > 200 && nextScore.value <= 0 && nextScore.value >= -100){

                    const _m = new Move(MoveRes.move)
                            .setType("MISTAKE")
                            .setDescription(`O jogo estava com uma leve vantagem para as ${game.turn() == "w" ? "pretas" : "brancas"}, mas agora o jogo está equilibrado`);
                    ResponseMoves.push(_m);
                    continue;

                }

                let OPTION_CP = {
                    EXCELENT: 50,
                    BOM: 100,
                    IMPRUDENTE: 150,
                    MISTAKE: 200,
                    CAPIVARADA: 250
                }

                if(MoveRes.score.value < 300 && MoveRes.score.value >= 0){
                    OPTION_CP = {
                        EXCELENT: 50,
                        BOM: 100,
                        IMPRUDENTE: 150,
                        MISTAKE: 200,
                        CAPIVARADA: 250
                    }
                }else if(MoveRes.score.value < 500 && MoveRes.score.value >= 0){
                    OPTION_CP = {
                        EXCELENT: 100,
                        BOM: 150,
                        IMPRUDENTE: 200,
                        MISTAKE: 275,
                        CAPIVARADA: 450
                    }
                }else if(MoveRes.score.value < 800 && MoveRes.score.value >= 0){
                    OPTION_CP = {
                        EXCELENT: 150,
                        BOM: 250,
                        IMPRUDENTE: 325,
                        MISTAKE: 400,
                        CAPIVARADA: 600
                    }
                }else if(MoveRes.score.value > 800){
                    OPTION_CP = {
                        EXCELENT: 200,
                        BOM: 300,
                        IMPRUDENTE: 375,
                        MISTAKE: 450,
                        CAPIVARADA: 600
                    }
                }

                if(MoveRes.score.value - OPTION_CP.EXCELENT < nextScore.value ){

                    const _m = new Move(MoveRes.move).setType("EXCELENT");
                    if(MovePositions[MoveRes.move.from] === 1){
                        _m.setDescription(`Esse lance desenvolve uma peça`)
                    }else{
                        _m.setDescription(`Esse é um dos melhores lance na posição`)
                    }
                    ResponseMoves.push(_m);
                    continue;

                }

                if(MoveRes.score.value - OPTION_CP.BOM < nextScore.value){

                    const _m = new Move(MoveRes.move).setType("BOM");
                    if(MovePositions[MoveRes.move.from] === 1){
                        _m.setDescription(`Esse lance desenvolve uma peça`)
                    }else{
                        let _game = new Chess();
                        _game.load(previousFen);
                        let _move = _game.move(MoveRes.bestmove);
                        if(MovePositions[_move.from] === 1){
                            _m.setDescription(`Esse lance perde uma oportunidade de desenvolver uma peça`)
                        }else{
                            _m.setDescription(`Esse é um movimento bom, mas havia outros melhores na posição`)
                        }
                    }
                    ResponseMoves.push(_m);
                    continue;

                }

                if(MoveRes.score.value - OPTION_CP.IMPRUDENTE < nextScore.value){

                    const _m = new Move(MoveRes.move).setType("IMPRUDENTE");
                    let _game = new Chess();
                    _game.load(previousFen);
                    let _move = _game.move(MoveRes.bestmove);
                    if(MovePositions[_move.from] === 1){
                        _m.setDescription(`Esse lance perde uma oportunidade de desenvolver uma peça`)
                    }else{
                        _m.setDescription(`Esse lance deixa sua posição um pouco pior`)
                    }
                    ResponseMoves.push(_m);
                    continue;

                }

                if(MoveRes.score.value - OPTION_CP.MISTAKE < nextScore.value){

                    const _m = new Move(MoveRes.move).setType("MISTAKE");
                    _m.setDescription(`Esse lance faz você perder parte da sua vantagem`)
                    ResponseMoves.push(_m);
                    continue;

                }
                
                if(MoveRes.score.value - OPTION_CP.CAPIVARADA < nextScore.value){

                    const _m = new Move(MoveRes.move).setType("CAPIVARADA");
                    _m.setDescription(`Esse lance faz você perder parte sua vantagem`)
                    ResponseMoves.push(_m);
                    continue;

                }

                const _m = new Move(MoveRes.move).setType("CAPIVARADA");
                _m.setDescription(`Esse lance deixa seu oponente com vantagem`)
                ResponseMoves.push(_m);
                continue;

            }else if(MoveRes.score.unit == "cp" && nextScore.unit == "mate"){
                if(nextScore.value >= 0){
                    const _m = new Move(MoveRes.move)
                        .setType("BEST")
                        .setDescription(`Esse lance inicia a sequencia de mate`)
                    ResponseMoves.push(_m);
                    continue;
                }else{
                    const _m = new Move(MoveRes.move);

                    if(nextScore.value > -3){
                        _m.setDescription(`Esse lance permite um xeque-mate forçado em ${nextScore.value > 0 ? nextScore.value : nextScore.value * -1} lances`)
                            .setType("CAPIVARADA")
                    }else{
                        _m.setDescription(`Esse lance permite um xeque-mate forçado em ${nextScore.value > 0 ? nextScore.value : nextScore.value * -1} lances`)
                            .setType("MISTAKE")
                    }

                    _m.__isMate = true;
                        
                    ResponseMoves.push(_m);
                    continue;
                }
            }else if(MoveRes.score.unit == "mate" && nextScore.unit == "cp"){
                if(MoveRes.score.value >= 0){
                    const _m = new Move(MoveRes.move)
                        .setType("VITORIA_PERDIDA")
                        .setDescription(`Esse movimento perde uma sequencia de mate`)
                    ResponseMoves.push(_m);
                    continue;
                }else{
                    const _m = new Move(MoveRes.move)
                        .setType("EXCELENT")
                        .setDescription(`Esse movimento é um dos melhores lances da posição`)
                    ResponseMoves.push(_m);
                    continue;
                }
            }else if(MoveRes.score.unit == "mate" && nextScore.unit == "mate"){
                if(MoveRes.score.value >= 0 && nextScore.value >= 0){
                    if(MoveRes.score.value < nextScore.value){
                        const _m = new Move(MoveRes.move)
                            .setType("BOM")
                            .setDescription(`Esse lance leva ao mate, mas havia um caminho mais rapido`)
                        ResponseMoves.push(_m);
                        continue;
                    }else{
                        const _m = new Move(MoveRes.move)
                            .setType("BEST")
                            .setDescription(`Esse lance continua com a sequencia de mate`)
                        ResponseMoves.push(_m);
                        continue;
                    }
                }else if(MoveRes.score.value >= 0 && nextScore.value < 0){
                    const _m = new Move(MoveRes.move)
                        .setType("VITORIA_PERDIDA")
                        .setDescription(`Esse lance perde uma sequencia de mate`)
                    ResponseMoves.push(_m);
                    continue;
                }else{
                    const _m = new Move(MoveRes.move)
                        .setType("EXCELENT")
                        .setDescription(`Esse movimento é um dos melhores lances da posição`)
                    ResponseMoves.push(_m);
                    continue;
                }
            }

            const _m = new Move(MoveRes.move)
                .setDescription(`Esse é um movimento que n passou pela logica`)
                .setType("???")
            ResponseMoves.push(_m);


        }

        if(ResponseMoves[ResponseMoves.length-1]){
            ResponseMoves[ResponseMoves.length-1].score = MoveResult[MoveResult.length-1].score;
            ResponseMoves[ResponseMoves.length-1].next = nextMoveAnalysis || {}
        }

        _MoveResult.push(...MoveResult)

        

        for(const _index in ResponseMoves){
            const index = Number(_index)
            if(ResponseMoves[index]?.next?.value > 0 && (ResponseMoves[index].type == "BEST" || ResponseMoves[index].type == "CRITICAL" || ResponseMoves[index].type == "EXCELENT") && ResponseMoves[index].move.piece !== "p" && ResponseMoves[index].move.piece !== "k"){
                const _game = new Chess();
                _game.load(ResponseMoves[index].move.fen);
                const turn = _game.turn();
                const pos = [];
                for(const lines of _game.board()){
                    for(const piece of lines){
                        if(piece){
                            if(piece.color === turn){
                                pos.push(piece.square)
                            }
                        }
                    }
                }
                /**
                 * @type {{
                 *  [square: string]: {
                 *    attacking: string[] | null,
                 *    defeding: string[] | null,
                 *    defenses: string[] | null,
                 *    piece: { color: "white" | "black", type: string },
                 *    sights: string[] | null,
                 *    threats: string[] | null
                 *  }
                 * }}
                 */
                const Info = getInfo(_game.fen(), pos);

                _game.move(ResponseMoves[index].move.san);

                const pos2 = [];
                for(const lines of _game.board()){
                    for(const piece of lines){
                        if(piece){
                            if(piece.color === turn){
                                pos2.push(piece.square)
                            }
                        }
                    }
                }

                /**
                 * @type {{
                 *  [square: string]: {
                 *    attacking: string[] | null,
                 *    defeding: string[] | null,
                 *    defenses: string[] | null,
                 *    piece: { color: "white" | "black", type: string },
                 *    sights: string[] | null,
                 *    threats: string[] | null
                 *  }
                 * }}
                 */
                const Info2 = getInfo(_game.fen(), pos2);

                const previousPos = Info[ResponseMoves[index].move.from];
                const nextPos = Info2[ResponseMoves[index].move.to];

                if(nextPos.threats){

                    this.console.log(["THREATS", ResponseMoves[index].move.san, nextPos.threats])
                    
                    let piecePointsAttacking = [];
                    const piecePointsDeffeding = []
                    for(const position of nextPos.threats){
                        piecePointsAttacking.push(_game.get(position));
                    }
                    const _piecePointsAttacking = piecePointsAttacking.map(e => {
                        if(e.type == "p") e.points = 1;
                        if(e.type == "b") e.points = 3;
                        if(e.type == "n") e.points = 3;
                        if(e.type == "r") e.points = 5;
                        if(e.type == "q") e.points = 9;
                        if(e.type == "k") e.points = Infinity;
                        return e;
                    }).sort((a, b) => a.points - b.points)
                    for(const position of (nextPos.defenses || [])){
                        piecePointsDeffeding.push(_game.get(position));
                    }
                    let _piecePointsDeffeding = piecePointsDeffeding.map(e => {
                        if(e.type == "p") e.points = 1;
                        if(e.type == "b") e.points = 3;
                        if(e.type == "n") e.points = 3;
                        if(e.type == "r") e.points = 5;
                        if(e.type == "q") e.points = 9;
                        if(e.type == "k") e.points = Infinity;
                        return e;
                    })
                    _piecePointsDeffeding.sort((a, b) => a.points - b.points);

                    /**
                     * 
                     * @param {import("chess.js").PieceSymbol} e 
                     * @returns 
                     */
                    function getPiecePoints(e){
                        if(e == "p") return { points: 1 };
                        if(e == "b") return { points: 3 };
                        if(e == "n") return { points: 3 };
                        if(e == "r") return { points: 5 };
                        if(e == "q") return { points: 9 };
                        if(e == "k") return { points: Infinity };
                    }
                    


                    function compare(attackingPieces, defendingPieces, capturing=-1){


                        if(capturing >= defendingPieces[0]?.points) return false;

                        function nc(attackingPieces, defendingPieces){
                            const pieceDef = defendingPieces.shift();
                            const pieceAtk = attackingPieces.shift();

                            if(!pieceAtk){
                                return false;
                            }

                            if(!pieceDef){
                                return true;
                            }

                            if(pieceDef.points > pieceAtk.points){
                                return true;
                            }

                            if(pieceDef.points === pieceAtk.points){
                                return nc(attackingPieces, defendingPieces)
                            }

                            if(pieceDef.points < pieceAtk.points){
                                return false;
                            }
                        }

                        return nc(attackingPieces, defendingPieces)

                    }
                    // this.console.log([
                    //     "COMPARE", 
                    //     [
                    //         getPiecePoints(ResponseMoves[index].move.piece), 
                    //         getPiecePoints(ResponseMoves[index].move.captured)?.points || -1, 
                    //         ..._piecePointsDeffeding
                    //     ], 
                    //     _piecePointsAttacking, 
                    //     compare(
                    //         _piecePointsAttacking, 
                    //         [
                    //             getPiecePoints(ResponseMoves[index].move.piece), 
                    //             ..._piecePointsDeffeding
                    //         ], 
                    //         getPiecePoints(ResponseMoves[index].move.captured)?.points || -1
                    //         )
                    //     ]
                    // )
                    if(compare(_piecePointsAttacking, [getPiecePoints(ResponseMoves[index].move.piece), ..._piecePointsDeffeding], getPiecePoints(ResponseMoves[index].move.captured)?.points || -1)){
                        // é um sacrificio, mas essa peça já estava perdida antes?
                        const _ngame = new Chess(ResponseMoves[index].move.fen);
                        const ListMoves = _ngame.moves();
                        let outerMoves = false;
                        this.console.log(["LIST", ListMoves.length]);
                        if(ListMoves.length > 0){
                            for(const _move of ListMoves){
                                this.console.log(_move);
                                const __mv = _ngame.move(_move);
                                if(__mv.from === ResponseMoves[index].move.from){
                                    const infoPos = getInfo(_ngame.fen(), [__mv.to])[__mv.to];
                                    if(infoPos.threats){
                                        const piecePointsAttacking = [];
                                        const piecePointsDeffeding = []
                                        for(const position of infoPos.threats){
                                            piecePointsAttacking.push(_ngame.get(position));
                                        }
                                        let _piecePointsAttacking = piecePointsAttacking.map(e => {
                                            if(e.type == "p") e.points = 1;
                                            if(e.type == "b") e.points = 3;
                                            if(e.type == "n") e.points = 3;
                                            if(e.type == "r") e.points = 5;
                                            if(e.type == "q") e.points = 9;
                                            if(e.type == "k") e.points = Infinity;
                                            return e;
                                        }).sort((a, b) => a.points - b.points);
                                        for(const position of (infoPos.defenses || [])){
                                            piecePointsDeffeding.push(_ngame.get(position));
                                        }
                                        let _piecePointsDeffeding = piecePointsDeffeding.map(e => {
                                            if(e.type == "p") e.points = 1;
                                            if(e.type == "b") e.points = 3;
                                            if(e.type == "n") e.points = 3;
                                            if(e.type == "r") e.points = 5;
                                            if(e.type == "q") e.points = 9;
                                            if(e.type == "k") e.points = Infinity;
                                            return e;
                                        }).sort((a, b) => a.points - b.points);

                                        if(!compare(_piecePointsAttacking, [getPiecePoints(__mv.piece), ..._piecePointsDeffeding], getPiecePoints(__mv.captured)?.points || -1)){
                                            outerMoves = true;
                                            break
                                        }
                                    }
                                }else{
                                    const infoPos = getInfo(_ngame.fen(), [ResponseMoves[index].move.from])[ResponseMoves[index].move.from];
                                    if(infoPos.threats){
                                        const piecePointsAttacking = [];
                                        const piecePointsDeffeding = []
                                        for(const position of infoPos.threats){
                                            piecePointsAttacking.push(_ngame.get(position));
                                        }
                                        let _piecePointsAttacking = piecePointsAttacking.map(e => {
                                            if(e.type == "p") e.points = 1;
                                            if(e.type == "b") e.points = 3;
                                            if(e.type == "n") e.points = 3;
                                            if(e.type == "r") e.points = 5;
                                            if(e.type == "q") e.points = 9;
                                            if(e.type == "k") e.points = Infinity;
                                            return e;
                                        }).sort((a, b) => a.points - b.points);
                                        for(const position of (infoPos.defenses || [])){
                                            piecePointsDeffeding.push(_ngame.get(position));
                                        }
                                        let _piecePointsDeffeding = piecePointsDeffeding.map(e => {
                                            if(e.type == "p") e.points = 1;
                                            if(e.type == "b") e.points = 3;
                                            if(e.type == "n") e.points = 3;
                                            if(e.type == "r") e.points = 5;
                                            if(e.type == "q") e.points = 9;
                                            if(e.type == "k") e.points = Infinity;
                                            return e;
                                        }).sort((a, b) => a.points - b.points);

                                        if(!compare(_piecePointsAttacking, [getPiecePoints(ResponseMoves[index].move.piece), ..._piecePointsDeffeding], getPiecePoints(ResponseMoves[index].move.captured)?.points || -1)){
                                            outerMoves = true;
                                            break
                                        }
                                    }
                                }
                                _ngame.undo();
                            }
                            this.console.log(["ANALYSIS", outerMoves])
                            if(outerMoves){
                                ResponseMoves[index].setType("BRILHANTE")
                                    .setDescription("Esse lance sacrifica a sua peça, é uma jogada dificil de ser vista")
                            }
                        }
                    }
                    
                }
                
            }

            let s__ = true;

            if(ResponseMoves[index-1]){
                if(ResponseMoves[index-1].type == "MISTAKE" || ResponseMoves[index-1].type == "CAPIVARADA"){
                    if(ResponseMoves[index].type == "BEST" || ResponseMoves[index].type == "EXCELENT" || ResponseMoves[index].type == "CRITICAL"){
                        ResponseMoves[index].setDescription("Esse lance se aproveita de um erro adversario" + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                        s__ = false;
                    }
                }
            }

            if(s__ && typeof _MoveResult[index+1] !== "undefined"){
                if(ResponseMoves[index].type == "BEST" || ResponseMoves[index].type == "EXCELENT" || ResponseMoves[index].type == "CRITICAL" || ResponseMoves[index].type == "BOM" || ResponseMoves[index].type == "BOOK"){
                    const position = new Position(ResponseMoves[index].move.fen);
                    const text = position.detect(`${ResponseMoves[index]?.move.san}${_MoveResult[index+1]?.result?.[0]?.pv ? " " + _MoveResult[index+1]?.result?.[0]?.pv : ""}`, ResponseMoves[index].type, _MoveResult[index]?.result?.[0]?.pv);
                    if(text){
                        if(text === "Esse lance move sua peça para uma posição mais ativa"){
                            if(ResponseMoves[index].move.captured){
                                ResponseMoves[index].setDescription("Esse lance captura uma peça" + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                            }else if(Math.floor(Math.random() * 10) > 5 ){
                                ResponseMoves[index].setDescription(text + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                            }
                        }else{
                            ResponseMoves[index].setDescription(text + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                        }
                    }else if(ResponseMoves[index].move.captured){
                        ResponseMoves[index].setDescription("Esse lance captura uma peça" + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                    }
                }else if(ResponseMoves[index].type !== "MISTAKE" && ResponseMoves[index].type !== "CAPIVARADA" && ResponseMoves[index].type !== "VITORIA_PERDIDA" && ResponseMoves[index].type !== "BRILHANTE"){
                    const position = new Position(ResponseMoves[index].move.fen);
                    const text = position.detect(`${ResponseMoves[index]?.move.san}${_MoveResult[index+1]?.result?.[0]?.pv ? " " + _MoveResult[index+1]?.result?.[0]?.pv : ""}`, ResponseMoves[index].type, _MoveResult[index]?.result?.[0]?.pv);
                    if(text){
                        if(text === "Esse lance move sua peça para uma posição mais ativa"){
                            if(ResponseMoves[index].move.captured){
                                ResponseMoves[index].setDescription("Esse lance captura uma peça" + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                            }else if(Math.floor(Math.random() * 10) > 5 ){
                                ResponseMoves[index].setDescription(text + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                            }
                        }else{
                            ResponseMoves[index].setDescription(text + (ResponseMoves[index].type == "CRITICAL" ? ", É o unico lance bom" : ""));
                        }
                    }
                }
            }

            if(ResponseMoves[index].type == "MISTAKE" || ResponseMoves[index].type == "CAPIVARADA"){
                const _game = new Chess();
                _game.load(ResponseMoves[index].move.fen);
                const gTurn = ResponseMoves[index].move.color;
                const oTurn = ResponseMoves[index].move.color === "w" ? "b" : "w";
                
                _game.move(ResponseMoves[index].move.san);
                let boardPieces = { w: 0, b: 0 };
                for(const x of _game.board()){
                    for(const piece of x){
                        if(piece)
                        boardPieces[piece.color] += getPiecePointsAcc(piece.type) || 0;
                    }
                }
                if(MoveResult[index]){
                    await Stocks[0].position(_game.fen());
                    const response = await Stocks[0].go({ depth: this.depth });
                    const result = this.getScore(response);
                    const moves = result[0].pv.split(" ");
                    for(const move of moves){
                        _game.move(move);
                    }
                    let boardPieces2 = { w: 0, b: 0 };
                    for(const x of _game.board()){
                        for(const piece of x){
                            if(piece)
                            boardPieces2[piece.color] += getPiecePointsAcc(piece.type) || 0;
                        }
                    }
                    //this.console.log(ResponseMoves[index].move.san, boardPieces, boardPieces2, gTurn, oTurn)
                    if(boardPieces[gTurn]-boardPieces[oTurn] > boardPieces2[gTurn]-boardPieces2[oTurn]){
                        ResponseMoves[index].setDescription("Esse lance leva a perda de material");
                    }else{
                        const tatical = new Position(ResponseMoves[index].move.fen);
                        const evaluation = ResponseMoves[index].type;
                        const type = ResponseMoves[index].type;
                        ResponseMoves[index]
                            .setType("TATICAL_ERROR")
                            .setDescription(tatical.detect(`${ResponseMoves[index].move.san} ${result[0].pv || ""}`.trim(), evaluation, result[0].pv) || "Esse lance permite um tema tatico para o oponente");
                    }
                }
            }

            if(ResponseMoves[index-1] && (ResponseMoves[index-1].type == "TATICAL_ERROR" || ResponseMoves[index-1].type == "CAPIVARADA" || ResponseMoves[index-1].type == "MISTAKE")){
                if(ResponseMoves[index] && (ResponseMoves[index].type == "TATICAL_ERROR" || ResponseMoves[index].type == "CAPIVARADA" || ResponseMoves[index].type == "MISTAKE")){
                    if(_MoveResult[index-1] && _MoveResult[index-2]){
                        if(_MoveResult[index-1].score.unit == "cp" && _MoveResult[index-2].score.unit == "cp"){
                            if(_MoveResult[index-1].score.value < _MoveResult[index-2].score.value - 200){
                                ResponseMoves[index]
                                    .setType("VITORIA_PERDIDA")
                                    .setDescription("Esse lance perde uma forma de se aproveitar de um erro do oponente");
                                    continue;
                            }
                        }
                    }
                    ResponseMoves[index]
                        .setType("TATICAL_ERROR")
                        .setDescription("Esse lance perde uma forma de se aproveitar de um erro do oponente");
                }
            }
        }

        const ramUsage2 = require("os").freemem();

        for(const engine of Stocks){
            await engine.quit();
        }

        const Precissions = {
            White: {
                q: { total: 0, sum: 0 },
                r: { total: 0, sum: 0 },
                n: { total: 0, sum: 0 },
                b: { total: 0, sum: 0 },
                p: { total: 0, sum: 0 },
                k: { total: 0, sum: 0 },
            },
            Black: {
                q: { total: 0, sum: 0 },
                r: { total: 0, sum: 0 },
                n: { total: 0, sum: 0 },
                b: { total: 0, sum: 0 },
                p: { total: 0, sum: 0 },
                k: { total: 0, sum: 0 },
            }
        }

        require("fs").writeFileSync("_move.json", JSON.stringify(_MoveResult, null, 4));

        for(const result of ResponseMoves){
            if(result.move.color == "w"){
                if(result.type != "BOOK"){
                    Precissions.White[result.move.piece].total++;
                    Precissions.White[result.move.piece].sum += result.getPoints();
                }
            }else{
                if(result.type != "BOOK"){
                    Precissions.Black[result.move.piece].total++;
                    Precissions.Black[result.move.piece].sum += result.getPoints();
                }
            }
        }

        const Precision = {
            White: Number(((
                (Precissions.White.b.sum || 0)+
                (Precissions.White.n.sum || 0)+
                (Precissions.White.p.sum || 0)+
                (Precissions.White.q.sum || 0)+
                (Precissions.White.r.sum || 0)
            )/(
                (Precissions.White.b.total || 0)+
                (Precissions.White.n.total || 0)+
                (Precissions.White.p.total || 0)+
                (Precissions.White.q.total || 0)+
                (Precissions.White.r.total || 0)
            )).toFixed(1)),
            Black: Number(((
                (Precissions.Black.b.sum || 0)+
                (Precissions.Black.n.sum || 0)+
                (Precissions.Black.p.sum || 0)+
                (Precissions.Black.q.sum || 0)+
                (Precissions.Black.r.sum || 0)
            )/(
                (Precissions.Black.b.total || 0)+
                (Precissions.Black.n.total || 0)+
                (Precissions.Black.p.total || 0)+
                (Precissions.Black.q.total || 0)+
                (Precissions.Black.r.total || 0)
            )).toFixed(1))
        }

        const pShow = { White: {}, Black: {} }
        for(const key of Object.keys(Precissions.White)){
            pShow.White[key] = {
                moves: Precissions.White[key].total,
                precision: Number((Precissions.White[key].sum/Precissions.White[key].total).toFixed(1)),
            }
        }
        for(const key of Object.keys(Precissions.Black)){
            pShow.Black[key] = {
                moves: Precissions.Black[key].total,
                precision: Number((Precissions.Black[key].sum/Precissions.Black[key].total).toFixed(1)),
            }
        }

        require("fs").writeFileSync("_total.json", JSON.stringify({
            precisionPerPiece: pShow,
            precision: Precision,
            moves: ResponseMoves
        }, null, 4));
        

        return {
            ramUsage: ramUsage-ramUsage2,
            d: [ramUsage, ramUsage2],
            precisionPerPiece: Precissions,
            precision: Precision,
            moves: ResponseMoves
        };

    }

}
const Game = require("./Game");

module.exports = class Analysis {

    constructor(engine_path, Config){
        this.engine_path = engine_path
        this.instances = Config.instance_stockfish;
        this.depth = Config.depth;
        this.book = require("../../engine/book/eco.json");
    }

    inBook(pgn){
        return !!this.getBook(pgn);
    }

    getBook(pgn){
        return this.book.find(e => e.moves === pgn)
    }

    create(){

        return new Game(this);

    }

}
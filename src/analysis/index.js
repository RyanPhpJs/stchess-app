const Game = require("./Game");
const Config = require("../../conf/options.json");
const ChessTools = require('chess-tools');
const fs = require("fs");

module.exports = class Analysis {

    constructor(){
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
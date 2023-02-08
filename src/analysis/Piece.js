const { Chess } = require("chess.js");
const { getDefending } = require("chessy")

module.exports = class Piece {

    /**
     * 
     * @param {string} piece 
     */
    constructor(piece){

        this.piece = piece
        this.game = new Chess();
        this.local = null;
        this.moves = 0;

    }

    setFen(fen){
        this.game.load(fen);
        return this;
    }

    setLocal(local){
        this.local = local;
        return this;
    }

    move(to){
        this.local = to;
        this.moves++;
        return this;
    }

    countDeffender(){
        return getDefending(this.game.fen())
    }

}
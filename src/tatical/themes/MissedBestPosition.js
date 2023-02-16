const { Chess } = require("chess.js");
const { getInfo } = require("chessy")
const TaticalTheme = require("../TaticalTheme");

module.exports = class MissedBestPosition extends TaticalTheme {

    constructor(){

        super("MissedBestPosition", {
            types: ["BOM", "IMPRUDENTE"],
            descriptionFavorite: "Esse lance perde uma forma de melhorar a posição de uma peça",
            descriptionError: "Esse lance perde uma forma de melhorar a posição de uma peça",
            onlyBestPv: true
        });

    }

    isBest(board, pv){
        let turn = board.turn();
        const move = pv.split(" ")[0];
        const fen = board.fen();
        let _move = board.move(move);

        const result1 = getInfo(fen, [_move.from])[_move.from]?.sights?.length || 0;
        const _fen = board.fen().split(" ");
        _fen[1] = turn;
        const result2 = getInfo(_fen.join(" "), [_move.to])[_move.to]?.sights?.length || 0;

        return {
            status: result2 > result1
        }
    }

    /**
     * 
     * @param {import("chess.js").Chess} board 
     * @param {string} pv 
     * @param {bestPv} pv 
     */
    __is(board, pv, bestPv){

        const move = pv.split(" ")[0];
        const pcMove = bestPv.split(" ")[0];

        if(move !== pcMove){

            return this.isBest(board, bestPv);

        }

        return {
            status: false
        }

    }

    isFavorite(...args){
        return this.__is(...args);
    }

    isError(...args){
        return this.__is(...args);
    }

}

// const validate = new module.exports();
// console.log(validate.isFavorite(
//     new Chess("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"), 
//     "Bc4", {
//         unit: "mate",
//         value: 9
//     }
// ))
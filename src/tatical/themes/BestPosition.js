const { Chess } = require("chess.js");
const { getInfo } = require("chessy")
const TaticalTheme = require("../TaticalTheme");

module.exports = class BestPosition extends TaticalTheme {

    constructor(){

        super("BestPosition", {
            types: ["BOOK", "BEST", "CRITICAL", "BOM", "EXCELENT"],
            descriptionFavorite: "Esse lance move sua peça para uma posição mais ativa"
        });

    }

    /**
     * 
     * @param {import("chess.js").Chess} board 
     * @param {string} pv 
     */
    isFavorite(board, pv){

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

}

// const validate = new module.exports();
// console.log(validate.isFavorite(
//     new Chess("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"), 
//     "Bc4", {
//         unit: "mate",
//         value: 9
//     }
// ))
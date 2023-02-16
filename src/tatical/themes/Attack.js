const { Chess } = require("chess.js");
const { getAttacking } = require("chessy")
const TaticalTheme = require("../TaticalTheme");

function arrayEquals(a, b) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

module.exports = class Attack extends TaticalTheme {

    constructor(){

        super("BestPosition", {
            types: ["BOOK", "BEST", "CRITICAL", "BOM", "EXCELENT"],
            descriptionFavorite: "Esse lance ataca uma peça de valor maior, forçando sua retirada"
        });

    }

    /**
     * 
     * @param {import("chess.js").Chess} board 
     * @param {string} pv 
     */
    isFavorite(board, pv){

        let turn = board.turn();
        let eturn = turn === "w" ? "white" : "black";
        const move = pv.split(" ")[0];
        const fen = board.fen();
        let _move = board.move(move);
        let _fen = board.fen();

        const moves1 = getAttacking(fen)[eturn];
        const moves2 = getAttacking(_fen)[eturn];
        const VALUE = {
            k: Infinity,
            p: 1,
            b: 3,
            n: 3,
            r: 5,
            q: 9,
            "e": 0
        }

        for(const square of Object.keys(moves2)){
            if(!moves1[square]){
                const piece = board.get(square);
                const pieceValue = VALUE[piece.type];
                for(const pieces of moves2[square]){
                    if(pieceValue < VALUE[board.get(pieces)?.type || "e"]){
                        return {
                            status: true
                        }
                    }
                }
            }
        }

        return {
            status: false
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
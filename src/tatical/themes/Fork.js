const { Chess } = require("chess.js");
const { getInfo, getAttacking } = require("chessy")
const TaticalTheme = require("../TaticalTheme");

module.exports = class BestPosition extends TaticalTheme {

    constructor(){

        super("BestPosition", {
            types: ["BEST", "CRITICAL", "BOM", "EXCELENT"],
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
        const moves = pv.split(" ");
        const fen = board.fen();
        const _turn = turn == "w" ? "white" : "black";

        let Values = {
            "p": 1,
            "q": 9,
            "r": 5,
            "b": 3,
            "n": 3
        }
        
        for(const move of moves){
            board.move(move);
            if(board.turn() === turn){
                let fen = board.fen().split(" ");
                fen[1] = turn;
                const attacking = getThreats(fen.join(" "));
                for(const square of Object.keys(attacking[_turn])){
                    const piece = board.get(square);
                    
                }
            }
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
const { Chess } = require("chess.js");
const TaticalTheme = require("../TaticalTheme");

module.exports = class PawnDouble extends TaticalTheme {

    constructor(){

        super("PawnDouble", {
            alter: true,
            types: ["IMPRUDENTE", "MISTAKE", "CAPIVARADA"],
            descriptionError: "Esse lance faz você ter peões dobrados na coluna $collumn em $moves"
        });

    }

    /**
     * 
     * @param {Chess} board 
     * @param {"w"|"b"} turn 
     */
    has(board, turn){

        let Pawns = {};

        for(const line of board.board()){
            for(const piece of line){
                if(piece && piece.type == "p" && piece.color === turn){
                    if(!Pawns[piece.square[0]]){
                        Pawns[piece.square[0]] = [];
                    }
                    Pawns[piece.square[0]].push(piece.square);
                }
            }
        }

        let ret = [];

        for(const collumn of Object.keys(Pawns)){
            if(Pawns[collumn].length > 1){
                ret.push(collumn);
            }
        }

        if(ret.length > 0) return ret;

        return []

    }

    /**
     * 
     * @param {string} board 
     * @param {*} pv 
     */
    isError(board, pv){

        let turn = board.turn();
        let oponentColor = turn == "w" ? "b" : "w";
        const Doubleds = this.has(board, turn);
        const moves = pv.split(" ");

        let i = 0;
        for(const move of moves){
            board.move(move);
            if(board.turn() === oponentColor){
                i++;
            }
            const doubled = this.has(board, turn);
            // if(doubled.length > 0)
            //     console.log(doubled, turn, pv)
            if(doubled.length > Doubleds.length){
                const collumns = [];
                for(const collumn of doubled){
                    if(!Doubleds.includes(collumn)){
                        collumns.push(collumn)
                    }
                }
                if(i <= 3){
                    return { status: true, moves: i, collumn: collumns.join(" e ") };
                }
                return { status: false, moves: -1 };
                
            }
        }

        return { status: false, moves: -1 };

    }

}

// const validate = new module.exports();
// console.log(validate.isError(
//     new Chess("r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1"), 
//     "Bxc6 dxc6", {
//         unit: "mate",
//         value: 9
//     }
// ))
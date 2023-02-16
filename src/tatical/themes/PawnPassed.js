const { Chess } = require("chess.js");
const TaticalTheme = require("../TaticalTheme");

module.exports = class PawnPassed extends TaticalTheme {

    constructor(){

        super("PawnPassed", {
            alter: true,
            types: ["BOOK", "BEST", "BOM", "BRILHANTE", "CAPIVARADA", "CRITICAL", "EXCELENT", "IMPRUDENTE", "MISTAKE"],
            descriptionFavorite: "Esse lance permite você criar um peão passado",
            descriptionError: "Esse lance permite que seu adversario crie um peão passado"
        });

    }

    /**
     * @private
     * @param {import("chess.js").Chess} board 
     * @param {"w"|"b"} turn 
     */
    has(board, turn){
        let Pawns = { w: [], b: [] };
        for(const line of board.board()){
            for(const piece of line){
                if(piece){
                    if(piece.type == "p"){
                        const obj = {
                            square: piece.square,
                            squareLetter: piece.square[0],
                            squareNumber: turn == "w" ? Number(piece.square[1]) : 9 - Number(piece.square[1]),
                            color: piece.color,
                            hasPawnInSquareLetter: false,
                            hasPawnInSquareLefts: false,
                            get isPassed(){
                                return !this.hasPawnInSquareLetter && !this.hasPawnInSquareLefts
                            }
                        }
                        Pawns[piece.color].push(obj)
                    }
                }
            }
        }

        const oponentColor = turn === "w" ? "b" : "w";

        const mapper = {
            "a": 1,
            "b": 2,
            "c": 3,
            "d": 4,
            "e": 5,
            "f": 6,
            "g": 7,
            "h": 8
        }

        const mapperLetter = {
            1: "a",
            2: "b",
            3: "c",
            4: "d",
            5: "e",
            6: "f",
            7: "g",
            8: "h"
        }

        for(const index in Pawns[turn]){
            if(Pawns[oponentColor].find(e => {
                if(e.squareLetter === Pawns[turn][index].squareLetter){
                    if(e.squareNumber >  Pawns[turn][index].squareNumber){
                        return true;
                    }
                }
                return false
            })){
                Pawns[turn][index].hasPawnInSquareLetter = true;
            }
            let letsSquare = [mapperLetter[mapper[Pawns[turn][index].squareLetter]-1], mapperLetter[mapper[Pawns[turn][index].squareLetter]+1]];
            //console.log(Pawns[turn][index].squareLetter, letsSquare);
            if(Pawns[oponentColor].find(e => {
                for(const square of letsSquare){
                    if(square && e.squareLetter === square){
                        if(e.squareNumber >  Pawns[turn][index].squareNumber){
                            return true;
                        }
                    }
                }
                return false;
            })){
                Pawns[turn][index].hasPawnInSquareLefts = true;
            }
        }

        return Pawns[turn].find(e => e.isPassed);
    }

    /**
     * 
     * @param {import("chess.js").Chess} board 
     * @param {string} pv
     * @param {{unit: "cp"|"bestmove", value: number}} score
     */
    isFavorite(board, pv, score){

        let turn = board.turn();
        let oponentColor = turn == "w" ? "b" : "w";
        const isPassed = this.has(board, turn);
        const moves = pv.split(" ");

        if(!isPassed){
            let i = 0;
            for(const move of moves){
                board.move(move);
                if(board.turn() === turn){
                    i++;
                    const passed = this.has(board, turn);
                    if(passed){
                        if(i <= 3){
                            return { status: true, moves: i };
                        }
                        return { status: false, moves: 0 };
                    }
                }
            }
        }
        
        return { status: false, moves: 0 };

    }

    /**
     * 
     * @param {import("chess.js").Chess} board 
     * @param {string} pv
     * @param {{unit: "cp"|"bestmove", value: number}} score
     */
    isError(board, pv){
        let turn = board.turn();
        let oponentColor = turn == "w" ? "b" : "w";
        const isPassed = this.has(board, oponentColor);
        const moves = pv.split(" ");

        if(!isPassed){
            let i = 0;
            for(const move of moves){
                //console.log({ fen: board.fen(), turn: turn, pv: pv })
                board.move(move);
                if(board.turn() === turn){
                    i++;
                    const passed = this.has(board, oponentColor);
                    if(passed){
                        if(i <= 3){
                            return { status: true, moves: i };
                        }
                        return { status: false, moves: 0 };
                    }
                }
            }
        }
        
        return { status: false, moves: 0 };
    }

}

// const validate = new module.exports();
// console.log(validate.isError(
//     new Chess("8/k6p/P3p1p1/Kp1pPpP1/1PpP1P1P/2P5/8/8 b - - 0 1"), 
//     "h7h6 g5h6 g6g5", {
//         unit: "mate",
//         value: 9
//     }
// ))
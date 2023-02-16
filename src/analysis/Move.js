module.exports = class Move {

    /**
     * 
     * @param {import("chess.js").Move} move 
     */
    constructor(move){

        this.type = null;
        this.move = move;
        this.description = null;

    }

    static getPoints(type){
        if(type == "BOOK") return 100;
        if(type == "BEST") return 100;
        if(type == "BRILHANTE") return 100;
        if(type == "CRITICAL") return 100;
        if(type == "EXCELENT") return 90;
        if(type == "BOM") return 75;
        if(type == "IMPRUDENTE") return 50;
        if(type == "MISTAKE") return 30;
        if(type == "TATICAL_ERROR") return 15;
        if(type == "CAPIVARADA") return 0;
        if(type == "VITORIA_PERDIDA") return 0;
        if(type == "FORCADO") return 100;
    }

    getPoints(){
        return Move.getPoints(this.type)
    }

    setDescription(description){

        this.description = description;
        return this;

    }

    setType(type){

        this.type = type;
        return this;

    }

    // toJSON(){
    //     return {
    //         type: this.type,
    //         move: this.move,
    //         description: this.description
    //     }
    // }

}
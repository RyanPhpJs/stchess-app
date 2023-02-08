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

    getPoints(){
        if(this.type == "BEST") return 100;
        if(this.type == "BRILHANTE") return 100;
        if(this.type == "CRITICAL") return 100;
        if(this.type == "EXCELENT") return 90;
        if(this.type == "BOM") return 75;
        if(this.type == "IMPRECISAO") return 50;
        if(this.type == "MISTAKE") return 25;
        if(this.type == "CAPIVARADA") return 0;
        if(this.type == "VITORIA_PERDIDA") return 0;
        if(this.type == "FORCADO") return 100;
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
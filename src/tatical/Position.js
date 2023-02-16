const { Chess } = require("chess.js");
const Move = require("../analysis/Move");
const Attack = require("./themes/Attack");
const BestPosition = require("./themes/BestPosition");
const MissedAttack = require("./themes/MissedAttack");
const MissedBestPosition = require("./themes/MissedBestPosition");
const PawnDouble = require("./themes/PawnDouble");
const PawnPassed = require("./themes/PawnPassed");

module.exports = class Position {

    constructor(fen){

        this.fen = fen;
        this.modules = [
            new PawnPassed(),
            new PawnDouble(),
            new Attack(),
            new MissedAttack(),
            new MissedBestPosition(),
            new BestPosition()
        ]

    }

    detect(pv, evaluationType, bestPv){

        const points = Move.getPoints(evaluationType);

        for(const theme of this.modules){

            if(theme.hasType(evaluationType)){

                if(theme.onlyBestPv && !bestPv){
                    continue;
                }

                if(points > 50){

                    const game = new Chess(this.fen);
                    const result = theme.isFavorite(game, pv, bestPv);
                    if(result.status){
                        return theme.description.replace(/\$([a-zA-Z0-9\.\-\_]+)/, (match, p1) => {
                            return result[p1] || "null";
                        });
                    }

                }else{

                    if(theme.isError){
                        const game = new Chess(this.fen);
                        const result = theme.isError(game, pv, bestPv);
                        if(typeof result === "undefined") console.log(result, theme);
                        if(result.status){
                            if(!theme.descriptionError){
                                console.log(">> "+theme.name);
                                return null;
                            }
                            return theme.descriptionError.replace(/\$([a-zA-Z0-9\.\-\_]+)/, (match, p1) => {
                                return result[p1] || "null";
                            });
                        }
                    }else{
                        console.warn(`${theme.name} not exists function isError and accept ${evaluationType}`);
                    }
                    

                }

            }

        }

        if(points > 50){
            return null
        }else{
            return null
        }

    }

}
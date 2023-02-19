const Analysis = require("./src/analysis");
const pgn = require("fs").readFileSync("game_play.pgn", "utf8");
const Config = require("./conf/options.json");

const manager = new Analysis("engine/src/stockfish", Config);

const game = manager.create();
game.setPgn(pgn);

game.on("progress", function(progress){
    console.log(`Completo ${progress}% da partida`);
});

const InitedDate = Date.now();

game.go().then((result) => {
    for(const move of result.moves){
        console.log(`${move.move.san} (${move.type}) - ${move.description}`);
    }
    console.log(`Operation consumed ${Date.now() - InitedDate}ms`);
    console.log(`RAM Usage: ${(result.ramUsage/1024/1024).toFixed(1)}MB`);

    let text = `[White_Precision ${result.precision.White}%]\n[Black_Precision ${result.precision.Black}]\n\n`;
    let i = 0;
    let isWhite = true;
    const Texts = {
        "BRILHANTE": "!!",
        "CRITICAL": "!",
        "IMPRUDENTE": "?!",
        "TATICAL_ERROR": "!?",
        "MISTAKE": "?",
        "CAPIVARADA": "??"
    }

    for(const move of result.moves){

        if(isWhite){
            i++
        }
        text += `${i}${isWhite ? "." : "..."} ${move.move.san}${Texts[move.type] || ""} {${move.type} - ${move.description}} `;
        isWhite = !isWhite;

        if(i % 10 === 0){
            text += "\n";
        }

    }

    require("fs").writeFileSync("generate.pgn", text);

    process.exit();
})
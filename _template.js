const Analysis = require("./src/analysis");

const manager = new Analysis();

const game = manager.create();
game.setPgn(require("fs").readFileSync("game.pgn", "utf8"));

game.on("progress", function(progress){
    console.log(`Completo ${progress}% da partida`);
});

const InitedDate = Date.now();

game.go().then((result) => {
    for(const move of result.moves){
        console.log(`${move.move.san} (${move.type}) - ${move.description}`);
    }
    console.log(`Operation consumed ${Date.now() - InitedDate}ms`);
    console.log(`RAM Usage: ${(result.ramUsage/1024/1024).toFixed(1)}MB - `, result.d)

    process.exit();
})
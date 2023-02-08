module.exports = class MoveAnalysis {

    /**
     * 
     * @param {{ depth: number, string?: string, seldepth: number, time: number, nodes: number, hashfull: number, nps: number, tbhits: number, score: { unit: "mate"|"cp", value: number }, multipv: number, pv: string }[]} move 
     * @param {string} bestmove
     * @param {import("chess.js").Move & { _moves: string[], _index: number }} chess
     */
    constructor(move, bestmove, chess){

        this.bestmove = bestmove;
        this.result = move;
        this.move = chess;
        this.score = move[0].score;

    }

}
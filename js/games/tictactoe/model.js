export class TicTacToeModel {
  constructor(domainModel) {
    if (!domainModel) throw new TypeError("TicTacToeModel requires the application game model.");
    this.domainModel = domainModel;
  }

  createGame(players) {
    return this.domainModel.createTicTacToeGame(players);
  }

  applyMove(game, playerId, cell) {
    return this.domainModel.applyTicTacToeMove(game, playerId, cell);
  }

  chooseComputerMove(game, playerId) {
    return this.domainModel.chooseTicTacToeMove(game, playerId);
  }

  getWinner(board) {
    return this.domainModel.getTicTacToeWinner(board);
  }
}

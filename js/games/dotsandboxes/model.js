export class DotsAndBoxesModel {
  constructor(domainModel) {
    if (!domainModel) throw new TypeError("DotsAndBoxesModel requires the application game model.");
    this.domainModel = domainModel;
  }

  createGame(players) {
    return this.domainModel.createDotsAndBoxesGame(players);
  }

  isGame(game) {
    return this.domainModel.isDotsAndBoxesGame(game);
  }

  applyMove(game, playerId, edge) {
    return this.domainModel.applyDotsAndBoxesMove(game, playerId, edge);
  }

  chooseComputerMove(game, playerId) {
    return this.domainModel.chooseDotsAndBoxesMove(game, playerId);
  }
}

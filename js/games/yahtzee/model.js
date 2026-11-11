export class YahtzeeModel {
  constructor(domainModel) {
    if (!domainModel) throw new TypeError("YahtzeeModel requires the application game model.");
    this.domainModel = domainModel;
  }

  getCategories() {
    return this.domainModel.getYahtzeeCategories();
  }

  createGame() {
    return this.domainModel.createYahtzeeGame();
  }

  createMatch(players) {
    return this.domainModel.createYahtzeeMatch(players);
  }

  roll(game) {
    return this.domainModel.rollYahtzeeDice(game);
  }

  toggleDie(game, index) {
    return this.domainModel.toggleYahtzeeDie(game, index);
  }

  previewScore(game, category) {
    return this.domainModel.getYahtzeeTurnScore(game, category);
  }

  scoreTurn(game, category) {
    return this.domainModel.scoreYahtzeeTurn(game, category);
  }
}

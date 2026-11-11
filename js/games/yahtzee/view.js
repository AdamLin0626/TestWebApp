export class YahtzeeView {
  constructor(gameView) {
    this.gameView = gameView;
  }

  render(state, model, pendingMove = false) {
    this.gameView.renderYahtzee(state, model.domainModel || model, pendingMove);
  }

  mountHandlers({ dice, roll, scoreList, onToggleDie, onRoll, onScore } = {}) {
    this.handleDiceClick = (event) => {
      const die = event.target.closest("[data-die]");
      if (die && !die.disabled) onToggleDie(Number(die.dataset.die));
    };
    this.handleRollClick = () => onRoll();
    this.handleScoreClick = (event) => {
      const category = event.target.closest("[data-category]");
      if (category && !category.disabled) onScore(category.dataset.category);
    };
    dice.addEventListener("click", this.handleDiceClick);
    roll.addEventListener("click", this.handleRollClick);
    scoreList.addEventListener("click", this.handleScoreClick);
    return () => {
      dice.removeEventListener("click", this.handleDiceClick);
      roll.removeEventListener("click", this.handleRollClick);
      scoreList.removeEventListener("click", this.handleScoreClick);
    };
  }
}

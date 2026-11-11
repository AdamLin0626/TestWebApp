export class A1B2View {
  constructor(gameView) {
    this.gameView = gameView;
  }

  render(state, getPlayers, onCurrentResult) {
    this.gameView.render(state, getPlayers, onCurrentResult);
  }

  mountHandlers({ onSubmit, onDigit, onClear, onBackspace, onInput, restart, onRestart } = {}) {
    const elements = this.gameView.elements;
    this.handlers = { onSubmit, onDigit, onClear, onBackspace, onInput, onRestart };
    this.handleFormSubmit = (event) => {
      event.preventDefault();
      this.handlers?.onSubmit?.(elements.guess.value);
    };
    this.handleKeypadClick = (event) => {
      const button = event.target.closest("button");
      if (!button || button.disabled) return;
      if (button.dataset.digit) this.handlers?.onDigit?.(button.dataset.digit);
      else if (button.dataset.action === "clear") this.handlers?.onClear?.();
      else if (button.dataset.action === "delete") this.handlers?.onBackspace?.();
    };
    this.handleInput = () => this.handlers?.onInput?.();
    this.handleRestart = () => this.handlers?.onRestart?.();
    elements.guessForm.addEventListener("submit", this.handleFormSubmit);
    elements.keypad.addEventListener("click", this.handleKeypadClick);
    elements.guess.addEventListener("input", this.handleInput);
    elements.keypadSubmit.addEventListener("click", this.handleFormSubmit);
    restart.addEventListener("click", this.handleRestart);
    return () => this.dispose();
  }

  updateGuessSlots(state) {
    this.gameView.updateGuessSlots(state);
  }

  dispose() {
    const elements = this.gameView.elements;
    elements.guessForm.removeEventListener("submit", this.handleFormSubmit);
    elements.keypad.removeEventListener("click", this.handleKeypadClick);
    elements.guess.removeEventListener("input", this.handleInput);
    elements.keypadSubmit.removeEventListener("click", this.handleFormSubmit);
    this.gameView.elements.restart.removeEventListener("click", this.handleRestart);
    this.handlers = null;
  }
}

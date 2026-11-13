function el(documentRef, tag, className = "", text = null) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function actionButton(documentRef, label, action, disabled = false, data = {}) {
  const button = el(documentRef, "button", "button button-secondary core-action", label);
  button.type = "button";
  button.dataset.action = action;
  button.disabled = Boolean(disabled);
  for (const [key, value] of Object.entries(data)) button.dataset[key] = String(value);
  return button;
}

function handValue(cards = []) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") { total += 11; aces += 1; }
    else if (["K", "Q", "J", "10"].includes(card.rank)) total += 10;
    else total += Number(card.rank) || 0;
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

function cardLabel(card) {
  if (!card || card.hidden) return "◆◆";
  const suits = { S: "♠", H: "♥", D: "♦", C: "♣" };
  return `${card.rank}${suits[card.suit] || ""}`;
}

export class CorePlayView {
  constructor(root, gameType, handlers = {}, translate = (source) => source) {
    if (!root || !root.ownerDocument) throw new TypeError("CorePlayView requires a game root element.");
    this.root = root;
    this.document = root.ownerDocument;
    this.gameType = gameType;
    this.handlers = handlers;
    this.t = translate;
    this.selectedCell = null;
    this.context = null;
    this.clickHandler = (event) => this._onClick(event);
    this.changeHandler = (event) => this._onChange(event);
    this.localeHandler = () => { if (this.context) this.render(this.context); };
    this.root.addEventListener("click", this.clickHandler);
    this.root.addEventListener("change", this.changeHandler);
    this.document.defaultView?.addEventListener("playroom:localechange", this.localeHandler);
  }

  dispose() {
    this.root.removeEventListener("click", this.clickHandler);
    this.root.removeEventListener("change", this.changeHandler);
    this.document.defaultView?.removeEventListener("playroom:localechange", this.localeHandler);
    this.context = null;
  }

  render(context) {
    this.context = context;
    const shell = el(this.document, "div", "core-play-shell");
    if (context.waiting) {
      const waiting = el(this.document, "div", "core-waiting");
      waiting.append(
        el(this.document, "span", "core-waiting-mark", "…"),
        el(this.document, "p", "core-play-status", this.t("Waiting for the host to start this game."))
      );
      shell.append(waiting);
      this.root.replaceChildren(shell);
      return;
    }
    if (!context.engine) {
      shell.append(el(this.document, "p", "core-play-status", this.t("Waiting for game state.")));
      this.root.replaceChildren(shell);
      return;
    }

    const status = el(this.document, "div", "core-play-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = this._status(context);
    shell.append(status);

    const players = this._renderPlayers(context);
    if (players) shell.append(players);

    const board = el(this.document, "div", `core-play-board core-board-${this.gameType}`);
    if (this.gameType === "sudoku") this._renderSudoku(board, context);
    else if (this.gameType === "mancala") this._renderMancala(board, context);
    else if (this.gameType === "slapjack") this._renderSlapjack(board, context);
    else if (this.gameType === "blackjack") this._renderBlackjack(board, context);
    else if (this.gameType === "liarsdice") this._renderLiarsDice(board, context);
    else if (this.gameType === "ninetynine") this._renderNinetyNine(board, context);
    shell.append(board);
    this.root.replaceChildren(shell);
  }

  _status(context) {
    const { engine, gameType, playerId, mode, activePlayerId, pending } = context;
    if (engine.phase === "finished") {
      return engine.winnerId
        ? this.t("{name} wins!", { name: this._name(engine.winnerId, context) })
        : this.t("It's a draw!");
    }
    if (gameType === "blackjack") {
      if (engine.phase === "betting") return this.t("Ready to deal.");
      if (engine.phase === "dealer-turn") return this.t("Dealer is playing…");
      if (engine.phase === "settled") return this.t("Round complete.");
    }
    if (gameType === "slapjack" && engine.windowOpen) return this.t("Slap now!");
    if (gameType === "sudoku") {
      if (pending) return this.t("Waiting for your move to sync.");
      if (mode === "2P" && activePlayerId !== playerId) {
        return this.t("{name}'s turn.", { name: this._name(activePlayerId, context) });
      }
      return this.t("Select an empty cell, then choose a number.");
    }
    if (pending) return this.t("Waiting for your move to sync.");
    if (activePlayerId === playerId) return this.t("Your turn.");
    if (mode === "1P" && activePlayerId === "p2") return this.t("Computer is thinking…");
    if (activePlayerId) return this.t("{name}'s turn.", { name: this._name(activePlayerId, context) });
    return this.t("Game in progress.");
  }

  _name(playerId, context) {
    const players = context.engine?.players || context.players || [];
    return players.find((player) => player.id === playerId)?.name ||
      (playerId === "p1" ? context.playerName : playerId === "p2" && context.mode === "1P" ? this.t("Computer") : this.t("Opponent"));
  }

  _renderPlayers(context) {
    const game = context.engine;
    if (this.gameType === "sudoku") return null;
    const players = Array.isArray(game.players) ? game.players : [];
    const scores = el(this.document, "div", "core-player-row");
    for (const player of players) {
      const card = el(this.document, "div", "core-player-card");
      card.classList.toggle("is-turn", context.activePlayerId === player.id && game.phase !== "finished");
      card.dataset.player = player.id;
      const name = el(this.document, "span", "core-player-name", player.name || this._name(player.id, context));
      const value = el(this.document, "strong", "core-player-value");
      if (this.gameType === "mancala") value.textContent = String(game.board[player.id === "p1" ? 6 : 13] || 0);
      else if (this.gameType === "slapjack") value.textContent = this.t("Cards: {count}", { count: player.cardCount ?? player.hand?.length ?? 0 });
      else if (this.gameType === "blackjack") value.textContent = this.t("Chips: {count}", { count: player.bankroll });
      else if (this.gameType === "liarsdice") value.textContent = this.t("Dice: {count}", { count: player.diceCount });
      else if (this.gameType === "ninetynine") value.textContent = this.t("Lives: {count}", { count: player.lives });
      card.append(name, value);
      scores.append(card);
    }
    return scores;
  }

  _renderSudoku(board, context) {
    const game = context.engine;
    const isTurn = context.mode !== "2P" || context.activePlayerId === context.playerId;
    const grid = el(this.document, "div", "core-sudoku-grid");
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", this.t("Sudoku board"));
    if (this.selectedCell === null || this.selectedCell < 0) {
      this.selectedCell = game.grid.findIndex((value, index) => value === 0 && !game.givens[index]);
    }
    for (let index = 0; index < 81; index += 1) {
      const value = game.grid[index];
      const cell = actionButton(this.document, value || "", "select-cell", Boolean(game.givens[index]) || !isTurn || context.pending || game.phase !== "playing", { index });
      cell.classList.add("core-sudoku-cell");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", this.t("Row {row}, column {column}: {value}", {
        row: Math.floor(index / 9) + 1,
        column: index % 9 + 1,
        value: value || this.t("empty")
      }));
      if (game.givens[index]) cell.classList.add("is-given");
      if ((game.conflicts || []).includes(index)) cell.classList.add("is-conflict");
      if (this.selectedCell === index) cell.classList.add("is-selected");
      if (index % 9 === 2 || index % 9 === 5) cell.classList.add("box-right");
      if (Math.floor(index / 9) === 2 || Math.floor(index / 9) === 5) cell.classList.add("box-bottom");
      grid.append(cell);
    }
    board.append(grid);
    const controls = el(this.document, "div", "core-sudoku-controls");
    for (let value = 1; value <= 9; value += 1) {
      controls.append(actionButton(this.document, value, "set-value", !isTurn || context.pending || game.phase !== "playing" || this.selectedCell < 0, { value }));
    }
    controls.append(actionButton(this.document, this.t("Clear"), "set-value", !isTurn || context.pending || game.phase !== "playing" || this.selectedCell < 0, { value: 0 }));
    if (context.mode === "1P") controls.append(actionButton(this.document, this.t("Hint"), "hint", context.pending || game.phase !== "playing" || this.selectedCell < 0));
    board.append(controls);
    if (context.mode === "1P") {
      const settings = el(this.document, "label", "core-setting");
      settings.append(el(this.document, "span", "", this.t("Difficulty")));
      const select = el(this.document, "select", "core-select");
      select.dataset.action = "difficulty";
      for (const difficulty of ["easy", "medium", "hard", "expert"]) {
        const option = el(this.document, "option", "", this.t(difficulty));
        option.value = difficulty;
        option.selected = context.difficulty === difficulty;
        select.append(option);
      }
      settings.append(select);
      board.append(settings);
    }
  }

  _renderMancala(board, context) {
    const game = context.engine;
    const layout = el(this.document, "div", "core-mancala-layout");
    const p2Store = this._store(game, "p2", context);
    p2Store.classList.add("core-store-p2");
    const p1Store = this._store(game, "p1", context);
    p1Store.classList.add("core-store-p1");
    layout.append(p2Store);
    const p2Row = el(this.document, "div", "core-mancala-pits core-pits-p2");
    for (const pit of [12, 11, 10, 9, 8, 7]) p2Row.append(this._pit(game, pit, context));
    const p1Row = el(this.document, "div", "core-mancala-pits core-pits-p1");
    for (const pit of [0, 1, 2, 3, 4, 5]) p1Row.append(this._pit(game, pit, context));
    layout.append(p2Row, p1Row, p1Store);
    board.append(layout);
  }

  _store(game, playerId, context) {
    const store = el(this.document, "div", "core-mancala-store");
    store.append(el(this.document, "span", "", this._name(playerId, context)));
    store.append(el(this.document, "strong", "", game.board[playerId === "p1" ? 6 : 13]));
    store.setAttribute("aria-label", this.t("{name}'s store: {count}", { name: this._name(playerId, context), count: game.board[playerId === "p1" ? 6 : 13] }));
    return store;
  }

  _pit(game, pitIndex, context) {
    const owner = pitIndex <= 5 ? "p1" : "p2";
    const enabled = context.activePlayerId === context.playerId && owner === context.playerId &&
      game.phase === "playing" && game.board[pitIndex] > 0 && !context.pending;
    const pit = actionButton(this.document, game.board[pitIndex], "move-pit", !enabled, { pit: pitIndex });
    pit.classList.add("core-mancala-pit");
    pit.setAttribute("aria-label", this.t("Pit {number}, {count} stones", { number: pitIndex + 1, count: game.board[pitIndex] }));
    pit.dataset.owner = owner;
    return pit;
  }

  _renderSlapjack(board, context) {
    const game = context.engine;
    const table = el(this.document, "div", "core-card-table");
    const pile = el(this.document, "div", "core-center-pile");
    pile.append(el(this.document, "span", "core-kicker", this.t("Current pile")));
    pile.append(el(this.document, "strong", "core-face-card", cardLabel(game.topCard)));
    pile.append(el(this.document, "span", "", this.t("Cards: {count}", { count: game.pile.length })));
    table.append(pile);
    const actions = el(this.document, "div", "core-actions");
    const local = game.players.find((player) => player.id === context.playerId);
    actions.append(actionButton(this.document, this.t("Play top card"), "play-slapjack",
      context.pending || game.phase !== "playing" || game.windowOpen || game.currentPlayerId !== context.playerId || !local?.hand?.length));
    if (game.windowOpen) actions.append(actionButton(this.document, this.t("Slap!"), "slap-pile",
      context.pending || game.windowClaimed || game.eliminatedIds.includes(context.playerId) || game.falseSlappedPlayerIds.includes(context.playerId), { window: game.windowId }));
    table.append(actions);
    if (game.lastAction?.type === "slap" && !game.lastAction.correct) {
      table.append(el(this.document, "p", "core-note", this.t("False slap — penalty cards: {count}", { count: game.lastAction.penaltyCards })));
    }
    board.append(table);
  }

  _renderBlackjack(board, context) {
    const game = context.engine;
    const table = el(this.document, "div", "core-blackjack-table");
    const dealer = el(this.document, "section", "core-hand-panel");
    dealer.append(el(this.document, "h3", "", this.t("Dealer")));
    dealer.append(this._cards(game.dealer.cards));
    if (game.dealer.status === "busted" || game.phase === "settled") {
      dealer.append(el(this.document, "span", "core-hand-total", this.t("Total: {count}", { count: handValue(game.dealer.cards) })));
    }
    table.append(dealer);
    for (const player of game.players) {
      const playerPanel = el(this.document, "section", "core-hand-panel");
      playerPanel.append(el(this.document, "h3", "", player.name || this._name(player.id, context)));
      for (let handIndex = 0; handIndex < player.hands.length; handIndex += 1) {
        const hand = player.hands[handIndex];
        const handPanel = el(this.document, "div", "core-hand");
        handPanel.classList.toggle("is-active", game.phase === "player-turn" && game.currentPlayerIndex === game.players.indexOf(player) && game.currentHandIndex === handIndex);
        handPanel.append(this._cards(hand.cards));
        handPanel.append(el(this.document, "span", "core-hand-total", this.t("Total: {count}", { count: handValue(hand.cards) })));
        if (hand.status !== "active") {
          const resultKey = (hand.outcome || hand.status) === "blackjack" ? "Natural 21" : hand.outcome || hand.status;
          handPanel.append(el(this.document, "span", "core-hand-result", this.t(resultKey)));
        }
        playerPanel.append(handPanel);
      }
      table.append(playerPanel);
    }
    const currentPlayer = game.phase === "player-turn" ? game.players[game.currentPlayerIndex] : null;
    const currentHand = currentPlayer?.hands?.[game.currentHandIndex];
    const active = currentPlayer?.id === context.playerId && currentHand?.status === "active";
    const rankValue = (rank) => rank === "A" ? 11 : ["K", "Q", "J"].includes(rank) ? 10 : Number(rank);
    const actions = el(this.document, "div", "core-actions");
    if (game.phase === "betting") {
      actions.append(actionButton(this.document, this.t("Deal"), "blackjack-deal",
        context.pending || context.playerId !== "p1" || game.players.some((player) => player.bankroll < game.rules.minimumBet)));
    } else if (["player-turn", "dealer-turn"].includes(game.phase)) {
      actions.append(actionButton(this.document, this.t("Hit"), "blackjack-hit", !active || context.pending));
      actions.append(actionButton(this.document, this.t("Stand"), "blackjack-stand", !active || context.pending));
      const currentPlayerState = game.players[game.currentPlayerIndex] || {};
      const firstRankValue = rankValue(currentHand?.cards?.[0]?.rank);
      const secondRankValue = rankValue(currentHand?.cards?.[1]?.rank);
      const splitAces = currentHand?.cards?.[0]?.rank === "A";
      const canSplit = active && currentHand?.cards?.length === 2 && currentPlayerState.bankroll >= currentHand.bet &&
        currentPlayerState.hands?.length < game.rules.maxHands && firstRankValue === secondRankValue &&
        (!splitAces || !currentHand.fromSplit || game.rules.allowResplitAces);
      const canDouble = active && currentHand?.cards?.length === 2 && currentPlayerState.bankroll >= currentHand.bet &&
        (!currentHand.fromSplit || game.rules.allowDoubleAfterSplit);
      actions.append(actionButton(this.document, this.t("Split"), "blackjack-split", !canSplit || context.pending));
      actions.append(actionButton(this.document, this.t("Double down"), "blackjack-double", !canDouble || context.pending));
    }
    table.append(actions);
    if (game.roundResult) table.append(el(this.document, "p", "core-note", this.t("Dealer total: {count}", { count: game.roundResult.dealerTotal })));
    board.append(table);
  }

  _cards(cards = []) {
    const row = el(this.document, "div", "core-card-row");
    for (const card of cards) {
      const item = el(this.document, "span", `core-playing-card${card?.hidden ? " is-hidden" : ""}`, cardLabel(card));
      item.setAttribute("aria-label", card?.hidden ? this.t("Hidden card") : cardLabel(card));
      row.append(item);
    }
    return row;
  }

  _renderLiarsDice(board, context) {
    const game = context.engine;
    const table = el(this.document, "div", "core-dice-table");
    const diceRow = el(this.document, "div", "core-opponent-dice");
    for (const player of game.players) {
      const panel = el(this.document, "div", "core-dice-player");
      panel.append(el(this.document, "strong", "", player.name || this._name(player.id, context)));
      const faces = player.id === context.playerId && Array.isArray(player.dice) ? player.dice : [];
      const dice = el(this.document, "div", "core-dice-row");
      if (faces.length) {
        for (const face of faces) dice.append(el(this.document, "span", "core-die", face));
      } else {
        const count = player.diceCount || 0;
        for (let index = 0; index < count; index += 1) dice.append(el(this.document, "span", "core-die is-hidden", "?"));
      }
      panel.append(dice);
      diceRow.append(panel);
    }
    table.append(diceRow);
    const bid = game.currentBid
      ? this.t("Current bid: {quantity} × {face}", { quantity: game.currentBid.quantity, face: game.currentBid.face })
      : this.t("No bid yet.");
    table.append(el(this.document, "p", "core-current-total", bid));
    const canBid = game.phase === "bidding" && game.currentPlayerId === context.playerId && !context.pending;
    const quantity = el(this.document, "input", "core-number-input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = String(game.players.reduce((sum, player) => sum + player.diceCount, 0));
    const maxQuantity = Number(quantity.max);
    const nextQuantity = !game.currentBid ? 1 : game.currentBid.face >= 6
      ? Math.min(game.currentBid.quantity + 1, maxQuantity) : game.currentBid.quantity;
    const nextFace = !game.currentBid ? 1 : game.currentBid.face >= 6 ? 1 : game.currentBid.face + 1;
    quantity.value = String(nextQuantity);
    quantity.dataset.field = "bid-quantity";
    quantity.setAttribute("aria-label", this.t("Quantity"));
    const face = el(this.document, "select", "core-select");
    face.dataset.field = "bid-face";
    face.setAttribute("aria-label", this.t("Face"));
    for (let value = 1; value <= 6; value += 1) {
      const option = el(this.document, "option", "", value);
      option.value = String(value);
      option.selected = nextFace === value;
      face.append(option);
    }
    const controls = el(this.document, "div", "core-actions");
    quantity.disabled = !canBid;
    face.disabled = !canBid;
    controls.append(quantity, face, actionButton(this.document, this.t("Bid"), "liars-bid", !canBid));
    const canChallenge = canBid && Boolean(game.currentBid) && game.currentPlayerId !== game.lastBidderId;
    controls.append(actionButton(this.document, this.t("Call bluff"), "liars-challenge", !canChallenge));
    table.append(controls);
    if (game.lastRound) {
      table.append(el(this.document, "p", "core-note", this.t("The bid counted {actual} matching dice.", { actual: game.lastRound.actualCount })));
    }
    board.append(table);
  }

  _renderNinetyNine(board, context) {
    const game = context.engine;
    const table = el(this.document, "div", "core-ninety-nine-table");
    table.append(el(this.document, "div", "core-99-total", this.t("Total: {count}", { count: game.total })));
    const own = game.players.find((player) => player.id === context.playerId);
    const hand = Array.isArray(own?.hand) ? own.hand : [];
    const handRow = el(this.document, "div", "core-99-hand");
    const canPlay = game.phase === "playing" && game.currentPlayerId === context.playerId && !context.pending;
    for (let index = 0; index < hand.length; index += 1) {
      handRow.append(actionButton(this.document, cardLabel(hand[index]), "play-99", !canPlay, { index }));
    }
    table.append(el(this.document, "p", "core-note", this.t("Choose a total (0–99) for a 9 card; other cards use their printed effect.")));
    const totalInput = el(this.document, "input", "core-number-input");
    totalInput.type = "number";
    totalInput.min = "0";
    totalInput.max = "99";
    totalInput.value = String(game.total);
    totalInput.dataset.field = "chosen-total";
    totalInput.setAttribute("aria-label", this.t("Chosen total"));
    totalInput.disabled = !canPlay;
    table.append(totalInput, handRow);
    if (game.lastAction) {
      table.append(el(this.document, "p", "core-note", this.t("{name} played {card}.", {
        name: this._name(game.lastAction.playerId, context),
        card: cardLabel(game.lastAction.card)
      })));
    }
    board.append(table);
  }

  _onClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !this.root.contains(button) || !this.context) return;
    const action = button.dataset.action;
    if (action === "select-cell") {
      this.selectedCell = Number(button.dataset.index);
      this.render(this.context);
    } else if (action === "set-value") {
      this.handlers.setSudokuValue?.(this.selectedCell, Number(button.dataset.value));
    } else if (action === "hint") {
      this.handlers.hint?.(this.selectedCell);
    } else if (action === "move-pit") {
      this.handlers.movePit?.(Number(button.dataset.pit));
    } else if (action === "play-slapjack") {
      this.handlers.playCard?.();
    } else if (action === "slap-pile") {
      this.handlers.slap?.(Number(button.dataset.window));
    } else if (action.startsWith("blackjack-")) {
      this.handlers.blackjackAction?.(action.slice("blackjack-".length));
    } else if (action === "liars-bid") {
      this.handlers.bid?.(
        Number(this.root.querySelector('[data-field="bid-quantity"]')?.value),
        Number(this.root.querySelector('[data-field="bid-face"]')?.value)
      );
    } else if (action === "liars-challenge") {
      this.handlers.challenge?.();
    } else if (action === "play-99") {
      const chosenTotal = Number(this.root.querySelector('[data-field="chosen-total"]')?.value);
      this.handlers.playNinetyNine?.(Number(button.dataset.index), chosenTotal);
    }
  }

  _onChange(event) {
    if (event.target.matches('select[data-action="difficulty"]')) {
      this.handlers.changeDifficulty?.(event.target.value);
    }
  }
}

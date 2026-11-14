import { GUESS_WHO_CHARACTERS, GUESS_WHO_QUESTIONS } from "../guesswho/model.js";

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

const SVG_NS = "http://www.w3.org/2000/svg";
const SKIN_COLORS = { light: "#f4c59d", medium: "#b87552", dark: "#784631" };
const HAIR_COLORS = { black: "#282126", brown: "#75432f", blonde: "#edbf3e", red: "#c75b2c", gray: "#c4c9d9" };
const EYE_COLORS = { blue: "#428bb7", green: "#629668", brown: "#593b2b" };

function svgElement(documentRef, tag, attributes = {}) {
  const node = documentRef.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function characterPortrait(documentRef, character) {
  const svg = svgElement(documentRef, "svg", { viewBox: "0 0 100 88", class: "core-character-portrait", role: "img", "aria-label": character.name });
  const shape = (tag, attributes) => svg.append(svgElement(documentRef, tag, attributes));
  const hair = HAIR_COLORS[character.hairColor] || HAIR_COLORS.brown;
  const skin = SKIN_COLORS[character.skinTone] || SKIN_COLORS.light;
  shape("rect", { x: 0, y: 0, width: 100, height: 88, rx: 14, fill: "#fff9ed" });
  shape("path", { d: "M12 88 Q16 64 50 64 Q84 64 88 88Z", fill: character.gender === "woman" ? "#6a79a9" : "#4f7485" });
  shape("rect", { x: 43, y: 55, width: 14, height: 16, rx: 5, fill: skin });
  if (character.hair !== "bald") {
    const backHair = character.hair === "long" ? "M20 37 Q18 10 50 9 Q83 12 80 43 L78 73 Q70 77 67 58 L31 58 Q28 78 20 71Z"
      : character.hair === "curly" ? "M21 39 Q13 19 30 15 Q32 2 45 10 Q58 2 63 12 Q82 8 80 28 Q88 43 76 49 L73 58 L27 58 L24 48Z"
        : "M22 39 Q17 10 48 9 Q77 8 79 34 L73 43 Q66 31 57 29 Q42 34 29 30Z";
    shape("path", { d: backHair, fill: hair });
  }
  shape("ellipse", { cx: 50, cy: 44, rx: 24, ry: 29, fill: skin });
  shape("circle", { cx: 25, cy: 45, r: 4, fill: skin });
  shape("circle", { cx: 75, cy: 45, r: 4, fill: skin });
  if (character.hair !== "bald") {
    shape("path", { d: character.hair === "curly" ? "M27 31 Q29 11 49 15 Q70 10 74 31 Q62 22 50 27 Q39 22 27 31Z" : "M27 33 Q30 12 51 15 Q69 13 74 31 Q56 22 44 26 Q36 28 27 33Z", fill: hair });
  }
  for (const cx of [41, 59]) {
    shape("ellipse", { cx, cy: 43, rx: 4.2, ry: 5, fill: "#fff" });
    shape("circle", { cx, cy: 43, r: 2.5, fill: EYE_COLORS[character.eyes] || EYE_COLORS.brown });
    shape("circle", { cx, cy: 43, r: 1.1, fill: "#201d1b" });
  }
  shape("path", { d: "M44 58 Q50 63 56 58", fill: "none", stroke: "#a75448", "stroke-width": 2, "stroke-linecap": "round" });
  if (character.glasses) {
    shape("rect", { x: 32, y: 36, width: 17, height: 14, rx: 5, fill: "none", stroke: "#342b39", "stroke-width": 2.5 });
    shape("rect", { x: 51, y: 36, width: 17, height: 14, rx: 5, fill: "none", stroke: "#342b39", "stroke-width": 2.5 });
    shape("path", { d: "M49 41 L51 41 M31 40 L27 39 M69 40 L73 39", stroke: "#342b39", "stroke-width": 2 });
  }
  if (character.facialHair) shape("path", { d: "M36 55 Q41 51 46 55 Q50 59 54 55 Q60 51 65 55 Q63 69 50 70 Q38 68 36 55Z", fill: hair });
  return svg;
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
    else if (this.gameType === "guesswho") this._renderGuessWho(board, context);
    else if (this.gameType === "dominoes") this._renderDominoes(board, context);
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
      else if (this.gameType === "guesswho") value.textContent = this.t("Candidates: {count}", { count: game.candidates?.[player.id]?.length ?? 0 });
      else if (this.gameType === "dominoes") value.textContent = this.t("Score {score} · {count} tiles", { score: game.scores?.[player.id] ?? 0, count: game.handCounts?.[player.id] ?? game.hands?.[player.id]?.length ?? 0 });
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

  _renderGuessWho(board, context) {
    const game = context.engine;
    const active = game.phase === "playing" && game.currentPlayerId === context.playerId && !context.pending;
    const secret = GUESS_WHO_CHARACTERS.find((character) => character.id === game.privateCharacterId);
    const secretPanel = el(this.document, "section", "core-secret-character");
    if (secret) secretPanel.append(characterPortrait(this.document, secret));
    const secretCopy = el(this.document, "div", "core-secret-copy");
    secretCopy.append(el(this.document, "span", "core-kicker", this.t("Your secret character")));
    secretCopy.append(el(this.document, "strong", "", secret ? this.t(secret.name) : this.t("Private character")));
    secretPanel.append(secretCopy);
    board.append(secretPanel);

    const questions = el(this.document, "section", "core-question-panel");
    questions.append(el(this.document, "h3", "core-subheading", this.t("Ask a yes/no question")));
    const questionGrid = el(this.document, "div", "core-question-grid");
    const candidateCharacters = (game.candidates?.[context.playerId] || []).map((id) => GUESS_WHO_CHARACTERS.find((character) => character.id === id));
    for (const question of GUESS_WHO_QUESTIONS) {
      const alreadyAsked = game.askedQuestions?.[context.playerId]?.includes(question.id);
      const possibleAnswers = new Set(candidateCharacters.map((character) => character?.[question.attribute] === question.value));
      const informative = possibleAnswers.size > 1;
      questionGrid.append(actionButton(this.document, this.t(question.label), "guesswho-question", !active || alreadyAsked || !informative, { question: question.id }));
    }
    questions.append(questionGrid);
    board.append(questions);

    if (game.lastAction?.type === "question") {
      const action = game.lastAction;
      const question = GUESS_WHO_QUESTIONS.find((item) => item.id === action.questionId);
      board.append(el(this.document, "p", "core-question-answer", this.t("{name} asked: {question} Answer: {answer}.", {
        name: this._name(action.playerId, context),
        question: question ? this.t(question.label) : "",
        answer: this.t(action.answer ? "Yes" : "No")
      })));
    } else if (game.lastAction?.type === "guess") {
      const guessed = GUESS_WHO_CHARACTERS.find((character) => character.id === game.lastAction.characterId);
      board.append(el(this.document, "p", "core-question-answer", this.t("{name} guessed {character}: {result}.", {
        name: this._name(game.lastAction.playerId, context),
        character: guessed ? this.t(guessed.name) : "",
        result: this.t(game.lastAction.correct ? "Correct" : "Not quite")
      })));
    }

    const remaining = new Set(game.candidates?.[context.playerId] || []);
    const grid = el(this.document, "div", "core-character-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", this.t("Character candidates"));
    for (const character of GUESS_WHO_CHARACTERS) {
      const candidate = remaining.has(character.id);
      const card = actionButton(this.document, "", "guesswho-guess", !candidate || !active, { character: character.id });
      card.classList.add("core-character-card");
      if (!candidate) card.classList.add("is-eliminated");
      card.setAttribute("aria-label", this.t("Guess {name}", { name: this.t(character.name) }));
      card.append(characterPortrait(this.document, character));
      card.append(el(this.document, "span", "core-character-name", this.t(character.name)));
      grid.append(card);
    }
    board.append(grid);
  }

  _dominoFace(value) {
    const pattern = {
      0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8],
      4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8]
    }[value] || [];
    const face = el(this.document, "span", "core-domino-half");
    face.setAttribute("aria-label", String(value));
    const dots = new Set(pattern);
    for (let index = 0; index < 9; index += 1) {
      const dot = el(this.document, "i", dots.has(index) ? "has-pip" : "");
      dot.setAttribute("aria-hidden", "true");
      face.append(dot);
    }
    return face;
  }

  _dominoTile(tile, { hidden = false, action = "", side = "right", disabled = false } = {}) {
    const item = action
      ? actionButton(this.document, "", action, disabled, { tile: tile?.id, side })
      : el(this.document, "span", "core-domino-tile");
    item.classList.add("core-domino-tile");
    if (hidden) {
      item.classList.add("is-hidden");
      item.setAttribute("aria-label", this.t("Hidden domino"));
      item.append(el(this.document, "span", "core-domino-back-mark", "◆"));
    } else {
      item.setAttribute("aria-label", this.t("Domino {left} and {right}", { left: tile.a, right: tile.b }));
      item.append(this._dominoFace(tile.a), this._dominoFace(tile.b));
    }
    return item;
  }

  _renderDominoes(board, context) {
    const game = context.engine;
    const active = game.phase === "playing" && game.currentPlayerId === context.playerId && !context.pending;
    const table = el(this.document, "div", "core-domino-table");
    table.append(el(this.document, "div", "core-domino-target", this.t("First to {score} points wins", { score: game.targetScore })));

    const opponentId = context.playerId === "p1" ? "p2" : "p1";
    const backs = el(this.document, "div", "core-domino-opponent-hand");
    backs.append(el(this.document, "span", "core-kicker", this.t("{name}'s hand", { name: this._name(opponentId, context) })));
    const opponentCount = game.handCounts?.[opponentId] ?? game.hands?.[opponentId]?.length ?? 0;
    const backRow = el(this.document, "div", "core-domino-back-row");
    for (let index = 0; index < Math.min(opponentCount, 14); index += 1) backRow.append(this._dominoTile(null, { hidden: true }));
    backs.append(backRow);
    table.append(backs);

    const chain = el(this.document, "div", "core-domino-chain");
    chain.setAttribute("role", "group");
    chain.setAttribute("aria-label", this.t("Domino chain; left end {left}, right end {right}", {
      left: game.leftEnd ?? "—", right: game.rightEnd ?? "—"
    }));
    if (!game.chain.length) chain.append(el(this.document, "p", "core-note", this.t("Play any tile to start the chain.")));
    for (const tile of game.chain) chain.append(this._dominoTile(tile));
    table.append(chain);

    const ownHand = Array.isArray(game.hands?.[context.playerId]) ? game.hands[context.playerId] : [];
    const moves = new Map();
    for (const tile of ownHand) {
      const sides = !game.chain.length ? ["right"] : [
        ...([tile.a, tile.b].includes(game.leftEnd) ? ["left"] : []),
        ...([tile.a, tile.b].includes(game.rightEnd) ? ["right"] : [])
      ];
      if (sides.length) moves.set(tile.id, sides);
    }
    const handPanel = el(this.document, "section", "core-domino-own-hand");
    handPanel.append(el(this.document, "h3", "core-subheading", this.t("Your tiles")));
    const preferredSide = this.selectedDominoSide || "right";
    const sidePicker = el(this.document, "div", "core-actions core-domino-side-picker");
    for (const side of ["left", "right"]) {
      const control = actionButton(this.document, this.t(side === "left" ? "Left end" : "Right end"), "domino-side", false, { side });
      if (preferredSide === side) control.classList.add("is-selected");
      sidePicker.append(control);
    }
    handPanel.append(sidePicker);
    const handRow = el(this.document, "div", "core-domino-hand");
    for (const tile of ownHand) {
      const availableSides = moves.get(tile.id) || [];
      const side = availableSides.includes(preferredSide) ? preferredSide : availableSides[0] || preferredSide;
      const tileButton = this._dominoTile(tile, { action: "domino-play", side, disabled: !active || !availableSides.length });
      handRow.append(tileButton);
    }
    if (!ownHand.length) handRow.append(el(this.document, "p", "core-note", this.t("No tiles in hand.")));
    handPanel.append(handRow);
    const noMoves = moves.size === 0;
    const actions = el(this.document, "div", "core-actions");
    actions.append(actionButton(this.document, this.t("Draw tile"), "domino-draw", !active || !noMoves || game.boneyard.length === 0));
    actions.append(actionButton(this.document, this.t("Pass turn"), "domino-pass", !active || !noMoves || game.boneyard.length > 0));
    actions.append(el(this.document, "span", "core-kicker", this.t("Draw pile: {count}", { count: game.boneyard.length })));
    handPanel.append(actions);
    table.append(handPanel);

    if (game.lastRound) {
      const winnerName = game.lastRound.winnerId ? this._name(game.lastRound.winnerId, context) : this.t("Nobody");
      table.append(el(this.document, "p", "core-domino-round-note", this.t("Round {round}: {name} scored {points} points.", {
        round: game.roundNumber - (game.phase === "playing" ? 1 : 0), name: winnerName, points: game.lastRound.points
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
    } else if (action === "guesswho-question") {
      this.handlers.askGuessWho?.(button.dataset.question);
    } else if (action === "guesswho-guess") {
      this.handlers.guessCharacter?.(button.dataset.character);
    } else if (action === "domino-play") {
      this.handlers.playDomino?.(button.dataset.tile, button.dataset.side);
    } else if (action === "domino-draw") {
      this.handlers.drawDomino?.();
    } else if (action === "domino-pass") {
      this.handlers.passDomino?.();
    } else if (action === "domino-side") {
      this.selectedDominoSide = button.dataset.side;
      this.render(this.context);
    }
  }

  _onChange(event) {
    if (event.target.matches('select[data-action="difficulty"]')) {
      this.handlers.changeDifficulty?.(event.target.value);
    }
  }
}

export class GameView {
  constructor(documentRef = document) {
    const $ = (selector) => documentRef.querySelector(selector);
    this.document = documentRef;
    this.elements = {
      page: $(".page"),
      connection: $("#connection"),
      connectionText: $("#connection-text"),
      setup: $("#home"),
      lobby: $("#lobby"),
      roomActions: $("#room-actions"),
      roomWaiting: $("#room-waiting"),
      roomWaitingStatus: $("#room-waiting-status"),
      roomWaitingCode: $("#room-waiting-code"),
      roomWaitingCopy: $("#waiting-copy"),
      modeOne: $("#mode-one"),
      modeTwo: $("#mode-two"),
      gameTile: $("#game-tile"),
      ticTacToeTile: $("#tic-tac-toe-tile"),
      dotsAndBoxesTile: $("#dots-and-boxes-tile"),
      backHome: $("#back-home"),
      roomError: $("#room-error"),
      roomKicker: $("#room-kicker"),
      roomDescription: $(".room-description"),
      roomCreateDescription: $(".room-create-card p"),
      roomCreateButton: $("#create-room"),
      playersCard: $("#players-card"),
      secretCard: $("#secret-card"),
      roomHeading: $(".room-heading"),
      gameGrid: $(".game-grid"),
      gameTitle: $("#game-title"),
      modeBadge: $("#mode-badge"),
      game: $("#game"),
      name: $("#player-name"),
      editName: $("#edit-name"),
      room: $("#room-code-input"),
      create: $("#create-room"),
      join: $("#join-room"),
      banner: $("#game-banner"),
      players: $("#players"),
      secretForm: $("#secret-form"),
      secret: $("#secret-input"),
      secretSubmit: $("#secret-submit"),
      turnTitle: $("#turn-title"),
      turnHint: $("#turn-hint"),
      turnNumber: $("#turn-number"),
      guessForm: $("#guess-form"),
      guess: $("#guess-input"),
      guessSubmit: $("#guess-submit"),
      guessSlots: $("#guess-slots"),
      keypad: $("#keypad"),
      keypadSubmit: $("#keypad-submit"),
      soloSecret: $("#solo-secret"),
      greeting: $("#greeting-name"),
      history: $("#history"),
      code: $("#room-code"),
      leave: $("#home-button"),
      readyStatus: $("#ready-status"),
      ticTacToeGame: $("#tic-tac-toe-game"),
      ticTacToeExit: $("#tic-tac-toe-exit"),
      ticTacToeRoomCode: $("#tic-tac-toe-room-code"),
      ticTacToePlayers: $("#tic-tac-toe-players"),
      ticTacToeStatus: $("#tic-tac-toe-status"),
      ticTacToeBoard: $("#tic-tac-toe-board"),
      dotsAndBoxesGame: $("#dots-and-boxes-game"),
      dotsExit: $("#dots-game-exit"),
      dotsRoomCode: $("#dots-room-code"),
      dotsPlayers: $("#dots-players"),
      dotsStatus: $("#dots-status"),
      dotsScores: $("#dots-scores"),
      dotsBoard: $("#dots-board")
    };
  }

  setConnection(state, text) {
    this.elements.connection.dataset.state = state;
    this.elements.connectionText.textContent = text;
  }

  setBanner(message, kind = "neutral") {
    this.elements.banner.textContent = message;
    this.elements.banner.dataset.kind = kind;
    this.elements.banner.hidden = !message;
  }

  setMode(mode) {
    this.elements.modeOne.setAttribute("aria-pressed", String(mode === "1P"));
    this.elements.modeTwo.setAttribute("aria-pressed", String(mode === "2P"));
  }

  setGameType(gameType) {
    const isTicTacToe = gameType === "tictactoe";
    const isDotsAndBoxes = gameType === "dotsandboxes";
    const title = isTicTacToe ? "TIC TAC TOE" : isDotsAndBoxes ? "DOTS AND BOXES" : "1A2B";
    this.elements.roomKicker.textContent = `${title} / TWO PLAYERS`;
    this.elements.roomDescription.textContent = isTicTacToe
      ? "Create a room or join a friend for a moving 3×3 game."
      : isDotsAndBoxes
        ? "Create a room or join a friend to play Dots and Boxes."
        : "Create a private room or join a friend’s game.";
    this.elements.roomCreateDescription.textContent = isTicTacToe
      ? "Invite a friend and take turns placing O and X. When the board fills, the oldest mark is removed."
      : isDotsAndBoxes
        ? "Take turns drawing lines. Complete a box to score and keep your turn."
        : "Set your own secret code for your friend to guess. Once they join, you’ll each guess the other’s code in turn.";
    this.elements.roomCreateButton.textContent = isTicTacToe || isDotsAndBoxes
      ? "Create game room →"
      : "Create room →";
  }

  renderTicTacToe(state, getPlayers, pendingMove = false) {
    const game = state.gameState;
    const players = game?.players || [];
    const activePlayers = getPlayers();
    const markFor = (playerId) => players.find((player) => player.id === playerId)?.mark;
    const playerName = (playerId) => state.players[playerId]?.name || "Player";
    this.elements.ticTacToeRoomCode.textContent = state.room;
    this.elements.ticTacToePlayers.textContent = players.length
      ? players.map((player) => `${playerName(player.id)} · ${player.mark}`).join("   ")
      : activePlayers.map((player) => player.name).join("   ");

    if (!game) {
      this.elements.ticTacToeStatus.textContent = "Waiting for a player to join your room.";
    } else if (game.phase === "won") {
      this.elements.ticTacToeStatus.textContent = `${playerName(game.winnerId)} (${markFor(game.winnerId)}) wins!`;
    } else if (activePlayers.length !== 2 && game.phase === "playing") {
      this.elements.ticTacToeStatus.textContent = "Waiting for a player to reconnect.";
    } else {
      const activeName = playerName(game.activePlayerId);
      const activeMark = markFor(game.activePlayerId);
      const turnMessage = game.activePlayerId === state.playerId
        ? `Your turn — you are ${activeMark}.`
        : `${activeName} (${activeMark}) is choosing.`;
      this.elements.ticTacToeStatus.textContent = game.lastRemoved
        ? `Oldest ${game.lastRemoved.mark} removed. ${turnMessage}`
        : turnMessage;
    }

    this.elements.ticTacToeBoard.replaceChildren(...Array.from({ length: 9 }, (_, index) => {
      const move = game?.board[index];
      const cell = this.document.createElement("button");
      cell.type = "button";
      cell.className = "tic-tac-toe-cell";
      cell.dataset.cell = String(index);
      cell.dataset.mark = move?.mark || "";
      cell.textContent = move?.mark || "";
      cell.classList.toggle("is-oldest", game?.lastRemoved?.cell === index);
      cell.setAttribute("aria-label", `Square ${index + 1}${move ? `, ${move.mark}` : ", empty"}`);
      cell.disabled = !game || game.phase !== "playing" || game.activePlayerId !== state.playerId ||
        activePlayers.length !== 2 || pendingMove || Boolean(move);
      return cell;
    }));
  }

  renderDotsAndBoxes(state, getPlayers, pendingMove = false, localMode = false) {
    const game = state.gameState;
    const players = game?.players || [];
    const activePlayers = getPlayers();
    const playerName = (playerId) => state.players[playerId]?.name || "Player";
    const markFor = (playerId) => players.find((player) => player.id === playerId)?.mark || "";
    this.elements.dotsRoomCode.textContent = state.room || "LOCAL";
    this.elements.dotsPlayers.textContent = players
      .map((player) => `${playerName(player.id)} · ${player.mark}`)
      .join("   ");

    if (!game) {
      this.elements.dotsStatus.textContent = "Waiting for a player to join your room.";
    } else if (game.phase === "won") {
      if (game.winnerId) {
        const loser = players.find((player) => player.id !== game.winnerId);
        this.elements.dotsStatus.textContent =
          `${playerName(game.winnerId)} wins ${game.scores[game.winnerId]}–${game.scores[loser?.id]}!`;
      } else {
        this.elements.dotsStatus.textContent = `It's a tie! ${game.scores[players[0]?.id]}–${game.scores[players[1]?.id]}.`;
      }
    } else if (activePlayers.length !== 2 && !localMode) {
      this.elements.dotsStatus.textContent = "Waiting for a player to reconnect.";
    } else if (pendingMove && localMode) {
      this.elements.dotsStatus.textContent = "Computer is thinking…";
    } else {
      this.elements.dotsStatus.textContent = game.activePlayerId === state.playerId
        ? "Your turn — draw a line."
        : `${playerName(game.activePlayerId)}'s turn.`;
    }

    this.elements.dotsScores.replaceChildren(...players.map((player) => {
      const score = this.document.createElement("div");
      score.className = "dots-score";
      score.dataset.mark = player.mark;
      score.classList.toggle("is-active", game?.phase === "playing" && game.activePlayerId === player.id);
      const name = this.document.createElement("span");
      name.textContent = playerName(player.id);
      const value = this.document.createElement("strong");
      value.textContent = String(game?.scores[player.id] || 0);
      score.append(name, value);
      return score;
    }));

    const rows = game?.rows || 6;
    const columns = game?.columns || 4;
    const horizontalEdgeCount = (rows + 1) * columns;
    const cells = [];
    for (let row = 0; row < rows * 2 + 1; row++) {
      for (let column = 0; column < columns * 2 + 1; column++) {
        if (row % 2 === 0 && column % 2 === 0) {
          const dot = this.document.createElement("span");
          dot.className = "dots-node";
          cells.push(dot);
        } else if (row % 2 === 0) {
          const edge = (row / 2) * columns + Math.floor(column / 2);
          cells.push(this.createDotsEdge(edge, "horizontal", game, state, activePlayers, pendingMove, localMode));
        } else if (column % 2 === 0) {
          const edge = horizontalEdgeCount + Math.floor(row / 2) * (columns + 1) + column / 2;
          cells.push(this.createDotsEdge(edge, "vertical", game, state, activePlayers, pendingMove, localMode));
        } else {
          const box = Math.floor(row / 2) * columns + Math.floor(column / 2);
          const square = this.document.createElement("span");
          square.className = "dots-box";
          const owner = game?.boxes[box];
          square.dataset.mark = markFor(owner);
          square.textContent = owner ? markFor(owner) : "";
          cells.push(square);
        }
      }
    }
    this.elements.dotsBoard.replaceChildren(...cells);
  }

  createDotsEdge(edge, orientation, game, state, players, pendingMove, localMode) {
    const move = game?.edges[edge];
    const button = this.document.createElement("button");
    button.type = "button";
    button.className = `dots-edge is-${orientation}`;
    button.dataset.edge = String(edge);
    button.dataset.mark = move?.mark || "";
    button.setAttribute("aria-label", `Draw ${orientation} line ${edge + 1}${move ? `, claimed by ${move.mark}` : ""}`);
    button.disabled = !game || game.phase !== "playing" || game.activePlayerId !== state.playerId ||
      players.length !== 2 && !localMode || pendingMove || Boolean(move);
    return button;
  }

  renderPlayers(state, getPlayers) {
    const activePlayers = getPlayers();
    const displayPlayers = [...activePlayers];
    if (!displayPlayers.some((player) => player.id === state.playerId) && state.joined) {
      displayPlayers.unshift(state.players[state.playerId] || {
        id: state.playerId,
        name: state.playerName,
        online: true,
        ready: false
      });
    }

    this.elements.players.replaceChildren(...[displayPlayers[0], displayPlayers[1]].map((player, index) => {
      const card = this.document.createElement("div");
      card.className = "player-card";
      if (state.gameState?.phase === "playing" && player?.id === state.gameState.activePlayerId) {
        card.classList.add("is-turn");
      }
      if (!player) {
        card.innerHTML = `<span class="player-avatar">··</span><span class="waiting-slot">Waiting for player ${index + 1}…</span>`;
        return card;
      }
      const avatar = this.document.createElement("span");
      avatar.className = "player-avatar";
      avatar.textContent = player.name.slice(0, 2).toUpperCase();
      const details = this.document.createElement("span");
      details.className = "player-details";
      const name = this.document.createElement("span");
      name.className = "player-name";
      name.textContent = player.id === state.playerId ? `${player.name} (you)` : player.name;
      const status = this.document.createElement("span");
      status.className = "player-status";
      status.textContent = player.online === false ? "Disconnected" : player.ready ? "Secret set · Ready" : "Choosing a secret";
      details.append(name, status);
      const playerState = this.document.createElement("span");
      playerState.className = "player-state";
      playerState.textContent = player.ready ? "READY" : player.online === false ? "OFFLINE" : "ONLINE";
      card.append(avatar, details, playerState);
      return card;
    }));
  }

  render(state, getPlayers, onCurrentResult) {
    this.renderPlayers(state, getPlayers);
    if (state.soloMode) {
      this.renderSoloGame(state);
      return;
    }

    const activePlayers = getPlayers();
    const me = state.players[state.playerId];
    const opponent = activePlayers.find((player) => player.id !== state.playerId);
    if (!state.gameState) {
      this.elements.readyStatus.textContent = me?.ready ? "You are ready" : "Not ready yet";
      this.elements.secretSubmit.textContent = me?.ready ? "Update secret" : "Lock in secret";
      this.elements.secretSubmit.disabled = false;
      this.elements.secret.disabled = false;
      this.elements.secret.value = state.mySecret;
      this.elements.guessForm.hidden = true;
      this.elements.turnTitle.textContent = "Waiting for both players";
      this.elements.turnHint.textContent = opponent
        ? `${opponent.name} needs to set a secret too.`
        : "Share the room code to invite your opponent.";
      this.elements.turnNumber.textContent = "—";
    } else if (state.gameState.phase === "won") {
      this.elements.secretSubmit.disabled = true;
      this.elements.secret.disabled = true;
      this.elements.readyStatus.textContent = "ROUND COMPLETE";
      const winner = state.players[state.gameState.winnerId]?.name || "A player";
      this.elements.turnTitle.textContent = state.gameState.winnerId === state.playerId
        ? "You cracked the code!"
        : `${winner} cracked your code`;
      this.elements.turnHint.textContent = "A perfect 4A ends the game.";
      this.elements.turnNumber.textContent = String(Math.max(1, state.gameState.turn));
      this.elements.guessForm.hidden = true;
      this.setBanner(state.gameState.winnerId === state.playerId
        ? "You win — all four digits, in the right order!"
        : `${winner} wins this round.`, "neutral");
    } else {
      this.elements.secretSubmit.disabled = true;
      this.elements.secret.disabled = true;
      this.elements.readyStatus.textContent = "GAME IN PROGRESS";
      const isMyTurn = state.gameState.activePlayerId === state.playerId;
      const whoseTurn = state.players[state.gameState.activePlayerId]?.name || "Opponent";
      this.elements.turnTitle.textContent = isMyTurn ? "Your turn to guess" : `${whoseTurn} is guessing`;
      this.elements.turnHint.textContent = isMyTurn
        ? `Try to crack ${opponent?.name || "your opponent"}’s secret.`
        : "Your opponent is trying to crack your secret.";
      this.elements.turnNumber.textContent = String(state.gameState.turn);
      this.elements.guessForm.hidden = !isMyTurn;
      this.elements.guessSubmit.disabled = !isMyTurn || Boolean(state.guesses[state.gameState.turn]) || !state.mySecret;
      if (isMyTurn && !state.mySecret) this.setBanner("Re-enter your secret number below before taking your turn.", "error");
      else if (!state.guesses[state.gameState.turn] && isMyTurn) this.setBanner("Your turn. Enter four different digits to make a guess.");
      else if (!isMyTurn) this.setBanner("Waiting for your opponent’s guess.");
    }
    this.updateGuessSlots(state);
    this.renderHistory(state);
    onCurrentResult();
  }

  renderSoloGame(state) {
    this.elements.turnNumber.textContent = String(state.gameState.turn);
    this.elements.guessForm.hidden = state.gameState.phase === "won";
    this.elements.guessSubmit.disabled = state.gameState.phase === "won";
    this.elements.soloSecret.hidden = false;
    this.updateGuessSlots(state);
    if (state.gameState.phase === "won") {
      this.elements.turnTitle.textContent = "You got it!";
      this.elements.turnHint.textContent = "";
      this.setBanner(`The code was ${state.soloSecret}.`);
    } else {
      this.elements.turnTitle.textContent = "Guess the code";
      this.elements.turnHint.textContent = "";
      this.setBanner("Find the secret. Every clue counts.");
    }
    this.renderHistory(state);
  }

  renderHistory(state) {
    const turns = Object.keys(state.guesses).map(Number).sort((a, b) => a - b);
    if (!turns.length) {
      const empty = this.document.createElement("div");
      empty.className = "empty-history";
      empty.textContent = "Guesses will appear here once the game begins.";
      this.elements.history.replaceChildren(empty);
      return;
    }
    this.elements.history.replaceChildren(...turns.map((turn) => {
      const guess = state.guesses[turn];
      const item = this.document.createElement("div");
      item.className = "history-item";
      const index = this.document.createElement("span");
      index.className = "history-index";
      index.textContent = String(turn).padStart(2, "0");
      const detail = this.document.createElement("span");
      const player = this.document.createElement("span");
      player.className = "history-player";
      const name = this.document.createElement("strong");
      name.textContent = state.soloMode
        ? state.playerName
        : (state.players[guess.by]?.name || (guess.by === state.playerId ? state.playerName : "Opponent"));
      player.append(name, this.document.createTextNode(guess.by === state.playerId ? " · guessed" : " guessed"));
      const digits = this.document.createElement("span");
      digits.className = "history-guess";
      digits.textContent = guess.guess;
      detail.append(player, digits);
      const outcome = this.document.createElement("span");
      outcome.className = "history-result";
      if (state.results[turn]) {
        const bulls = this.document.createElement("span");
        bulls.textContent = `${state.results[turn].a}A`;
        const cows = this.document.createElement("span");
        cows.textContent = `${state.results[turn].b}B`;
        outcome.append(bulls, cows);
      } else {
        outcome.textContent = "…";
      }
      item.append(index, detail, outcome);
      return item;
    }).reverse());
  }

  updateGuessSlots(state) {
    const value = this.elements.guess.value;
    [...this.elements.guessSlots.children].forEach((slot, index) => {
      slot.textContent = value[index] || (index === value.length ? "−" : "");
      slot.classList.toggle("is-empty", index === value.length);
    });
    this.elements.keypad.querySelectorAll("[data-digit]").forEach((button) => {
      const used = value.includes(button.dataset.digit);
      button.disabled = used;
      button.classList.toggle("is-used", used);
      button.setAttribute("aria-pressed", String(used));
    });
    this.elements.keypadSubmit.disabled = value.length !== 4 || new Set(value).size !== value.length ||
      (state.soloMode && state.gameState?.phase === "won") ||
      (!state.soloMode && (!state.gameState || state.gameState.phase !== "playing" ||
        state.gameState.activePlayerId !== state.playerId || Boolean(state.guesses[state.gameState.turn]) || !state.mySecret));
    this.elements.keypadSubmit.textContent = value.length === 4 ? "Submit guess" : "Add one more digit to submit";
    const count = this.document.querySelector("#guess-count");
    if (count) count.textContent = `GUESS ${String(Object.keys(state.guesses).length + 1).padStart(2, "0")}`;
  }
}

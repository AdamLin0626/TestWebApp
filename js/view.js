export class GameView {
  constructor(documentRef = document, translate = (source) => source) {
    const $ = (selector) => documentRef.querySelector(selector);
    this.document = documentRef;
    this.translate = translate;
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
      yahtzeeTile: $("#yahtzee-tile"),
      sudokuTile: $("#sudoku-tile"),
      killerSudokuTile: $("#killer-sudoku-tile"),
      chessTile: $("#chess-tile"),
      battleshipTile: $("#battleship-tile"),
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
      dotsBoard: $("#dots-board"),
      yahtzeeGame: $("#yahtzee-game"),
      sudokuGame: $("#sudoku-game"),
      killerSudokuGame: $("#killer-sudoku-game"),
      chessGame: $("#chess-game"),
      battleshipGame: $("#battleship-game"),
      standaloneError: $("#standalone-error"),
      yahtzeeExit: $("#yahtzee-exit"),
      yahtzeeRestart: $("#yahtzee-restart"),
      yahtzeeDice: $("#yahtzee-dice"),
      yahtzeeRoll: $("#yahtzee-roll"),
      yahtzeeRollLabel: $("#yahtzee-roll-label"),
      yahtzeeHint: $("#yahtzee-hint"),
      yahtzeeHeldCount: $("#yahtzee-held-count"),
      yahtzeeTotal: $("#yahtzee-total"),
      yahtzeeRound: $("#yahtzee-round"),
      yahtzeeScoreList: $("#yahtzee-score-list"),
      yahtzeeScorecardFooter: $("#yahtzee-scorecard-footer"),
      yahtzeeMatchScores: $("#yahtzee-match-scores"),
      yahtzeeModeBadge: $("#yahtzee-mode-badge"),
      yahtzeeRestart: $("#yahtzee-restart"),
      ticTacToeRestart: $("#tic-tac-toe-restart"),
      dotsRestart: $("#dots-game-restart"),
      restart: $("#game-restart")
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
    const titles = {
      "1a2b": "1A2B",
      tictactoe: "TIC TAC TOE",
      dotsandboxes: "DOTS AND BOXES",
      yahtzee: "YAHTZEE",
      sudoku: "SUDOKU",
      killersudoku: "KILLER SUDOKU",
      chess: "CHESS",
      battleship: "BATTLESHIP"
    };
    const title = titles[gameType] || "1A2B";
    this.elements.roomKicker.textContent = `${title} / TWO PLAYERS`;
    this.elements.roomDescription.textContent = isTicTacToe
      ? "Create a room or join a friend for a moving 3×3 game."
      : isDotsAndBoxes
        ? "Create a room or join a friend to play 點格棋."
        : gameType === "yahtzee"
          ? "Take turns rolling and scoring with a friend."
          : ["sudoku", "killersudoku"].includes(gameType)
            ? "Race your friend to complete the Sudoku grid."
            : gameType === "chess"
              ? "Play a full game of chess with a friend."
              : gameType === "battleship"
                ? "Place your fleet and take turns finding each other’s ships."
                : "Create a private room or join a friend’s game.";
    this.elements.roomCreateDescription.textContent = isTicTacToe
      ? "Invite a friend and take turns placing O and X. When the board fills, the oldest mark is removed."
      : isDotsAndBoxes
        ? "Take turns drawing lines. Complete a box to score and keep your turn."
        : gameType === "yahtzee"
          ? "Take turns rolling five dice and filling your own scorecard. The higher final score wins."
          : ["sudoku", "killersudoku"].includes(gameType)
            ? "Race to complete the same grid. The first player to solve it wins."
            : gameType === "chess"
              ? "Take turns making legal moves. Checkmate wins."
              : gameType === "battleship"
                ? "Place a standard fleet on a 10 × 10 board, then take turns firing."
                : "Set your own secret code for your friend to guess. Once they join, you’ll each guess the other’s code in turn.";
    this.elements.roomCreateButton.textContent = ["tictactoe", "dotsandboxes", "yahtzee", "sudoku",
      "killersudoku", "chess", "battleship"].includes(gameType)
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
    } else if (pendingMove && localMode && game.activePlayerId !== state.playerId) {
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

  renderYahtzee(state, model, pendingMove = false) {
    const game = state.gameState;
    if (!game) {
      this.elements.yahtzeeModeBadge.textContent = "2P · Friends";
      this.elements.yahtzeeHint.textContent = "Waiting for your friend to join.";
      this.elements.yahtzeeRoll.disabled = true;
      this.elements.yahtzeeRestart.disabled = true;
      this.elements.yahtzeeDice.replaceChildren();
      this.elements.yahtzeeScoreList.replaceChildren();
      this.elements.yahtzeeMatchScores.replaceChildren();
      this.elements.yahtzeeMatchScores.hidden = true;
      return;
    }
    const categories = model.getYahtzeeCategories();
    const multiPlayer = game.mode === "2P";
    const displayedPlayerId = multiPlayer
      ? game.activePlayerId || state.playerId
      : null;
    const card = multiPlayer ? game.scorecards[displayedPlayerId] : game;
    const isMyTurn = !multiPlayer || game.activePlayerId === state.playerId;
    const hasRolled = game.dice.some(Boolean);
    const heldCount = game.held.filter(Boolean).length;
    this.elements.yahtzeeTotal.textContent = String(card?.totalScore || 0);
    this.elements.yahtzeeRound.textContent = this.translate("{round} of 13", {
      round: String(Math.min(game.round, 13)).padStart(2, "0")
    });
    this.elements.yahtzeeModeBadge.textContent = multiPlayer ? "2P · Friends" : "1P · Solo";
    this.elements.yahtzeeMatchScores.hidden = !multiPlayer;
    if (multiPlayer) {
      this.elements.yahtzeeMatchScores.replaceChildren(...game.players.map((player) => {
        const score = this.document.createElement("span");
        score.className = "yahtzee-player-score";
        score.classList.toggle("is-turn", player.id === game.activePlayerId && game.phase === "playing");
        const name = this.document.createElement("strong");
        name.textContent = player.id === state.playerId ? `${player.name} (you)` : player.name;
        const total = this.document.createElement("b");
        total.textContent = String(game.scorecards[player.id].totalScore);
        score.append(name, total);
        return score;
      }));
    } else {
      this.elements.yahtzeeMatchScores.replaceChildren();
    }
    this.elements.yahtzeeRollLabel.textContent = hasRolled
      ? this.translate("ROLL {roll} OF 3", { roll: 3 - game.rollsRemaining })
      : this.translate("READY TO ROLL");
    this.elements.yahtzeeRoll.textContent = game.phase === "won"
      ? multiPlayer
        ? game.winnerId
          ? this.translate("{name} wins", { name: game.players.find(({ id }) => id === game.winnerId)?.name })
          : this.translate("It’s a tie")
        : this.translate("Game complete")
      : multiPlayer && !isMyTurn
        ? this.translate("Waiting for your turn")
        : game.rollsRemaining === 3
          ? this.translate("Roll dice · 3 left")
          : this.translate("Roll again · {count} left", { count: game.rollsRemaining });
    this.elements.yahtzeeRoll.disabled = game.phase !== "playing" || game.rollsRemaining === 0 ||
      !isMyTurn || pendingMove;
    this.elements.yahtzeeHeldCount.textContent = `${heldCount} held`;
    this.elements.yahtzeeHint.textContent = game.phase === "won"
      ? multiPlayer
        ? game.winnerId
          ? this.translate("{name} wins with {score} points.", {
            name: game.players.find(({ id }) => id === game.winnerId)?.name,
            score: game.scorecards[game.winnerId].totalScore
          })
          : this.translate("Both players finished with {score} points.", {
            score: game.scorecards[game.players[0].id].totalScore
          })
        : `Game complete — you scored ${game.totalScore} points.`
      : multiPlayer && !isMyTurn
        ? this.translate("{name} is playing.", {
          name: game.players.find(({ id }) => id === game.activePlayerId)?.name || this.translate("Your opponent")
        })
      : !hasRolled
        ? "Tap Roll to start your turn."
        : game.rollsRemaining > 0
          ? "Tap dice to hold them, then roll again."
          : "Choose a category to score this turn.";

    const pipSlots = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9]
    };
    this.elements.yahtzeeDice.replaceChildren(...game.dice.map((die, index) => {
      const button = this.document.createElement("button");
      button.type = "button";
      button.className = "yahtzee-die";
      button.dataset.die = String(index);
      button.classList.toggle("is-empty", !die);
      button.classList.toggle("is-held", game.held[index]);
      button.setAttribute("aria-label", die
        ? `Die ${index + 1}: ${die}${game.held[index] ? ", held" : ""}`
        : `Die ${index + 1}: not rolled`);
      button.setAttribute("aria-pressed", String(game.held[index]));
      button.disabled = !die || game.rollsRemaining === 0 || game.phase !== "playing" ||
        !isMyTurn || pendingMove;
      for (let slot = 1; slot <= 9; slot++) {
        const pip = this.document.createElement("span");
        pip.className = "die-pip";
        if (pipSlots[die]?.includes(slot)) pip.classList.add("is-visible");
        button.append(pip);
      }
      return button;
    }));

    this.elements.yahtzeeScoreList.replaceChildren(...categories.map((category) => {
      const score = card?.categories[category.id];
      const button = this.document.createElement("button");
      button.type = "button";
      button.className = "yahtzee-score-row";
      button.dataset.category = category.id;
      button.classList.toggle("is-scored", score !== null);
      const preview = score === null ? model.getYahtzeeTurnScore(game, category.id) : score;
      button.disabled = game.phase !== "playing" || !isMyTurn || pendingMove ||
        preview === null || score !== null;
      const label = this.document.createElement("span");
      label.textContent = this.translate(category.label);
      const value = this.document.createElement("strong");
      value.textContent = score !== null
        ? String(score)
        : hasRolled && preview !== null ? String(preview) : "—";
      button.append(label, value);
      return button;
    }));
    const categoriesLeft = 13 - Object.values(card?.categories || {}).filter((value) => value !== null).length;
    this.elements.yahtzeeScorecardFooter.textContent = this.translate(
      "Upper {score} / 63{bonus}{yahtzee} · {count} categories left",
      {
        score: card?.upperScore || 0,
        bonus: card?.upperBonus ? this.translate("· +35 bonus") : "",
        yahtzee: card?.yahtzeeBonus
          ? this.translate("· Yahtzee +{score}", { score: card.yahtzeeBonus })
          : "",
        count: categoriesLeft
      }
    );
    this.elements.yahtzeeRestart.disabled = pendingMove;
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
    const turns = Object.keys(state.guesses).map(Number)
      .filter((turn) => state.guesses[turn].by === state.playerId)
      .sort((a, b) => a - b);
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

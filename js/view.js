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
      pairedStatus: $("#paired-status"),
      pairedTitle: $("#paired-title"),
      pairedDetail: $("#paired-detail"),
      matchOverlay: $("#match-overlay"),
      matchTitle: $("#match-title"),
      matchStatus: $("#match-status"),
      matchDecisionActions: $("#match-decision-actions"),
      matchAccept: $("#match-accept"),
      matchDecline: $("#match-decline"),
      matchGestureActions: $("#match-gesture-actions"),
      resultOverlay: $("#result-overlay"),
      resultTitle: $("#result-title"),
      resultDetail: $("#result-detail"),
      resultActions: $("#result-actions"),
      resultHome: $("#result-home"),
      resultReplay: $("#result-replay"),
      modeOne: $("#mode-one"),
      modeTwo: $("#mode-two"),
      gameTile: $("#game-tile"),
      ticTacToeTile: $("#tic-tac-toe-tile"),
      dotsAndBoxesTile: $("#dots-and-boxes-tile"),
      yahtzeeTile: $("#yahtzee-tile"),
      chessTile: $("#chess-tile"),
      battleshipTile: $("#battleship-tile"),
      airHockeyTile: $("#air-hockey-tile"),
      connectFourTile: $("#connect-four-tile"),
      reversiTile: $("#reversi-tile"),
      memoryTile: $("#memory-tile"),
      sudokuTile: $("#sudoku-tile"),
      mancalaTile: $("#mancala-tile"),
      slapjackTile: $("#slapjack-tile"),
      blackjackTile: $("#blackjack-tile"),
      liarsDiceTile: $("#liars-dice-tile"),
      ninetynineTile: $("#ninetynine-tile"),
      backHome: $("#back-home"),
      roomError: $("#room-error"),
      roomKicker: $("#room-kicker"),
      roomDescription: $(".room-description"),
      roomCreateDescription: $(".room-create-card p"),
      roomCreateButton: $("#create-room"),
      playersCard: $("#players-card"),
      secretCard: $("#secret-card"),
      gameGrid: $(".game-grid"),
      gameHeader: $("#game-header"),
      gameSubtitle: $("#game-subtitle"),
      gameMainFrame: $("#game-main-frame"),
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
      leave: $("#home-button"),
      readyStatus: $("#ready-status"),
      ticTacToeGame: $("#tic-tac-toe-game"),
      ticTacToeStatus: $("#tic-tac-toe-status"),
      ticTacToeBoard: $("#tic-tac-toe-board"),
      dotsAndBoxesGame: $("#dots-and-boxes-game"),
      dotsStatus: $("#dots-status"),
      dotsScores: $("#dots-scores"),
      dotsBoard: $("#dots-board"),
      yahtzeeGame: $("#yahtzee-game"),
      chessGame: $("#chess-game"),
      battleshipGame: $("#battleship-game"),
      airHockeyGame: $("#airhockey-game"),
      connectFourGame: $("#connectfour-game"),
      reversiGame: $("#reversi-game"),
      memoryGame: $("#memory-game"),
      sudokuGame: $("#sudoku-game"),
      mancalaGame: $("#mancala-game"),
      slapjackGame: $("#slapjack-game"),
      blackjackGame: $("#blackjack-game"),
      liarsDiceGame: $("#liarsdice-game"),
      ninetynineGame: $("#ninetynine-game"),
      standaloneError: $("#standalone-error"),
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
      restart: $("#game-restart"),
      chatRoot: $("#room-chat"),
      chatLauncher: $("#chat-launcher"),
      chatUnread: $("#chat-unread"),
      chatNotice: $("#chat-notice"),
      chatNoticeName: $("#chat-notice-name"),
      chatNoticeText: $("#chat-notice-text"),
      chatPanel: $("#chat-panel"),
      chatClose: $("#chat-close"),
      chatConnection: $("#chat-connection"),
      chatMessages: $("#chat-messages"),
      chatEmpty: $("#chat-empty"),
      chatForm: $("#chat-form"),
      chatInput: $("#chat-input"),
      chatSend: $("#chat-send"),
      chatCount: $("#chat-count"),
      chatError: $("#chat-error")
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

  setGameHeader(gameType, mode) {
    const titles = {
      "1a2b": "1A2B",
      tictactoe: "Tic Tac Toe",
      dotsandboxes: "點格棋",
      yahtzee: "快艇骰子",
      chess: "Chess",
      battleship: "Battleship",
      airhockey: "Air Hockey",
      connectfour: "Connect Four",
      reversi: "Reversi",
      memory: "Memory Match",
      sudoku: "Sudoku",
      mancala: "Mancala",
      slapjack: "Slapjack",
      blackjack: "Blackjack",
      liarsdice: "Liar's Dice",
      ninetynine: "99"
    };
    const subtitles = {
      "1a2b": "Guess the secret 4-digit code.",
      tictactoe: "Make three in a row.",
      dotsandboxes: "Complete boxes by drawing their four sides.",
      yahtzee: "Roll, hold, and make every count.",
      chess: "Take turns making legal moves. Checkmate wins.",
      battleship: "Place your fleet and hunt your rival.",
      airhockey: "Keep the puck moving. First to seven goals wins.",
      connectfour: "Drop discs to connect four.",
      reversi: "Flip more discs than your opponent.",
      memory: "Find pairs and score points.",
      sudoku: "Solve the grid without repeating a digit.",
      mancala: "Sow seeds and capture stones in Kalah.",
      slapjack: "Play cards in turn and slap every Jack.",
      blackjack: "Play your hand against the dealer.",
      liarsdice: "Bid on hidden dice or challenge a bid.",
      ninetynine: "Use special cards and keep the total at 99 or less."
    };
    const gameLabels = {
      "1a2b": "1A2B game",
      tictactoe: "Tic Tac Toe game",
      dotsandboxes: "Dots and Boxes game",
      yahtzee: "Yahtzee game",
      chess: "Chess game",
      battleship: "Battleship game",
      airhockey: "Air hockey game",
      connectfour: "Connect Four game",
      reversi: "Reversi game",
      memory: "Memory match game",
      sudoku: "Sudoku game",
      mancala: "Mancala game",
      slapjack: "Slapjack game",
      blackjack: "Blackjack game",
      liarsdice: "Liar's Dice game",
      ninetynine: "99 game"
    };
    this.elements.gameTitle.textContent = this.translate(titles[gameType] || titles["1a2b"]);
    this.elements.gameSubtitle.textContent = this.translate(subtitles[gameType] || subtitles["1a2b"]);
    this.elements.modeBadge.textContent = mode;
    this.elements.game.setAttribute("aria-label", this.translate(gameLabels[gameType] || gameLabels["1a2b"]));
  }

  setGameType(gameType, mode = "2P") {
    const rooms = {
      "1a2b": ["1A2B", "Create a private room or join a friend’s game.", "Set your own secret code for your friend to guess. Once they join, you’ll each guess the other’s code in turn.", "Create room →"],
      tictactoe: ["TIC TAC TOE", "Create a room or join a friend for a moving 3×3 game.", "Invite a friend and take turns placing O and X. When the board fills, the oldest mark is removed.", "Create game room →"],
      dotsandboxes: ["DOTS AND BOXES", "Create a room or join a friend to play 點格棋.", "Take turns drawing lines. Complete a box to score and keep your turn.", "Create game room →"],
      yahtzee: ["YAHTZEE", "Take turns rolling and scoring with a friend.", "Take turns rolling five dice and filling your own scorecard. The higher final score wins.", "Create game room →"],
      chess: ["CHESS", "Play a full game of chess with a friend.", "Take turns making legal moves. Checkmate wins.", "Create game room →"],
      battleship: ["BATTLESHIP", "Place your fleet and take turns finding each other’s ships.", "Place a standard fleet on a 10 × 10 board, then take turns firing.", "Create game room →"],
      airhockey: ["AIR HOCKEY", "Play a real-time air hockey match with a friend.", "Each player controls one paddle. First to seven goals wins.", "Create game room →"],
      connectfour: ["CONNECT FOUR", "Take turns dropping discs with a friend.", "Drop a disc into a column. Connect four in any direction to win.", "Create game room →"],
      reversi: ["REVERSI", "Outflank a friend and claim the board.", "Place a disc to flip your opponent’s line. The most discs wins.", "Create game room →"],
      memory: ["MEMORY MATCH", "Find pairs and outscore a friend.", "Take turns revealing two cards. A match scores a point and keeps your turn.", "Create game room →"],
      sudoku: ["SUDOKU", "Share a Sudoku board and take turns filling cells.", "Fill every row, column and 3 × 3 box without repeating a digit.", "Create game room →"],
      mancala: ["MANCALA", "Play Kalah with a friend.", "Choose a pit to sow. Capture stones and score more than your opponent.", "Create game room →"],
      slapjack: ["SLAPJACK", "Race a friend to slap each Jack.", "Take turns playing a card. Slap the pile when a Jack appears.", "Create game room →"],
      blackjack: ["BLACKJACK", "Play at one shared table against the dealer.", "Take turns hitting, standing, splitting or doubling down.", "Create game room →"],
      liarsdice: ["LIAR’S DICE", "Bluff and call bids with a friend.", "Your dice stay hidden. Raise the bid or challenge your opponent.", "Create game room →"],
      ninetynine: ["99", "Keep the running total at 99 or below.", "Play special cards, change direction and avoid losing all your lives.", "Create game room →"]
    };
    const [title, roomDescription, createDescription, createButton] = rooms[gameType] || rooms["1a2b"];
    const coreTitles = { sudoku: "Sudoku", mancala: "Mancala", slapjack: "Slapjack", blackjack: "Blackjack", liarsdice: "Liar’s Dice", ninetynine: "99" };
    const roomTitle = coreTitles[gameType] ? this.translate(coreTitles[gameType]) : title;
    const roomPlayers = coreTitles[gameType] ? this.translate("Two players") : "TWO PLAYERS";
    this.setGameHeader(gameType, mode);
    this.elements.roomKicker.textContent = `${roomTitle} / ${roomPlayers}`;
    this.elements.roomDescription.textContent = this.translate(roomDescription);
    this.elements.roomCreateDescription.textContent = this.translate(createDescription);
    this.elements.roomCreateButton.textContent = this.translate(createButton);
  }

  setPairingRoom() {
    this.elements.roomKicker.textContent = this.translate("2P / PAIR FIRST");
    this.elements.roomDescription.textContent = this.translate("Pair with a friend first, then choose a game together.");
    this.elements.roomCreateDescription.textContent = this.translate("Create a room or enter the six-digit room code shared by your friend. Choose a game after both players connect.");
    this.elements.roomCreateButton.textContent = this.translate("Create room →");
  }

  renderPairStatus(snapshot, localName = "", opponentName = "", gameNames = {}) {
    const paired = Boolean(snapshot?.ready && snapshot.opponentId);
    this.elements.pairedStatus.hidden = !paired;
    if (!paired) return;
    this.elements.pairedTitle.textContent = this.translate("Paired with {name}", { name: opponentName || this.translate("Opponent") });
    const offerName = this.translate(gameNames[snapshot.offerGame] || snapshot.offerGame || "");
    const counterName = this.translate(gameNames[snapshot.counterGame] || snapshot.counterGame || "");
    let detail = "Choose a game below to invite your friend.";
    if (snapshot.phase === "offer" && snapshot.localIsOfferer) {
      detail = "You invited your friend to play {game}. Waiting for your friend to respond.";
    } else if (snapshot.phase === "offer") {
      detail = "Your friend invited you to play {game}.";
    } else if (snapshot.phase === "counter" && snapshot.localCanChooseCounter) {
      detail = "Your friend declined. Choose another game below; then play rock, paper, scissors.";
    } else if (snapshot.phase === "counter") {
      detail = "Your friend declined and is choosing another game.";
    } else if (snapshot.phase === "rps") {
      detail = "Choose rock, paper or scissors to decide between {game} and {counterGame}.";
    } else if (snapshot.phase === "resolving") {
      detail = "Your friend accepted. Starting the game…";
    }
    this.elements.pairedDetail.textContent = this.translate(detail, {
      game: offerName,
      counterGame: counterName,
      name: opponentName || this.translate("Opponent")
    });
  }

  renderMatchmaking(snapshot, gameNames = {}) {
    const phase = snapshot?.phase || "";
    const show = Boolean(snapshot?.ready && !snapshot.result &&
      (phase === "offer" || (phase === "counter" && !snapshot.localCanChooseCounter) || phase === "rps"));
    this.elements.matchOverlay.hidden = !show;
    if (!show) return;
    const offerName = this.translate(gameNames[snapshot.offerGame] || snapshot.offerGame || "");
    const counterName = this.translate(gameNames[snapshot.counterGame] || snapshot.counterGame || "");
    const localIsOfferer = Boolean(snapshot.localIsOfferer);
    const bothRps = phase === "rps";
    this.elements.matchDecisionActions.hidden = phase !== "offer" || localIsOfferer;
    this.elements.matchAccept.disabled = phase !== "offer" || localIsOfferer;
    this.elements.matchDecline.disabled = phase !== "offer" || localIsOfferer;
    this.elements.matchGestureActions.hidden = !bothRps;
    this.elements.matchGestureActions.querySelectorAll("[data-gesture]").forEach((button) => {
      button.disabled = Boolean(snapshot.localGesture);
      button.setAttribute("aria-pressed", String(button.dataset.gesture === snapshot.localGesture));
    });

    let title = "Would you like to play {game}?";
    let status = "Your friend wants to play {game}.";
    if (phase === "offer" && localIsOfferer) {
      title = "Waiting for your friend";
      status = "You invited your friend to play {game}. Waiting for your friend to respond.";
    } else if (phase === "counter") {
      title = "Waiting for your friend";
      status = "Your friend declined. Waiting for them to choose another game.";
    } else if (bothRps) {
      title = "Choose the game";
      status = "Choose rock, paper or scissors to decide between {game} and {counterGame}.";
      if (snapshot.localGesture && !snapshot.opponentGesture) status = "You chose {gesture}. Waiting for your friend.";
      else if (!snapshot.localGesture && snapshot.opponentGesture) status = "Your friend chose {opponentGesture}. Choose rock, paper or scissors.";
      else if (snapshot.localGesture && snapshot.opponentGesture) status = "Both choices are in. Deciding which game to play…";
      else if (snapshot.gestureRound > 0) status = "It was a tie. Choose rock, paper or scissors again.";
    }
    this.elements.matchTitle.textContent = this.translate(title, { game: offerName });
    const gestureLabel = snapshot.localGesture ? snapshot.localGesture[0].toUpperCase() + snapshot.localGesture.slice(1) : "";
    const opponentGestureLabel = snapshot.opponentGesture
      ? snapshot.opponentGesture[0].toUpperCase() + snapshot.opponentGesture.slice(1)
      : "";
    this.elements.matchStatus.textContent = this.translate(status, {
      game: offerName,
      counterGame: counterName,
      gesture: this.translate(gestureLabel),
      opponentGesture: this.translate(opponentGestureLabel)
    });
  }

  showResult({ title, detail = "" }) {
    this.elements.matchOverlay.hidden = true;
    this.elements.resultTitle.textContent = title;
    this.elements.resultDetail.textContent = detail;
    this.elements.resultActions.hidden = true;
    this.elements.resultOverlay.hidden = false;
  }

  showResultActions() {
    this.elements.resultActions.hidden = false;
  }

  hideResult() {
    this.elements.resultOverlay.hidden = true;
    this.elements.resultActions.hidden = true;
  }

  renderTicTacToe(state, getPlayers, pendingMove = false) {
    const game = state.gameState;
    const players = game?.players || [];
    const markFor = (playerId) => players.find((player) => player.id === playerId)?.mark;
    const playerName = (playerId) => state.players[playerId]?.name || "Player";
    const activePlayers = getPlayers();

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
      this.elements.yahtzeeHint.textContent = "Waiting for your friend to join.";
      this.elements.yahtzeeRoll.disabled = true;
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

  setChatAvailable(available) {
    this.elements.chatRoot.hidden = !available;
    if (!available) {
      this.setChatOpen(false);
      this.hideChatNotification();
    }
  }

  setChatOpen(open) {
    const { chatRoot, chatPanel, chatLauncher } = this.elements;
    chatRoot.classList.toggle("is-chat-open", open);
    chatPanel.classList.toggle("is-open", open);
    chatPanel.setAttribute("aria-hidden", String(!open));
    chatPanel.inert = !open;
    chatLauncher.setAttribute("aria-expanded", String(open));
  }

  setChatUnread(count) {
    const unread = Math.max(0, Number(count) || 0);
    this.elements.chatUnread.hidden = unread === 0;
    this.elements.chatUnread.textContent = unread > 99 ? "99+" : String(unread);
    this.elements.chatUnread.setAttribute("aria-label", this.translate("Unread messages: {count}", { count: unread }));
  }

  setChatConnection(message) {
    this.elements.chatConnection.textContent = message;
    this.elements.chatConnection.hidden = !message;
  }

  setChatSendEnabled(enabled) {
    this.elements.chatInput.disabled = !enabled;
    this.elements.chatSend.disabled = !enabled;
  }

  setChatError(message) {
    this.elements.chatError.textContent = message;
    this.elements.chatError.hidden = !message;
  }

  updateChatCount(count, maximum) {
    this.elements.chatCount.textContent = `${count} / ${maximum}`;
  }

  renderChatMessages(messages, localPlayerId) {
    const language = this.document.documentElement.lang || "en";
    const timeFormatter = new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" });
    const items = messages.map((message) => {
      const item = this.document.createElement("li");
      item.dataset.noI18n = "";
      item.className = `chat-message${message.playerId === localPlayerId ? " is-self" : ""}`;
      const meta = this.document.createElement("div");
      meta.className = "chat-message-meta";
      const name = this.document.createElement("strong");
      name.textContent = message.playerName || this.translate("Opponent");
      const time = this.document.createElement("time");
      const sentAt = Number.isFinite(Number(message.sentAt)) ? Number(message.sentAt) : Date.now();
      const date = new Date(sentAt);
      time.dateTime = date.toISOString();
      time.textContent = timeFormatter.format(date);
      meta.append(name, time);
      const body = this.document.createElement("p");
      body.className = "chat-message-body";
      body.textContent = message.text;
      item.append(meta, body);
      return item;
    });
    this.elements.chatMessages.replaceChildren(...items);
    this.elements.chatEmpty.hidden = messages.length > 0;
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  showChatNotification({ name, text }) {
    const notice = this.elements.chatNotice;
    notice.hidden = true;
    notice.classList.remove("is-visible");
    this.elements.chatNoticeName.textContent = name;
    this.elements.chatNoticeText.textContent = text;
    notice.setAttribute("aria-label", this.translate("New message from {name}", { name }));
    void notice.offsetWidth;
    notice.hidden = false;
    notice.classList.add("is-visible");
  }

  hideChatNotification() {
    this.elements.chatNotice.hidden = true;
    this.elements.chatNotice.classList.remove("is-visible");
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

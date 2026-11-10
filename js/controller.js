import { GameModel } from "./model.js";
import { GameView } from "./view.js";

document.addEventListener("DOMContentLoaded", () => {
      (() => {
        const model = new GameModel();
        const state = model.state;
        const view = new GameView();
        const elements = view.elements;
        const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";
        let client = null;
        let pendingTicTacToeMove = false;
        let localTicTacToe = false;
        let pendingDotsMove = false;
        let localDotsBoxes = false;

        const roomTopic = () => model.roomTopic();
        const playerTopic = (id) => model.playerTopic(id);
        const secretKey = () => model.secretKey();
        const setConnection = (connectionState, text) => view.setConnection(connectionState, text);
        const setBanner = (message, kind = "neutral") => view.setBanner(message, kind);
        function setMode(nextMode) {
          state.mode = nextMode;
          view.setMode(state.mode);
        }

        async function submitDotsMove(edge) {
          if (pendingDotsMove) return;
          const nextGame = model.applyDotsAndBoxesMove(state.gameState, state.playerId, edge);
          if (!nextGame) return;
          const previousGame = state.gameState;
          state.gameState = nextGame;
          pendingDotsMove = true;
          render();
          if (localDotsBoxes) {
            while (state.gameState.phase === "playing" && state.gameState.activePlayerId === "computer") {
              await new Promise((resolve) => window.setTimeout(resolve, 120));
              if (!localDotsBoxes) break;
              const aiEdge = model.chooseDotsAndBoxesMove(state.gameState, "computer");
              const aiMove = model.applyDotsAndBoxesMove(state.gameState, "computer", aiEdge);
              if (!aiMove) {
                pendingDotsMove = false;
                render();
                return;
              }
              state.gameState = aiMove;
              render();
            }
            pendingDotsMove = false;
            render();
            return;
          }
          try {
            await publish(`${roomTopic()}/game`, nextGame);
          } catch (error) {
            if (state.gameState === nextGame) state.gameState = previousGame;
            elements.dotsStatus.textContent = `Could not send your move: ${error.message}`;
          } finally {
            pendingDotsMove = false;
            render();
          }
        }
        function startSoloGame() {
          state.playerName = model.validName(elements.name.value) || "Player";
          elements.name.value = state.playerName;
          localStorage.setItem("fourfold.name", state.playerName);
          state.soloMode = true;
          elements.page.classList.add("is-playing");
          state.soloSecret = model.createSecret();
          state.room = "";
          state.playerId = "solo";
          state.players = { solo: { id: "solo", name: state.playerName, online: true, ready: true } };
          state.guesses = {};
          state.results = {};
          state.handledResults = new Set();
          state.gameState = { phase: "playing", turn: 1, activePlayerId: state.playerId };
          elements.setup.hidden = true;
          elements.lobby.hidden = true;
          elements.game.hidden = false;
          elements.game.dataset.mode = "1P";
          elements.game.dataset.game = "1a2b";
          elements.game.setAttribute("aria-label", "1A2B game");
          elements.gameTitle.textContent = "1A2B";
          elements.modeBadge.textContent = "1P · Solo";
          elements.playersCard.hidden = true;
          elements.secretCard.hidden = true;
          elements.soloSecret.hidden = false;
          setBanner("Find the secret. Every clue counts.");
          render();
        }
        function startDotsAndBoxesSoloGame() {
          state.playerName = model.validName(elements.name.value) || "Player";
          elements.name.value = state.playerName;
          localStorage.setItem("fourfold.name", state.playerName);
          state.gameType = "dotsandboxes";
          state.room = "";
          state.playerId = "local";
          state.players = {
            local: { id: "local", name: state.playerName, online: true },
            computer: { id: "computer", name: "Computer", online: true }
          };
          state.gameState = model.createDotsAndBoxesGame([
            { id: "local", name: state.playerName },
            { id: "computer", name: "Computer" }
          ]);
          state.joined = false;
          state.soloMode = false;
          localDotsBoxes = true;
          pendingDotsMove = false;
          elements.setup.hidden = true;
          elements.lobby.hidden = true;
          elements.page.classList.add("is-playing");
          elements.game.hidden = false;
          elements.game.dataset.mode = "1P";
          elements.game.dataset.game = "dotsandboxes";
          elements.game.setAttribute("aria-label", "Dots and Boxes against the computer");
          elements.roomHeading.hidden = true;
          elements.gameGrid.hidden = true;
          elements.ticTacToeGame.hidden = true;
          elements.dotsAndBoxesGame.hidden = false;
          render();
        }
        function startTicTacToeSoloGame() {
          state.playerName = model.validName(elements.name.value) || "Player";
          elements.name.value = state.playerName;
          localStorage.setItem("fourfold.name", state.playerName);
          state.gameType = "tictactoe";
          state.room = "";
          state.playerId = "local";
          state.players = {
            local: { id: "local", name: state.playerName, online: true },
            computer: { id: "computer", name: "Computer", online: true }
          };
          state.gameState = model.createTicTacToeGame([
            { id: "local", name: state.playerName },
            { id: "computer", name: "Computer" }
          ]);
          state.joined = false;
          state.soloMode = false;
          localTicTacToe = true;
          pendingTicTacToeMove = false;
          elements.setup.hidden = true;
          elements.lobby.hidden = true;
          elements.page.classList.add("is-playing");
          elements.game.hidden = false;
          elements.game.dataset.mode = "1P";
          elements.game.dataset.game = "tictactoe";
          elements.game.setAttribute("aria-label", "Tic Tac Toe against the computer");
          elements.roomHeading.hidden = true;
          elements.gameGrid.hidden = true;
          elements.ticTacToeGame.hidden = false;
          render();
        }
        const publish = (topic, value, retain = true) => new Promise((resolve, reject) => {
          if (!client || !client.connected) {
            reject(new Error("The MQTT connection is not available."));
            return;
          }
          if (state.gameType === "dotsandboxes" && parts[0] === "game" &&
            data && Array.isArray(data.edges) && typeof data.moveCount === "number") {
            if (!state.gameState || data.moveCount > state.gameState.moveCount) {
              state.gameState = data;
              render();
            }
            return;
          }
          client.publish(topic, JSON.stringify(value), { qos: 1, retain }, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        function setRoomInput(value) {
          elements.room.value = value;
        }

        function enterRoom(code) {
          if (state.joining || state.joined) return;
          if (!window.mqtt) {
            setConnection("error", "Game library unavailable");
            setBanner("The MQTT library did not load. Check your connection and refresh the page.", "error");
            return;
          }
          state.room = code.toUpperCase();
          state.playerName = model.validName(elements.name.value) || "Player";
          const playerKey = state.gameType === "1a2b"
            ? `fourfold.player.${state.room}`
            : `fourfold.player.${state.gameType}.${state.room}`;
          state.playerId = localStorage.getItem(playerKey) || crypto.randomUUID().replaceAll("-", "").slice(0, 12);
          localStorage.setItem(playerKey, state.playerId);
          state.mySecret = sessionStorage.getItem(secretKey()) || "";
          state.joining = true;
          elements.create.disabled = true;
          elements.join.disabled = true;
          elements.room.value = state.room;
          setConnection("connecting", "Connecting to room…");
          setBanner("Connecting to the game room…");

          client = window.mqtt.connect(brokerUrl, {
            clientId: `fourfold-${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
            clean: true,
            connectTimeout: 12000,
            reconnectPeriod: 2000,
            will: {
              topic: playerTopic(state.playerId),
              payload: JSON.stringify({ id: state.playerId, online: false }),
              qos: 1,
              retain: true
            }
          });
          client.on("connect", () => {
            setConnection("connected", "Connected");
            client.subscribe(`${roomTopic()}/#`, { qos: 1 }, (error) => {
              if (error) {
                elements.roomError.textContent = "Could not join this room.";
                setBanner("Could not subscribe to the room. Please leave and try again.", "error");
                return;
              }
              if (state.joined) {
                const current = state.players[state.playerId];
                if (current) {
                  publish(playerTopic(state.playerId), { ...current, online: true })
                    .catch((publishError) => setBanner(`Could not restore your room status: ${publishError.message}`, "error"));
                }
              } else {
                window.setTimeout(completeJoin, 700);
              }
            });
          });
          client.on("reconnect", () => setConnection("connecting", "Reconnecting…"));
          client.on("offline", () => setConnection("connecting", "Reconnecting…"));
          client.on("close", () => {
            if (state.joined) setConnection("connecting", "Connection lost");
          });
          client.on("error", (error) => {
            setConnection("error", "Connection error");
            elements.roomError.textContent = "Connection failed. Try again.";
            const message = `Could not connect to the public MQTT broker: ${error.message || "unknown error"}`;
            if (state.gameType === "tictactoe" && !elements.game.hidden) {
              elements.ticTacToeStatus.textContent = message;
            } else if (state.gameType === "dotsandboxes" && !elements.game.hidden) {
              elements.dotsStatus.textContent = message;
            } else {
              setBanner(message, "error");
            }
          });
          client.on("message", onMessage);
        }

        async function completeJoin() {
          if (!client || !client.connected || state.joined) return;
          const otherPlayers = Object.values(state.players).filter((player) => player.id !== state.playerId);
          if (!state.players[state.playerId] && otherPlayers.length >= 2) {
            elements.roomError.textContent = "Room is full.";
            state.joining = false;
            elements.create.disabled = false;
            elements.join.disabled = false;
            client.end(true);
            client = null;
            return;
          }
          const previous = state.players[state.playerId] || {};
          const presence = {
            id: state.playerId,
            name: state.playerName,
            online: true,
            ready: state.gameType !== "1a2b" || Boolean(previous.ready),
            joinedAt: previous.joinedAt || Date.now()
          };
          try {
            await publish(playerTopic(state.playerId), presence);
            state.players[state.playerId] = presence;
            state.joined = true;
            state.joining = false;
            elements.setup.hidden = true;
            elements.roomActions.hidden = true;
            elements.roomWaiting.hidden = false;
            elements.roomWaitingCode.textContent = state.room;
            elements.lobby.hidden = false;
            elements.game.hidden = true;
            state.soloMode = false;
            elements.game.dataset.mode = "2P";
            elements.game.dataset.game = state.gameType;
            const isBoardGame = state.gameType !== "1a2b";
            elements.game.setAttribute("aria-label", state.gameType === "tictactoe"
              ? "Tic Tac Toe game"
              : state.gameType === "dotsandboxes" ? "Dots and Boxes game" : "1A2B game");
            elements.gameTitle.textContent = state.gameType === "tictactoe"
              ? "Tic Tac Toe"
              : state.gameType === "dotsandboxes" ? "Dots and Boxes" : "1A2B";
            elements.modeBadge.textContent = "2P · Friends";
            elements.playersCard.hidden = isBoardGame;
            elements.secretCard.hidden = state.gameType !== "1a2b";
            elements.soloSecret.hidden = true;
            elements.code.textContent = state.room;
            elements.ticTacToeRoomCode.textContent = state.room;
            elements.dotsRoomCode.textContent = state.room;
            setBanner(isBoardGame
              ? "Waiting for a friend to join."
              : "Set your secret code. Once both players are ready, take turns guessing each other’s code.");
            render();
            updateRoomWaiting();
            maybeStartGame();
          } catch (error) {
            elements.roomError.textContent = "Could not join the room. Try again.";
            state.joining = false;
            elements.create.disabled = false;
            elements.join.disabled = false;
          }
        }

        function onMessage(topic, payload) {
          let data;
          try {
            data = JSON.parse(payload.toString());
          } catch {
            return;
          }
          const base = roomTopic();
          const relative = topic.slice(base.length + 1);
          const parts = relative.split("/");
          if (parts[0] === "players" && parts.length === 3 && parts[2] === "presence" && data.id) {
            const previous = state.players[data.id] || {};
            state.players[data.id] = { ...previous, ...data };
            if (!data.online && data.id !== state.playerId) state.players[data.id].ready = Boolean(previous.ready);
            renderPlayers();
            updateRoomWaiting();
            maybeStartGame();
            if (state.gameType !== "1a2b") render();
            return;
          }
          if (parts[0] === "game" && data && typeof data.turn === "number") {
            if (!state.gameState || data.turn > state.gameState.turn ||
              (data.turn === state.gameState.turn && state.gameState.phase !== "won" && data.phase === "won")) {
              state.gameState = data;
              render();
            }
            return;
          }
          if (state.gameType === "tictactoe" && parts[0] === "game" &&
            data && Array.isArray(data.board) && typeof data.moveCount === "number") {
            if (!state.gameState || data.moveCount > state.gameState.moveCount) {
              state.gameState = data;
              render();
            }
            return;
          }
          if (parts[0] === "moves" && parts.length === 3) {
            const turn = Number(parts[1]);
            if (!Number.isInteger(turn) || turn < 1) return;
            if (parts[2] === "guess" && typeof data.guess === "string" && data.by) {
              state.guesses[turn] = data;
              render();
              if (data.to === state.playerId && state.gameState?.turn === turn && state.mySecret) {
                answerGuess(turn, data);
              } else if (data.to === state.playerId && !state.mySecret) {
                setBanner("Your secret was lost when this page reloaded. Re-enter it below to continue.", "error");
              }
            } else if (parts[2] === "result" && typeof data.a === "number" && typeof data.b === "number") {
              state.results[turn] = data;
              render();
            }
          }
        }

        function getPlayers() {
          return model.getPlayers();
        }

        function updateRoomWaiting() {
          if (!state.joined) return;
          const onlinePlayers = getPlayers();
          if (onlinePlayers.length < 2) {
            elements.roomWaitingStatus.textContent = "Waiting for a player to join your room.";
            return;
          }
          elements.lobby.hidden = true;
          elements.game.hidden = false;
          elements.page.classList.add("is-playing");
          render();
        }

        function maybeStartGame() {
          if (!state.joined || state.gameState || getPlayers().length !== 2) return;
          const activePlayers = getPlayers();
          if (state.gameType === "tictactoe" || state.gameType === "dotsandboxes") {
            state.gameState = state.gameType === "dotsandboxes"
              ? model.createDotsAndBoxesGame(activePlayers)
              : model.createTicTacToeGame(activePlayers);
            publish(`${roomTopic()}/game`, state.gameState)
              .catch((error) => {
                const status = state.gameType === "dotsandboxes" ? elements.dotsStatus : elements.ticTacToeStatus;
                status.textContent = `Could not start the game: ${error.message}`;
              });
            render();
            return;
          }
          if (!activePlayers.every((player) => player.ready)) return;
          state.gameState = { phase: "playing", turn: 1, activePlayerId: activePlayers[0].id, startedAt: Date.now() };
          setBanner("Both players are ready. The first turn starts now.");
          publish(`${roomTopic()}/game`, state.gameState).catch((error) => setBanner(`Could not start the game: ${error.message}`, "error"));
          render();
        }

        function renderPlayers() {
          view.renderPlayers(state, getPlayers);
        }

        function render() {
          if (state.gameType === "tictactoe") {
            elements.roomHeading.hidden = true;
            elements.gameGrid.hidden = true;
            elements.ticTacToeGame.hidden = false;
            elements.dotsAndBoxesGame.hidden = true;
            view.renderTicTacToe(state, getPlayers, pendingTicTacToeMove);
            return;
          }
          if (state.gameType === "dotsandboxes") {
            elements.roomHeading.hidden = true;
            elements.gameGrid.hidden = true;
            elements.ticTacToeGame.hidden = true;
            elements.dotsAndBoxesGame.hidden = false;
            view.renderDotsAndBoxes(state, getPlayers, pendingDotsMove, localDotsBoxes);
            return;
          }
          elements.roomHeading.hidden = false;
          elements.gameGrid.hidden = false;
          elements.ticTacToeGame.hidden = true;
          elements.dotsAndBoxesGame.hidden = true;
          view.render(state, getPlayers, processCurrentResult);
        }

        async function submitTicTacToeMove(cell) {
          if (pendingTicTacToeMove) return;
          const nextGame = model.applyTicTacToeMove(state.gameState, state.playerId, cell);
          if (!nextGame) return;
          const previousGame = state.gameState;
          state.gameState = nextGame;
          pendingTicTacToeMove = true;
          render();
          if (localTicTacToe) {
            if (nextGame.phase === "playing") {
              await new Promise((resolve) => window.setTimeout(resolve, 120));
              if (!localTicTacToe || state.gameState !== nextGame) {
                pendingTicTacToeMove = false;
                return;
              }
              const aiCell = model.chooseTicTacToeMove(state.gameState, "computer");
              const aiMove = model.applyTicTacToeMove(state.gameState, "computer", aiCell);
              if (aiMove) state.gameState = aiMove;
            }
            pendingTicTacToeMove = false;
            render();
            return;
          }
          try {
            await publish(`${roomTopic()}/game`, nextGame);
          } catch (error) {
            if (state.gameState === nextGame) state.gameState = previousGame;
            elements.ticTacToeStatus.textContent = `Could not send your move: ${error.message}`;
          } finally {
            pendingTicTacToeMove = false;
            render();
          }
        }

        function submitSoloGuess(value) {
          const turn = state.gameState.turn;
          const { a, b } = model.scoreGuess(state.soloSecret, value);
          state.guesses[turn] = { turn, guess: value, by: state.playerId, at: Date.now() };
          state.results[turn] = { a, b };
          elements.guess.value = "";
          if (a === 4) state.gameState = { ...state.gameState, phase: "won" };
          else state.gameState = { ...state.gameState, turn: turn + 1 };
          render();
        }

        async function answerGuess(turn, guess) {
          if (!state.mySecret || !client?.connected || state.results[turn]) return;
          const { a, b } = model.scoreGuess(state.mySecret, guess.guess);
          try {
            await publish(`${roomTopic()}/moves/${turn}/result`, { turn, a, b, by: state.playerId, for: guess.by, at: Date.now() });
          } catch (error) {
            setBanner(`Could not share the result: ${error.message}`, "error");
          }
        }

        function processCurrentResult() {
          if (!state.gameState || state.gameState.phase !== "playing") return;
          const result = state.results[state.gameState.turn];
          if (!result || state.handledResults.has(state.gameState.turn)) return;
          state.handledResults.add(state.gameState.turn);
          if (result.a === 4) {
            state.gameState = { ...state.gameState, phase: "won", winnerId: result.for, turn: state.gameState.turn };
          } else {
            state.gameState = { ...state.gameState, turn: state.gameState.turn + 1, activePlayerId: result.by };
          }
          publish(`${roomTopic()}/game`, state.gameState).catch((error) => setBanner(`Could not update the game: ${error.message}`, "error"));
          render();
        }

        elements.modeOne.addEventListener("click", () => setMode("1P"));
        elements.modeTwo.addEventListener("click", () => setMode("2P"));
        elements.gameTile.addEventListener("click", () => {
          state.gameType = "1a2b";
          view.setGameType(state.gameType);
          if (state.mode === "1P") startSoloGame();
          else {
            elements.roomActions.hidden = false;
            elements.roomWaiting.hidden = true;
            elements.lobby.hidden = false;
            elements.roomError.textContent = "";
          }
        });
        elements.ticTacToeTile.addEventListener("click", () => {
          state.gameType = "tictactoe";
          localTicTacToe = false;
          if (state.mode === "1P") {
            startTicTacToeSoloGame();
            return;
          }
          view.setGameType(state.gameType);
          elements.roomActions.hidden = false;
          elements.roomWaiting.hidden = true;
          elements.lobby.hidden = false;
          elements.roomError.textContent = "";
        });
        elements.dotsAndBoxesTile.addEventListener("click", () => {
          state.gameType = "dotsandboxes";
          localDotsBoxes = false;
          if (state.mode === "1P") {
            startDotsAndBoxesSoloGame();
            return;
          }
          view.setGameType(state.gameType);
          elements.roomActions.hidden = false;
          elements.roomWaiting.hidden = true;
          elements.lobby.hidden = false;
          elements.roomError.textContent = "";
        });
        elements.create.addEventListener("click", () => {
          if (!window.mqtt) {
            elements.roomError.textContent = "Could not load online play.";
            return;
          }
          const code = model.createRoomCode();
          elements.room.value = code;
          enterRoom(code);
        });
        elements.join.addEventListener("click", () => {
          const code = elements.room.value.trim().toUpperCase();
          if (!model.isValidRoomCode(code)) {
            elements.roomError.textContent = "Enter a 6-character room code.";
            return;
          }
          elements.roomError.textContent = "";
          enterRoom(code);
        });
        elements.room.addEventListener("input", () => {
          elements.room.value = elements.room.value.replace(/[^a-hj-np-z2-9]/gi, "").slice(0, 6).toUpperCase();
        });
        elements.secretForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const value = elements.secret.value;
          if (!model.isValidCode(value)) {
            setBanner("Your secret must be four digits with no repeats.", "error");
            elements.secret.focus();
            return;
          }
          if (!state.joined || !client?.connected) {
            setBanner("Reconnect to the room before setting your secret.", "error");
            return;
          }
          state.mySecret = value;
          sessionStorage.setItem(secretKey(), value);
          const current = state.players[state.playerId] || { id: state.playerId, name: state.playerName, joinedAt: Date.now() };
          const presence = { ...current, id: state.playerId, name: state.playerName, ready: true, online: true };
          try {
            await publish(playerTopic(state.playerId), presence);
            state.players[state.playerId] = presence;
            setBanner("Your secret is saved on this device only. Waiting for your opponent to ready up.");
            render();
            maybeStartGame();
          } catch (error) {
            setBanner(`Could not mark you ready: ${error.message}`, "error");
          }
        });
        elements.guessForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const value = elements.guess.value;
          if (!model.isValidCode(value)) {
            setBanner("Use 4 different digits.", "error");
            elements.guess.focus();
            return;
          }
          if (state.soloMode) {
            submitSoloGuess(value);
            return;
          }
          if (!state.gameState || state.gameState.phase !== "playing" || state.gameState.activePlayerId !== state.playerId || state.guesses[state.gameState.turn]) return;
          const turn = state.gameState.turn;
          const guess = { turn, guess: value, by: state.playerId, to: getPlayers().find((player) => player.id !== state.playerId)?.id, at: Date.now() };
          state.guesses[turn] = guess;
          elements.guess.value = "";
          render();
          try {
            await publish(`${roomTopic()}/moves/${turn}/guess`, guess);
          } catch (error) {
            delete state.guesses[turn];
            setBanner(`Could not send your guess: ${error.message}`, "error");
            render();
          }
        });
        function updateGuessSlots() {
          view.updateGuessSlots(state);
        }
        elements.keypad.addEventListener("click", (event) => {
          const button = event.target.closest("button");
          if (!button || button.disabled) return;
          const current = elements.guess.value;
          if (button.dataset.digit && current.length < 4) {
            elements.guess.value = `${current}${button.dataset.digit}`;
          } else if (button.dataset.action === "clear") {
            elements.guess.value = "";
          } else if (button.dataset.action === "delete") {
            elements.guess.value = current.slice(0, -1);
          }
          updateGuessSlots();
        });
        elements.guess.addEventListener("input", () => {
          elements.guess.value = elements.guess.value.replace(/\D/g, "").slice(0, 4);
          updateGuessSlots();
        });
        elements.keypadSubmit.addEventListener("click", () => {
          if (!elements.keypadSubmit.disabled) elements.guessForm.requestSubmit();
        });
        elements.ticTacToeBoard.addEventListener("click", (event) => {
          const cell = event.target.closest("[data-cell]");
          if (!cell || cell.disabled) return;
          submitTicTacToeMove(Number(cell.dataset.cell));
        });
        elements.dotsBoard.addEventListener("click", (event) => {
          const edge = event.target.closest("[data-edge]");
          if (!edge || edge.disabled) return;
          submitDotsMove(Number(edge.dataset.edge));
        });
        elements.roomWaitingCopy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(state.room);
            elements.roomWaitingCopy.textContent = "Copied";
            window.setTimeout(() => { elements.roomWaitingCopy.textContent = "Copy room code"; }, 1500);
          } catch (error) {
            elements.roomWaitingStatus.textContent = `Could not copy the room code: ${error.message}. Share ${state.room} with your friend.`;
          }
        });
        function returnHome() {
          if (client) {
            const currentClient = client;
            if (state.joined && currentClient.connected) {
              publish(playerTopic(state.playerId), { ...state.players[state.playerId], online: false })
                .catch((error) => console.error("Could not clear player presence:", error))
                .finally(() => currentClient.end(true));
            } else {
              currentClient.end(true);
            }
          }
          client = null;
          pendingTicTacToeMove = false;
          localTicTacToe = false;
          pendingDotsMove = false;
          localDotsBoxes = false;
          model.resetGame();
          elements.setup.hidden = false;
          elements.page.classList.remove("is-playing");
          elements.lobby.hidden = true;
          elements.roomActions.hidden = false;
          elements.roomWaiting.hidden = true;
          elements.roomWaitingCopy.textContent = "Copy room code";
          elements.roomWaitingCode.textContent = "------";
          elements.game.hidden = true;
          elements.game.dataset.mode = "";
          elements.create.disabled = false;
          elements.join.disabled = false;
          elements.secret.value = "";
          elements.guess.value = "";
          updateGuessSlots();
          elements.playersCard.hidden = false;
          elements.secretCard.hidden = false;
          elements.soloSecret.hidden = true;
          elements.roomError.textContent = "";
          elements.room.value = "";
          setConnection("offline", "Not connected");
          setBanner("");
          window.scrollTo(0, 0);
        }
        elements.backHome.addEventListener("click", returnHome);
        elements.leave.addEventListener("click", returnHome);
        elements.ticTacToeExit.addEventListener("click", returnHome);
        elements.dotsExit.addEventListener("click", returnHome);

        if (!window.mqtt) {
          elements.create.disabled = true;
          elements.join.disabled = true;
          console.error("MQTT library unavailable; online multiplayer is disabled.");
        }
        elements.name.value = localStorage.getItem("fourfold.name") || "Alex";
        elements.greeting.textContent = elements.name.value;
        elements.editName.addEventListener("click", () => elements.name.focus());
        elements.name.addEventListener("change", () => {
          const name = model.validName(elements.name.value);
          elements.name.value = name;
          if (name) {
            localStorage.setItem("fourfold.name", name);
            elements.greeting.textContent = name;
          }
        });
        elements.name.addEventListener("input", () => {
          elements.greeting.textContent = model.validName(elements.name.value) || "friend";
        });
      })();
      });

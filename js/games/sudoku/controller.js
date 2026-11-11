import { SudokuModel } from "./model.js";
import { SudokuView } from "./view.js";

export class SudokuController {
  constructor({
    root,
    mode = "1P",
    playerId = "p1",
    playerName = "Player",
    transport = null,
    onExit = () => {},
    onError = () => {},
    t = (source) => source,
    killer = false,
  } = {}) {
    if (!root) throw new TypeError("SudokuController requires a root element.");
    this.root = root;
    this.mode = mode;
    this.playerId = playerId;
    this.playerName = playerName;
    this.transport = transport;
    this.onExit = onExit;
    this.onError = onError;
    this.t = t;
    this.model = new SudokuModel({ killer });
    this.view = new SudokuView(root, { t });
    this.unsubscribe = null;
    this.interval = null;
    this.started = false;
    this.unmountHandlers = null;
  }

  start() {
    if (this.started) return this;
    this.started = true;
    this.unmountHandlers = this.view.mountHandlers({
      onCell: (index) => this.selectCell(index),
      onDigit: (digit) => this.enterDigit(digit),
      onNotes: () => this.toggleNotes(),
      onClear: () => this.clearCell(),
      onRestart: () => this.restart(),
      onExit: () => this.onExit(),
    });
    if (this.transport && typeof this.transport.subscribe === "function") {
      this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    }
    this.render();
    this.interval = setInterval(() => {
      this.model.tick();
      this.render();
    }, 1000);
    this.publishState();
    return this;
  }

  dispose() {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (typeof this.unsubscribe === "function") {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (typeof this.unmountHandlers === "function") {
      this.unmountHandlers();
      this.unmountHandlers = null;
    }
    this.started = false;
  }

  receive(message) {
    if (!message || typeof message !== "object" || message.playerId === this.playerId) return;
    if (message.type === "progress") {
      this.model.applyRemoteProgress(message.progress);
    } else if (message.type === "snapshot") {
      this.model.receiveSnapshot(message.snapshot);
    } else {
      return;
    }
    this.render();
  }

  selectCell(index) {
    this.model.selectCell(index);
    this.render();
  }

  enterDigit(digit) {
    const previousSolved = this.model.solved;
    this.model.enterDigit(digit);
    this.render();
    if (this.model.progress !== this.lastPublishedProgress || this.model.solved !== previousSolved) {
      this.publishState();
    }
  }

  clearCell() {
    const previousProgress = this.model.progress;
    this.model.clearCell();
    this.render();
    if (this.model.progress !== previousProgress) this.publishState();
  }

  toggleNotes() {
    this.model.toggleNotes();
    this.render();
  }

  restart() {
    this.model.restart();
    this.lastPublishedProgress = null;
    this.render();
    this.publishState();
  }

  render() {
    const state = this.model.getSnapshot();
    state.mode = this.mode;
    const localPlayer = this.playerId === "p2" ? "p2" : "p1";
    const tr = this.t;
    const players = [
      { id: "p1", side: "P1" },
      { id: "p2", side: "P2" },
    ];
    state.race = players.map(({ id, side }) => {
      const local = id === localPlayer;
      return {
        id,
        label: tr("{player} · {name}", {
          player: tr(side),
          name: local ? this.playerName : tr("Opponent"),
        }),
        progress: local ? state.progress : state.remoteProgress,
        solved: local ? state.solved : state.remoteSolved,
        local,
      };
    });
    this.view.render(state);
  }

  publishState() {
    if (!this.transport || typeof this.transport.publish !== "function") return;
    const progress = this.model.progress;
    this.lastPublishedProgress = progress;
    const publicSnapshot = {
      progress,
      elapsedSeconds: this.model.elapsedSeconds,
      solved: this.model.solved,
      killer: this.model.killer,
    };
    try {
      const progressPublication = this.transport.publish({
        type: "progress",
        playerId: this.playerId,
        progress,
      });
      const snapshotPublication = this.transport.publish({
        type: "snapshot",
        playerId: this.playerId,
        snapshot: publicSnapshot,
      });
      Promise.all([progressPublication, snapshotPublication]).catch((error) => this.onError(error));
    } catch (error) {
      this.onError(error);
    }
  }
}

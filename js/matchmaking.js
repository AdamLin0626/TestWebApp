export const MATCH_GAME_TYPES = Object.freeze([
  '1a2b',
  'tictactoe',
  'dotsandboxes',
  'yahtzee',
  'chess',
  'battleship',
  'airhockey',
  'connectfour',
  'reversi',
  'memory',
]);

const ACTIONS = new Set(['offer', 'accept', 'decline', 'counter']);
const GESTURES = Object.freeze(['rock', 'paper', 'scissors']);
const DEFAULT_CHOICE = () => ({ gameType: '', action: '', gesture: '' });

function validGameType(value) {
  return MATCH_GAME_TYPES.includes(value);
}

function gestureWinner(first, second) {
  if (first === second) return null;
  if ((first === 'rock' && second === 'scissors') ||
      (first === 'paper' && second === 'rock') ||
      (first === 'scissors' && second === 'paper')) return 0;
  return 1;
}

export class MatchmakingFlow {
  constructor({ playerId, hostId, publish, onChange = () => {}, onResolve = () => {} }) {
    if (!playerId || !hostId || typeof publish !== 'function') {
      throw new TypeError('MatchmakingFlow requires playerId, hostId and publish.');
    }
    this.playerId = playerId;
    this.hostId = hostId;
    this.opponentId = '';
    this.publish = publish;
    this.onChange = onChange;
    this.onResolve = onResolve;
    this.roundId = 0;
    this.gestureRound = 0;
    this.ready = false;
    this.choices = new Map();
    this.result = null;
    this.notifiedRound = 0;
  }

  get isHost() {
    return this.playerId === this.hostId;
  }

  setOpponent(opponentId) {
    const next = opponentId && opponentId !== this.playerId ? opponentId : '';
    if (next === this.opponentId) return false;
    this.opponentId = next;
    if (this.isHost && next) this.startRound();
    else this._emit();
    return true;
  }

  startRound() {
    if (!this.isHost || !this.opponentId) return false;
    this.roundId = Math.max(Date.now(), this.roundId + 1);
    this.gestureRound = 0;
    this.ready = true;
    this.result = null;
    this.notifiedRound = 0;
    this.choices = new Map([
      [this.playerId, DEFAULT_CHOICE()],
      [this.opponentId, DEFAULT_CHOICE()],
    ]);
    this.publish('match/session', {
      kind: 'session',
      hostId: this.hostId,
      roundId: this.roundId,
      gestureRound: this.gestureRound,
    }, true);
    this._publishLocal();
    this._emit();
    return true;
  }

  chooseGame(gameType) {
    if (!this.ready || this.result || !validGameType(gameType)) return false;
    const state = this.snapshot();
    const choice = this._localChoice();
    if (state.phase === 'select') {
      choice.gameType = gameType;
      choice.action = 'offer';
    } else if (state.phase === 'counter' && state.counterPlayerId === this.playerId) {
      choice.gameType = gameType;
      choice.action = 'counter';
    } else {
      return false;
    }
    choice.gesture = '';
    this._saveLocal(choice);
    this._publishLocal();
    this._emit();
    return true;
  }

  chooseDecision(decision) {
    if (!this.ready || this.result || !['accept', 'decline'].includes(decision)) return false;
    const state = this.snapshot();
    if (state.phase !== 'offer' || state.offererId === this.playerId) return false;
    const choice = this._localChoice();
    choice.action = decision;
    choice.gesture = '';
    this._saveLocal(choice);
    this._publishLocal();
    this._emit();
    if (this.isHost) this._maybeResolve();
    return true;
  }

  chooseGesture(gesture) {
    if (!this.ready || this.result || !GESTURES.includes(gesture)) return false;
    const state = this.snapshot();
    if (state.phase !== 'rps' || state.localGesture) return false;
    const choice = this._localChoice();
    choice.gesture = gesture;
    this._saveLocal(choice);
    this._publishLocal();
    this._emit();
    if (this.isHost) this._maybeResolve();
    return true;
  }

  receive(topic, payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (topic === 'match/session' && payload.kind === 'session') {
      if (payload.hostId !== this.hostId || !Number.isSafeInteger(payload.roundId)) return false;
      if (payload.roundId < this.roundId) return false;
      if (payload.roundId > this.roundId) {
        this.roundId = payload.roundId;
        this.gestureRound = Number.isSafeInteger(payload.gestureRound) ? payload.gestureRound : 0;
        this.ready = true;
        this.result = null;
        this.notifiedRound = 0;
        this.choices = new Map([
          [this.playerId, DEFAULT_CHOICE()],
          [this.opponentId, DEFAULT_CHOICE()],
        ]);
        this._publishLocal();
        this._emit();
        return true;
      }
      if (Number.isSafeInteger(payload.gestureRound) && payload.gestureRound > this.gestureRound) {
        this.gestureRound = payload.gestureRound;
        for (const choice of this.choices.values()) choice.gesture = '';
        this._publishLocal();
        this._emit();
        return true;
      }
      return false;
    }

    if (topic === 'match/result' && payload.kind === 'result') {
      if (payload.roundId !== this.roundId || !validGameType(payload.gameType) || this.result) return false;
      this.result = {
        roundId: payload.roundId,
        gameType: payload.gameType,
        winnerId: payload.winnerId || '',
        method: payload.method || 'accepted',
      };
      this._notifyResolved();
      this._emit();
      return true;
    }

    if (!topic.startsWith('match/players/') || payload.kind !== 'choice' || !this.ready) return false;
    const topicPlayerId = topic.slice('match/players/'.length);
    if (!topicPlayerId || topicPlayerId !== payload.playerId || topicPlayerId !== this.opponentId ||
        payload.roundId !== this.roundId || payload.gestureRound !== this.gestureRound) return false;
    const choice = {
      gameType: validGameType(payload.gameType) ? payload.gameType : '',
      action: ACTIONS.has(payload.action) ? payload.action : '',
      gesture: GESTURES.includes(payload.gesture) ? payload.gesture : '',
    };
    this.choices.set(topicPlayerId, choice);
    this._emit();
    if (this.isHost) this._maybeResolve();
    return true;
  }

  snapshot() {
    const local = this.choices.get(this.playerId) || DEFAULT_CHOICE();
    const opponent = this.choices.get(this.opponentId) || DEFAULT_CHOICE();
    const offer = this._activeOffer();
    const responderId = offer ? this._otherPlayerId(offer.playerId) : '';
    const response = responderId ? (this.choices.get(responderId) || DEFAULT_CHOICE()) : DEFAULT_CHOICE();
    let phase = 'select';
    if (this.result) phase = 'resolved';
    else if (offer && response.action === 'accept') phase = 'resolving';
    else if (offer && response.action === 'decline') phase = 'counter';
    else if (offer && response.action === 'counter' && validGameType(response.gameType)) phase = 'rps';
    else if (offer) phase = 'offer';

    return {
      roundId: this.roundId,
      gestureRound: this.gestureRound,
      ready: this.ready,
      opponentId: this.opponentId,
      localId: this.playerId,
      localGame: local.gameType,
      opponentGame: opponent.gameType,
      localAction: local.action,
      opponentAction: opponent.action,
      localGesture: local.gesture,
      opponentGesture: opponent.gesture,
      phase,
      offererId: offer?.playerId || '',
      offerGame: offer?.gameType || '',
      responderId,
      counterPlayerId: phase === 'counter' || phase === 'rps' ? responderId : '',
      counterGame: response.action === 'counter' ? response.gameType : '',
      localIsOfferer: Boolean(offer && offer.playerId === this.playerId),
      localCanChooseCounter: Boolean(phase === 'counter' && responderId === this.playerId),
      bothSelected: Boolean(offer),
      bothDecided: Boolean(response.action),
      result: this.result,
    };
  }

  reset() {
    this.roundId = 0;
    this.gestureRound = 0;
    this.ready = false;
    this.choices.clear();
    this.result = null;
    this.notifiedRound = 0;
    this._emit();
  }

  _activeOffer() {
    const candidates = [this.hostId, this.opponentId]
      .filter(Boolean)
      .map((playerId) => ({ playerId, choice: this.choices.get(playerId) || DEFAULT_CHOICE() }))
      .filter(({ choice }) => choice.action === 'offer' && validGameType(choice.gameType));
    candidates.sort((left, right) => left.playerId === this.hostId ? -1 : right.playerId === this.hostId ? 1 : 0);
    return candidates[0] || null;
  }

  _otherPlayerId(playerId) {
    if (!playerId) return '';
    return playerId === this.playerId ? this.opponentId : this.playerId;
  }

  _localChoice() {
    return { ...(this.choices.get(this.playerId) || DEFAULT_CHOICE()) };
  }

  _saveLocal(choice) {
    this.choices.set(this.playerId, choice);
  }

  _publishLocal() {
    if (!this.ready || !this.playerId || !this.opponentId) return;
    const choice = this._localChoice();
    this.publish(`match/players/${this.playerId}`, {
      kind: 'choice',
      playerId: this.playerId,
      roundId: this.roundId,
      gestureRound: this.gestureRound,
      ...choice,
    }, true);
  }

  _maybeResolve() {
    if (!this.isHost || !this.ready || this.result || !this.opponentId) return;
    const offer = this._activeOffer();
    if (!offer) return;
    const responderId = this._otherPlayerId(offer.playerId);
    const response = this.choices.get(responderId) || DEFAULT_CHOICE();
    if (response.action === 'accept') {
      this._publishResult(offer.choice.gameType, '', 'accepted');
      return;
    }
    if (response.action !== 'counter' || !validGameType(response.gameType)) return;

    const offerGesture = offer.choice.gesture;
    const counterGesture = response.gesture;
    if (!GESTURES.includes(offerGesture) || !GESTURES.includes(counterGesture)) return;
    const winner = gestureWinner(offerGesture, counterGesture);
    if (winner === null) {
      this.gestureRound += 1;
      for (const choice of this.choices.values()) choice.gesture = '';
      this.publish('match/session', {
        kind: 'session',
        hostId: this.hostId,
        roundId: this.roundId,
        gestureRound: this.gestureRound,
      }, true);
      this._publishLocal();
      this._emit();
      return;
    }
    const winnerId = winner === 0 ? offer.playerId : responderId;
    const gameType = winner === 0 ? offer.choice.gameType : response.gameType;
    this._publishResult(gameType, winnerId, 'rps');
  }

  _publishResult(gameType, winnerId, method) {
    const result = { kind: 'result', roundId: this.roundId, gameType, winnerId, method };
    this.result = result;
    this.publish('match/result', result, true);
    this._notifyResolved();
    this._emit();
  }

  _notifyResolved() {
    if (!this.result || this.notifiedRound === this.result.roundId) return;
    this.notifiedRound = this.result.roundId;
    this.onResolve({ ...this.result });
  }

  _emit() {
    this.onChange(this.snapshot());
  }
}

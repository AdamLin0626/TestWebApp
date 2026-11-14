const clone = (value) => JSON.parse(JSON.stringify(value));
const PLAYERS = Object.freeze([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" }
]);

export const GUESS_WHO_CHARACTERS = Object.freeze([
  ["lucy","Lucy","woman","brown","long","black","light",false,false],
  ["tom","Tom","man","blue","bald","brown","light",true,true],
  ["sara","Sara","woman","blue","long","brown","light",true,false],
  ["emma","Emma","woman","brown","curly","gray","dark",false,false],
  ["henry","Henry","man","brown","short","brown","dark",false,true],
  ["rose","Rose","woman","blue","short","black","light",false,false],
  ["jeff","Jeff","man","brown","long","blonde","light",true,false],
  ["lia","Lia","woman","brown","curly","gray","light",false,false],
  ["rob","Rob","man","brown","short","black","medium",false,true],
  ["aria","Aria","woman","brown","short","gray","light",true,false],
  ["bob","Bob","man","green","short","brown","dark",false,false],
  ["bella","Bella","woman","green","short","red","light",false,false],
  ["sophia","Sophia","woman","brown","long","blonde","light",false,false],
  ["jack","Jack","man","green","short","gray","light",false,true],
  ["jose","Jose","man","green","short","black","dark",false,true],
  ["theo","Theo","man","blue","short","blonde","light",false,false],
  ["annie","Annie","woman","brown","curly","red","light",false,false],
  ["paul","Paul","man","green","short","brown","medium",false,true],
  ["olivia","Olivia","woman","green","long","blonde","dark",false,false],
  ["chloe","Chloe","woman","green","curly","brown","light",false,false],
  ["nora","Nora","woman","brown","curly","red","dark",true,false],
  ["james","James","man","brown","short","brown","light",true,true],
  ["bill","Bill","man","brown","short","blonde","light",false,false],
  ["julia","Julia","woman","brown","short","gray","dark",false,false],
  ["naomi","Naomi","woman","brown","long","black","light",false,false],
  ["ryan","Ryan","man","blue","short","gray","light",true,true],
  ["david","David","man","brown","short","black","dark",false,true],
  ["mila","Mila","woman","green","long","blonde","medium",true,false],
  ["john","John","man","blue","short","gray","dark",false,false],
  ["ben","Ben","man","green","short","brown","dark",true,false]
].map(([id,name,gender,eyes,hair,hairColor,skinTone,glasses,facialHair]) => Object.freeze({
  id, name, gender, eyes, hair, hairColor, skinTone, glasses, facialHair
})));

export const GUESS_WHO_QUESTIONS = Object.freeze([
  { id: "gender-woman", attribute: "gender", value: "woman", label: "Is your character a woman?" },
  { id: "eyes-blue", attribute: "eyes", value: "blue", label: "Does your character have blue eyes?" },
  { id: "eyes-green", attribute: "eyes", value: "green", label: "Does your character have green eyes?" },
  { id: "eyes-brown", attribute: "eyes", value: "brown", label: "Does your character have brown eyes?" },
  { id: "hair-long", attribute: "hair", value: "long", label: "Does your character have long hair?" },
  { id: "hair-short", attribute: "hair", value: "short", label: "Does your character have short hair?" },
  { id: "hair-curly", attribute: "hair", value: "curly", label: "Does your character have curly hair?" },
  { id: "color-black", attribute: "hairColor", value: "black", label: "Does your character have black hair?" },
  { id: "color-brown", attribute: "hairColor", value: "brown", label: "Does your character have brown hair?" },
  { id: "color-blonde", attribute: "hairColor", value: "blonde", label: "Does your character have blonde hair?" },
  { id: "color-red", attribute: "hairColor", value: "red", label: "Does your character have red hair?" },
  { id: "color-gray", attribute: "hairColor", value: "gray", label: "Does your character have gray hair?" },
  { id: "skin-light", attribute: "skinTone", value: "light", label: "Does your character have light skin?" },
  { id: "skin-medium", attribute: "skinTone", value: "medium", label: "Does your character have medium skin?" },
  { id: "skin-dark", attribute: "skinTone", value: "dark", label: "Does your character have dark skin?" },
  { id: "glasses", attribute: "glasses", value: true, label: "Does your character wear glasses?" },
  { id: "facial-hair", attribute: "facialHair", value: true, label: "Does your character have facial hair?" }
]);

const characterById = (id) => GUESS_WHO_CHARACTERS.find((character) => character.id === id);
const sameAnswer = (character, question) => character?.[question.attribute] === question.value;

export class GuessWhoModel {
  constructor({ rng = Math.random } = {}) {
    if (typeof rng !== "function") throw new TypeError("GuessWhoModel requires an RNG function.");
    this.rng = rng;
  }

  createGame({ players = PLAYERS, secrets = null } = {}) {
    if (!Array.isArray(players) || players.length !== 2 || players[0]?.id !== "p1" || players[1]?.id !== "p2") {
      throw new TypeError("Guess Who requires p1 and p2 seats.");
    }
    const secretIds = secrets && characterById(secrets.p1) && characterById(secrets.p2)
      ? { p1: secrets.p1, p2: secrets.p2 }
      : { p1: this._randomCharacterId(), p2: this._randomCharacterId() };
    return {
      gameType: "guesswho",
      phase: "playing",
      players: clone(players),
      secrets: secretIds,
      candidates: { p1: GUESS_WHO_CHARACTERS.map(({ id }) => id), p2: GUESS_WHO_CHARACTERS.map(({ id }) => id) },
      askedQuestions: { p1: [], p2: [] },
      currentPlayerId: "p1",
      turnCount: 0,
      lastAction: null,
      winnerId: null
    };
  }

  _randomCharacterId() {
    return GUESS_WHO_CHARACTERS[Math.min(GUESS_WHO_CHARACTERS.length - 1, Math.floor(this.rng() * GUESS_WHO_CHARACTERS.length))].id;
  }

  getQuestions() { return GUESS_WHO_QUESTIONS.map((question) => ({ ...question })); }

  askQuestion(game, playerId, questionId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || game.currentPlayerId !== playerId) return null;
    const question = GUESS_WHO_QUESTIONS.find((item) => item.id === questionId);
    if (!question || game.askedQuestions[playerId].includes(questionId)) return null;
    const possibleAnswers = new Set(game.candidates[playerId].map((id) => sameAnswer(characterById(id), question)));
    if (possibleAnswers.size < 2) return null;
    const answer = sameAnswer(characterById(game.secrets[playerId === "p1" ? "p2" : "p1"]), question);
    const candidates = { p1: [...game.candidates.p1], p2: [...game.candidates.p2] };
    const askedQuestions = { p1: [...game.askedQuestions.p1], p2: [...game.askedQuestions.p2] };
    candidates[playerId] = candidates[playerId].filter((id) => sameAnswer(characterById(id), question) === answer);
    if (!candidates[playerId].length) return null;
    askedQuestions[playerId].push(questionId);
    const nextPlayerId = playerId === "p1" ? "p2" : "p1";
    return {
      ...clone(game), candidates, askedQuestions, currentPlayerId: nextPlayerId, turnCount: game.turnCount + 1,
      lastAction: { type: "question", playerId, questionId, answer }
    };
  }

  guessCharacter(game, playerId, characterId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || game.currentPlayerId !== playerId || !characterById(characterId)) return null;
    const opponentId = playerId === "p1" ? "p2" : "p1";
    const correct = game.secrets[opponentId] === characterId;
    return {
      ...clone(game), phase: "finished", winnerId: correct ? playerId : opponentId,
      currentPlayerId: null, turnCount: game.turnCount + 1,
      lastAction: { type: "guess", playerId, characterId, correct }
    };
  }

  getBestQuestion(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing") return null;
    const remaining = game.candidates[playerId] || [];
    if (remaining.length < 2) return null;
    const unused = GUESS_WHO_QUESTIONS.filter((question) => {
      if (game.askedQuestions[playerId].includes(question.id)) return false;
      const answer = sameAnswer(characterById(game.secrets[playerId === "p1" ? "p2" : "p1"]), question);
      return remaining.some((id) => sameAnswer(characterById(id), question) !== answer);
    });
    return unused.sort((left, right) => {
      const splitScore = (question) => {
        const yes = remaining.filter((id) => sameAnswer(characterById(id), question)).length;
        return Math.abs(remaining.length - 2 * yes);
      };
      return splitScore(left) - splitScore(right);
    })[0] || null;
  }

  getPublicState(game, viewerId) {
    if (!this.isValidSnapshot(game) || !["p1", "p2"].includes(viewerId)) return null;
    const snapshot = clone(game);
    snapshot.privateCharacterId = snapshot.secrets[viewerId];
    delete snapshot.secrets;
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== "guesswho" || !["playing", "finished"].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length !== 2 || !game.secrets
      || !characterById(game.secrets.p1) || !characterById(game.secrets.p2)
      || !game.candidates || !Array.isArray(game.candidates.p1) || !Array.isArray(game.candidates.p2)
      || game.candidates.p1.length < 1 || game.candidates.p2.length < 1
      || game.candidates.p1.some((id) => !characterById(id)) || game.candidates.p2.some((id) => !characterById(id))
      || new Set(game.candidates.p1).size !== game.candidates.p1.length || new Set(game.candidates.p2).size !== game.candidates.p2.length
      || !game.candidates.p1.includes(game.secrets.p2) || !game.candidates.p2.includes(game.secrets.p1)
      || !game.askedQuestions || !Array.isArray(game.askedQuestions.p1) || !Array.isArray(game.askedQuestions.p2)
      || [...game.askedQuestions.p1, ...game.askedQuestions.p2].some((id) => !GUESS_WHO_QUESTIONS.some((question) => question.id === id))
      || new Set(game.askedQuestions.p1).size !== game.askedQuestions.p1.length || new Set(game.askedQuestions.p2).size !== game.askedQuestions.p2.length
      || !Number.isInteger(game.turnCount) || game.turnCount < 0) return false;
    if (game.phase === "playing") return ["p1", "p2"].includes(game.currentPlayerId) && !game.winnerId;
    return game.currentPlayerId === null && ["p1", "p2"].includes(game.winnerId);
  }
}

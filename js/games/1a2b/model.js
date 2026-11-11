export class A1B2Model {
  isValidCode(value) {
    return /^(?!.*(.).*\1)[0-9]{4}$/.test(value);
  }

  scoreGuess(secret, guess) {
    const exact = [...guess].filter((digit, index) => digit === secret[index]).length;
    const matching = [...guess].filter((digit) => secret.includes(digit)).length;
    return { a: exact, b: matching - exact };
  }

  createSecret(cryptoSource = globalThis.crypto) {
    const digits = "0123456789".split("");
    for (let index = digits.length - 1; index > 0; index -= 1) {
      const swap = cryptoSource.getRandomValues(new Uint32Array(1))[0] % (index + 1);
      [digits[index], digits[swap]] = [digits[swap], digits[index]];
    }
    return digits.slice(0, 4).join("");
  }
}

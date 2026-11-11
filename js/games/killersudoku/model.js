import { SudokuModel } from "../sudoku/model.js";

export class KillerSudokuModel extends SudokuModel {
  constructor(options = {}) {
    super({ ...options, killer: true });
  }
}

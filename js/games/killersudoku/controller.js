import { SudokuController } from "../sudoku/controller.js";
import { KillerSudokuModel } from "./model.js";
import { KillerSudokuView } from "./view.js";

export class KillerSudokuController extends SudokuController {
  constructor(options = {}) {
    super({
      ...options,
      killer: true,
      model: new KillerSudokuModel(options.puzzle ? { puzzle: options.puzzle } : {}),
      view: new KillerSudokuView(options.root, { t: options.t })
    });
  }
}

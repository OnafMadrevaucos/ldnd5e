import TaticsRollConfigurationDialog from "../models/dialogs/TaticsRollConfigurationDialog.js";

const dice = dnd5e.dice;

export default class TaticsRoll extends dice.BasicRoll {
    constructor(formula, data, options) {
        super(formula, data, options);
    }
    /**
   * Default application used for the roll configuration prompt.
   * @type {typeof TaticsRollConfigurationDialog}
   */
    static DefaultConfigurationDialog = TaticsRollConfigurationDialog;
}
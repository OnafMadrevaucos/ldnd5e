import { constants, i18nStrings } from "../scripts/constants.js";

export default class adControl extends Application {

    constructor(data = {}, options = {})
    {
       super(options);

       this.pcs = data;
    }

    static get defaultOptions()
    {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName],
         template: 'modules/ldnd5e/templates/mainControl.hbs',
         width: 700,
         height: 480,
         minimizable: true,
         resizable: true,
         title: game.i18n.localize(i18nStrings.title),
         tabs: [{ navSelector: '.log-tabs', contentSelector: '.log-body', initial: 'active' }]
      });
    }
}
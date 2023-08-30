import { constants } from "../../scripts/constants.js";

export default class ActorSheetL5eCompany extends ActorSheet {
    get template() {
        return constants.templates.companySheetTemplate;
    }

    /** @inheritDoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["dnd5e", "sheet", "actor", "group"],
            tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "members"}],
            scrollY: [".inventory .inventory-list"],
            width: 620,
            height: 620
        });
    }
  
    async getData(options={}) {
      const context = await super.getData(options);      
      return context;
    }
}
import { constants, i18nStrings, unitFlags } from "../../scripts/constants.js";
export default class ActorSheetL5eUnit extends ActorSheet {
  
    get template() {
      return constants.templates.unitSheetTemplate;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["dnd5e", "sheet", "actor", "unit"],
            width: 600
          });
    }  
    
    async getData(options={}) {
      const context = await super.getData(options);

      return foundry.utils.mergeObject(context, {
        unit: this.actor,
        system: this.actor.system,
        abilities: foundry.utils.deepClone(this.actor.system.abilities),
        attributes: foundry.utils.deepClone(this.actor.system.attributes),
        isLight: this.actor.system.attributes.utype === unitFlags.uTypes.light,
        isHeavy: this.actor.system.attributes.utype === unitFlags.uTypes.heavy,
        isMerc: this.actor.system.attributes.utype === unitFlags.uTypes.mercenary,
        config: {
          uTypes: i18nStrings.uTypes
        }
      });
    }
}
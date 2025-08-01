import { i18nStrings, unitChoices } from "../../scripts/constants.js";

export default class UnitL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            info: new fields.SchemaField({
                type: new fields.StringField({
                    choices: unitChoices.type,
                    initial: "light",
                    textSearch: true,
                }),                  
                price: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),              
            }),            
            trainning: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        };
    }

    /**@inheritdoc */
    prepareBaseData() {
        
    }

    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareDerivedData() {
        this.labels = {};

        // Prepare abilities.
        this._prepareAbilities()
    }

    /* -------------------------------------------- */

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        
    }

    /* -------------------------------------------- */
}
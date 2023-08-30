import { i18nStrings } from "../../scripts/constants.js";

export default class UnitL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            details: new fields.SchemaField({
                biography: new fields.SchemaField({
                    value: new fields.HTMLField({required: false, blank: true}),
                    public: new fields.HTMLField({required: false, blank: true})
                }),
                description: new fields.SchemaField({
                    full: new fields.HTMLField({required: false, blank: true}),
                    summary: new fields.HTMLField({required: false, blank: true})
                })
            }),          
            abilities: new fields.SchemaField({
                for: new fields.SchemaField({
                    value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                    bonuses: new fields.SchemaField({
                        check:  new fields.StringField({required: true, blank: true, initial: ""}),
                        save:  new fields.StringField({required: true, blank: true, initial: ""})
                    })
                }),
                mrl: new fields.SchemaField({
                    value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                    max:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                    temp: new fields.StringField({required: true, blank: true, initial: ""}),
                    tempMax: new fields.StringField({required: true, blank: true, initial: ""}),
                    bonuses: new fields.SchemaField({                        
                        check:  new fields.StringField({required: true, blank: true, initial: ""}),
                        save:  new fields.StringField({required: true, blank: true, initial: ""})
                    })
                }),
                wil: new fields.SchemaField({
                    value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                    bonuses: new fields.SchemaField({
                        check:  new fields.StringField({required: true, blank: true, initial: ""}),
                        save:  new fields.StringField({required: true, blank: true, initial: ""})
                    })
                }),              
            }),          
            attributes: new fields.SchemaField({
                utype:  new fields.StringField({required: true, blank: false, initial: "light"}),
                isolated: new fields.BooleanField({initial: false})
            })          
        };
    }
    
    prepareDerivedData() {        
        this.labels = {};

        // Prepare abilities
        this._prepareAbilities()
    }

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        for ( const [id, abl] of Object.entries(this.system.abilities) ) {  
            abl.label = game.i18n.localize(i18nStrings.uAbilities[id]);
            abl.mod = Math.floor((abl.value - 10) / 2);
            if ( !Number.isFinite(abl.max) ) abl.max = CONFIG.DND5E.maxAbilityScore;            
        }
    }

    /* -------------------------------------------- */
}
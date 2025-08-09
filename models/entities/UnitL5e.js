import { i18nStrings, unitChoices } from "../../scripts/constants.js";

export default class UnitL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            flavor: new fields.StringField({ textSearch: true }),
            description: new fields.StringField({ textSearch: true }),
            info: new fields.SchemaField({        
                company: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "TYPES.Actor.ldnd5e.company",
                }),                        
                type: new fields.StringField({
                    choices: unitChoices.type,
                    initial: "light",
                    textSearch: true,
                }),  
                category: new fields.StringField({                    
                    initial: "none",
                    textSearch: true,
                }), 
                price: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                              
            }),
            abilities: new fields.SchemaField({
                frt: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                    
                }),
                mrl: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                    
                }),
                wll: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                    
                }),
            }),
            combat: new fields.SchemaField({
                dsp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                    save: new fields.SchemaField({
                       value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }), 
                    }),                   
                }),
                enc: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                    
                }),
                def: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),                    
                }),
            }),            
            status: new fields.SchemaField({                
                isolated: new fields.BooleanField({ initial: false })
            }),
            tatics: new fields.ArrayField(new fields.StringField({ textSearch: true, label: "ldnd5e.tatics" })),
        };
    }

    /**@inheritdoc */
    prepareBaseData() {
        this.military = true;
        
        this.system = {
            info: this.info,
            abilities: this.abilities,
            combat: this.combat,
            status: this.status,
            tatics: this.tatics
        };
    }

    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareDerivedData() {
        this.labels = {};

        // Prepare abilities.
        this._prepareAbilities();

        // Prepare combat skills.
        this._prepareSkills();

        // Prepare saving throws.
        this._prepareSaves();
    }

    /* -------------------------------------------- */

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        for (const [id, abl] of Object.entries(this.system.abilities)) {
            abl.key = id;
            abl.label = game.i18n.localize(i18nStrings.uAbilities[id]);
            abl.mod = Math.abs(abl.value);
            abl.icon = `modules/ldnd5e/ui/abilities/${id}.svg`;
            abl.sign = (abl.value >= 0) ? "+" : "-";
            if (!Number.isFinite(abl.max)) abl.max = CONFIG.DND5E.maxAbilityScore;
        }
    }

    /* -------------------------------------------- */

    /**
   * Prepare combat skills.   
   * @protected
   */
    _prepareSkills() {
        const company = this.system.info.company;
        const prestige = Number(company?.system.attributes.prestige.mod ?? 0);
        const commander = company?.system.info.commander;

        for (const [id, skl] of Object.entries(this.system.combat)) {
            skl.key = id;
            skl.label = game.i18n.localize(i18nStrings.uCombat[id]);

            if(['dsp'].includes(id)) {
                skl.value = this.system.abilities.wll.value;

                skl.bonus = commander?.system.abilities.cha.mod ?? 0.
                skl.bonus += prestige;                
            } else if(['enc'].includes(id)) {
                skl.value = this.system.abilities.frt.value;

                skl.bonus = commander?.system.abilities.cha.mod ?? 0.
                skl.bonus += prestige;                
            } else if(['def'].includes(id)) {
                skl.value = this.system.abilities.mrl.value;

                skl.bonus = commander?.system.abilities.cha.mod ?? 0.
                skl.bonus += prestige;
            } else {
                skl.value = 0;
                skl.bonus = 0;
            }            

            skl.mod = Math.abs(skl.value + skl.bonus);
            skl.icon = unitChoices.uCombatIcons[id];
            skl.sign = (skl.value >= 0) ? "+" : "-";
        }
    }

    /* -------------------------------------------- */

    /**
   * Prepare saving throws.   
   * @protected
   */
    _prepareSaves() {
        const company = this.system.info.company;
        const commander = company?.system.info.commander;
        const prof = commander?.system.attributes.prof ?? 0;

        const dsp = this.system.combat.dsp;

        dsp.save.value = dsp.value + dsp.bonus + prof;

        dsp.save.mod = Math.abs(dsp.save.value);
        dsp.save.sign = (dsp.save.value >= 0) ? "+" : "-";
    }

    /* -------------------------------------------- */
}
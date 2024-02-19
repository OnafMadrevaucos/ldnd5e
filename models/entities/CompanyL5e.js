export default class CompanyL5e extends foundry.abstract.TypeDataModel {
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
        prestige: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
            mod: new fields.StringField({required: true, blank: true, initial: ""})
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
            })
        }),
        members: new fields.ArrayField(new fields.StringField()),
        units: new fields.SchemaField({
            light: new fields.StringField({required: true, blank: true}),
            heavy: new fields.StringField({required: true, blank: true}),
            merc: new fields.StringField({required: true, blank: true})
        }),
        attributes: new fields.SchemaField({
            movement: new fields.SchemaField({
                normal: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                full: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0})
            }),
            nobleTitle: new fields.StringField({required: true, blank: true, initial: ""}),
            ctype:  new fields.StringField({required: true, blank: true, initial: ""}),
            isolated: new fields.BooleanField({initial: false})
        }),
        treasure: new fields.SchemaField({
            currency: new fields.SchemaField({
                pp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                gp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                ep: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                sp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                cp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
            }),
            properties: new fields.ArrayField(new fields.StringField()),
        })
      };
    }
  
    prepareDerivedData() {
    }

    _prepareLabels(unit) {
        const cr = parseFloat(unit.system.details.cr ?? 0);
        const crLabels = {0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2"};

        // Ability Scores
        for ( const [a, abl] of Object.entries(unit.system.abilities) ) {
            this._getAbilitiesLabels(a, abl, unit.system);
        }

        return {
              cr: cr >= 1 ? String(cr) : crLabels[cr] ?? 1,
              type: unit.constructor.formatCreatureType(unit.system.details.type),
              armorType: this._getArmorLabel(unit)
            };
    }

    _prepareData(){
        const system = foundry.utils.deepClone(game.model["Actor"]['npc']);

        const cr = system.details.cr;
        // Proficiency
        system.attributes.prof = Math.floor((Math.max(cr, 1) + 7) / 4);

        this._prepareBaseAbilities(system);

        return system;
    }

    _prepareBaseAbilities(system){
        const lightData = this.units.light.actor?.system;
        const heavyData = this.units.heavy.actor?.system;
        const specialData = this.units.special.actor?.system;
        const onwerData = this.owner.system;

        if(!system.abilities["mrl"])
        {
            const mrl = foundry.utils.deepClone(game.system.template.Actor.templates.common.abilities.cha);
            mrl.value = 10;
            mrl.min = 0;
            system.abilities.mrl = mrl;
        }

        for ( const [id, abl] of Object.entries(system.abilities) ){

            abl.value = (lightData?.abilities[id].mod ?? 0) + 
                        (heavyData?.abilities[id].mod ?? 0) + 
                        (specialData?.abilities[id].mod ?? 0);
            
            abl.value += (!["mrl"].includes(id) ? (onwerData.abilities[id]?.mod ?? 0) : 0);
                                 
            this._prepareAbilities(abl, system);

            this._getAbilitiesLabels(id, abl, system);
        }       
    }

    _prepareAbilities(abl, system) { 
        const dcBonus = utils.simplifyBonus(system.bonuses?.spell?.dc);
        abl.mod = Math.floor((abl.value - 10) / 2);
        abl.checkProf = new documents.Proficiency(system.attributes.prof);
        const saveBonusAbl = utils.simplifyBonus(abl.bonuses?.save);
        abl.saveBonus = saveBonusAbl;
    
        abl.saveProf = new documents.Proficiency(system.attributes.prof, abl.proficient);
        const checkBonusAbl = utils.simplifyBonus(abl.bonuses?.check);
        abl.checkBonus = checkBonusAbl;
    
        abl.save = abl.mod + abl.saveBonus;
        if ( Number.isNumeric(abl.saveProf.term) ) abl.save += abl.saveProf.flat;
        abl.dc = 8 + abl.mod + system.attributes.prof + dcBonus;
    }

    /**
    * Get the font-awesome icon used to display a certain level of skill proficiency.
    * @param {number} level  A proficiency mode defined in `CONFIG.DND5E.proficiencyLevels`.
    * @returns {string}      HTML string for the chosen icon.
    * @private
    */
    _getProficiencyIcon(level) {
        const icons = {
            0: '<i class="far fa-circle"></i>',
            0.5: '<i class="fas fa-adjust"></i>',
            1: '<i class="fas fa-check"></i>',
            2: '<i class="fas fa-check-double"></i>'
        };
        return icons[level] || icons[0];
    }

    _getAbilitiesLabels(a, abl, system){
        abl.icon = this._getProficiencyIcon(abl.proficient);
        abl.hover = CONFIG.DND5E.proficiencyLevels[abl.proficient];
        abl.label = CONFIG.DND5E.abilities[a];
        abl.baseProf = system.abilities[a]?.proficient ?? 0;
    }

    _getArmorLabel(actor) {
        const ac = actor.system.attributes.ac;
        const label = [];
        if ( ac.calc === "default" ) label.push(actor.armor?.name || game.i18n.localize("DND5E.ArmorClassUnarmored"));
        else label.push(game.i18n.localize(CONFIG.DND5E.armorClasses[ac.calc].label));
        if ( actor.shield ) label.push(actor.shield.name);
        return label.filterJoin(", ");
    }
}

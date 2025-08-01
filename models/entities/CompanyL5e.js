import { i18nStrings, unitChoices } from "../../scripts/constants.js";

export default class CompanyL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        const data = {
            name: new fields.StringField({ required: true, label: "ldnd5e.company.name" }),
            info: new fields.SchemaField({
                org: new fields.StringField({ textSearch: true, required: true, label: "ldnd5e.company.org" }),
                commander: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "ldnd5e.company.commander",
                }),
                type: new fields.StringField({ required: true, label: "ldnd5e.company.type" }),
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
                })
            }),
            attributes: new fields.SchemaField({
                initiative: new fields.StringField({ required: true, nullable: false, integer: true, initial: "0" }),                
                hp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
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

            units: new fields.ArrayField(new fields.StringField({ textSearch: true, label: "ldnd5e.units" })),
        };

        return data;
    }

    /**
   * Prepare data related to this DataModel itself, before any derived data is computed.
   * @inheritdoc
   */
    prepareBaseData() {
        this.military = true;

        this.limits = {
            light: 2,
            heavy: 2,
            special: 1,
            medical: 1
        }

        this.system = {
            info: this.info,
            abilities: this.abilities,
            attributes: this.attributes,
            combat: this.combat,
            units: this.units
        }
    }

    /**@inheritdoc */
    prepareDerivedData() {          
    }

    /* -------------------------------------------- */

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        for (const [id, abl] of Object.entries(this.system.abilities)) {
            for (const uId of this.units) {
                const unit = game.actors.get(uId);
                const uAbl = unit.system?.abilities[id] ?? { value: 0 };
                abl.value += Math.abs(uAbl.value);
            }
            abl.key = id;
            abl.label = game.i18n.localize(i18nStrings.uAbilities[id]);
            abl.icon = `modules/ldnd5e/ui/abilities/${id}.svg`;
            abl.mod = Math.abs(abl.value);
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
        for (const [id, skl] of Object.entries(this.system.combat)) {
            for (const uId of this.units) {
                const unit = game.actors.get(uId);
                const uSkl = unit.system.combat[id] ?? { value: 0 };
                skl.value += Math.abs(uSkl.value);
            }

            skl.key = id;
            skl.label = game.i18n.localize(i18nStrings.uCombat[id]);
            skl.icon = unitChoices.uCombatIcons[id];
            skl.mod = Math.abs(skl.value);
            skl.sign = (skl.value >= 0) ? "+" : "-";
        }
    }

    /* -------------------------------------------- */

    _prepareUnits() {
        const units = {
            light: [],
            heavy: [],
            special: [],
            medical: []
        };

        for (const id of this.system.units) {
            const unit = game.actors.get(id);

            units[unit.system.info.type].push(unit);
        }

        this.unitActors = units;
    }

    /*
    _prepareLabels(unit) {
        const cr = parseFloat(unit.system.details.cr ?? 0);
        const crLabels = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };

        // Ability Scores
        for (const [a, abl] of Object.entries(unit.system.abilities)) {
            this._getAbilitiesLabels(a, abl, unit.system);
        }

        return {
            cr: cr >= 1 ? String(cr) : crLabels[cr] ?? 1,
            type: unit.constructor.formatCreatureType(unit.system.details.type),
            armorType: this._getArmorLabel(unit)
        };
    }

    _prepareData() {
        const system = foundry.utils.deepClone(game.model["Actor"]['npc']);

        const cr = system.details.cr;
        // Proficiency
        system.attributes.prof = Math.floor((Math.max(cr, 1) + 7) / 4);

        this._prepareBaseAbilities(system);

        return system;
    }

    _prepareBaseAbilities(system) {
        const lightData = this.units.light.actor?.system;
        const heavyData = this.units.heavy.actor?.system;
        const specialData = this.units.special.actor?.system;
        const onwerData = this.owner.system;

        if (!system.abilities["mrl"]) {
            const mrl = foundry.utils.deepClone(game.system.template.Actor.templates.common.abilities.cha);
            mrl.value = 10;
            mrl.min = 0;
            system.abilities.mrl = mrl;
        }

        for (const [id, abl] of Object.entries(system.abilities)) {

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
        if (Number.isNumeric(abl.saveProf.term)) abl.save += abl.saveProf.flat;
        abl.dc = 8 + abl.mod + system.attributes.prof + dcBonus;
    }

    /**
    * Get the font-awesome icon used to display a certain level of skill proficiency.
    * @param {number} level  A proficiency mode defined in `CONFIG.DND5E.proficiencyLevels`.
    * @returns {string}      HTML string for the chosen icon.
    * @private
    *//*
    _getProficiencyIcon(level) {
        const icons = {
            0: '<i class="far fa-circle"></i>',
            0.5: '<i class="fas fa-adjust"></i>',
            1: '<i class="fas fa-check"></i>',
            2: '<i class="fas fa-check-double"></i>'
        };
        return icons[level] || icons[0];
    }

    _getAbilitiesLabels(a, abl, system) {
        abl.icon = this._getProficiencyIcon(abl.proficient);
        abl.hover = CONFIG.DND5E.proficiencyLevels[abl.proficient];
        abl.label = CONFIG.DND5E.abilities[a];
        abl.baseProf = system.abilities[a]?.proficient ?? 0;
    }

    _getArmorLabel(actor) {
        const ac = actor.system.attributes.ac;
        const label = [];
        if (ac.calc === "default") label.push(actor.armor?.name || game.i18n.localize("DND5E.ArmorClassUnarmored"));
        else label.push(game.i18n.localize(CONFIG.DND5E.armorClasses[ac.calc].label));
        if (actor.shield) label.push(actor.shield.name);
        return label.filterJoin(", ");
    }
    */
}

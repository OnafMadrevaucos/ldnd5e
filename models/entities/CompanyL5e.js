import { i18nStrings, unitChoices } from "../../scripts/constants.js";

export default class CompanyL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        const data = {
            name: new fields.StringField({ required: true, label: "ldnd5e.company.name" }),
            info: new fields.SchemaField({
                description: new fields.StringField({ required: true, label: "ldnd5e.company.description" }),
                flavor: new fields.StringField({ required: true, label: "ldnd5e.company.flavor" }),
                army: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "TYPES.Actor.ldnd5e.army",
                }),
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
                affinity: new fields.SchemaField({
                    class: new fields.StringField({ required: true }),
                    hitDice: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 8 }),
                    baseAbilities: new fields.ArrayField(new fields.StringField({ textSearch: true })),
                    bonus: new fields.SchemaField({
                        value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                        prof: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                        prestige: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                    }),
                }),
                initiative: new fields.StringField({ required: true, nullable: false, integer: true, initial: "0" }),
                hp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: true, integer: true }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                }),
                stamina: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: true, integer: true }),
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

    /* -------------------------------------------- */
    /*  Preparation Functions                       */
    /* -------------------------------------------- */

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
        const army = this.system.info.army;
        this.system.attributes.prestige = army?.system.prestige ?? { mod: "+0" };

        // Prepare the company's abilities.
        this._prepareAbilities();
        // Prepare the company's attributes.
        this._prepareAttributes();
        // Prepare the company's combat skills.
        this._prepareCombatSkills();
        // Prepare the company's saves.
        this._prepareSaves();

        // Sort the units by type.
        this._prepareUnits();
    }

    /* -------------------------------------------- */

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        for (const [id, abl] of Object.entries(this.system.abilities)) {
            let maxValue = Number.MIN_SAFE_INTEGER;

            // Safe max value for the ability.
            abl.value = 0;

            // Obtain the max value between all units for thes. ability.
            for (const uId of this.units) {
                const unit = game.actors.get(uId);

                // Ignore medical units, for it doesn't count as a combat unit.
                if (unit.system.info.type === unitChoices.uTypes.medical) continue;

                const uAbl = unit.system?.abilities[id] ?? { value: 0 };
                abl.value = maxValue = Math.max(maxValue, uAbl.value);
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
   * Prepare attributes.   
   * @protected
   */
    _prepareAttributes() {
        const data = this.system;

        // Hit Dice largest face from the commander's original class.
        const hitDice = data.attributes.affinity.hitDice;

        let stamina = 0;
        let totalHP = 0;

        // Count the number of combat units.
        for (const uId of this.units) {
            const unit = game.actors.get(uId);

            // Ignore medical units, for it doesn't count as a combat unit.
            if (unit.system.info.type === unitChoices.uTypes.medical) continue;

            stamina += unit.system.abilities.frt.value;
            totalHP += (unit.system.abilities.mrl.value + unit.system.abilities.wll.value) * hitDice;
        }

        data.attributes.stamina.max = stamina;
        data.attributes.stamina.value = Math.min(data.attributes.stamina.value, data.attributes.stamina.max);
        data.attributes.stamina.pct = (data.attributes.stamina.value / data.attributes.stamina.max) * 100;

        data.attributes.hp.max = totalHP;
        data.attributes.hp.value = Math.min(data.attributes.hp.value, data.attributes.hp.max);
        data.attributes.hp.pct = (data.attributes.hp.value / data.attributes.hp.max) * 100;
    }

    /* -------------------------------------------- */

    /**
   * Prepare combat skills.   
   * @protected
   */
    _prepareCombatSkills() {
        const companyData = this.system;

        // Army's prestige modifier.
        const prestige = companyData.attributes.affinity.bonus.prestige;
        
        // Commander's charisma modifier.
        const bonus = companyData.attributes.affinity.bonus.value;

        for (const [id, skl] of Object.entries(this.system.combat)) {
            let unitCount = 0;

            // Count the number of combat units.
            for (const uId of this.units) {
                const unit = game.actors.get(uId);

                // Ignore medical units, for it doesn't count as a combat unit.
                if (unit.system.info.type === unitChoices.uTypes.medical) continue;

                unitCount++;
            }

            // Company has at least one combat unit. Compute the skill value.
            if (unitCount > 0) {
                if (['dsp'].includes(id)) {
                    skl.value = this.system.abilities.wll.value;
                    skl.bonus = bonus + prestige;
                } else if (['enc'].includes(id)) {
                    skl.value = this.system.abilities.frt.value;
                    skl.bonus = bonus + prestige;
                } else if (['def'].includes(id)) {
                    skl.value = this.system.abilities.mrl.value;
                    skl.bonus = bonus + prestige;
                }
            }
            // Company has no combat units, so it has no skill value. 
            else {
                skl.value = 0;
                skl.bonus = 0;
            }

            skl.key = id;
            skl.label = game.i18n.localize(i18nStrings.uCombat[id]);
            skl.icon = unitChoices.uCombatIcons[id];
            skl.mod = Math.abs(skl.value + skl.bonus);
            skl.sign = (skl.value >= 0) ? "+" : "-";
        }
    }

    /* -------------------------------------------- */

    /**
   * Prepare saving throws.  
   * @protected
   */
    _prepareSaves() {
        const companyData = this.system;        
        const prof = companyData.attributes.affinity.bonus.prof;

        // Army's prestige modifier.
        const prestige = companyData.attributes.affinity.bonus.prestige;

        const dsp = this.system.combat.dsp;
        dsp.save.value = dsp.value + prof + prestige;

        dsp.save.mod = Math.abs(dsp.save.value);
        dsp.save.sign = (dsp.value >= 0) ? "+" : "-";
    }

    /* -------------------------------------------- */

    /** 
     * Prepare rendering context for the header.
     * @protected
     */
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

        this.unitsList = units;
    }

    /* -------------------------------------------- */
    /*  Utility Functions                           */
    /* -------------------------------------------- */

    /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   */
    getRollData() {
        let data = {
            army: this.system.info.army ?? null,

            abilities: this.system.abilities,
            attributes: this.system.attributes,
            skill: this.system.combat
        };

        data.prestige = data.attributes.affinity.bonus.prestige;

        // TODO: Add affinity check between company's units and the commander.
        data.prof = data.attributes.affinity.bonus.prof;

        data.flags = { ...this.flags };
        data.name = this.name;
        return data;
    }

    /* -------------------------------------------- */
    /*  Dice Roll Functions                         */
    /* -------------------------------------------- */

    /**
   * Roll an Ability Check.
   * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
   * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
   * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
   * @returns {Promise<D20Roll[]|null>}                        A Promise which resolves to the created Roll instance.
   */
    async rollAbilityCheck(config = {}, dialog = {}, message = {}) {
        const abilityLabel = game.i18n.localize(i18nStrings.uAbilities[config.ability]) ?? "";
        const dialogConfig = foundry.utils.mergeObject({
            options: {
                window: {
                    title: game.i18n.format("DND5E.AbilityPromptTitle", { ability: abilityLabel }),
                    subtitle: this.name
                }
            }
        }, dialog);
        return this.#rollD20Test("check", config, dialogConfig, message);
    }

    /* -------------------------------------------- */

    /**
     * Roll a Saving Throw.
     * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
     * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
     * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
     * @returns {Promise<D20Roll[]|null>}                        A Promise which resolves to the created Roll instances.
     */
    async rollSavingThrow(config = {}, dialog = {}, message = {}) {
        const abilityLabel = game.i18n.localize(i18nStrings.uCombat[config.skill]) ?? "";
        const dialogConfig = foundry.utils.mergeObject({
            options: {
                window: {
                    title: game.i18n.format("DND5E.SavePromptTitle", { ability: abilityLabel }),
                    subtitle: this.name
                }
            }
        }, dialog);
        return this.#rollD20Test("save", config, dialogConfig, message);
    }

    /* -------------------------------------------- */

    /**
   * Roll an Ability Check.
   * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
   * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
   * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
   * @returns {Promise<D20Roll[]|null>}                        A Promise which resolves to the created Roll instance.
   */
    async rollSkill(config = {}, dialog = {}, message = {}) {
        const abilityLabel = game.i18n.localize(i18nStrings.uCombat[config.skill]) ?? "";
        const dialogConfig = foundry.utils.mergeObject({
            options: {
                window: {
                    title: game.i18n.format("DND5E.AbilityPromptTitle", { ability: abilityLabel }),
                    subtitle: this.name
                }
            }
        }, dialog);
        return this.#rollD20Test("skill", config, dialogConfig, message);
    }

    /* -------------------------------------------- */

    /**
     * @typedef {D20RollProcessConfiguration} AbilityRollProcessConfiguration
     * @property {string} [ability]  ID of the ability to roll as found in `CONFIG.DND5E.abilities`.
     */

    /**
     * Shared rolling functionality between ability checks & saving throws.
     * @param {"check"|"save"} type                     D20 test type.
     * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
     * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
     * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
     * @returns {Promise<D20Roll[]|null>}               A Promise which resolves to the created Roll instance.
     */
    async #rollD20Test(type, config = {}, dialog = {}, message = {}) {
        let oldFormat = false;
        const name = type === "check" ? "AbilityCheck" : (type === "skill" ? "SkillCheck" : "SavingThrow");

        const ability = ["skill", "save"].includes(type) ? this.system.combat?.[config.skill] : this.system.abilities?.[config.ability];
        const abilityLabel = ["skill", "save"].includes(type) ? game.i18n.localize(i18nStrings.uCombat[config.skill])
            : game.i18n.localize(i18nStrings.uAbilities[config.ability]) ?? "";

        const rollData = this.getRollData();
        let { parts, data } = CONFIG.Dice.BasicRoll.constructParts({
            mod: ability?.value,
            prof: rollData.prof,
            bonus: type === 'save' ? rollData.prestige : null,
        }, rollData);
        const options = {};

        const rollConfig = config;
        rollConfig.hookNames = [...(config.hookNames ?? []), name, "d20Test"];
        rollConfig.rolls = [
            CONFIG.Dice.BasicRoll.mergeConfigs({ parts, data, options }, config.rolls?.shift())
        ].concat(config.rolls ?? []);
        rollConfig.subject = this;

        const dialogConfig = foundry.utils.deepClone(dialog);

        const messageConfig = foundry.utils.mergeObject({
            create: true,
            data: {
                flags: {
                    dnd5e: {
                        messageType: "roll",
                        roll: {
                            ability: ["skill", "save"].includes(type) ? config.skill : config.ability,
                            type: type === "check" ? "ability" : "save"
                        }
                    }
                },
                flavor: game.i18n.format(
                    `DND5E.${["skill", "check"].includes(type) ? "Ability" : "Save"}PromptTitle`, { ability: abilityLabel }
                ),
                speaker: message.speaker ?? ChatMessage.getSpeaker({ actor: this })
            }
        }, message);

        const rolls = await CONFIG.Dice.D20Roll.build(rollConfig, dialogConfig, messageConfig);

        // TODO: Temporary fix to re-apply roll mode back to original config object to allow calling methods to
        // access the roll mode set in the dialog. There should be a better fix for this that works for all rolls.
        message.rollMode = messageConfig.rollMode;

        if (!rolls.length) return null;

        /**
         * A hook event that fires after an ability check or save has been rolled.
         * @function dnd5e.rollAbilityCheck
         * @function dnd5e.rollSavingThrow
         * @memberof hookEvents
         * @param {D20Roll[]} rolls       The resulting rolls.
         * @param {object} data
         * @param {string} data.ability   ID of the ability that was rolled as defined in `CONFIG.DND5E.abilities`.
         * @param {Actor5e} data.subject  Actor for which the roll has been performed.
         */
        Hooks.callAll(`dnd5e.roll${name}`, rolls, { ability: config.ability, subject: this });

        return oldFormat ? rolls[0] : rolls;
    }
}

import { i18nStrings, unitData } from "../../scripts/constants.js";

const DND5E = dnd5e.config;

export default class CompanyL5e extends foundry.abstract.TypeDataModel {
    constructor(data, options) {
        super(data, options);

        const i = 0;
    }

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
            currency: new fields.SchemaField({
                cp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
                }),
                sp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
                }),
                gp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
                }),
                ep: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
                }),
                pp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
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
                    value: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
                }),
            }),
            units: new fields.ArrayField(new fields.StringField({ textSearch: true, label: "ldnd5e.units" })),
            trigger: new fields.BooleanField({ required: true, nullable: false, initial: true })
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
    }

    /**@inheritdoc */
    prepareDerivedData() {
        const army = this.info.army;
        this.attributes.prestige = army?.system.prestige ?? { mod: "+0" };

        // Prepare the company's abilities.
        this._prepareAbilities();
        // Prepare the company's attributes.
        this._prepareAttributes();
        // Prepare the company's combat skills.
        this._prepareCombatSkills();
        // Prepare the company's saves.
        this._prepareSaves();

        // Prepare the company's currency.
        this._prepareCurrency();

        // Sort the units by type.
        this._prepareUnits();
    }

    /* -------------------------------------------- */

    /**
   * Prepare abilities.   
   * @protected
   */
    _prepareAbilities() {
        const abilities = {
            frt: { value: Number.MIN_SAFE_INTEGER },
            mrl: { value: Number.MIN_SAFE_INTEGER },
            wll: { value: Number.MIN_SAFE_INTEGER }
        };
        // Obtain the max value between all units for thes. ability.
        for (const uId of this.units) {
            const unit = game.actors.get(uId);

            // Ignore if the unit doesn't exist.
            if (!unit) continue;

            // Ignore medical units, for it doesn't count as a combat unit.
            if (unit.system.info.type === unitData.uTypes.medical) continue;

            for (const [id, abl] of Object.entries(unit.system.abilities)) {
                // Safe max value for the ability.
                abilities[id].value = Math.max(abilities[id].value, abl.value);


                abilities[id].key = id;
                abilities[id].label = game.i18n.localize(i18nStrings.uAbilities[id]);
                abilities[id].icon = `modules/ldnd5e/ui/abilities/${id}.svg`;
                abilities[id].mod = Math.abs(abilities[id].value);
                abilities[id].sign = (abilities[id].value >= 0) ? "+" : "-";
                if (!Number.isFinite(abilities[id].max)) abilities[id].max = CONFIG.DND5E.maxAbilityScore;
            }
        }

        this.abilities = abilities;
    }

    /* -------------------------------------------- */

    /**
   * Prepare attributes.   
   * @protected
   */
    _prepareAttributes() {
        // Hit Dice largest face from the commander's original class.
        const hitDice = this.attributes.affinity.hitDice;

        let stamina = 0;
        let totalHP = 0;

        this.attributes.trainning = {
            value: 0,
            max: 0
        };

        // Count the number of combat units.
        for (const uId of this.units) {
            const unit = game.actors.get(uId);

            // Ignore if the unit doesn't exist.
            if (!unit) continue;

            // Ignore medical units, for it doesn't count as a combat unit.
            if (unit.system.info.type === unitData.uTypes.medical) continue;

            stamina += unit.system.abilities.frt.value;
            totalHP += (unit.system.abilities.mrl.value + unit.system.abilities.wll.value) * hitDice;
        }

        this.attributes.stamina.max = stamina ?? 0;
        this.attributes.stamina.value = Math.min(this.attributes.stamina.value, this.attributes.stamina.max);
        this.attributes.stamina.pct = (this.attributes.stamina.value / this.attributes.stamina.max) * 100;

        this.attributes.hp.max = totalHP;
        this.attributes.hp.value = Math.min(this.attributes.hp.value, this.attributes.hp.max);
        this.attributes.hp.pct = (this.attributes.hp.value / this.attributes.hp.max) * 100;
    }

    /* -------------------------------------------- */

    /**
   * Prepare combat skills.   
   * @protected
   */
    _prepareCombatSkills() {
        const combat = {
            dsp: {
                value: Number.MIN_SAFE_INTEGER,
                save: {
                    value: Number.MIN_SAFE_INTEGER,
                },
            },
            enc: {
                value: Number.MIN_SAFE_INTEGER,
            },
            def: {
                value: Number.MIN_SAFE_INTEGER,
            },
        };
        const prestige = Number(this.attributes.prestige.mod ?? 0);
        const commander = this.info.commander;

        // Commander's charisma modifier.
        const bonus = this.attributes.affinity.bonus.value;

        // Count the number of combat units.
        for (const uId of this.units) {
            const unit = game.actors.get(uId);
            // Ignore if the unit doesn't exist.
            if (!unit) continue;

            // Ignore medical units, for it doesn't count as a combat unit.
            if (unit.system.info.type === unitData.uTypes.medical) continue;

            for (const [id, skl] of Object.entries(unit.system.combat)) {
                if (['dsp'].includes(id) && skl.value > combat[id].value) {
                    combat[id].value = this.abilities.wll.value;

                    combat[id].bonus = commander?.system.abilities.cha.mod ?? 0.
                    combat[id].bonus += prestige;
                } else if (['enc'].includes(id) && skl.value > combat[id].value) {
                    combat[id].value = this.abilities.frt.value;

                    combat[id].bonus = commander?.system.abilities.cha.mod ?? 0.
                    combat[id].bonus += prestige;
                } else if (['def'].includes(id) && skl.value > combat[id].value) {
                    combat[id].value = this.abilities.mrl.value;

                    combat[id].bonus = commander?.system.abilities.cha.mod ?? 0.
                    combat[id].bonus += prestige;
                }

                combat[id].key = id;
                combat[id].label = game.i18n.localize(i18nStrings.uCombat[id]);
                combat[id].icon = unitData.uCombatIcons[id];
                combat[id].mod = Math.abs(combat[id].value + combat[id].bonus);
                combat[id].sign = (combat[id].value >= 0) ? "+" : "-";
            }
        }

        this.combat = combat;
    }

    /* -------------------------------------------- */

    /**
   * Prepare saving throws.  
   * @protected
   */
    _prepareSaves() {
        const prof = this.attributes.affinity.bonus.prof;

        const dsp = this.combat.dsp;
        dsp.save.value = dsp.value;

        dsp.save.bonus = dsp.bonus + prof;
        dsp.save.mod = Math.abs(dsp.save.value + dsp.save.bonus);
        dsp.save.sign = (dsp.save.value >= 0) ? "+" : "-";
    }

    /* -------------------------------------------- */

    /**
    * Prepare actor currency for display.
    * @protected
    */
    _prepareCurrency() {
        Object.entries(this.currency).forEach(([k, v]) => {
            this.currency[k].key = k;
            this.currency[k].label = game.i18n.localize(DND5E.currencies[k].label);
        });
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

        for (const id of this.units) {
            const unit = game.actors.get(id);

            // Ignore if the unit doesn't exist.
            if (!unit) continue;

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
            army: this.info.army ?? null,

            abilities: this.abilities,
            attributes: this.attributes,
            skill: this.combat
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

        const ability = ["skill", "save"].includes(type) ? this.combat?.[config.skill] : this.abilities?.[config.ability];
        const abilityLabel = ["skill", "save"].includes(type) ? game.i18n.localize(i18nStrings.uCombat[config.skill])
            : game.i18n.localize(i18nStrings.uAbilities[config.ability]) ?? "";

        const rollData = this.getRollData();
        let { parts, data } = CONFIG.Dice.BasicRoll.constructParts({
            mod: ability?.value,
            bonus: ability?.bonus,
            prof: (type === 'save' ? rollData.prof : null),
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

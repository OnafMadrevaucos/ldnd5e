import { i18nStrings, unitChoices } from "../../scripts/constants.js";

export default class UnitL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            info: new fields.SchemaField({
                flavor: new fields.StringField({ textSearch: true }),
                description: new fields.StringField({ textSearch: true }),
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
        };
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The chosen activity.
     * @type {Activity|null}
     */
    get isMedical() {
        return this.info.type === unitChoices.uTypes.medical;
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

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

        const company = this.system.info.company;
        this.system.attributes = {
            prestige: company?.system.attributes.prestige ?? { mod: "+0" },
            prof: company?.system.attributes.affinity.bonus.prof ?? 0,
        }       

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

            if (['dsp'].includes(id)) {
                skl.value = this.system.abilities.wll.value;

                skl.bonus = commander?.system.abilities.cha.mod ?? 0.
                skl.bonus += prestige;
            } else if (['enc'].includes(id)) {
                skl.value = this.system.abilities.frt.value;

                skl.bonus = commander?.system.abilities.cha.mod ?? 0.
                skl.bonus += prestige;
            } else if (['def'].includes(id)) {
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
        const prof = this.system.attributes.prof ?? 0;

        const dsp = this.system.combat.dsp;

        dsp.save.value = dsp.value + dsp.bonus + prof;

        dsp.save.mod = Math.abs(dsp.save.value);
        dsp.save.sign = (dsp.save.value >= 0) ? "+" : "-";
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
            company: this.system.info.company ?? null,

            abilities: this.system.abilities,
            attributes: this.system.attributes,
            skill: this.system.combat
        };

        data.prestige = data.attributes.prestige;

        // TODO: Add affinity check between company's units and the commander.
        data.prof = data.attributes.prof;

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
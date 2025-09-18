import { i18nStrings } from "../../scripts/constants.js";

export default class TaticsL5e extends foundry.abstract.TypeDataModel {

    /** @inheritDoc */
    static metadata = Object.freeze({
        hasEffects: false
    });


    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            // Nome da Tática.
            name: new fields.StringField({ required: true, label: "ldnd5e.tatics.name" }),
            // Intensidade de Treinamento da Tática (número de cartas dessa Tática no baralho).
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0 }),
            info: new fields.SchemaField({
                flavor: new fields.StringField({ textSearch: true, initial: "" }),
                description: new fields.StringField({ textSearch: true, initial: "" }),
                // Unidade a que a Tática pertence.
                unit: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "TYPES.Actor.ldnd5e.unit",
                }),
                // Nível de Complexidade (NC) da Tática.
                cr: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                // Preço da Tática.
                price: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                    denomination: new fields.StringField({
                        required: true,
                        nullable: false,
                        initial: "gp",
                        choices: dnd5e.config.currencies,
                    }),
                }),
            }),
            // Flag indicando se a Tática está sendo treinada.
            trainning: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            // Flag indicando se a Tática é a habilidade de recuperação da unidade médica.
            mainRecovery: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            attributes: new fields.SchemaField({
                // Se a Tática é uma ação de preparação.
                prep: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática é uma ação de surpresa.
                surp: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática é uma ação de reação.
                reac: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática se mantém permanentemente durante a batalha.
                pers: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            }),
            // Lista de Atividades que a Tática fornece.
            activities: new fields.ObjectField({ required: true, nullable: false }),
        };
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareBaseData() {
        this.system = {
            info: this.info,
            quantity: this.quantity,
            trainning: this.trainning,
            attributes: this.attributes,
            activities: this.activities,
        }
    }

    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareDerivedData() {
        this.labels = {};

        // Main recoveries only can be used on the Preparation Phase.
        if (this.system.mainRecovery) {
            this.system.attributes.surp = false;
            this.system.attributes.reac = false;
            this.system.attributes.pers = false;
        }
    }

    /* -------------------------------------------- */
    /*  Utility Functions                           */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async getSheetData(context) {
        const unit = this.parent.actor;
        const impetus = unit?.system.abilities.frt.value ?? 0;

        context.info = [{
            label: "ldnd5e.tatics.impetus",
            classes: "info-lg",
            value: dnd5e.utils.formatModifier(impetus)
        }];

        if (Object.keys(this.system.activities).length > 0) {
            context.info.push({
                value: Object.values(this.system.activities).reduce((a, b) => {
                    const formula = `${b.number}d${b.die}${b.bonus}`;

                    return `${a}
                    <span class="formula rollable" data-action="roll" data-type="activity" data-id="${b.id}" data-tooltip aria-label="${b.name}">${formula}</span>
                    <span class="damage-type" data-tooltip aria-label="${game.i18n.localize(`ldnd5e.tatics.activities.${b.type}`)}">
                        <dnd5e-icon src="modules/ldnd5e/ui/icons/${b.type}.svg"></dnd5e-icon>
                    </span>
                    `;
                }, ""),
                classes: "info-grid damage"
            });
        }
    }

    /* -------------------------------------------- */

    /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   */
    getRollData() {
        let data = {};

        data.flags = { ...this.flags };
        data.name = this.name;
        return data;
    }

    /* -------------------------------------------- */
    /*  Dice Roll Functions                         */
    /* -------------------------------------------- */

    /**
   * Roll an Activity Check.
   * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
   * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
   * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
   * @returns {Promise<DamageRoll[]|null>}                     A Promise which resolves to the created Roll instance.
   */
    async rollActivity(config = {}, dialog = {}, message = {}) {
        const result = await this.#rollDice(config, dialog, message);
        return result;
    }

    /* -------------------------------------------- */

    /**
     * Perform a damage roll.
     * @param {Partial<AbilityRollProcessConfiguration>} config  Configuration information for the roll.
     * @param {Partial<BasicRollDialogConfiguration>} dialog     Configuration for the roll dialog.
     * @param {Partial<BasicRollMessageConfiguration>} message   Configuration for the roll message.
     * @returns {Promise<void>}
     */
    async #rollDice(config, dialog, message) {
        const { activity, event } = config;

        const attackMode = "roll";
        const rollType = "damage";
        const formula = `${activity.number}d${activity.die}${activity.bonus}`;
        const damageType = activity.type;

        const rollConfig = {
            attackMode, event,              
            rolls: [{
                parts: [formula],
                options: { type: damageType, types }
            }],
        };

        rollConfig.subject = this;

        const dialogConfig = foundry.utils.mergeObject({
            options: {
                position: {
                    width: 400,
                    top: config.event ? config.event.clientY - 80 : null,
                    left: window.innerWidth - 710
                },
                window: {
                    title: activity.name,
                    subtitle: this.parent.name,
                    icon: this.parent.img
                }
            }
        }, dialog);

        const messageConfig = {
            create: true,
            data: {
                flags: {
                    dnd5e: {
                        messageType: "roll",
                        roll: { type: rollType },
                        targets: this.getTargetDescriptors()
                    }
                },
                flavor: `${this.parent.name} - ${activity.name}`,
                speaker: message.speaker ?? ChatMessage.getSpeaker({ actor: this.parent.actor }),
            }
        };

        const rolls = await CONFIG.Dice.DamageRoll.build(rollConfig, dialogConfig, messageConfig);
        if (!rolls?.length) return;

        const result = {
            unit: this.parent.actor,
            activity: activity,
            tatic: {
                uuid: this.parent.uuid,
                name: this.parent.name
            },
            damageType,
            formula,
            total: rolls.reduce((a, b) => a + b.total, 0),
            rolls
        };        

        return result;
    }

    /* -------------------------------------------- */
    /*  Targeting                                   */
    /* -------------------------------------------- */

    /**
     * Important information on a targeted token.
     *
     * @typedef {object} TargetDescriptor5e
     * @property {string} uuid  The UUID of the target.
     * @property {string} img   The target's image.
     * @property {string} name  The target's name.
     * @property {number} ac    The target's armor class, if applicable.
     */

    /**
     * Grab the targeted tokens and return relevant information on them.
     * @returns {TargetDescriptor[]}
     */
    getTargetDescriptors() {
        const targets = new Map();
        for (const token of game.user.targets) {
            const { name } = token;
            const { img, system, uuid, statuses } = token.actor ?? {};
            if (uuid) {
                const ac = statuses.has("coverTotal") ? null : system.attributes?.ac?.value;
                targets.set(uuid, { name, img, uuid, ac: ac ?? null });
            }
        }
        return Array.from(targets.values());
    }
}
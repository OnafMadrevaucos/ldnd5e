export default class EventsL5e extends foundry.abstract.TypeDataModel {

    /** @inheritDoc */
    static metadata = Object.freeze({
        hasEffects: false,
    });

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            name: new fields.StringField({ required: true, label: "ldnd5e.events.name" }),
            info: new fields.SchemaField({
                flavor: new fields.StringField({ textSearch: true, initial: "" }),
                description: new fields.StringField({ textSearch: true, initial: "" }),
                // Preço do efeito do Evento.
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
            attributes: new fields.SchemaField({
                // Se o Evento causa baixas.
                baix: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se o Evento gera um tipo de informação.
                infr: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se o Evento causa alguma limitação.
                limt: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se o Evento causa algum efeito na fase de Preparação.
                prep: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se o Evento gera um tipo de impasse.
                imps: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            }),
            // Lista de Atividades que o Evento fornece.
            activities: new fields.ObjectField({ required: true, nullable: false }),
        };
    }
    /* -------------------------------------------- */
    /*  Utility Functions                           */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async getSheetData(context) {
        const unit = this.parent.actor;
        const impetus = unit?.system.abilities.frt.value ?? 0;

        context.info = [];

        if (Object.keys(this.activities).length > 0) {
            context.info.push({
                value: `<div class="info-lg">
                    <div class="label">Mod.</div>
                    <div class="value">
                    ${Object.values(this.activities).reduce((a, b) => {
                    const formula = `${b.number}d${b.die}${b.bonus}`;

                    return `${a}
                            <span class="formula" data-type="activity" data-id="${b.id}" data-tooltip aria-label="${b.name}">${formula}</span>
                            <span class="damage-type" data-tooltip aria-label="${game.i18n.localize(`ldnd5e.tatics.activities.${b.type}`)}">
                                <dnd5e-icon src="modules/ldnd5e/ui/icons/${b.type}.svg"></dnd5e-icon>
                            </span>
                        `;
                }, "")}</div></div>`,
                classes: "info-grid damage"
            });
        }
    }

    /* -------------------------------------------- */
    

    /**
    * @inheritdoc
    */
    toDragData() {
        return {
            type: "ldnd5e.event",
            uuid: this.uuid
        };
    }

    /* -------------------------------------------- */

    /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   */
    getRollData() {
        let data = this;

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
        const eventType = activity.type;

        const rollConfig = {
            attackMode,
            event,
            data: this.getRollData(),
            rolls: [{
                parts: [formula],
                options: { type: eventType, targetField: 'a', fields: ['a', 'e'] }
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
                        targets: null
                    }
                },
                flavor: `${this.parent.name} - ${activity.name}`,
                speaker: message.speaker ?? ChatMessage.getSpeaker({ actor: game.user.character }),
            }
        };

        const rolls = await CONFIG.Dice.TaticsRoll.build(rollConfig, dialogConfig, messageConfig);
        if (!rolls?.length) return;

        const result = {
            unit: this.parent.actor,
            activity: activity,
            tatic: {
                uuid: this.parent.uuid,
                name: this.parent.name
            },
            damageType: eventType,
            targetField: rolls[0].options.targetField,
            formula,
            total: rolls.reduce((a, b) => a + b.total, 0),
            rolls
        };

        return result;
    }
}
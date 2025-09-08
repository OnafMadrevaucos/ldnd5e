import { unitData } from "../../scripts/constants.js";

const api = dnd5e.applications.api;

export default class MedicalRestaurationBrowser extends api.Dialog5e {
    constructor(config, options = {}) {
        super(options);

        this.config = foundry.utils.mergeObject({
            rolls: {}
        }, config);

        this.document = config.document;

        this.#unit = config.unit;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["company", "restauration", "dialog"],
        window: {
            title: "ldnd5e.tatics.activityTitle"
        },
        form: {
            handler: MedicalRestaurationBrowser.#handleFormSubmission
        },
        actions: {
            rollRestActivity: MedicalRestaurationBrowser.#rollRestActivity
        },
        position: {
            width: 400
        },
        buildConfig: null
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        body: {
            template: "modules/ldnd5e/templates/dialogs/medical-restauration/body.hbs"
        },
        footer: {
            template: "modules/ldnd5e/templates/dialogs/medical-restauration/footer.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The chosen activity.
     * @type {Activity|null}
     */
    get unit() {
        return this.#unit ?? null;
    }

    #unit;

    get rested() {
        return this.#rested ?? false;
    }

    #rested = false;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        if (options.isFirstRender) options.window.icon ||= this.#unit.img;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = { ...(await super._preparePartContext(partId, context, options)) };

        context.recoveryTatics = this.unit.items.filter(i => i.system.mainRecovery).map(i => {
            return {
                id: i.id,
                name: i.name,
                img: {
                    src: i.img,
                    svg: i.img.endsWith(".svg") ?? false
                },
                activities: Object.values(i.system.activities).map(a => {
                    return {
                        id: a.id,
                        name: a.name,
                        type: a.type,
                        formula: `${a.number}d${a.die}${a.bonus}`,
                        icon: {
                            src: `modules/ldnd5e/ui/icons/${a.type}.svg`,
                            svg: true
                        },
                    }
                })
            };
        });
        context.noTatics = context.recoveryTatics.length === 0;

        if (!context.noTatics) {

        }

        if (partId === "body") return this._prepareBodyContext(context, options);
        if (partId === "footer") return this._prepareFooterContext(context, options);
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the main body section.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _prepareBodyContext(context, options) {
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the buttons.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _prepareFooterContext(context, options) {
        return context;
    }


    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
   * Handle submission of the dialog using the form buttons.
   * @this {MedicalRestaurationBrowser}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
    static async #handleFormSubmission(event, form, formData) {
        foundry.utils.mergeObject(this.config, formData.object);
        this.#rested = true;
        await this.close();
    }

    /**
     * Handle choosing an activity.
     * @this {MedicalRestaurationBrowser}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #rollRestActivity(event, target) {
        const tatic = target.closest(".tatic");
        const taticId = tatic.dataset.taticId;
        const taticItem = this.unit.items.get(taticId);

        if (!taticItem) return;

        const restActivity = target.closest(".rest-activity");
        const activityId = restActivity.dataset.activityId;
        const activity = taticItem.system.activities[activityId];

        if (!activity) return;

        const input = tatic.querySelector(".roll-result");

        let formula = `max(0, ${activity.number}d${activity.die}${activity.bonus})`;

        const rollConfig = {
            rolls: [{ parts: [formula], data: null }],
            denomination: `d${activity.die}`,
            subject: this.unit,
        };

        const flavor = game.i18n.localize("ldnd5e.company.restRoll");
        const messageConfig = {
            rollMode: game.settings.get("core", "rollMode"),
            data: {
                speaker: ChatMessage.implementation.getSpeaker({ actor: this.unit }),
                flavor,
                title: `${flavor}: ${this.unit.name}`
            }
        };

        const rolls = await CONFIG.Dice.BasicRoll.build(rollConfig, {}, messageConfig);
        if ( !rolls.length ) return null;
        const rollResult = rolls?.length ? rolls[0] : rolls;

        input.value = rollResult.total;
        this.config.rolls[activityId] = rollResult;
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {CompanyL5e} company          The resting company.
     * @param {object} [options={}]         Additional options for the application.
     * @returns {Promise<TaticsL5e|null>}   Transformation settings to apply.
     */
    static async create(company, options = {}) {
        const data = company.system;

        const medicalId = data.units.find(unitId => {
            const unit = game.actors.get(unitId);
            if (!unit) return null;

            return unit.system.info.type === unitData.uTypes.medical;
        });

        const medicalUnit = game.actors.get(medicalId);
        if (!medicalUnit) return null;

        return new Promise((resolve, reject) => {
            const dialog = new this({
                document: company,
                unit: medicalUnit
            }, options);
            dialog.addEventListener("close", () => dialog.rested ? resolve(dialog.config) : reject(), { once: true }, { once: true });
            dialog.render({ force: true });
        });
    }
}
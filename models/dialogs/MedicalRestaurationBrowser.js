const api = dnd5e.applications.api;

export default class MedicalRestaurationBrowser extends api.Application5e {
    constructor(unit, options = {}) {
        super(options);

        this.#unit = unit;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["tatic", "activity", "dialog"],
        window: {
            title: "ldnd5e.tatics.activityTitle"
        },
        actions: {
            choice: MedicalRestaurationBrowser.#onChooseRestauration
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
            template: "modules/ldnd5e/templates/dialogs/medical-restauration.hbs"
        },
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
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.recoveryTatics = this.unit.items.filter(i => i.system.mainRecovery);
        context.noTatics = context.recoveryTatics.length === 0;

        return context;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Handle choosing an activity.
     * @this {MedicalRestaurationBrowser}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #onChooseRestauration(event, target) {
        this.close();
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {UnitL5e} unit                Medical unit of the company.
     * @param {object} [options={}]         Additional options for the application.
     * @returns {Promise<TaticsL5e|null>}   Transformation settings to apply.
     */
    static async create(unit, options = {}) {
        return new Promise(resolve => {
            const dialog = new this(unit, options);
            dialog.addEventListener("close", event => {
                const data = event.target.data;

                resolve(data ?? null);
            }, { once: true });
            dialog.render({ force: true });
        });
    }
}
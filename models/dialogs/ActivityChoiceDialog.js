import TaticsL5e from "../entities/TaticsL5e.js";

const api = dnd5e.applications.api;

export default class ActivityChoiceDialog extends api.Application5e {
    constructor(tatic, options = {}) {
        super(options);

        this.mode = options.mode ?? "full";

        this.#tatic = tatic;
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["tatic", "activity-choice", "dialog"],
        window: {
            title: "ldnd5e.tatics.activityTitle"
        },
        actions: {
            choose: ActivityChoiceDialog.#onChooseActivity,
            accept: ActivityChoiceDialog.#onAcceptActivities
        },
        position: {
            width: 350
        }
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        header: {
            template: "modules/ldnd5e/templates/dialogs/activity-choices/header.hbs"
        },
        body: {
            template: "modules/ldnd5e/templates/dialogs/activity-choices/body.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The chosen activity.
     * @type {Activity|null}
     */
    get activity() {
        return this.#activity ?? null;
    }

    #activity;

    /* -------------------------------------------- */

    /**
     * The Tatic whose activities are being chosen.
     * @type {Item5e}
     */
    get tatic() {
        return this.#tatic;
    }

    #tatic;

    /* -------------------------------------------- */

    /** @override */
    get title() {
        return this.#tatic.name;
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        if (options.isFirstRender) options.window.icon ||= this.#tatic.img;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        switch (partId) {
            case "header":
                return this._prepareHeaderContext(context, options);
            case "body":
                return this._prepareBodyContext(context, options);
            default:
                return context;
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareHeaderContext(context, options) {
        context.tatic = this.#tatic;
        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareBodyContext(context, options) {
        let controlHint;
        if (game.settings.get("dnd5e", "controlHints")) {
            controlHint = game.i18n.localize("DND5E.Controls.Activity.FastForwardHint");
            controlHint = controlHint.replace(
                "<left-click>",
                `<img src="systems/dnd5e/icons/svg/mouse-left.svg" alt="${game.i18n.localize("DND5E.Controls.LeftClick")}">`
            );
        }

        let activities = (Object.values(this.#tatic.system.activities) ?? [])
            .map(this._prepareActivityContext.bind(this))
            .sort((a, b) => a.sort - b.sort);

        // If mode is 'with extra', filter out main activities.
        if (this.mode === 'extra') {
            activities = activities.filter(a => !a.mainRoll);
        }

        context.mode = this.mode;
        context.controlHint = controlHint;
        context.activities = activities;

        context.button = {
            label: game.i18n.localize("ldnd5e.tatics.acceptExtras"),
            icon: "fas fa-check"
        }

        return context;
    }

    /* -------------------------------------------- */

    /**
   * @typedef ActivityChoiceDialogContext
   * @property {string} id
   * @property {string} name
   * @property {number} sort
   * @property {object} icon
   * @property {string} icon.src
   * @property {boolean} icon.svg
   */

    /**
     * Prepare rendering context for a given activity.
     * @param {Activity} activity  The activity.
     * @returns {ActivityChoiceDialogContext}
     * @protected
     */
    _prepareActivityContext(activity) {
        const { id, name, type, mainRoll } = activity;
        return {
            id, name,
            icon: {
                src: `modules/ldnd5e/ui/icons/${type}.svg`,
                svg: true
            },
            mainRoll
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Handle choosing an activity.
     * @this {ActivityChoiceDialog}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #onChooseActivity(event, target) {
        const li = target.closest("li");
        const { activityId } = li.dataset;
        const activity = this.tatic.system.activities[activityId];
        if (!activity) return;

        this.#activity = activity;
        this.close();
    }

    /* -------------------------------------------- */

    /**
     * Handle choosing an activity.
     * @this {ActivityChoiceDialog}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #onAcceptActivities(event, target) {
        this.#activity = [];
        const itemChoices = this.element.querySelectorAll('dnd5e-checkbox[name="item-choice"]');
        itemChoices.forEach(itemChoice => {
            if (itemChoice.checked) {
                const { activityId } = itemChoice.closest("li").dataset;
                const activity = this.tatic.system.activities[activityId];
                if (activity) this.#activity.push(activity);
            }
        });
        this.close();
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {TaticsL5e} tatic                        Item that will receive the activity.
     * @param {object} [options={}]                    Additional options for the application.
     * @returns {Promise<TaticsL5e|null>}              Transformation settings to apply.
     */
    static async create(tatic, options = {}) {
        return new Promise(resolve => {
            const dialog = new this(tatic, options);
            dialog.addEventListener("close", event => {
                const activity = event.target.activity ?? null;

                resolve(activity ?? null);
            }, { once: true });
            dialog.render({ force: true });
        });
    }
}
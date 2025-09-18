import { taticsData } from "../../scripts/constants.js";
import TaticsL5e from "../entities/TaticsL5e.js";

const api = dnd5e.applications.api;

export default class ActivityDialog extends api.Dialog5e {
    constructor(options = {}) {
        super(options);

        this.#mode = options.mode ?? "create";

        if (this.#mode === "edit") {
            this.#data = options.tatic?.system.activities[options.activityId] ?? {};
        }

        this.#changes = this.#data;
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["tatic", "activity", "dialog"],
        window: {
            title: "ldnd5e.tatics.activityTitle"
        },
        form: {
            handler: ActivityDialog.#handleFormSubmission,
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 400
        },
        buildConfig: null
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        header: {
            template: "modules/ldnd5e/templates/dialogs/activity/header.hbs"
        },
        configuration: {
            template: "modules/ldnd5e/templates/dialogs/activity/configuration.hbs"
        }
    };

    /* -------------------------------------------- */

    /**
   * Activity types used to create a Tatic Activity.
   * @type {typeof Object}
   */
    static get activityTypes() {
        return taticsData.activities;
    }

    /* -------------------------------------------- */

    /**
   * Activity types used to create a Tatic Activity.
   * @type {typeof Array<string>}
   */
    static get DamageDice() {
        return [
            {
                value: 4,
                label: "d4"
            },
            {
                value: 6,
                label: "d6"
            },
            {
                value: 8,
                label: "d8"
            },
            {
                value: 10,
                label: "d10"
            },
            {
                value: 12,
                label: "d12"
            },
            {
                value: 20,
                label: "d20"
            }
        ];
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Application mode.
     * @type {BasicActivityData}
     */
    #mode = {};

    get isEdit() {
        return this.#mode === "edit";
    }

    /**
     * Activity data.
     * @type {BasicActivityData}
     */
    #data = {};

    get data() {
        return this.#data;
    }

    /**
     * Application has changed some data.
     * @type {BasicActivityData}
     */
    #changes = {};

    get hasChanges() {
        return !this._deepEqual(this.#data, this.#changes);
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        Object.assign(context, {
            isEdit: this.isEdit,
            data: this.#data,
        });

        switch (partId) {
            case "configuration":
                return this._prepareConfigurationContext(context, options);
            default:
                return context;
        }
    }   

    /* -------------------------------------------- */

    /**
     * Prepare the context for the roll configuration section.
     * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _prepareConfigurationContext(context, options) {
        context.dice = this.constructor.DamageDice;
        context.activityTypes = [
            { value: "0", label: "-" },
            ...Object.values(this.constructor.activityTypes)
                .map(type => {
                    return { value: type, label: game.i18n.localize(`ldnd5e.tatics.activities.${type}`) };
                })
        ];

        return context;
    }

    _deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;

        if (typeof obj1 !== "object" || obj1 === null ||
            typeof obj2 !== "object" || obj2 === null) {
            return false;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (let key of keys1) {
            if (!keys2.includes(key) || !this._deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }
        return true;
    }

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    /**
     * Handle form submission.
     * @this {TransformDialog}
     * @param {Event|SubmitEvent} event    The form submission event.
     * @param {HTMLFormElement} form       The submitted form.
     * @param {FormDataExtended} formData  Data from the dialog.
     */
    static async #handleFormSubmission(event, form, formData) {
        if (event.type === "change") {
            const nameInput = form.querySelector('.document-name');
            const numberInput = form.querySelector('input[name="number"]');
            const mainRollCheck = form.querySelector('dnd5e-checkbox');
            const submittedData = formData.object;

            this.#data = {
                id: this.isEdit ? this.data.id : foundry.utils.randomID(),
                name: submittedData.name || nameInput.placeholder,
                number: submittedData.number || numberInput.placeholder,
                die: submittedData.die,
                bonus: submittedData.bonus,
                type: submittedData.type,
                mainRoll: mainRollCheck.checked
            };            
        } 
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
    static async createDialog(tatic, options = {}) {
        return new Promise(resolve => {
            options.tatic = tatic;
            const dialog = new this(options);
            dialog.addEventListener("close", event => {
                const data = event.target.data;                

                if (data.name === "" ) {
                    ui.notifications.warn(game.i18n.localize("ldnd5e.tatics.invalidActivity.name"));
                    resolve(null);
                }

                if (data.type === "0") {
                    ui.notifications.warn(game.i18n.localize("ldnd5e.tatics.invalidActivity.type"));
                    resolve(null);
                }

                if (!data.number) {
                    ui.notifications.warn(game.i18n.localize("ldnd5e.tatics.invalidActivity.formula"));
                    resolve(null);
                }

                resolve(data ?? null);
            }, { once: true });
            dialog.render({ force: true });
        });
    }
}
import { taticsData } from "../../scripts/constants.js";

const api = dnd5e.applications.api;

export default class ActivityDialog extends api.Application5e {
    constructor(tatic, options = {}) {
        super(options);

        this.#mode = options.mode ?? "create";

        if (this.#mode === "edit") {
            this.#data = tatic.system.activities[options.activityId] ?? {};
        }

        this.#tatic = tatic;
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "tatic", "activity"],
        tag: "form",
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
        },
        buttons: {
            template: "modules/ldnd5e/templates/dialogs/activity/buttons.hbs"
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
     * @type {string}
     */
    #mode = "";

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
     * Tatic data.
     * @type {TaticsL5e}
     */
    #tatic = {};

    get tatic() {
        return this.#tatic;
    }

    /**
     * Tatic data.
     * @type {boolean}
     */
    #hasData = false;

    get hasData() {
        return this.#hasData;
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
            const _formData = foundry.utils.expandObject(formData.object);
            this.#data = { 
                id: (this.isEdit) ? this.#data.id : foundry.utils.randomID(),
                ..._formData.header, ..._formData.config };
        } else if (event.type === "submit") {          
            this.#hasData = true;
            this.close();
        }
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {TaticsL5e} tatic             Tatic object. 
     * @param {object} [options={}]         Additional options for the application.
     * @returns {Promise<boolean|null>}     Transformation settings to apply.
     */
    static async create(tatic, options = {}) {
        return new Promise((resolve, reject) => {
            const dialog = new this(tatic, options);
            dialog.addEventListener("close", () => {
                return dialog.hasData ? resolve(dialog.data) : resolve(null);
            });
            dialog.render({ force: true });
        });
    }
}
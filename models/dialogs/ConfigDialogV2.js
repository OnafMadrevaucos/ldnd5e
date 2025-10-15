import { constants, i18nStrings } from "../../scripts/constants.js";

const api = dnd5e.applications.api;
export default class ConfigDialogV2 extends api.Application5e {
    constructor(config, options = {}) {
        super(options);

        this.config = config;

        this.#allSelected = this.config.allSelected;
    }

    /**@override */
    static DEFAULT_OPTIONS = {
        classes: ["ad-config", "dialog"],
        window: {
            title: i18nStrings.dlControlTitle
        },
        form: {
            handler: ConfigDialogV2.#handleFormSubmission,
            submitOnChange: true,
            closeOnSubmit: false
        },
        actions: {
            saveClick: ConfigDialogV2.#saveClick,
            cancelClick: ConfigDialogV2.#cancelClick,
            selectAll: ConfigDialogV2.#selectAll,
            toggleActor: ConfigDialogV2.#toggleActor
        },
        position: {
            width: 420,
            height: this.height
        },
        buildConfig: null
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        content: {
            template: "modules/ldnd5e/templates/dialogs/pc-list-control/body.hbs"
        },
        footer: {
            template: "modules/ldnd5e/templates/dialogs/pc-list-control/footer.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The list of PCs' actors.
     * @type {Array<ActorL5e>|null}
     */
    get actors() {
        return this.config.actors ?? null;
    }

    /**
     * If all actors are selected.
     * @type {boolean}
     */
    get allSelected() {
        return this.#allSelected;
    }

    #allSelected = false;

    /**
     * If the dialog returns a valid result.
     * @type {boolean}
     */
    get ok() {
        return this.#ok;
    }

    #ok = false;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = { ...(await super._preparePartContext(partId, context, options)) };

        if (partId === "content") return this._prepareContentContext(context, options);
        if (partId === "footer") return this._prepareButtonsContext(context, options);
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
    async _prepareContentContext(context, options) {
        context.actors = this.actors;        
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
    async _prepareButtonsContext(context, options) {
        context.buttons = {
            save: {
                default: true,
                icon: '<i class="fas fa-floppy-disk"></i>',
                label: game.i18n.localize(i18nStrings.saveBtn),
            },
            cancel: {
                icon: '<i class="fas fa-ban"></i>',
                label: game.i18n.localize(i18nStrings.cancelBtn),
            }
        };

        return context;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
   * Handle submission of the dialog using the form buttons.
   * @this {AdDialogV2}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
    static async #handleFormSubmission(event, form, formData) {
        foundry.utils.mergeObject(this.config, formData.object);
        await this.close();
    }

    /* -------------------------------------------- */

    /**
     * Handle saving the valid actors list.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #saveClick(event, target) {
        for(let a of Object.values(this.actors)) {
            const actor = game.actors.get(a.id);
            await actor.setFlag("ldnd5e", "dasEnabled", a.dasEnabled);
        }

        this.#ok = true;
        this.close();
    }

    /* -------------------------------------------- */

    /**
     * Handle cancelling the configuration.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #cancelClick(event, target) {
        this.close();
    }

    /* -------------------------------------------- */

    /**
     * Handle selecting all actors.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #selectAll(event, target) {
        const pcsList = target.closest('.pcs-list');
        const pcs = pcsList.querySelectorAll('.pc-item');

        this.#allSelected = !this.#allSelected;

        pcs.forEach((li) => {                    
            const checkbox = li.querySelector('input');
            const actorId = li.dataset.actorId;
            const actor = this.actors[actorId];

            actor.dasEnabled = checkbox.checked = this.allSelected;
        });
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling an actor.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #toggleActor(event, target) {
        const li = target.closest('.pc-item');
        const checkbox = li.querySelector('input');
        const actorId = li.dataset.actorId;
        const actor = this.actors[actorId];

        actor.dasEnabled = checkbox.checked = !actor.dasEnabled; 
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {object} config                           Configuration options.
     * @param {Array<object>} config.actors             The list of PCs` actors. 
     * @param {string} config.actors[].id               The actor's ID.
     * @param {string} config.actors[].name             The actor's name.
     * @param {string} config.actors[].img              The actor's image.
     * @param {boolean} config.actors[].dasEnabled      If the actor is valid within the DA System. 
     * 
     * @param {boolean} config.allSelected              If all actors are valid within the DA System.    
     * 
     * @param {object} [options={}]                     Additional options for the application.
     * @returns {Promise<boolean|null>}                 Transformation settings to apply.
     */
    static async create(config, options = {}) {
        return new Promise((resolve, reject) => {
            const dialog = new this(config, options);
            dialog.addEventListener("close", () => dialog.ok === true ? resolve(true) : dialog.ok === false ? resolve(false) : reject(null), { once: true });
            dialog.render({ force: true });
        });
    }
}
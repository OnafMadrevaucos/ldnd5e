import { suppliesChoices } from "../../scripts/constants.js";

const api = dnd5e.applications.api;

export default class SuppliesConfigDialog extends api.Application5e {
    constructor(config, options = {}) {
        super(options);

        this.document = config.army;
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "supplies"],
        window: {
            title: "ldnd5e.supplies.title"
        },
        actions: {
            addFoodSource: SuppliesConfigDialog.#addFoodSource
        },
        form: {
            handler: SuppliesConfigDialog.#handleFormSubmission
        },
        position: {
            width: 500
        }
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        body: {
            template: "modules/ldnd5e/templates/dialogs/supplies-dialog.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.size = 5;

        this._prepareSources(context);

        // Prepare the actor data for rendering.
        Object.assign(context, {
            hasFoodSource: this.document.system.supplies.sources.food.length > 0,
            hasWaterSource: this.document.system.supplies.sources.water.length > 0,
        });

        return context;
    }

    /**
   * Prepare rendering context for the sources.
   * @param {ApplicationRenderContext} context  Context being prepared.
   */
    _prepareSources(context) {
        const supplies = this.document.system.supplies;


        for (let food of supplies.sources.food) {
            this.#sources.food[food] = true;
        }

        for (let water of supplies.sources.water) {
            this.#sources.water[water] = true;
        }

        context.foodSources = Object.values(suppliesChoices.sources.food).map(food => ({
            value: food,
            label: game.i18n.localize(`ldnd5e.supplies.sources.food.${food}`),
            choosed: this.sources.food[food]
        })).filter(source => !source.choosed);

        context.waterSources = Object.values(suppliesChoices.sources.water).map(water => ({
            value: water,
            label: game.i18n.localize(`ldnd5e.supplies.sources.water.${water}`),
            choosed: this.sources.water[water]
        })).filter(source => !source.choosed);

        context.sources = {
            food: Object.values(suppliesChoices.sources.food).map(food => ({
                name: game.i18n.localize(`ldnd5e.supplies.sources.food.${food}`),
                value: suppliesChoices.sourcesValues.food[food],
                img: {
                    src: suppliesChoices.sourcesImg.food[food],
                    svg: suppliesChoices.sourcesImg.food[food].endsWith(".svg")
                },
                choosed: this.sources.food[food]
            })).filter(source => source.choosed),
            water: Object.values(suppliesChoices.sources.water).map(water => ({
                name: game.i18n.localize(`ldnd5e.supplies.sources.water.${water}`),
                value: suppliesChoices.sourcesValues.water[water],
                img: {
                    src: suppliesChoices.sourcesImg.water[water],
                    svg: suppliesChoices.sourcesImg.water[water].endsWith(".svg")
                },
                choosed: this.sources.water[water]
            })).filter(source => source.choosed)
        }

        return context;
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The chosen activity.
     * @type {Activity|null}
     */
    get supplies() {
        return this.#supplies ?? null;
    }

    #supplies;

    get sources() {
        return this.#sources;
    }

    /**
     * A Flag collection of all avaliable sources.
     * @type {object|null}
     */
    #sources = {
        food: {
            plantI: false,
            plantII: false,
            plantIII: false,
            cityI: false,
            cityII: false,
            cityIII: false
        },
        water: {
            springI: false,
            springII: false,
            springIII: false,
            riverI: false,
            riverII: false,
            riverIII: false
        }
    };

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    /**
   * Handle submitting the supplies config form.
   * @this {Award}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
    static async #handleFormSubmission(event, form, formData) {
        this.close();
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Add a new food source to the list.
   * @this {SuppliesConfigDialog}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #addFoodSource(event, target) {
        const suppliesSouces = target.closest(".supplies-sources");
        const select = suppliesSouces.querySelector("select");
        const data = this.document.system.supplies.sources.food;

        data.push(select.value);

        await this.document.update({ [`system.supplies.sources.food`]: data.filter(value => value !== '') });
        this.render(true);
    }
}
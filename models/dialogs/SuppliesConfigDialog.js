import { suppliesData, armyData } from "../../scripts/constants.js";

const api = dnd5e.applications.api;

export default class SuppliesConfigDialog extends api.Application5e {
    constructor(config, options = {}) {
        super(options);

        this.document = config.army;
        this._calculateSupplies(this.document.system.supplies);
    }

    /* -------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "supplies"],
        window: {
            title: "ldnd5e.supplies.title"
        },
        actions: {
            addFoodSource: SuppliesConfigDialog.#addFoodSource,
            addWaterSource: SuppliesConfigDialog.#addWaterSource,
            deleteSupply: SuppliesConfigDialog.#deleteSupply
        },
        form: {
            handler: SuppliesConfigDialog.#handleFormSubmission,
            submitOnChange: true
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
    async _onRender(context, options) {
        await super._onRender(context, options);

        // Handle urban source changes.
        this.element.querySelector('select.urban-selector').addEventListener("change", this._onUrbanSourceChange.bind(this));
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.size = armyData.sizes[this.document.system.info.size] || 0;

        this._prepareSources(context);

        // Prepare the actor data for rendering.
        Object.assign(context, {
            actor: this.document,
            system: this.document.system,
            hasFoodSource: this.supplies.sources.food.length > 0,
            hasWaterSource: this.supplies.sources.water.length > 0,
            hasUrbanSource: this.supplies.sources.urban !== '',
            totals: this.totals
        });

        return context;
    }

    /**
   * Prepare rendering context for the sources.
   * @param {ApplicationRenderContext} context  Context being prepared.
   */
    _prepareSources(context) {
        const supplies = this.supplies;

        context.foodSources = Object.values(suppliesData.sources.food).map(food => ({
            value: food,
            label: game.i18n.localize(`ldnd5e.supplies.sources.food.${food}`)
        }));

        context.waterSources = Object.values(suppliesData.sources.water).map(water => ({
            value: water,
            label: game.i18n.localize(`ldnd5e.supplies.sources.water.${water}`)
        }));

        context.urbanSources = [{ value: '', label: '—' }, // Add a blank option.,
            ...Object.values(suppliesData.sources.urban).map(urban => ({
            value: urban,
            label: game.i18n.localize(`ldnd5e.supplies.sources.urban.${urban}`)
        }))];

        context.sources = {
            food: supplies.sources.food.map(food => ({
                name: game.i18n.localize(`ldnd5e.supplies.sources.food.${food}`),
                value: suppliesData.sourcesValues.food[food],
                img: {
                    src: suppliesData.sourcesImg.food[food],
                    svg: suppliesData.sourcesImg.food[food].endsWith(".svg")
                },
            })),
            water: supplies.sources.water.map(water => ({
                name: game.i18n.localize(`ldnd5e.supplies.sources.water.${water}`),
                value: suppliesData.sourcesValues.water[water],
                img: {
                    src: suppliesData.sourcesImg.water[water],
                    svg: suppliesData.sourcesImg.water[water].endsWith(".svg")
                }
            }))
        }

        return context;
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The army supplies.
     * @type {Object}
     */
    get supplies() {
        return this.#supplies;
    }

    #supplies;

    /**
     * The army total supplies.
     * @type {Object}
     */
    get totals() {
        return this.#totals;
    }

    #totals;

    /* -------------------------------------------- */
    /*  Events Listeners                            */
    /* -------------------------------------------- */

    async _onUrbanSourceChange(event) {
        event.preventDefault();
        const source = event.currentTarget.value;

        const reserve = {
            value: suppliesData.sourcesValues.urban[source] ?? 0,
            max: suppliesData.sourcesValues.urban[source] ?? 0
        }

        await this.document.update({ 
            "system.supplies.sources.urban": [source],
            "system.supplies.reserve": reserve
         });
        this.render(true);
    }

    /* -------------------------------------------- */
    /*  Internal Functions                          */
    /* -------------------------------------------- */

    /**
   * Helper function to calculate the total supplies.
   * @this {SuppliesConfigDialog}   
   */
    _calculateSupplies(supplies) {
        this.#supplies = supplies;

        const sources = supplies.sources;

        const foodTotal = Math.floor(sources.food.reduce((total, food) => total + suppliesData.sourcesValues.food[food], 0));
        const waterTotal = Math.floor(sources.water.reduce((total, water) => total + suppliesData.sourcesValues.water[water], 0));

        this.#totals = { foodTotal, waterTotal, total: foodTotal + waterTotal };

        return this.totals;
    }

    /* -------------------------------------------- */
    /*  Form Handling                               */
    /* -------------------------------------------- */

    /**
   * Handle submitting the supplies config form.
   * @this {SuppliesConfigDialog}
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

        await this.document.update({ [`system.supplies.sources.food`]: data });
        this._calculateSupplies(this.document.system.supplies);
        await this.document.update({ [`system.supplies.total`]: this.totals.total });
        this.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Add a new water source to the list.
   * @this {SuppliesConfigDialog}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #addWaterSource(event, target) {
        const suppliesSouces = target.closest(".supplies-sources");
        const select = suppliesSouces.querySelector("select");
        const data = this.supplies.sources.water;

        data.push(select.value);

        await this.document.update({ [`system.supplies.sources.water`]: data });
        this._calculateSupplies(this.document.system.supplies);
        await this.document.update({ [`system.supplies.total`]: this.totals.total });
        this.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Delete a supply from the list.
   * @this {SuppliesConfigDialog}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #deleteSupply(event, target) {
        const supplyType = target.dataset.type;
        if (!supplyType) return;

        const data = this.supplies.sources[supplyType];

        const supplyIdx = Number.parseInt(target.closest(`.item-row.${supplyType}`).dataset.idx);
        if (supplyIdx === undefined || supplyIdx === null) return;

        data.splice(supplyIdx, 1);

        await this.document.update({ [`system.supplies.sources.${supplyType}`]: data });
        this._calculateSupplies(this.document.system.supplies);
        await this.document.update({ [`system.supplies.total`]: this.totals.total });
        this.render(true);
    }
}
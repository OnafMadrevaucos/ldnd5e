const api = dnd5e.applications.api;

export default class SettingsApp extends api.Application5e {
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "settings-app", "standard-form"],
        tag: "form",
        window: {
            title: "ldnd5e.titles.settings"
        },
        controls: {
            dropdown: true // Habilita o dropdown no header.
        },
        actions: {
            resetWorld: SettingsApp.#resetWorld
        },
        form: {
            handler: SettingsApp.#handleFormSubmission,
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 520,
        },
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        world: {
            template: "modules/ldnd5e/templates/settings/parts/world.hbs"
        },
        comanders: {
            template: "modules/ldnd5e/templates/settings/parts/comanders.hbs"
        },               
        buttons: {
            template: "modules/ldnd5e/templates/settings/buttons.hbs"
        },
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        return {
            ...context,
            options: this.options
        };
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        switch (partId) {
            case "world":
                return this._prepareWorldContext(context, options);
            case "comanders":
                return this._prepareComandersContext(context, options);
            case "buttons":
                return this._prepareButtonsContext(context, options);
            default:
                return context;
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareWorldContext(context, options) {
        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareComandersContext(context, options) {
        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareButtonsContext(context, options) {
        return context;
    }

    /**
   * Process form submission for the sheet
   * @this {SettingsApp}                        The handler is called with the application as its bound scope
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {FormDataExtended} formData           Processed data for the submitted form
   * @returns {Promise<void>}
   */
    static async #handleFormSubmission(event, form, formData) {
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Reset the world variables.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #resetWorld(event, target) {
        const world = game.settings.get('ldnd5e', 'battle');
        const blankData = game.settings.settings.get('ldnd5e.battle').default;
        await game.settings.set('ldnd5e', 'battle', blankData);
    }
}
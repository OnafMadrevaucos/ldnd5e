import { unitData } from "../scripts/constants";

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
        affinity: {
            template: "modules/ldnd5e/templates/settings/parts/affinity.hbs"
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
            case "affinity":
                return this._prepareCommandersContext(context, options);
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
    async _prepareAffinityContext(context, options) {

        context.classes = await this._prepareClasses();

        context.categories = unitData.categories

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareButtonsContext(context, options) {
        return context;
    }

    /* -------------------------------------------- */

    async _prepareClasses() {
        const classes = new Map();

        // Classes do mundo.
        for (const item of game.items) {
            if (["class"].includes(item.type)) {
                classes.set(item.name, item);
            }
        }

        // Classes em Compêndios.
        const packs = game.packs.filter(p => p.documentName === "Item");
        for (const pack of packs) {
            const index = pack.index.filter(i => ["class"].includes(i.type));
            for (const i of index) {
                // Evita duplicatas com base no nome.
                if (!classes.has(i.name)) {
                    const doc = await pack.getDocument(i._id);
                    classes.set(i.name, doc);
                }
            }
        }

        return Array.from(classes.values());
    }

    /* -------------------------------------------- */

    _prepareAffinities() {
        const affinities = Object.entries(dnd5e.config.abilities).map(([key, abl]) => {
            return {
                key,
                label: abl.label,
                classes: []
            };
        });

        return affinities;
    }

    /* -------------------------------------------- */

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
        const ok = await foundry.applications.api.DialogV2.confirm({
            content: `
          <p>
            <strong>${game.i18n.localize("AreYouSure")}</strong> ${game.i18n.localize("ldnd5e.battle.resetConfirm")}
          </p>
        `,
            window: {
                icon: "fa-solid fa-trash",
                title: "ldnd5e.battle.reset"
            },
            position: { width: 400 }
        }, { rejectClose: false });

        if (ok) {
            const blankData = game.settings.settings.get('ldnd5e.battle').default;
            game.settings.set('ldnd5e', 'battle', blankData).then(() => {
                ui.notifications.info(game.i18n.localize("ldnd5e.battle.resetOK"));
            });
        }
    }
}
import SuppliesConfigDialog from "../dialogs/SuppliesConfigDialog.js";
import { suppliesData } from "../../scripts/constants.js";

const { api: api, sheets: sheets } = foundry.applications;

export default class ArmySheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
    static MODES = {
        PLAY: 0,
        EDIT: 1
    }

    static DEFAULT_OPTIONS = {
        classes: ["dnd5e2", "sheet", "actor", "ldnd5e", "army", "standard-form", "npc", "interactable"],
        position: {
            width: 720,
            height: 680
        },
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        actions: {
            removeCommander: this.#removeCommander,
            clickCompany: this.#clickCompany,
            removeCompany: this.#removeCompany,
            showConfiguration: this.#showConfiguration
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        }
    };

    /** @inheritdoc */
    static PARTS = {
        header: {
            template: "modules/ldnd5e/templates/sheets/army/header.hbs",
        },
        body: {
            template: "modules/ldnd5e/templates/sheets/army/body.hbs",
        },
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // Set toggle state and add status class to frame
        this._renderModeToggle();
        this.element.classList.toggle("editable", this.isEditable && (this._mode === this.constructor.MODES.EDIT));
        this.element.classList.toggle("interactable", this.isEditable && (this._mode === this.constructor.MODES.PLAY));
        this.element.classList.toggle("locked", !this.isEditable);

        this.element.querySelector('.meter > .reserve').addEventListener('click', event => this._toggleEditReserves(event, true));
        this.element.querySelector('.meter > .reserve > input').addEventListener('blur', event => this._toggleEditReserves(event, false));
        this.element.querySelector('.meter > .reserve > input').addEventListener('input', event => this._onReservesInput(event));

        // Handle delta inputs
        this.element.querySelectorAll('input[type="text"][data-dtype="Number"]')
            .forEach(i => i.addEventListener("change", this._onChangeInputDelta.bind(this)));
    }

    /**
     * Handle re-rendering the mode toggle on ownership changes.
     * @protected
     */
    _renderModeToggle() {
        const header = this.element.querySelector(".window-header");
        const toggle = header.querySelector(".mode-slider");
        if (this.isEditable && !toggle) {
            const toggle = document.createElement("slide-toggle");
            toggle.checked = this._mode === this.constructor.MODES.EDIT;
            toggle.classList.add("mode-slider");
            toggle.dataset.tooltip = "DND5E.SheetModeEdit";
            toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
            toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
            toggle.addEventListener("dblclick", event => event.stopPropagation());
            toggle.addEventListener("pointerdown", event => event.stopPropagation());
            header.prepend(toggle);
        } else if (this.isEditable) {
            toggle.checked = this._mode === this.constructor.MODES.EDIT;
        } else if (!this.isEditable && toggle) {
            toggle.remove();
        }
    }

    /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
     * @param {Event} event  Triggering event.
     * @protected
     */
    _onChangeInputDelta(event) {
        const input = event.target;
        const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;
        const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
        const activity = target?.system.activities?.get(activityId);
        const result = dnd5e.utils.parseInputDelta(input, activity ?? target);
        if (result !== undefined) {
            // Special case handling for Item uses.
            if (input.dataset.name === "system.uses.value") {
                target.update({ "system.uses.spent": target.system.uses.max - result });
            } else if (activity && (input.dataset.name === "uses.value")) {
                target.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
            }
            else target.update({ [input.dataset.name]: result });
        }
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Set editable the current form mode.
        context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

        context.CONFIG = dnd5e.config;

        // Prepare the actor data for rendering.
        Object.assign(context, {
            actor: this.actor,
            system: this.actor.system,
        });

        context.companies = [];
        for (const companyId of this.actor.system.companies) {
            const company = game.actors.get(companyId);

            // Ignore if the company doesn't exist.
            if (!company) continue;

            const unitCount = {
                light: 0,
                heavy: 0,
                special: 0,
                medical: 0
            }

            for (const uId of company.system.units) {
                const unit = game.actors.get(uId);

                // Ignore if the unit doesn't exist.
                if (!unit) continue;

                unitCount[unit.system.info.type] += 1;
            }

            company.unitCount = unitCount;
            context.companies.push(company);
        }

        //Verify if the army is starving.
        const supplies = this.actor.system.supplies;
        context.isStarving = supplies.total < supplies.needs;

        // Verify if the army has a urban source of supplies.
        context.hasUrbanSource = supplies.sources.urban || (supplies.sources.urban?.lenght > 0);

        if (context.hasUrbanSource) context.urbanIcon = suppliesData.sourcesImg.urban[supplies.sources.urban];

        // Verify if the army has a commander.
        context.hasCommander = !!this.actor.system.info.commander;

        // Obtain the commander actor if it exists.
        context.commander = this.actor.system.info.commander;

        // Prepare the actor's currency.
        this._prepareCurrency(context);

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _preparePartContext(partId, context, options) {
        switch (partId) {
            case "header": await this._prepareHeaderContext(context, options); break;
            case "body": break;
        }

        return context;
    }

    /* -------------------------------------------- */

    /**
   * Prepare rendering context for the header.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
    async _prepareHeaderContext(context, options) {
        context.portrait = this._preparePortrait(context);
    }

    /* -------------------------------------------- */

    /**
   * Prepare actor portrait for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _preparePortrait(context) {
        const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
        const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
        const defaultArtwork = Actor.implementation.getDefaultArtwork(this.actor._source)?.img;
        return {
            token: showTokenPortrait,
            src: showTokenPortrait ? token.texture.src : this.actor.img ?? defaultArtwork,
            // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
            path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
        };
    }

    /* -------------------------------------------- */

    /**
   * Prepare actor currency for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _prepareCurrency(context) {
        const currency = {
            cp: {
                key: "cp",
                label: game.i18n.localize("DND5E.CurrencyCP"),
                value: 0
            },
            sp: {
                key: "sp",
                label: game.i18n.localize("DND5E.CurrencySP"),
                value: 0
            },
            gp: {
                key: "gp",
                label: game.i18n.localize("DND5E.CurrencyGP"),
                value: 0
            },
            ep: {
                key: "ep",
                label: game.i18n.localize("DND5E.CurrencyEP"),
                value: 0
            },
            pp: {
                key: "pp",
                label: game.i18n.localize("DND5E.CurrencyPP"),
                value: 0
            }
        };

        for (let company of this.actor.system.companies) {
            const companyActor = game.actors.get(company);
            if (!companyActor) continue;

            for (const [k, c] of Object.entries(companyActor.system.currency)) {
                currency[k].value += c.value;
            }
        }

        context.currency = currency;
    }


    /* -------------------------------------------- */

    /** @inheritDoc */
    _getLabels() {
        const labels = super._getLabels();
        return labels;
    }

    /* -------------------------------------------- */
    /*  Events Listeners                            */
    /* -------------------------------------------- */

    /**
     * Toggle editing reserves.
     * @param {PointerEvent} event  The triggering event.
     * @param {boolean} edit        Whether to toggle to the edit state.
     * @protected
     */
    _toggleEditReserves(event, edit) {
        const target = event.currentTarget.closest(".reserve");
        const label = target.querySelector(":scope > .label");
        const input = target.querySelector(":scope > input");
        label.hidden = edit;
        input.hidden = !edit;
        if (edit) input.focus();
    }

    /* -------------------------------------------- */

    /**
     * On changing reserves' value.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onReservesInput(event) {
        const input = event.currentTarget;
        const max = parseInt(input.dataset.max);
        const value = parseInt(input.value);

        if (value > max) input.value = max;
        if (value < 0) input.value = 0;
    }

    /* -------------------------------------------- */

    /**
     * Handle the user toggling the sheet mode.
     * @param {Event} event  The triggering event.
     * @protected
     */
    async _onChangeSheetMode(event) {
        const { MODES } = this.constructor;
        const toggle = event.currentTarget;
        const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
        toggle.dataset.tooltip = label;
        toggle.setAttribute("aria-label", label);
        this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
        await this.submit();
        this.render();
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _onDropActor(event, actor) {
        // The dropped actor is the commander of the army.
        if (["character", "npc"].includes(actor.type)) {
            await this.actor.update({ ['system.info.commander']: actor });
            const companyCollection = foundry.utils.deepClone(this.actor.system.companies);

            // Update all companies of the army.
            for (const companyId of companyCollection) {
                const company = game.actors.get(companyId);

                // Ignore if the company doesn't exist.
                if (!company) continue;

                await company.update({
                    ['system.info.army']: this.actor,
                    ['system.attributes.affinity.bonus.prestige']: this.actor.system.prestige.mod
                });
            }

            // Link the army to it's commander's actor.
            await actor.setFlag('ldnd5e', 'army', this.actor.id);

            return true;
        }

        // The dropped actor is a company of the army.
        if (actor.type === "ldnd5e.company") {
            // If the company is already part of the army, do nothing.
            if (this.actor.system.companies.includes(actor.id)) return false;

            // Only an original company can be dropped.
            if (actor.getFlag("ldnd5e", "isMember")) {
                ui.notifications.warn(game.i18n.localize("ldnd5e.army.invalidCompany"), {
                    localize: true
                });
                return false;
            };

            const companyCollection = foundry.utils.deepClone(this.actor.system.companies).filter(c => c !== actor.id);
            const companyData = foundry.utils.deepClone(actor.toObject());

            // Create a new company and add it to the army.
            const createdCompany = await Actor.create(companyData, { parent: null });
            await createdCompany.setFlag("ldnd5e", "isMember", true);

            companyCollection.push(createdCompany.id);

            await this.actor.update({ ['system.companies']: companyCollection });
            await createdCompany.update({
                ['system.info.army']: this.actor,
                ['system.attributes.affinity.bonus.prestige']: this.actor.system.prestige.mod
            });

            await game.actors.directory.render(true);

            return true;
        }

        // Everything else is invalid.
        ui.notifications.warn(game.i18n.localize("ldnd5e.army.invalidCommander"), {
            localize: true
        });

        return false;
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Removes the commander from the army.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #removeCommander(event, target) {
        await this.actor.update({ [`system.info.commander`]: null });

        // Remove the commander from all companies.
        for (const companyId of this.actor.system.companies) {
            const company = game.actors.get(companyId);

            // Ignore if the company doesn't exist.
            if (!company) continue;

            await company.update({ [`system.info.army`]: null });
        }
    }

    /* -------------------------------------------- */

    /**
   * Removes the commander from the army.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #clickCompany(event, target) {
        const item = target.closest(".item");
        if (!item) return;

        const companyId = item.dataset.itemId;
        const company = game.actors.get(companyId);

        // Ignore if the company doesn't exist.
        if (!company) return;

        // Open the company sheet.
        company.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Removes a company from the army.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #removeCompany(event, target) {
        const item = target.closest(".item");
        if (!item) return;

        const companyId = item.dataset.itemId;
        const company = game.actors.get(companyId);
        const companyCollection = foundry.utils.deepClone(this.actor.system.companies).filter(c => c !== companyId);

        // Update the collection.
        await this.actor.update({ ['system.companies']: companyCollection });

        if (company) {
            // Remove the company.
            await company.delete();
        }
    }

    /* -------------------------------------------- */

    /**
   * Show the supplies configuration form for the army.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #showConfiguration(event, target) {
        const app = new SuppliesConfigDialog({ army: this.actor });
        app.render(true);
    }
}
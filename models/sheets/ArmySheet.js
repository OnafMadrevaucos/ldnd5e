const { api: api, sheets: sheets } = foundry.applications;

export default class ArmySheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
    static MODES = {
        PLAY: 1,
        EDIT: 2
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
            removeCompany: this.#removeCompany
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

        // Prepare the actor data for rendering.
        Object.assign(context, {
            actor: this.actor,
            system: this.actor.system,

        });

        context.companies = [];
        this.actor.system.companies.forEach(companyId => {
            const company = game.actors.get(companyId);
            if (!company) return false;

            const unitCount = {
                light: 0,
                heavy: 0,
                special: 0,
                medical: 0
            }

            for (const uId of company.system.units) {
                const unit = game.actors.get(uId);
                if (!unit) return false;

                unitCount[unit.system.info.type] += 1;
            }

            company.unitCount = unitCount;

            context.companies.push(company);
        });

        // Verify if the army has a commander.
        context.hasCommander = !!this.actor.system.info.commander;

        // Obtain the commander actor if it exists.
        context.commander = this.actor.system.info.commander || null;

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
                label: game.i18n.localize("DND5E.CurrencyCopper"),
                value: 0
            },
            sp: {
                key: "sp",
                label: game.i18n.localize("DND5E.CurrencySilver"),
                value: 0
            },
            gp: {
                key: "gp",
                label: game.i18n.localize("DND5E.CurrencyGold"),
                value: 0
            },
            ep: {
                key: "ep",
                label: game.i18n.localize("DND5E.CurrencyElectrum"),
                value: 0
            },
            pp: {
                key: "pp",
                label: game.i18n.localize("DND5E.CurrencyPlatinum"),
                value: 0
            }
        };

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

                await company.update({
                    ['system.info.army']: this.actor,
                    ['system.attributes.affinity.bonus.prestige']: this.actor.system.prestige.mod
                });
            }
            return true;
        }

        // The dropped actor is a company of the army.
        if (actor.type === "ldnd5e.company") {
            // If the company is already part of the army, do nothing.
            if (this.actor.system.companies.includes(actor.id)) return false;

            const companyCollection = foundry.utils.deepClone(this.actor.system.companies).filter(c => c !== actor.id);
            companyCollection.push(actor.id);

            await this.actor.update({ ['system.companies']: companyCollection });
            await actor.update({
                ['system.info.army']: this.actor,
                ['system.attributes.affinity.bonus.prestige']: this.actor.system.prestige.mod
            });
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
        for (const company of this.actor.system.companies) {
            const companyActor = game.actors.get(company);
            await companyActor.update({ [`system.info.army`]: null });
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
        // Remove the army's reference from the company.
        await company.update({
            ['system.info.army']: null,
            ['system.attributes.affinity.bonus.prestige']: 0
        });
    }
}
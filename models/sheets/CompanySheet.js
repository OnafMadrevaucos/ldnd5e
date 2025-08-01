import { constants, i18nStrings, unitChoices } from "../../scripts/constants.js";

const { api: api, sheets: sheets } = foundry.applications;

export default class CompanySheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
    static MODES = {
        PLAY: 0,
        EDIT: 1
    }

    static DEFAULT_OPTIONS = {
        classes: ["dnd5e2", "sheet", "actor", "ldnd5e", "company", "standard-form", "npc", "interactable"],
        position: {
            width: 720,
            height: 680
        },
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        actions: {
            removeCommander: this.#removeCommander,
            removeUnit: this.#removeUnit
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        }
    };

    /** @inheritdoc */
    static PARTS = {
        header: {
            template: "modules/ldnd5e/templates/sheets/company/header.hbs",
        },
        body: {
            template: "modules/ldnd5e/templates/sheets/company/body.hbs",
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

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Set editable the current form mode.
        context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

        Object.assign(context, {
            actor: this.actor,
            system: this.actor.system
        });

        // Prepare the units data for rendering.
        this._prepareUnits(context);

        // Verify if the army has a commander.
        context.hasCommander = !!this.actor.system.info.commander;

        // Obtain the commander actor if it exists.
        context.commander = this.actor.system.info.commander || null;

        // Prepare the company's abilities.
        this._prepareAbilities(context);

        // Prepare the company's currency.
        this._prepareCurrency(context);

        // Prepare the company's skills.
        this._prepareSkills(context);

        // Prepare the company's saves.
        this._prepareSaves(context);

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
     * Prepare rendering context for the header.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @protected
     */
    _prepareUnits(context) {
        const units = {
            light: [],
            heavy: [],
            special: [],
            medical: []
        };

        for (const id of this.actor.system.units) {
            const unit = game.actors.get(id);

            units[unit.system.info.type].push(unit);
        }

        context.units = units;
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

    /**
   * Prepare abilities.
   * @param {ApplicationRenderContext} context  Context being prepared. 
   * @protected
   */
    _prepareAbilities(context) {
        const abilities = this.actor.system.abilities;
        const units = this.actor.system.units;

        for (const [id, abl] of Object.entries(abilities)) {
            for (const uId of units) {
                const unit = game.actors.get(uId);
                const uAbl = unit.system?.abilities[id] ?? { value: 0 };
                abl.value += Math.abs(uAbl.value);
            }
            abl.key = id;
            abl.label = game.i18n.localize(i18nStrings.uAbilities[id]);
            abl.icon = `modules/ldnd5e/ui/abilities/${id}.svg`;
            abl.mod = Math.abs(abl.value);
            abl.sign = (abl.value >= 0) ? "+" : "-";
            if (!Number.isFinite(abl.max)) abl.max = CONFIG.DND5E.maxAbilityScore;
        }

        context.abilities = abilities;
    }

    /* -------------------------------------------- */

    /**
   * Prepare combat skills. 
   * @param {ApplicationRenderContext} context  Context being prepared.   *   
   * @protected
   */
    _prepareSkills(context) {
        const skills = this.actor.system.combat;
        const units = this.actor.system.units;

        for (const [id, skl] of Object.entries(skills)) {
            for (const uId of units) {
                const unit = game.actors.get(uId);
                const uSkl = unit.system.combat[id] ?? { value: 0 };
                skl.value += Math.abs(uSkl.value);
            }

            skl.key = id;
            skl.label = game.i18n.localize(i18nStrings.uCombat[id]);
            skl.icon = unitChoices.uCombatIcons[id];
            skl.mod = Math.abs(skl.value);
            skl.sign = (skl.value >= 0) ? "+" : "-";
        }

        context.skills = skills;
    }

    /* -------------------------------------------- */

    /**
   * Prepare combat skills. 
   * @param {ApplicationRenderContext} context  Context being prepared.   *   
   * @protected
   */
    _prepareSaves(context) {
        const dsp = context.skills.dsp;
        const units = this.actor.system.units;

        for (const uId of units) {
            const unit = game.actors.get(uId);
            const uDsp = unit.system.combat.dsp ?? { value: 0, save: { value: 0 } };
            dsp.save.value += Math.abs(uDsp.value);
        }

        dsp.save.mod = Math.abs(dsp.value);
        dsp.save.sign = (dsp.value >= 0) ? "+" : "-";
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
            return true;
        }

        // The dropped actor is a unit of the company.
        if (actor.type === "ldnd5e.unit") {
            return this._onDropUnit(event, actor);
        }

        // Everything else is invalid.
        ui.notifications.warn(game.i18n.localize("ldnd5e.company.invalidCommander"), {
            localize: true
        });
        return false;

    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _onDropUnit(event, unit) {
        const type = unit.system.info.type;

        const limits = this.actor.system.limits;

        const unitCount = {
            light: 0,
            heavy: 0,
            special: 0,
            medical: 0
        }

        // Count the number of units of each type.
        for (const uId of this.actor.system.units) {
            const unit = game.actors.get(uId);
            unitCount[unit.system.info.type] += 1;
        }

        // If the total number of units is greater than 3, warn the user and abort.
        const totalUnits = unitCount.light + unitCount.heavy + unitCount.special;
        if (totalUnits >= 3 && [unitChoices.uTypes.light, unitChoices.uTypes.heavy].includes(type)) {
            ui.notifications.warn(game.i18n.localize("ldnd5e.company.full"), {
                localize: true
            });
            return false;
        }

        // If the total number of common units is greater than 3, warn the user and abort.
        // Special units count as common units for this check.
        if ([unitChoices.uTypes.special].includes(type) && unitCount.light + unitCount.heavy >= 3) {
            ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                localize: true
            });
            return false;
        }

        switch (type) {
            // If the unit type is light...
            case unitChoices.uTypes.light: {
                if (unitCount.light > limits[type]) {
                    ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                        localize: true
                    });
                    return false;
                }
            } break;
            // If the unit type is heavy...
            case unitChoices.uTypes.heavy: {
                if (unitCount.heavy > limits[type]) {
                    ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                        localize: true
                    });
                    return false;
                }
            } break;
            // If the unit type is special...
            case unitChoices.uTypes.special: {
                let idx = -1;
                for (const uid of this.actor.system.units) {
                    const u = game.actors.get(uid);
                    if (u.system.info.type === type)
                        idx = this.actor.system.units.indexOf(uid);
                }

                // Remove the old special unit.
                if (idx !== -1) this.actor.system.units.splice(idx, 1);
            } break;
            // If the unit type is medical...
            case unitChoices.uTypes.medical: {
                let idx = -1;
                for (const uid of this.actor.system.units) {
                    const u = game.actors.get(uid);
                    if (u.system.info.type === type)
                        idx = this.actor.system.units.indexOf(uid);
                }

                // Remove the old medical unit.
                if (idx !== -1) this.actor.system.units.splice(idx, 1);
            } break;
        }

        this.actor.system.units.push(unit.id);
        await this.actor.update({ ['system.units']: this.actor.system.units });

        return true;
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Removes the commander from the company.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #removeCommander(event, target) {
        await this.actor.update({ [`system.info.commander`]: null });
    }

    /* -------------------------------------------- */

    /**
   * Removes a unit from the company.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #removeUnit(event, target) {
        const item = target.closest(".item");
        if (!item) return;

        const unitId = item.dataset.itemId;
        const unit = game.actors.get(unitId);

        if (!unit) return;

        // Remove the unit from the collection.
        const unitCollection = foundry.utils.deepClone(this.actor.system.units);
        // Remove the first instance of the unit from the collection.
        unitCollection.splice(unitCollection.indexOf(unitId), 1);

        // Update the collection.
        await this.actor.update({ ['system.units']: unitCollection });
    }
}
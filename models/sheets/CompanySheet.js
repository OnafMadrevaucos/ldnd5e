import { constants, i18nStrings, unitData } from "../../scripts/constants.js";
import MedicalRestaurationBrowser from "../dialogs/MedicalRestaurationBrowser.js";

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
            height: 750
        },
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        actions: {
            viewCommander: this.#viewCommander,
            removeCommander: this.#removeCommander,
            clickUnit: this.#clickUnit,
            removeUnit: this.#removeUnit,
            roll: this.#roll,
            companyRest: this.#companyRest
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

        this.element.querySelector('.meter > .hit-points').addEventListener('click', event => this._toggleEditHP(event, true));
        this.element.querySelector('.meter > .hit-points > input').addEventListener('blur', event => this._toggleEditHP(event, false));

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
            target.update({ [input.dataset.name]: result });
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
            system: this.actor.system,
            hasArmy: !!this.actor.system.info.army,
            army: this.actor.system.info.army || null,
            hasMarshal: !!this.actor.system.info.army?.system.info.commander,
            marshal: this.actor.system.info.army?.system.info.commander || null,
            hasCommander: !!this.actor.system.info.commander,
            commander: this.actor.system.info.commander || null
        });

        context.units = this.actor.system.unitsList;

        // Prepare the actor's combat skills.
        context.skills = this.actor.system.combat;

        // Prepare the company's costs.
        this._prepareCosts(context);

        // Prepare the company's currency.
        this._prepareCurrency(context);

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _preparePartContext(partId, context, options) {

        switch (partId) {
            case "header": await this._prepareHeaderContext(context, options); break;
            case "body": this._prepareBodyContext(context, options); break;
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
   * Prepare rendering context for the body.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
    async _prepareBodyContext(context, options) {
        this._prepareAttributes(context);
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
   * Prepare actor cost for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @protected
   */
    _prepareCosts(context) {
        const cost = {
            units: 0,
            tatics: 0,
            total: 0
        };

        for (const unitId of this.actor.system.units) {
            const unit = game.actors.get(unitId);
            if (!unit) continue;

            cost.units += unit.system.info.price.value;

            for (const tatic of unit.items) {
                cost.tatics += (tatic.system.info.price.value * tatic.system.quantity);
            }
        }

        cost.total = cost.units + cost.tatics;

        context.cost = cost;
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
   * Prepare attributes.   
   * @protected
   */
    _prepareAttributes(context) {
        const data = this.actor.system;
        const army = data.info.army;

        data.attributes.trainning = {
            max: 0,
            value: 0
        };

        // Count the number of combat units.
        for (const uId of this.actor.system.units) {
            const unit = game.actors.get(uId);

            // Ignore if the unit doesn't exist.
            if (!unit) continue;

            // Ignore medical units, for it doesn't count as a combat unit.
            if (unit.system.info.type === unitData.uTypes.medical) continue;

            const dsp = unit.system.combat.dsp;

            data.attributes.trainning.max += (dsp.value + dsp.bonus);

            for (const tatic of unit.items) {
                if (tatic.system.trainning)
                    data.attributes.trainning.value += tatic.system.quantity;
            }
        }

        data.attributes.trainning.max += army.system.supplies.total;

        data.attributes.trainning.value = Math.min(data.attributes.trainning.value, data.attributes.trainning.max);
        data.attributes.trainning.pct = (data.attributes.trainning.value / data.attributes.trainning.max) * 100;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Toggle editing hit points.
     * @param {PointerEvent} event  The triggering event.
     * @param {boolean} edit        Whether to toggle to the edit state.
     * @protected
     */
    _toggleEditHP(event, edit) {
        const target = event.currentTarget.closest(".hit-points");
        const label = target.querySelector(":scope > .label");
        const input = target.querySelector(":scope > input");
        label.hidden = edit;
        input.hidden = !edit;
        if (edit) input.focus();
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
            await this._onDropCommander(event, actor);
            return true;
        }

        // The dropped actor is a unit of the company.
        if (actor.type === "ldnd5e.unit") {
            // Only an original unit can be dropped.
            if (actor.getFlag("ldnd5e", "isMember")) {
                ui.notifications.warn(game.i18n.localize("ldnd5e.army.invalidUnit"), {
                    localize: true
                });
                return false;
            };

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
    async _onDropCommander(event, actor) {
        const actorData = actor.system;
        const mainClass = actorData.attributes.hd.classes.first();

        const oldCompanyId = actor.getFlag('ldnd5e', 'company');
        // The commander is already part of a company.
        if (oldCompanyId) {
            const company = game.actors.get(oldCompanyId);

            if (company)
                await company.update({ ['system.info.commander']: null });
        }

        const changes = {
            ['system.info.commander']: actor,

            ['system.attributes.affinity.class']: mainClass.system.identifier,
            ['system.attributes.affinity.hitDice']: actorData.attributes.hd.largestFace,
            ['system.attributes.affinity.baseAbilities']: [], // TODO...
            ['system.attributes.affinity.bonus.value']: actorData.abilities.cha.mod,
            ['system.attributes.affinity.bonus.prof']: actorData.attributes.prof,
        };

        await this.actor.update(changes);

        // Link the company to it's commander's actor.
        await actor.setFlag('ldnd5e', 'company', this.actor.id);
        await actor.setFlag('ldnd5e', 'deck', {
            hand: {
                tatics: [],
                max: 5
            },
            piles: {
                tatics: [],
                discarded: [],
                assets: []
            }
        });
    }

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
        if (totalUnits >= 3 && [unitData.uTypes.light, unitData.uTypes.heavy].includes(type)) {
            ui.notifications.warn(game.i18n.localize("ldnd5e.company.full"), {
                localize: true
            });
            return false;
        }

        // If the total number of common units is greater than 3, warn the user and abort.
        // Special units count as common units for this check.
        if ([unitData.uTypes.special].includes(type) && unitCount.light + unitCount.heavy >= 3) {
            ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                localize: true
            });
            return false;
        }

        switch (type) {
            // If the unit type is light...
            case unitData.uTypes.light: {
                if (unitCount.light > limits[type]) {
                    ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                        localize: true
                    });
                    return false;
                }
            } break;
            // If the unit type is heavy...
            case unitData.uTypes.heavy: {
                if (unitCount.heavy > limits[type]) {
                    ui.notifications.warn(game.i18n.format("ldnd5e.company.overLimit", game.i18n.localize(`ldnd5e.uTypes.${type}`)), {
                        localize: true
                    });
                    return false;
                }
            } break;
            // If the unit type is special...
            case unitData.uTypes.special: {
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
            case unitData.uTypes.medical: {
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

        const unitObj = foundry.utils.deepClone(unit.toObject());

        // Create the new unit.        
        const createdUnit = await Actor.create(unitObj, { parent: null });
        await createdUnit.setFlag("ldnd5e", "isMember", true);

        this.actor.system.units.push(createdUnit.id);
        await this.actor.update({ ['system.units']: this.actor.system.units });
        await createdUnit.update({ ['system.info.company']: this.actor });

        await game.actors.directory.render(true);

        return true;
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Opens the commander sheet.
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #viewCommander(event, target) {
        this.actor.system.info.commander.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Removes the commander from the company.
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #removeCommander(event, target) {
        const changes = {
            ['system.info.commander']: null,

            ['system.attributes.affinity.class']: null,
            ['system.attributes.affinity.hitDice']: 8,
            ['system.attributes.affinity.baseAbilities']: [],
            ['system.attributes.affinity.bonus.value']: 0,
            ['system.attributes.affinity.bonus.prof']: 0,
        };

        await this.actor.update(changes);

        // Remove the commander from all units.
        for (const unitId of this.actor.system.units) {
            const unit = game.actors.get(unitId);
            await unit.update({ [`system.info.commander`]: null });
        }
    }

    /* -------------------------------------------- */

    /**
   * Opens the unit sheet..
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #clickUnit(event, target) {
        const item = target.closest(".item");
        if (!item) return;

        const unitId = item.dataset.itemId;
        const unit = game.actors.get(unitId);

        // Open the company sheet.
        unit.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Removes a unit from the company.
   * @this {CompanySheet}
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
        // Remove the embedded unit.
        await unit.delete();
    }

    /* -------------------------------------------- */

    /**
   * Roll any check or saving throw fo the company.
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #roll(event, target) {
        if (!target.classList.contains("rollable")) return;

        switch (target.dataset.type) {
            case "ability": {
                const ability = target.closest("[data-ability]")?.dataset.ability;

                if (target.classList.contains("saving-throw")) return this.actor.system.rollSavingThrow({ skill: ability, event }, {}, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
                else return this.actor.system.rollAbilityCheck({ ability: ability }, { event }, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
            };
            case "skill": {
                const skill = target.closest("[data-key]")?.dataset.key;
                return this.actor.system.rollSkill({ skill: skill }, { event }, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
            }
        }
    }

    /* -------------------------------------------- */

    /**
   * Compute the values for a company Rest.
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #companyRest(event, target) {
        event.preventDefault();
        const data = this.actor.system;
        const result = await MedicalRestaurationBrowser.create(this.actor, { force: true });

        const rolls = Object.values(result.rolls);
        const hasRestauration = rolls.length > 0;
        const totalHealed = rolls.reduce((a, b) => a + b.total, 0);
        const staminaRestored = data.attributes.stamina.max - data.attributes.stamina.value;



        await this.actor.update({
            ['system.attributes.hp.value']: Math.min(data.attributes.hp.max, data.attributes.hp.value + totalHealed),
            ['system.attributes.stamina.value']: data.attributes.stamina.max,
        });

        let restaurationMessage = '';
        if (hasRestauration) {
            restaurationMessage = game.i18n.format('ldnd5e.company.hasRestoration', {
                total: totalHealed,
            });
        }

        let chatData = {
            content: game.i18n.format('ldnd5e.company.restResult', {
                name: this.actor.name,
                stamina: staminaRestored,
                restoration: restaurationMessage
            }),
            flavor: game.i18n.localize('ldnd5e.company.rest'),
            type: "rest",
            rolls: result.rolls,
            speaker: ChatMessage.getSpeaker({ actor: this.actor, alias: this.name })
        };
        ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
        return await ChatMessage.create(chatData);
    }
}
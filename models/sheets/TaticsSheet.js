import ActivityDialog from "../dialogs/ActivityDialog.js";
import { taticsData, unitData } from "../../scripts/constants.js";

const { api: api, item: item } = dnd5e.applications;

const TextEditor$b = foundry.applications.ux.TextEditor.implementation;

export default class TaticsSheet extends item.ItemSheet5e {
    static MODES = {
        PLAY: 0,
        EDIT: 1
    }

    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "tatic"],
        position: {
            width: 500,
            height: 400
        },
        editingDescriptionTarget: null,
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        actions: {
            editDescription: TaticsSheet.#editDescription,
            toggleAttr: TaticsSheet.#toggleAttr,
            toggleRecovery: TaticsSheet.#toggleRecovery,
            showAction: TaticsSheet.#showAction,
            removeAction: TaticsSheet.#removeAction,
            showEvent: TaticsSheet.#showEvent,
            removeEvent: TaticsSheet.#removeEvent,
            editDocument: TaticsSheet.#editDocument,
            deleteDocument: TaticsSheet.#deleteDocument,
            roll: TaticsSheet.#roll,
            decrease: TaticsSheet.#decrease,
            increase: TaticsSheet.#increase
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        window: {
            resizable: false
        }
    };

    /* -------------------------------------------- */

    /** @inheritdoc */
    static PARTS = {
        header: {
            template: "modules/ldnd5e/templates/sheets/tatic/header.hbs",
        },
        tabs: {
            template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
            templates: ["templates/generic/tab-navigation.hbs"]
        },
        activities: {
            template: "modules/ldnd5e/templates/sheets/tatic/tabs/activities.hbs",
            scrollable: [""]
        },
        details: {
            template: "modules/ldnd5e/templates/sheets/tatic/tabs/details.hbs",
        },
        description: {
            template: "modules/ldnd5e/templates/sheets/tatic/tabs/description.hbs",
        },
    };

    /* -------------------------------------------- */

    /** @override */
    static TABS = [
        { tab: "description", label: "DND5E.ITEM.SECTIONS.Description" },
        { tab: "details", label: "DND5E.ITEM.SECTIONS.Details" },
        { tab: "activities", label: "DND5E.ITEM.SECTIONS.Activities" },
    ];

    /* -------------------------------------------- */

    /** @override */
    tabGroups = {
        primary: "description"
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);

        this.element.querySelector(".cr input")?.addEventListener('input', event => this._onCRChange(event));
        this.element.querySelector(".qtd input")?.addEventListener('input', event => this._onQuantityChange(event));

        if (this.editingDescriptionTarget) {
            this.element.querySelectorAll("prose-mirror").forEach(editor => editor.addEventListener("save", () => {
                this.editingDescriptionTarget = null;
                this.render();
            }));
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _configureRenderOptions(options) {
        await super._configureRenderOptions(options);
        if (options.isFirstRender) {
            this.expandedSections.set("system.info.flavor", true);
            this.expandedSections.set("system.info.description", true);
        }
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        // Prepare the context with the configuration values from the system.
        context.CONFIG = dnd5e.config;

        // Set editable the current form mode.
        context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

        // Prepare the actor data for rendering.
        Object.assign(context, {
            item: this.item,
            system: this.item.system,
            isEmbedded: this.item.isEmbedded,
        });

        context.properties = {
            active: []
        }

        await this.item.getSheetData?.(context);

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _preparePartContext(partId, context, options) {
        context.tab = context.tabs[partId];

        switch (partId) {
            case "header": await this._prepareHeaderContext(context, options); break;
            case "activities": await this._prepareActivitiesContext(context, options); break;
            case "details": await this._prepareDetailsContext(context, options); break;
            case "description": await this._prepareDescriptionContext(context, options); break;
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

        context.isMedical = this.item.isEmbedded && this.actor.system.info.type === unitData.uTypes.medical;

        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the activities tab.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {ApplicationRenderContext}
     * @protected
     */
    async _prepareActivitiesContext(context, options) {
        context.activities = (Object.values(this.item.system.activities) ?? [])
            .map(activity => {
                const { id, name, type, mainRoll } = activity;
                return {
                    id: id,
                    name: name,
                    img: taticsData.activityIcons[type],
                    mainRoll
                };
            });


        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the description tab.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {ApplicationRenderContext}
     * @protected
     */
    async _prepareDetailsContext(context, options) {
        context.activationTypes = [
            ...Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, config]) => ({
                value,
                label: game.i18n.localize(config.label),
                group: game.i18n.localize(config.group)
            })),
            { value: "", label: game.i18n.localize("DND5E.NoneActionLabel") }
        ];

        context.canGiveBonus = (this.item.system.details.passive && context.editable);

        if (!this.item.system.details.passive)
            await this.item.update({ "system.details.giveBonus": false });

        context.events = this._prepareEvents();

        context.actions = this._prepareActions();

        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the description tab.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {ApplicationRenderContext}
     * @protected
     */
    async _prepareDescriptionContext(context, options) {
        context.expanded = this.expandedSections.entries().reduce((obj, [k, v]) => {
            obj[k] = v;
            return obj;
        }, {});

        const enrichmentOptions = {
            secrets: this.item.isOwner, relativeTo: this.item, rollData: null
        };
        context.enriched = {
            flavor: await TextEditor$b.enrichHTML(this.item.system.info.flavor, enrichmentOptions),
            description: await TextEditor$b.enrichHTML(this.item.system.info.description, enrichmentOptions),
        };
        if (this.editingDescriptionTarget) context.editingDescription = {
            target: this.editingDescriptionTarget,
            value: foundry.utils.getProperty(this.item._source, this.editingDescriptionTarget)
        };

        return context;
    }

    /* -------------------------------------------- */

    /**
   * Prepare item portrait for display.
   * @returns {object}
   * @protected
   */
    _preparePortrait() {
        const defaultArtwork = Item.implementation.getDefaultArtwork(this.item._source)?.img;
        return {
            src: this.item.img ?? defaultArtwork,
            // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
            path: "img"
        };
    }

    /* -------------------------------------------- */

    /**
   * Prepare the commander's actions for display.
   * @returns {object}
   * @protected
   */
    _prepareActions() {
        const items = this.item.getFlag('ldnd5e', 'actions') ?? {};

        return Object.values(items).map(a => {
            const action = fromUuidSync(a.uuid);

            // Ignore non-existing actions.
            if (!action) return;

            return {
                id: action.id,
                name: action.name,
                uuid: action.uuid,
                img: action.img
            };
        }).filter(a => a !== undefined);
    }

    /* -------------------------------------------- */

    /**
   * Prepare item's events for display.
   * @returns {object}
   * @protected
   */
    _prepareEvents() {
        const items = this.item.getFlag('ldnd5e', 'events') ?? {};

        return Object.values(items).map(e => {
            const event = fromUuidSync(e.uuid);

            // Ignore non-existing events.
            if (!event) return;

            return {
                id: event.id,
                name: event.name,
                uuid: event.uuid,
                img: event.img,
                quantity: e.quantity
            };
        }).filter(e => e !== undefined);
    }

    /* -------------------------------------------- */
    /*  Events Listeners and Handlers               */
    /* -------------------------------------------- */

    /**@inheritdoc */
    async _addDocument(event) {
        const activity = await ActivityDialog.create(this.item, { mode: "create" });

        // Ignore non-existing activities.
        if (!activity) return;

        this.item.system.activities[activity.id] = activity;
        await this.item.update({ ["system.activities"]: this.item.system.activities });
    }

    /* -------------------------------------------- */

    /**
     * The user has changed the CR.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onCRChange(event) {
        const input = event.currentTarget;

        let val = parseInt(input.value);

        const min = 0;
        const max = 5;

        if (val > max) input.value = max;
        if (val < min) input.value = min;
    }

    /* -------------------------------------------- */

    /**
     * The user has changed the Event Quantity.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    async _onQuantityChange(event) {
        const input = event.currentTarget;
        const id = input.dataset.id;

        const events = this.item.getFlag('ldnd5e', 'events') ?? {};
        let val = parseInt(input.value);

        const min = 0;
        if (val < min) input.value = min;

        if (isNaN(val)) return;

        events[id].quantity = val;
        await this.item.setFlag('ldnd5e', 'events', events);
    }

    /* -------------------------------------------- */

    /** @override */
    async _onDropItem(event, data) {
        const windowContent = this.element.querySelector(".window-content");

        const item = await Item.implementation.fromDropData(data);

        // Ignore non-valid items or items that dont exist anymore.
        if (!item || (item.type !== "ldnd5e.event" && item.type !== "feat")) {
            ui.notifications.warn(game.i18n.format("ldnd5e.tatics.invalidItem", { name: item.name }));
            return;
        }

        if (item.type === "ldnd5e.event") {
            const events = this.item.getFlag('ldnd5e', 'events') ?? {};
            events[item.id] = { quantity: 1, id: item.id, uuid: item.uuid };

            await this.item.setFlag("ldnd5e", "events", events);
        }
        else if (item.type === "feat") {
            const actions = this.item.getFlag('ldnd5e', 'actions') ?? {};
            actions[item.id] = { id: item.id, uuid: item.uuid };

            await this.item.setFlag("ldnd5e", "actions", actions);
        }

        this.render();
    }

    /**
   * Handle expanding the description editor.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static #editDescription(event, target) {
        if (target.ariaDisabled) return;
        this.editingDescriptionTarget = target.dataset.target;
        this.render();
    }

    /* -------------------------------------------- */

    /**
   * Handle toggling attributes.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #toggleAttr(event, target) {
        const attr = target.dataset.attr;
        const attributes = this.item.system.attributes;
        attributes[attr] = !attributes[attr];

        await this.item.update({ ["system.attributes"]: attributes });
    }

    /* -------------------------------------------- */

    /**
   * Handle toggling if this tatic is part of the main recovey action.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #toggleRecovery(event, target) {
        const mainRecovery = !this.item.system.mainRecovery;

        await this.item.update({ ["system.mainRecovery"]: mainRecovery });
    }

    /* -------------------------------------------- */

    /**
   * Handle showing of an action's sheet.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #showAction(event, target) {
        const li = target.closest(".item.action");
        const actionUuid = li.dataset.uuid;

        const action = await fromUuid(actionUuid);
        if (!action) return;

        action.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Handle removing of an action from this tatic.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #removeAction(event, target) {
        const li = target.closest(".item.action");
        const actionId = li.dataset.itemId;

        const actions = this.item.getFlag('ldnd5e', 'actions') ?? {};
        delete actions[actionId];

        await this.item.setFlag("ldnd5e", "actions", actions);

        this.render();
    }

    /* -------------------------------------------- */

    /**
   * Handle showing of an event's sheet.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #showEvent(event, target) {
        const li = target.closest(".item.event");
        const eventUuid = li.dataset.uuid;

        const eventObj = await fromUuid(eventUuid);
        if (!eventObj) return;

        eventObj.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Handle removing of an event from this tatic.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #removeEvent(event, target) {
        const li = target.closest(".item.event");
        const eventId = li.dataset.itemId;

        const events = this.item.getFlag('ldnd5e', 'events') ?? {};
        delete events[eventId];

        await this.item.setFlag("ldnd5e", "events", events);
        this.render();
    }

    /* -------------------------------------------- */

    /**
   * Handle showing an activity.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #editDocument(event, target) {
        const activityId = target.closest(".activity")?.dataset.activityId;
        if (!activityId) return;

        const activity = await ActivityDialog.create(this.item, { activityId, mode: "edit" });

        // Ignore non-existing activities.
        if (!activity) return;

        this.item.system.activities[activity.id] = activity;
        await this.item.update({ ["system.activities"]: this.item.system.activities });
    }

    /* -------------------------------------------- */

    /**
   * Handle deleting an activity.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #deleteDocument(event, target) {
        const activityId = target.closest(".activity")?.dataset.activityId;
        if (!activityId) return;

        console.log(this.item.system.activities);
        await this.item.update({
            [`system.activities.-=${activityId}`]: null
        });
        console.log(this.item.system.activities);

        this.render({ force: true });
    }

    /* -------------------------------------------- */

    /**
   * Handle activity's roll.
   * @this {TaticsSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #roll(event, target) {
        if (!target.classList.contains("rollable")) return;
        switch (target.dataset.type) {
            case "activity": {
                const activityId = target.dataset.id;
                const activity = this.item.system.activities[activityId];
                if (!activity) return;

                return this.item.system.rollActivity(
                    { activity, event }, {},
                    { speaker: ChatMessage.getSpeaker({ actor: this.actor }) }
                );
            };
        }
    }

    /* -------------------------------------------- */

    /**
     * Decrease an unit property value.
     * @this {UnitSheet}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
     */
    static async #decrease(event, target) {
        const property = target.dataset.property;
        const itemId = target.closest(".event")?.dataset.itemId;
        if (!itemId) return;

        const events = this.item.getFlag('ldnd5e', 'events') ?? {};
        const value = events[itemId]?.quantity ?? 0;

        // Prevent decreasing the quantity to 0.
        if (value - 1 == 0) return;

        events[itemId].quantity = value - 1;
        await this.item.setFlag('ldnd5e', 'events', events);

        this.render();
    }

    /* -------------------------------------------- */

    /**
     * Increase an unit property value.
     * @this {UnitSheet}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
     */
    static async #increase(event, target) {
        const property = target.dataset.property;
        const itemId = target.closest(".event")?.dataset.itemId;
        if (!itemId) return;

        const events = this.item.getFlag('ldnd5e', 'events') ?? {};
        const value = events[itemId]?.quantity ?? 0;

        events[itemId].quantity = value + 1;
        await this.item.setFlag('ldnd5e', 'events', events);

        this.render();
    }
}
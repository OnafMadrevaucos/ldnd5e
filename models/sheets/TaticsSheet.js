import ActivityDialog from "../dialogs/ActivityDialog.js";
import { unitData } from "../../scripts/constants.js";

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
            editDescription: this.#editDescription,
            toggleAttr: this.#toggleAttr,
            toggleRecovery: this.#toggleRecovery,
            editDocument: this.#editDocument,
            deleteDocument: this.#deleteDocument,
            roll: this.#roll
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
            template: "systems/dnd5e/templates/items/tabs.hbs",
            templates: ["templates/generic/tab-navigation.hbs"]
        },
        activities: {
            template: "modules/ldnd5e/templates/sheets/tatic/activities.hbs",
            scrollable: [""]
        },
        description: {
            template: "modules/ldnd5e/templates/sheets/tatic/description.hbs",
        },
    };

    /* -------------------------------------------- */

    /** @override */
    static TABS = [
        { tab: "description", label: "DND5E.ITEM.SECTIONS.Description" },
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
                const { id, name, type } = activity;
                return {
                    id: id,
                    name: name,
                    img: {
                        src: `modules/ldnd5e/ui/icons/${type}.svg`,
                        svg: true
                    }
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
   * Prepare actor portrait for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _preparePortrait(context) {
        const defaultArtwork = Actor.implementation.getDefaultArtwork(this.item._source)?.img;
        return {
            src: this.item.img ?? defaultArtwork,
            // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
            path: "img"
        };
    }

    /* -------------------------------------------- */
    /*  Events Listeners and Handlers               */
    /* -------------------------------------------- */

    /**@inheritdoc */
    async _addDocument(event) {
        const activity = await ActivityDialog.createDialog(this.item, { mode: "create" });

        if (activity) {
            this.item.system.activities[activity.id] = activity;
            await this.item.update({ "system.activities": this.item.system.activities });
            this.render();
        }
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
   * Handle expanding the description editor.
   * @this {ItemSheet5e}
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
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #toggleAttr(event, target) {
        const attr = target.dataset.attr;
        const attributes = this.item.system.attributes;
        attributes[attr] = attributes[attr] === true ? false : true;

        await this.item.update({ "system.attributes": attributes });
    }

    /* -------------------------------------------- */

    /**
   * Handle toggling if this tatic is part of the main recovey action.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #toggleRecovery(event, target) {
        const mainRecovery = !this.item.system.mainRecovery;

        await this.item.update({ "system.mainRecovery": mainRecovery });
    }

    /* -------------------------------------------- */

    /**
   * Handle showing an activity.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #editDocument(event, target) {
        const activityId = target.closest(".activity")?.dataset.activityId;
        if (!activityId) return;

        const activity = await ActivityDialog.createDialog(this.item, { activityId, mode: "edit" });
        if (!activity) return;

        this.item.system.activities[activityId] = activity;
        await this.item.update({ "system.activities": this.item.system.activities });
    }

    /* -------------------------------------------- */

    /**
   * Handle deleting an activity.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #deleteDocument(event, target) {
        const activityId = target.closest(".activity")?.dataset.activityId;
        if (!activityId) return;

        delete this.item.system.activities[activityId];
        await this.item.update({ "system.activities": this.item.system.activities });
        this.render();
    }

    /* -------------------------------------------- */

    /**
   * Handle activity's roll.
   * @this {ItemSheet5e}
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
}
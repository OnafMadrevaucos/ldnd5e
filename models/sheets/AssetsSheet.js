import ActivityDialog from "../dialogs/ActivityDialog.js";
import { assetsData, taticsData, unitData } from "../../scripts/constants.js";

const { api: api, item: item } = dnd5e.applications;

const TextEditor$b = foundry.applications.ux.TextEditor.implementation;

export default class AssetsSheet extends item.ItemSheet5e {
    static MODES = {
        PLAY: 0,
        EDIT: 1
    }

    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "asset"],
        position: {
            width: 500,
            height: 400
        },
        editingDescriptionTarget: null,
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        actions: {
            editDescription: this.#editDescription,
            editDocument: this.#editDocument,
            deleteDocument: this.#deleteDocument
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
            template: "modules/ldnd5e/templates/sheets/asset/header.hbs",
        },
        tabs: {
            template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
            templates: ["templates/generic/tab-navigation.hbs"]
        },
        activities: {
            template: "modules/ldnd5e/templates/sheets/asset/tabs/activities.hbs",
            scrollable: [""]
        },
        description: {
            template: "modules/ldnd5e/templates/sheets/asset/tabs/description.hbs",
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

        this.element.querySelector(".charges input")?.addEventListener('input', event => this._onChargesChange(event));

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
        const item = this.item;
        context.portrait = this._preparePortrait(context);

        const types = {};

        for (const [key, value] of Object.entries(assetsData.types)) {
            types[key] = {
                value: value,
                label: game.i18n.localize(`ldnd5e.assets.types.${value}`)
            };
        }

        context.types = types;
        context.typeIcon = assetsData.typesIcons[item.system.info.type];
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
        const defaultArtwork = Item.implementation.getDefaultArtwork(this.item._source)?.img;
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
        const activity = await ActivityDialog.create(this.item, { mode: "create" });

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
    _onChargesChange(event) {
        const input = event.currentTarget;

        let val = parseInt(input.value);

        const min = 0;

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
   * Handle showing an activity.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
    static async #editDocument(event, target) {
        const activityId = target.closest(".activity")?.dataset.activityId;
        if (!activityId) return;

        const activity = await ActivityDialog.create(this.item, { activityId, mode: "edit" });
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

        await this.item.update({
            [`system.activities.-=${activityId}`]: null
        });
        this.render();
    }

    /* -------------------------------------------- */
}
import { battleData } from "../scripts/constants.js";

const api = dnd5e.applications.api;
const contextMenu = dnd5e.applications.ContextMenu5e;

export default class BattleApp extends api.Application5e {

    static MODES = {
        PLAY: 0,
        EDIT: 1
    }

    /**@inheritdoc */
    constructor(options = {}) {
        super(options);
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "battle"],
        window: {
            title: "ldnd5e.titles.battle"
        },
        controls: {
            dropdown: true // habilita o dropdown no header
        },
        actions: {
            toggleDeckControls: BattleApp.#toggleDeckControls,
            toggleExtraDeck: BattleApp.#toggleExtraDeck,
            toggleEventsControls: BattleApp.#toggleEventsControls,
            clickUnit: BattleApp.#clickUnit
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 900,
            height: 825
        },
        dragDrop: [{ dropSelector: '.row' }]
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        field: {
            template: "modules/ldnd5e/templates/battles/field.hbs"
        },
        controls: {
            template: "modules/ldnd5e/templates/battles/controls.hbs"
        },
        events: {
            template: "modules/ldnd5e/templates/battles/events.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The whole battle data.
     * @type {Activity|null}
     */
    get battle() {
        return this.#battle ?? null;
    }

    /**
     * The world battle data.
     * @type {Activity|null}
     */
    get app() {
        return this.#battle.app ?? null;
    }

    /**
     * The world battle data.
     * @type {Activity|null}
     */
    get world() {
        return this.#battle.world ?? null;
    }

    /**
     * The local battle data.
     * @type {Activity|null}
     */
    get local() {
        return this.#battle.local ?? null;
    }

    #battle;

    /* -------------------------------------------- */

    /**
     * Is this PseudoDocument sheet editable by the current User?
     * This is governed by the editPermission threshold configured for the class.
     * @type {boolean}
     */
    get isEditable() {
        return game.user.isGM;
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    _prepareBaseData() {
        // Get the world battle data.
        let { app, world } = game.settings.get('ldnd5e', 'battle');

        if (!app) {
            app = {
                mode: this.constructor.MODES.PLAY
            };
        }

        // Check if the data is empty.
        if (!world) {
            world = {
                scoreboard: {
                    top: {
                        attack: 0,
                        impetus: 0
                    },
                    bottom: {
                        attack: 0,
                        impetus: 0
                    }
                },
                turns: {
                    max: 0,
                    current: 0
                },
                events: [],
                fields: {
                    top: {
                        rows: {
                            1: {
                                units: [],
                                effect: ''
                            },
                            2: {
                                units: [],
                                effect: ''
                            },
                            3: {
                                units: [],
                                effect: ''
                            }
                        }
                    },
                    bottom: {
                        rows: {
                            1: {
                                units: [],
                                effect: ''
                            },
                            2: {
                                units: [],
                                effect: ''
                            },
                            3: {
                                units: [],
                                effect: ''
                            }
                        }
                    }
                }
            }
        }

        let userCompanyId = game.user.character?.getFlag('ldnd5e', 'company');
        this.#battle = {
            app,
            world,
            local: {
                user: game.user,
                commander: game.user.character ?? null,
                company: userCompanyId ? game.actors.get(userCompanyId) : null,
            }
        };
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        // Initialize the application data.
        this._prepareBaseData();

        return {
            ...await super._prepareContext(options),
            editable: this.isEditable,
            options: this.options
        };
    }

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        context.isGM = this.local.user.isGM;

        context.icons = {
            deck: 'modules/ldnd5e/ui/icons/battle/deck.svg',
            events: 'modules/ldnd5e/ui/icons/battle/events.svg',
        };

        context.score = {
            enemy: {
                attack: 13,
                impetus: 23
            },
            ally: {
                attack: 16,
                impetus: 22
            }
        }

        // Prepare all the unit context for display.
        this._prepareUnits(context);

        switch (partId) {
            case "field":
                return this._prepareFieldContext(context, options);
            case "controls":
                return this._prepareControlsContext(context, options);
            case "events":
                return this._prepareEventsContext(context, options);
            default:
                return context;
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareFieldContext(context, options) {

        context.phase = {
            label: game.i18n.localize('ldnd5e.battle.phases.prep'),
            icon: 'ra-tower'
        }

        context.turns = {
            elapsed: 5,
            max: 20,
            current: 20 - 5,
            value: ((20 - 5) / 20),
            limit: Math.clamp((10 / 20) * 100, 0, 100),
            pct: Math.clamp(((20 - 5) / 20) * 100, 0, 100)
        };

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareControlsContext(context, options) {
        context.title = game.i18n.format('ldnd5e.battle.deck', { name: this.local.company.name });

        Object.assign(context.icons, {
            deckTiny: 'modules/ldnd5e/ui/icons/battle/deck-tiny.svg',
            full: 'modules/ldnd5e/ui/icons/battle/full-deck.svg',
            discarded: 'modules/ldnd5e/ui/icons/battle/discarded-deck.svg',
            assets: 'modules/ldnd5e/ui/icons/battle/assets-deck.svg',
        });

        context.hand = {
            counter: 3,
            max: 5
        }

        context.piles = {
            draw: 14,
            discard: 3,
            assets: 5
        }

        context.company = this.local.company;

        // Prepare the commander's combat skills.
        context.skills = this.local.company.system.combat;

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareEventsContext(context, options) {
        const world = this.battle.world;

        context.fields = {
            top: {
                rows: Object.entries(world.fields.top.rows).map(([n, { effect }]) => ({
                    number: Number(n),
                    label: game.i18n.format('ldnd5e.battle.rowNumber', { number: n }),
                    effect
                }))
            },
            bottom: {
                rows: Object.entries(world.fields.top.rows).map(([n, { effect }]) => ({
                    number: Number(n),
                    label: game.i18n.format('ldnd5e.battle.rowNumber', { number: n }),
                    effect
                }))
            }
        };

        context.rowEffects = [{ value: '', label: '—' },
        ...Object.values(battleData.rowEffects).map(effect => ({
            value: effect,
            label: game.i18n.localize(`ldnd5e.battle.rowEffects.${effect}`)
        }))
        ];

        return context;
    }

    /**
   * Prepare the combat units for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _prepareUnits(context) {
        const company = this.local.company;

        const unitsList = [];
        Object.entries(company.system.unitsList).forEach(([type, units]) => {
            if (['light', 'heavy', 'special'].includes(type)) {
                unitsList.push(...units);
            }
        });

        context.units = unitsList;

        const world = this.battle.world;

        context.rowUnits = {
            top: {
                rows: Object.entries(world.fields.top.rows).map(([n, { units }]) => ({
                    units: units.map(unit => game.actors.get(unit))
                }))
            },
            bottom: {
                rows: Object.entries(world.fields.bottom.rows).map(([n, { units }]) => ({
                    units: units.map(unit => game.actors.get(unit))
                }))
            }
        };

        return context;
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);
        const dragDrop = CONFIG.ux.DragDrop;

        // Enable Drag & Drop funtion to rows.
        new dragDrop({
            dragSelector: ".draggable",
            dropSelector: ".row",
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragenter: this._onDragEnter.bind(this),
                dragleave: this._onDragLeave.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);

        this.activateListeners();
    }

    /**
     * Activate listeners for context menu on units.
     * @return {void}
     */
    activateListeners() {
        for (const unit of this.element.querySelectorAll("li.unit")) {
            unit.addEventListener("contextmenu ", contextMenu.triggerEvent);
        }

        new contextMenu(this.element, "li.unit", [], { onOpen: this._onOpenContextMenu.bind(this), jQuery: false });
    }

    /* -------------------------------------------- */
    /*  Event Listeners                             */
    /* -------------------------------------------- */

    /**
     * Gets the header controls for the application.
     *
     * @returns {array} An array of header controls.
     * @protected
     */
    _getHeaderControls() {
        return [
            {
                icon: "fas fa-arrow-rotate-right",
                label: game.i18n.localize("ldnd5e.battle.reset"),
                onClick: (event) => this._onResetBattle(event)
            }
        ];
    }

    /**
   * Prepare an array of context menu options which are available for inventory items.
   * @param {UnitL5e} unit         The unit.
   * @param {HTMLElement} element  The unit's rendered element.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
    _getContextOptions(unit, element) {
        let options = [];

        // Unit options.
        options.push({
            id: "delete",
            name: "ldnd5e.unit.delete",
            icon: '<i class="fas fa-trash fa-fw"></i>',
            condition: () => true,
            callback: li => this._onAction(li, "delete")
        });

        return options;
    }

    /* -------------------------------------------- */

    /**
   * Handle item actions.
   * @param {HTMLElement} target            The action target.
   * @param {string} action                 The action to invoke.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise}
   * @private
   */
    async _onAction(target, action, { event } = {}) {
        const side = target.closest(".field").dataset.side;
        const row = target.closest(".row").dataset.row;
        const unitId = target.dataset.unitId;

        switch (action) {
            case "delete": {
                this.world.fields[side].rows[row].units = this.world.fields[side].rows[row].units.filter(u => u !== unitId);
                await game.settings.set('ldnd5e', 'battle', { app: this.app, world: this.world });
                return target.remove();
            }
        }
    }

    /* -------------------------------------------- */

    /**
   * Reset the battle data.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   */
    async _onResetBattle(event) {
        const blankData = {
            // Battle Application data.
            app: {
                mode: 0
            },
            // Global battle data.
            world: {
                scoreboard: {
                    top: {
                        attack: 0,
                        impetus: 0
                    },
                    bottom: {
                        attack: 0,
                        impetus: 0
                    }
                },
                turns: {
                    max: 0,
                    current: 0
                },
                events: [],
                fields: {
                    top: {
                        rows: {
                            1: {
                                units: [],
                                effect: ''
                            },
                            2: {
                                units: [],
                                effect: ''
                            },
                            3: {
                                units: [],
                                effect: ''
                            }
                        }
                    },
                    bottom: {
                        rows: {
                            1: {
                                units: [],
                                effect: ''
                            },
                            2: {
                                units: [],
                                effect: ''
                            },
                            3: {
                                units: [],
                                effect: ''
                            }
                        }
                    }
                }
            }
        };

        const result = await foundry.applications.api.DialogV2.confirm({
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

        if (result) {
            await game.settings.set('ldnd5e', 'battle', blankData);
            this.render(true);
        }
    }

    /**
     * Handle opening the context menu.
     * @param {HTMLElement} element  The element the context menu was triggered for.
     * @protected
     */
    _onOpenContextMenu(element) {
        const { unitId } = element.closest("[data-unit-id]")?.dataset ?? {};
        const unit = game.actors.get(unitId);

        ui.context.menuItems = this._getContextOptions(unit, element);
        Hooks.callAll("dnd5e.getItemContextOptions", unit, ui.context.menuItems);
    }
    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    /**
     * Handle the start of a drag operation by setting the drag data and allowed effect.
     * @param {DragEvent} event  The drag event.
     * @protected
     */
    async _onDragStart(event) {
        const li = event.target.closest("li");
        const unit = game.actors.get(li.dataset.unitId);

        event.dataTransfer.setData("text/plain", JSON.stringify(unit.toDragData()));
        event.dataTransfer.effectAllowed = li?.dataset.dragType ?? null;
    }

    /**
     * Handle when the user's mouse enters the drop target.
     * @param {DragEvent} event  The drag event.
     * @protected
     */
    async _onDragEnter(event) {
        const field = event.currentTarget.closest(".field");
        const rowEl = event.currentTarget.closest(".row");
        if (!rowEl) return;

        const rowNumber = rowEl.dataset.row;

        let dragCounter = Number(rowEl.dataset.dragCounter);
        dragCounter++;
        rowEl.dataset.dragCounter = dragCounter;

        const rowNumberSpan = field.querySelector(`.row-number[data-row="${rowNumber}"]`);

        rowEl.classList.add("drag-over");
        rowNumberSpan.classList.add("drag-over");
    }

    /**
     * Handle when the user's mouse leaves the drop target.
     * @param {DragEvent} event  The drag event.
     * @protected
     */
    async _onDragLeave(event) {
        const field = event.currentTarget.closest(".field");
        const rowEl = event.currentTarget.closest(".row");
        if (!rowEl) return;

        const rowNumber = rowEl.dataset.row;

        let dragCounter = Number(rowEl.dataset.dragCounter);
        dragCounter = dragCounter > 0 ? dragCounter - 1 : 0;
        rowEl.dataset.dragCounter = dragCounter;

        const rowNumberSpan = field.querySelector(`.row-number[data-row="${rowNumber}"]`);

        if (dragCounter <= 0) {
            rowEl.classList.remove("drag-over");
            rowNumberSpan.classList.remove("drag-over");
        }
    }


    /**
     * Handle dropping an actor onto the battlefield.
     * @param {DragEvent} event  The drop event.
     * @protected
     */
    async _onDrop(event) {

        const field = event.currentTarget.closest(".field");
        // Drop target.
        const rowEl = event.currentTarget.closest(".row");
        if (!rowEl) return;

        const rowNumber = rowEl.dataset.row;

        let dragCounter = Number(rowEl.dataset.dragCounter);
        dragCounter = dragCounter > 0 ? dragCounter - 1 : 0;
        rowEl.dataset.dragCounter = dragCounter;

        const rowNumberSpan = field.querySelector(`.row-number[data-row="${rowNumber}"]`);

        if (dragCounter <= 0) {
            rowEl.classList.remove("drag-over");
            rowNumberSpan.classList.remove("drag-over");
        }

        // Drop data.
        const data = foundry.applications.ux.TextEditor.getDragEventData(event);
        if (data.type !== "Actor") return;

        // Obtain Actor.
        const actor = await fromUuid(data.uuid);
        if (!actor) return;

        if (actor.type !== 'ldnd5e.unit') {
            ui.notifications.warn(game.i18n.format("ldnd5e.messages.invalidActorOnBattle", { actor: actor.name }), { localize: true });
            return;
        }

        const rowName = rowEl.dataset.row;
        const sideName = rowEl.closest(".field")?.dataset.side;

        if (!rowName || !sideName) return;

        switch (event.dataTransfer.effectAllowed) {
            case "move": {
                await this._onMoveUnit({ actor, sideName, rowName });
            } break;
            default: {
                await this._onDropUnit({ actor, sideName, rowName });
            } break
        }

        // Re-render
        this.render(true);
    }

    /**
     * Handle the move of a unit from one row to another.
     * @param {object} data - The event data.
     * @param {string} data.sideName - The name of the side.
     * @param {string} data.rowName - The name of the row.
     * @param {Actor} data.actor - The actor.
     * @private
     */
    async _onMoveUnit(data) {
        const fields = this.#battle.world.fields;

        // Remove from the old row.
        Object.values(fields).forEach(field => {
            Object.values(field.rows).forEach(row => {
                row.units = row.units.filter(u => u !== data.actor.id);
            });
        });

        fields[data.sideName].rows[data.rowName].units.push(data.actor.id);
        // Store.
        await game.settings.set('ldnd5e', 'battle', { app: this.app, world: this.world });
    }

    /**
     * Handle the drop of a unit onto the battle board.
     * @param {object} data - The event data.
     * @param {string} data.sideName - The name of the side.
     * @param {string} data.rowName - The name of the row.
     * @param {Actor} data.actor - The actor.
     */
    async _onDropUnit(data) {
        const fields = this.#battle.world.fields;

        fields[data.sideName].rows[data.rowName].units.push(data.actor.id);
        // Store.
        await game.settings.set('ldnd5e', 'battle', { app: this.app, world: this.world });
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Toggles the deck controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static #toggleDeckControls(event, target) {
        const content = target.closest(".window-content");

        const controls = content.querySelector(".battle-controls");
        const viewer = content.querySelector(".extra-decks-viewer");

        controls.classList.toggle("active");

        // If its closing, hide the viewer as well.
        if (!controls.classList.contains("active")) {
            viewer.classList.remove("active");

            const buttons = controls.querySelectorAll(".extra-decks button");

            // Clear all active elements.
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove("active");
            }

            // Clear active deck.
            viewer.dataset.deck = '';
        }
    }

    /* -------------------------------------------- */

    /**
   * Toggles the extra deck viewer.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static #toggleExtraDeck(event, target) {
        const container = target.closest(".extra-decks");
        const buttons = container.querySelectorAll("button");

        const content = target.closest(".window-content");
        const viewer = content.querySelector(".extra-decks-viewer");

        const oldActiveDeck = viewer.dataset.deck ?? '';
        const targetDeck = target.dataset.deck ?? '';

        const cardsSections = viewer.querySelectorAll(".cards-section");

        // Clear all active elements.
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("active");
            cardsSections[i].classList.add("hidden");
        }

        const targetCardsSection = viewer.querySelector(`.cards-section.${targetDeck}`);
        if (!targetCardsSection) return;

        // Show the target section.
        targetCardsSection.classList.remove("hidden");

        // If the viewer is already active.
        if (viewer.classList.contains("active")) {
            // Check if the target button is active.
            if (oldActiveDeck === targetDeck) {
                // If the deck is the same, close the viewer.
                viewer.classList.remove("active");
                target.classList.remove("active");
                // Reset the active deck. 
                viewer.dataset.deck = '';
            }
            // If the deck is different, change the active deck.
            else {
                target.classList.add("active");
                // Update the active deck.
                viewer.dataset.deck = targetDeck;
            }
        }
        // If the viewer is not active.
        else {
            viewer.classList.add("active");
            target.classList.add("active");
            // Set the active deck.
            viewer.dataset.deck = targetDeck;
        }
    }

    /* -------------------------------------------- */

    /**
   * Toggles the events controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static #toggleEventsControls(event, target) {
        const content = target.closest(".window-content");
        const controls = content.querySelector(".events-controls");

        controls.classList.toggle("active");
    }

    /* -------------------------------------------- */

    /**
   * Renders the clicked unit sheet.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static #clickUnit(event, target) {
        const item = target.closest("li");
        const unitId = item.dataset.unitId;
        const unit = game.actors.get(unitId);

        if (!unit) return;

        unit.sheet.render(true);
    }
}
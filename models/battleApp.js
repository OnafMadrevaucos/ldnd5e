import { battleData } from "../scripts/constants.js";

const api = dnd5e.applications.api;
export default class BattleApp extends api.Application5e {

    /**@inheritdoc */
    constructor(options = {}) {
        super(options);

        // Initialize the application data.
        this._initialize(options);
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "battle"],
        window: {
            title: "ldnd5e.titles.battle"
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
    /*  Rendering                                   */
    /* -------------------------------------------- */

    _initialize(options) {
        // Get the world battle data.
        let world = options?.world || game.settings.get('ldnd5e', 'battle');

        // Check if the data is empty.
        if (!world) {
            ui.notifications.error(game.i18n.localize("ldnd5e.messages.emptyBattleData"), { localize: true });
            return null;
        }

        let userCompanyId = game.user.character?.getFlag('ldnd5e', 'company');
        this.#battle = {
            ...world,
            local: {
                user: game.user,
                commander: game.user.character ?? null,
                company: userCompanyId ? game.actors.get(userCompanyId) : null,
            }
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

        // Prepare the combat units for display.
        this._prepareUnits(context);

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

        return context;
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);

        const rows = this.element.querySelectorAll(".row");
        rows.forEach(row => {
            // Enable Drag & Drop funtion to rows.
            new CONFIG.ux.DragDrop({
                dragSelector: ".draggable",
                dropSelector: null,
                callbacks: {
                    dragstart: this._onDragStart.bind(this),
                    dragenter: this._onDragEnter.bind(this),
                    dragleave: this._onDragLeave.bind(this),
                    drop: this._onDrop.bind(this)
                }
            }).bind(row);
        });
    }

    /* -------------------------------------------- */
    /*  Event LIsteners                             */
    /* -------------------------------------------- */

    async _onDragStart(event) {
        event.preventDefault();
    }

    async _onDragEnter(event) {
        event.preventDefault();

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

    async _onDragLeave(event) {
        event.preventDefault();

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

    async _onDrop(event) {
        event.preventDefault();

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
        const data = TextEditor.getDragEventData(event);
        if (data.type !== "Actor") return;

        // Obtain Actor.
        const actor = await fromUuid(data.uuid);
        if (!actor) return;

        if (actor.type !== 'ldnd5e.unit') {
            ui.notifications.warn(game.i18n.format("ldnd5e.messages.invalidActorOnBattle", { actor: actor.name }), { localize: true });
            return;
        }

        // TokenDocument's UUID.
        const tokenUuid = token.document.uuid;

        const rowName = rowEl.dataset.row;
        const sideName = rowEl.closest(".field")?.dataset.side;

        if (!rowName || !sideName) return;

        const battlefield = foundry.utils.deepClone(
            game.scenes.current.getFlag("ldnd5e", "battlefield") ?? {
                allies: { frontline: [], midline: [], backline: [] },
                enemies: { frontline: [], midline: [], backline: [] }
            }
        );

        battlefield[sideName][rowName].push(tokenUuid);

        // Store.
        await game.scenes.current.setFlag("ldnd5e", "battlefield", battlefield);

        // Re-render
        this.render();
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Toggles the deck controls.
   * @this {ArmySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static #toggleDeckControls(event, target) {
        const content = target.closest(".window-content");

        const controls = content.querySelector(".battle-controls");
        const viewer = controls.querySelector(".extra-decks-viewer");

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
   * @this {ArmySheet}
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
   * @this {ArmySheet}
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
   * @this {ArmySheet}
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
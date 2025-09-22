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
            toggleCompanySelect: BattleApp.#toggleCompanySelect,
            switchCompany: BattleApp.#switchCompany,
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
        },
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
<<<<<<< Updated upstream
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
=======

    /**
    * The current selected company index.
    * @type {Number|null}
    */
    get currentCompanyIdx() {
        return this.app.state.currentCompanyIdx ?? 0;
    }

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

    /**
     * Prepares the base data for the Battle App.
     * This is run every time the user opens the app, and is responsible for setting up the app's internal state.
     * @private
     */
    async _prepareBaseData() {
        // Get the world battle data.
        let world = game.settings.get('ldnd5e', 'battle') ?? game.settings.settings.get('ldnd5e.battle').default;

        let local = await this._prepareLocalData(world);

        this.#battle = {
            world,
            local
        };

        // Validate the deck.
        this._validateDeck();
    }

    /* -------------------------------------------- */

    async _prepareLocalData(world) {
        const userCompanyId = game.user.character?.getFlag('ldnd5e', 'company');
        // User has not a company linked to its character.
        const isViewer = ((userCompanyId === null) || (userCompanyId === undefined)
            || (userCompanyId === '')) && !game.user.isGM;

        // Get the user battle data.
        let app = game.user.getFlag('ldnd5e', 'battle');

        // Check if applitation data has not been created yet, or if the user is a viewer.
        if (!app || isViewer) {
            app = {
                mode: this.constructor.MODES.PLAY,
                state: {
                    sidebar: {
                        control: false,
                        viewer: '',
                        events: false,
                        tabs: false,
                        overlay: false
                    },
                    currentCompanyIdx: 0
                }
            };
        }

        let deck = (game.user.isGM ? game.user.getFlag('ldnd5e', 'deck') : (game.user.character?.getFlag('ldnd5e', 'deck')) ?? null);

        // If user is commander but has no deck data, create it.        
        if (!deck && (userCompanyId || game.user.isGM)) {
            deck = {
                hand: {
                    tatics: [],
                    max: 5
                },
                piles: {
                    tatics: [],
                    discarded: [],
                    assets: []
                }
            };

            // If the user is GM, the deck is located in its user data.
            if (game.user.isGM) {
                await game.user.setFlag('ldnd5e', 'deck', deck);
            }
            // If the user is not GM, the deck is located in its commander's character data. 
            else {
                await game.user.character?.setFlag('ldnd5e', 'deck', deck);
            }
        }

        // Build the company data.
        let company = null;
        let commander = null;

        // If the user is GM, get all the NPC's companies in the battle.
        if (game.user.isGM) {
            company = [];

            world.sides.top.forEach(c => {
                const data = game.actors.get(c.id);
                const commander = data.system.info.commander;
                if (!commander || (commander.type === 'npc')) {
                    company.push(c);
                }
            });

            world.sides.bottom.forEach(c => {
                const data = game.actors.get(c.id);
                const commander = data.system.info.commander;
                if (!commander || (commander.type === 'npc')) {
                    company.push(c);
                }
            });
        }
        // If the user is not GM, get only its company.
        else {
            company = userCompanyId ? game.actors.get(userCompanyId) : null;
            commander = company?.system.info.commander ?? null;
        }

        let side = 'none';
        if (userCompanyId) {
            let sideData = world.sides.top.find(s => s.id === userCompanyId);
            if (sideData) side = 'top';
            else {
                sideData = world.sides.bottom.find(s => s.id === userCompanyId);
                if (sideData) side = 'bottom';
>>>>>>> Stashed changes
            }
        }

        const local = {
            app,
            user: game.user,
            commander: commander,
            company,
            side,
            deck,
            isViewer,
            isGM: game.user.isGM
        };
<<<<<<< Updated upstream
=======

        return local;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        // Initialize the application data.
        await this._prepareBaseData();

        return {
            ...await super._prepareContext(options),
            state: this.state,
            editable: this.isEditable,
            options: this.options
        };
>>>>>>> Stashed changes
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        context.isGM = this.local.user.isGM;

        context.icons = {
            deck: 'modules/ldnd5e/ui/icons/battle/deck.svg',
            events: 'modules/ldnd5e/ui/icons/battle/events.svg'
        };

<<<<<<< Updated upstream
=======
        context.sides = {
            top: this.world.sides.top,
            bottom: this.world.sides.bottom,
            ready: this.world.sides.top.length > 0 && this.world.sides.bottom.length > 0,
            empty: {
                top: this.world.sides.top.length === 0,
                bottom: this.world.sides.bottom.length === 0
            }
        }

>>>>>>> Stashed changes
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

        if (this.local.user.isGM) {
            context.title = game.i18n.format('ldnd5e.battle.deck', { name: this.local.company[this.currentCompanyIdx]?.name ?? '' });
        } else {
            context.title = game.i18n.format('ldnd5e.battle.deck', { name: this.local.company.name });
        }
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

        let company = null;

        if (this.local.user.isGM) {
            const companyId = this.local.company[this.currentCompanyIdx]?.id ?? null;
            company = game.actors.get(companyId);

            context.companies = this.local.company;
            context.multipleCompanies = true;
            context.currentCompanyIdx = this.currentCompanyIdx;
        } else {
            company = this.local.company;
        }

        context.company = company;

        // Prepare the commander's combat skills.
        context.skills = company?.system.combat || {};

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareTabsContext(context, options) {
        context.tabs = this.tabs;

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

<<<<<<< Updated upstream
=======
    /* -------------------------------------------- */

    /**
   * Prepare the commander's deck.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @protected
   */
    _prepareDeck(context) {
        const deck = foundry.utils.deepClone(this.local.deck);

        deck.list = {
            hand: deck.hand.tatics.map(taticUuid => {
                const tatic = fromUuidSync(taticUuid);
                const unit = tatic.actor;

                return {
                    uuid: tatic.uuid,
                    name: tatic.name,
                    img: {
                        src: tatic.img,
                        svg: tatic.img.endsWith('.svg')
                    },
                    unit: {
                        id: unit.id,
                        name: unit.name
                    }
                };
            }).filter(tatic => tatic !== null && tatic !== undefined), // Filter out the nulls
            piles: {
                tatics: deck.piles.tatics.map(taticUuid => {
                    const tatic = fromUuidSync(taticUuid);
                    const unit = tatic.actor;

                    return {
                        uuid: tatic.uuid,
                        name: tatic.name,
                        img: {
                            src: tatic.img,
                            svg: tatic.img.endsWith('.svg')
                        },
                        unit: {
                            id: unit.id,
                            name: unit.name
                        }
                    };
                }).filter(tatic => tatic !== null && tatic !== undefined), // Filter out the nulls
                discarded: deck.piles.discarded.map(taticUuid => {
                    const tatic = fromUuidSync(taticUuid);
                    const unit = tatic.actor;

                    return {
                        uuid: tatic.uuid,
                        name: tatic.name,
                        img: {
                            src: tatic.img,
                            svg: tatic.img.endsWith('.svg')
                        },
                        unit: {
                            id: unit.id,
                            name: unit.name
                        }
                    };
                }).filter(tatic => tatic !== null && tatic !== undefined), // Filter out the nulls
                assets: deck.piles.assets.map(assetId => {
                    const assets = fromUuidSync(assetId);
                    const unit = tatic.actor;

                    return {
                        uuid: assets.uuid,
                        name: assets.name,
                        img: {
                            src: assets.img,
                            svg: assets.img.endsWith('.svg')
                        },
                        unit: {
                            id: unit.id,
                            name: unit.name
                        }
                    };
                }).filter(asset => asset !== null && asset !== undefined), // Filter out the nulls
            }
        };

        Object.assign(deck, {
            counter: {
                hand: deck.list.hand.length,
                tatics: deck.list.piles.tatics.length,
                discarded: deck.list.piles.discarded.length,
                assets: deck.list.piles.assets.length
            }
        });

        context.deck = deck;
        return context;
    }

>>>>>>> Stashed changes
    /**
   * Prepare the combat units for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _prepareUnits(context) {
<<<<<<< Updated upstream
        const company = this.local.company;

        const unitsList = [];
        Object.entries(company.system.unitsList).forEach(([type, units]) => {
            if (['light', 'heavy', 'special'].includes(type)) {
                unitsList.push(...units);
=======
        // If user is not a viewer, prepare its company's units list.
        if (!context.isViewer) {

            let company = null;
            const unitsList = [];

            if (this.local.user.isGM) {
                const companyId = this.local.company[this.currentCompanyIdx]?.id ?? null;
                company = game.actors.get(companyId);
            } else {
                const companyId = this.local.company.id;
                company = game.actors.get(companyId);
            }

            if (company) {
                Object.entries(company.system.unitsList).forEach(([type, units]) => {
                    if (['light', 'heavy', 'special'].includes(type)) {
                        unitsList.push(...units);
                    }
                });

                context.units = unitsList;
            }
        }

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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

        this.activateListeners();
    }

    /**
     * Activate listeners for context menu on units.
     * @return {void}
     */
    activateListeners() {
        const dragDrop = CONFIG.ux.DragDrop;

        // Enable Drag & Drop funtion to rows.
        new dragDrop({
            dragSelector: ".draggable",
            dropSelector: ".dropzone",
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragenter: this._onDragEnter.bind(this),
                dragleave: this._onDragLeave.bind(this),
                drop: this._onDrop.bind(this)
            }
        }).bind(this.element);

        const overlay = this.element.querySelector('.sidebar-overlay');
        overlay.addEventListener("click", this._onOverlayClick.bind(this));

        for (const unit of this.element.querySelectorAll("li.unit")) {
            unit.addEventListener("contextmenu ", contextMenu.triggerEvent);
        }

        new contextMenu(this.element, "li.unit", [], { onOpen: this._onOpenUnitContextMenu.bind(this), jQuery: false });
        new contextMenu(this.element, "div.item.company", [], { onOpen: this._onOpenSideContextMenu.bind(this), jQuery: false });
    }

    /* -------------------------------------------- */
    /*  Event Listeners                             */
    /* -------------------------------------------- */

    async _onOverlayClick(event) {
        event.stopPropagation();

        const html = this.element;
        if (this.app.state.sidebar.control) {

            const controls = html.querySelector('.deck-controls[data-application-part="controls"]');

            const tabs = controls.querySelector('.company-tabs');
            const viewer = controls.querySelector('.extra-decks-viewer');
            const battle = controls.querySelector('.battle-controls');

            tabs.classList.remove('active');
            viewer.classList.remove('active');
            battle.classList.remove('active');

            this.app.state.sidebar.control = false;
            this.app.state.sidebar.viewer = '';
            this.app.state.sidebar.tabs = false;

        } else if (this.app.state.sidebar.events) {
            const controls = html.querySelector('.events-controls[data-application-part="events"]');

            controls.classList.remove('active');
            this.app.state.sidebar.control = false;

            
        }

        event.target.classList.add('hidden');
        this.app.state.sidebar.overlay = false;
        await game.user.setFlag('ldnd5e', 'battle', this.app);
    }

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

    /* -------------------------------------------- */

    _onChangeTab() {

    }

    /* -------------------------------------------- */

    /**
   * Prepare an array of context menu options which are available for field units items.
   * @param {UnitL5e} unit         The unit.
   * @param {HTMLElement} element  The unit's rendered element.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
    _getUnitContextOptions(unit, element) {
        let options = [];

        // Unit options.
        options.push({
            id: "delete",
            name: "ldnd5e.unit.delete",
            icon: '<i class="fas fa-trash fa-fw"></i>',
            condition: () => true,
            callback: li => this._onAction(li, "deleteUnit")
        });

        return options;
    }

    /* -------------------------------------------- */

    /**
   * Prepare an array of context menu options which are available for side company items.
   * @param {UnitL5e} unit         The unit.
   * @param {HTMLElement} element  The unit's rendered element.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
    _getSideContextOptions(unit, element) {
        let options = [];

        // Unit options.
        options.push({
            id: "delete",
            name: "ldnd5e.company.delete",
            icon: '<i class="fas fa-trash fa-fw"></i>',
            condition: () => true,
            callback: div => this._onAction(div, "deleteCompany")
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
        switch (action) {
            case "deleteUnit": {
                const side = target.closest(".field").dataset.side;
                const row = target.closest(".row").dataset.row;
                const unitId = target.dataset.unitId;

                this.world.fields[side].rows[row].units = this.world.fields[side].rows[row].units.filter(u => u !== unitId);
            } break;
            case "deleteCompany": {
                const side = target.closest(".side").dataset.side;
                const companyId = target.dataset.companyId;

                this.world.sides[side] = this.world.sides[side].filter(c => c !== companyId);
            } break;
        }

        await game.settings.set('ldnd5e', 'battle', this.world);
        return target.remove();
    }

    /* -------------------------------------------- */

    /**
   * Reset the battle data.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   */
    async _onResetBattle(event) {
        const blankData = game.settings.settings.get('ldnd5e.battle').default;

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

    /* -------------------------------------------- */

    /**
     * Handle opening the field units context menu.
     * @param {HTMLElement} element  The element the context menu was triggered for.
     * @protected
     */
    _onOpenUnitContextMenu(element) {
        const { unitId } = element.closest("[data-unit-id]")?.dataset ?? {};
        const unit = game.actors.get(unitId);

        ui.context.menuItems = this._getUnitContextOptions(unit, element);
        Hooks.callAll("dnd5e.getItemContextOptions", unit, ui.context.menuItems);
    }

    /* -------------------------------------------- */

    /**
     * Handle opening the field units context menu.
     * @param {HTMLElement} element  The element the context menu was triggered for.
     * @protected
     */
    _onOpenSideContextMenu(element) {
        const { companyId } = element.closest("[data-company-id]")?.dataset ?? {};
        const company = game.actors.get(companyId);

        ui.context.menuItems = this._getSideContextOptions(company, element);
        Hooks.callAll("dnd5e.getItemContextOptions", company, ui.context.menuItems);
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
        const fields = this.element.querySelector('.fields');
        const rows = fields.querySelectorAll('.row');
        const rowsNumbers = fields.querySelectorAll('.row-number');

        const li = event.target.closest("li");
        const unit = game.actors.get(li.dataset.unitId);
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
        event.preventDefault();
=======
        // Drop target.
        const dropzone = event.currentTarget;

        if (dropzone.classList.contains("row")) {
            await this._onRowDrop(event, dropzone);
        }
        else if (dropzone.classList.contains("side")) {
            await this._onSideDrop(event, dropzone);
        }

        // Re-render
        this.render(true);
    }

    /**
     * Handle dropping an actor onto the battlefield.
     * @param {DragEvent} event  The drop event.
     * @param {HTMLElement} battleSide  The element receiving the drop.
     * @protected
     */
    async _onSideDrop(event, battleSide) {
        // Drop data.
        const data = foundry.applications.ux.TextEditor.getDragEventData(event);
        if (data.type !== "Actor") return;

        // Obtain Actor.
        const actor = await fromUuid(data.uuid);
        if (!actor) return;

        if (actor.type !== 'ldnd5e.army' && actor.type !== 'ldnd5e.company') {
            ui.notifications.warn(game.i18n.format("ldnd5e.messages.invalidActorOnBattle", { actor: actor.name }), { localize: true });
            return;
        }

        const companies = [];
        if (actor.type === 'ldnd5e.army') {
            for (const companyId of actor.system.companies) {
                const company = game.actors.get(companyId);
                if (!company) continue;

                let commander = company.system.info.commander;
                if (!commander) continue;

                companies.push({
                    uuid: company.uuid,
                    id: company.id,
                    name: company.name,
                    img: {
                        src: company.img,
                        svg: company.img.endsWith('.svg')
                    },
                    commander: commander.id
                });
            }
        } else {
            let commander = actor.system.info.commander;
            if (!commander) return;

            companies.push({
                uuid: company.uuid,
                id: company.id,
                name: company.name,
                img: {
                    src: company.img,
                    svg: company.img.endsWith('.svg')
                },
                commander: commander.id
            });
        }

        const sideName = battleSide.dataset.side;
        companies.forEach(companyId => {
            if (!this.world.sides[sideName].includes(companyId)) this.world.sides[sideName].push(companyId);
        });

        await game.settings.set('ldnd5e', 'battle', this.world);
    }

    /**
     * Handle dropping an actor onto the battlefield.
     * @param {DragEvent} event  The drop event.
     * @param {HTMLElement} unitRow  The element receiving the drop.
     * @protected
     */
    async _onRowDrop(event, unitRow) {
        const fields = this.element.querySelector('.fields');
        const rows = fields.querySelectorAll('.row');
        const rowsNumbers = fields.querySelectorAll('.row-number');

        rows.forEach(row => {
            delete row.dataset.prof;
        });
        rowsNumbers.forEach(row => {
            delete row.dataset.prof;
        });
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
        // Re-render
        this.render();
=======
    /**
     * Handle the drop of a unit onto the battle board.
     * @param {object} data - The event data.
     * @param {string} data.sideName - The name of the side.
     * @param {string} data.rowName - The name of the row.
     * @param {Actor} data.actor - The actor.
     */
    async _onDropUnit(data) {
        // Ignore if the user is a viewer.
        if (this.local.isViewer) return;

        const fields = this.#battle.world.fields;

        fields[data.sideName].rows[data.rowName].units.push(data.actor.id);
        // Store.
        await game.settings.set('ldnd5e', 'battle', this.world);
    }

    /* -------------------------------------------- */
    /*  Utility Function                            */
    /* -------------------------------------------- */

    /**
   * Toggle the sidebar overlay.
   * @this {BattleApp}
   */
    async _toggleOverLay() {
        const html = this.element;
        const overlay = html.querySelector('.sidebar-overlay');

        overlay.classList.toggle('hidden');

        this.app.state.sidebar.overlay = !overlay.classList.contains('hidden');
        await game.user.setFlag('ldnd5e', 'battle', this.app);
    }

    /* -------------------------------------------- */

    /**
   * Shuffles a Deck's array using Fisher-Yates algorithm.
   * @this {BattleApp}
   * @param {object|Array} deck    The deck array.
   * @returns {object}       The shuffled deck array.
   */
    _shuffleDeck(deck) {
        Object.values(deck.piles).forEach(array => {
            let m = array.length, i;

            while (m) {
                // Escolhe um índice aleatório entre 0 e m-1
                i = Math.floor(Math.random() * m--);

                // Troca o elemento atual (m) com o escolhido (i)
                [array[m], array[i]] = [array[i], array[m]];
            }
        });

        return deck;
    }

    /* -------------------------------------------- */

    /**
   * Discard a tatic to the discard pile.
   * @this {BattleApp}
   * @param {object} deck    The deck array.
   * @param {object} tatic   The tatic to be discarded.
   * @async
   */
    async _discardTatic(deck, tatic) {
        for (let taticUuid of deck.hand.tatics) {
            if (taticUuid == tatic.uuid) {
                deck.hand.tatics.splice(deck.hand.tatics.indexOf(taticUuid), 1);
                break;
            }
        }

        deck.piles.discarded.push(tatic.uuid);

        this._updateDeck();
    }

    /* -------------------------------------------- */

    /**
   * Restore a discarded tatic to the tatics pile.
   * @this {BattleApp}
   * @param {object} deck    The deck array.
   * @param {object} tatic   The tatic to be discarded.
   * @async
   */
    async _restoreTatic(deck, tatic) {
        for (let taticUuid of deck.piles.discarded) {
            if (taticUuid == tatic.uuid) {
                deck.piles.discarded.splice(deck.piles.discarded.indexOf(taticUuid), 1);
                break;
            }
        }

        deck.piles.tatics.push(tatic.uuid);
    }

    /* -------------------------------------------- */

    /**
   * Validate all deck entries.
   * @this {BattleApp}
   */
    async _updateDeck() {
        const deck = this.deck;

        if (game.user.isGM) {
            await this.local.user.setFlag("ldnd5e", "deck", { hand: deck.hand, piles: deck.piles });
        } else {
            await this.local.commander.setFlag("ldnd5e", "deck", { hand: deck.hand, piles: deck.piles });
        }
        this.render({ force: true });
    }

    /* -------------------------------------------- */

    /**
   * Validate all deck entries.
   * @this {BattleApp}
   */
    _validateDeck() {
        // Ignore if the user is a viewer.
        if (this.local.isViewer) return;

        const deck = this.deck;

        deck.hand.tatics = deck.hand.tatics.filter(taticUuid => {
            let tatic = fromUuidSync(taticUuid);
            if (!tatic) return false;
            else return true;
        });
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

        this._toggleOverLay();
    }

    /* -------------------------------------------- */

    /**
   * Toggles the deck controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   * @async
   */
    static async #toggleCompanySelect(event, target) {
        const content = target.closest(".window-content");
        const companyTabs = content.querySelector(".company-tabs");

        companyTabs.classList.toggle("active");
        this.state.sidebar.tabs = companyTabs.classList.contains("active");

        await game.user.setFlag('ldnd5e', 'battle', this.app);
>>>>>>> Stashed changes
    }

    /* -------------------------------------------- */

    /**
   * Toggles the deck controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   * @async
   */
    static async #switchCompany(event, target) {
        const companyTabs = target.closest(".company-tabs");
        const tabs = companyTabs.querySelectorAll(".item");

        tabs.forEach(tab => tab.classList.remove("active"));
        target.classList.add("active");

        this.app.state.currentCompanyIdx = Number(target.dataset.idx ?? 0);

        await game.user.setFlag('ldnd5e', 'battle', this.app);
        this.render({ force: true });
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
<<<<<<< Updated upstream
=======

        // Set the events control.
        this.state.sidebar.events = controls.classList.contains("active");

        this._toggleOverLay();
>>>>>>> Stashed changes
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
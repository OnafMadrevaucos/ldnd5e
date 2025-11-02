import { battleData, unitData, taticsData } from "../scripts/constants.js";

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
            title: "ldnd5e.titles.battle",
            controls: [
                {
                    icon: "fas fa-arrow-rotate-right",
                    label: "ldnd5e.battle.reset",
                    action: "resetBattle"
                }
            ]
        },
        controls: {
            dropdown: true // Habilita o dropdown no header.
        },
        actions: {
            startBattle: BattleApp.#startBattle,
            resetBattle: BattleApp.#resetBattle,
            toggleDeckControls: BattleApp.#toggleDeckControls,
            toggleCompanySelect: BattleApp.#toggleCompanySelect,
            switchCompany: BattleApp.#switchCompany,
            toggleExtraDeck: BattleApp.#toggleExtraDeck,
            toggleEventsControls: BattleApp.#toggleEventsControls,
            clickUnit: BattleApp.#clickUnit,
            drawCard: BattleApp.#drawCard,
            shuffleDeck: BattleApp.#shuffleDeck,
            discardTatic: BattleApp.#discardTatic,
            restoreTatic: BattleApp.#restoreTatic,
            restoreAllTatics: BattleApp.#restoreAllTatics,
            showTatic: BattleApp.#showTatic,
            useTatic: BattleApp.#useTatic
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 900,
            height: 825
        },
        dragDrop: [{ dropSelector: '.dropzone' }]
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
     * The application state data.
     * @type {Activity|null}
     */
    get state() {
        return this.#battle.local.app.state ?? null;
    }

    /**
     * The world battle data.
     * @type {Activity|null}
     */
    get app() {
        return this.#battle.local.app ?? null;
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

    /**
     * The local deck data.
     * @type {Activity|null}
     */
    get deck() {
        return this.#battle.local.deck ?? null;
    }

    #battle;

    /* -------------------------------------------- */

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

        const deck = await this._prepareLocalDeck(app, world, userCompanyId);

        // Build the company data.
        let company = null;
        let commander = null;

        // If the user is GM, get all the NPC's companies in the battle.
        if (game.user.isGM) {
            company = [];

            world.sides.top.forEach(c => {
                const data = game.actors.get(c.id);
                const commander = data.system.info.commander;
                c.ally = false;
                if (!commander || (commander.type === 'npc')) {
                    company.push(c);
                }
            });

            world.sides.bottom.forEach(c => {
                const data = game.actors.get(c.id);
                const commander = data.system.info.commander;
                c.ally = true;
                if (!commander || (commander.type === 'npc')) {
                    company.push(c);
                }
            });
        }
        // If the user is not GM, get only its company.
        else {
            let isAlly = false;
            for (let i = 0; i < world.sides.top.length; i++) {
                const c = world.sides.top[i];
                if (c.id === userCompanyId && !isAlly) {
                    isAlly = true;
                    i = 0;
                }

                c.ally = isAlly;
            }

            // If the user company has not been found in the top companies, all bottom companies are allies.
            if (!isAlly) {
                for (let i = 0; i < world.sides.top.length; i++) {
                    const c = world.sides.top[i];
                    c.ally = true;
                }
            }

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

        return local;
    }

    /* -------------------------------------------- */

    async _prepareLocalDeck(app, world, userCompanyId = null) {
        let deck = {
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

        if (game.user.isGM) {
            const companyId = world.sides.top[app.state.currentCompanyIdx]?.id ?? null;
            if (!companyId) return deck;

            const company = game.actors.get(companyId);
            if (!company) return deck;

            const commander = company.system.info.commander;
            if (!commander) return deck;

            deck = (commander.getFlag('ldnd5e', 'deck')) ?? deck;
        } else {
            let _deck = (game.user.character?.getFlag('ldnd5e', 'deck')) ?? null;

            // If user is commander but has no deck data, create it.        
            if (!_deck && userCompanyId) {
                await game.user.character?.setFlag('ldnd5e', 'deck', deck);
            }
            else if (_deck) deck = _foundry.utils.deepClone(_deck);
        }

        return deck;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        // Initialize the application data.
        await this._prepareBaseData();

        const context = await super._prepareContext(options);
        const world = this.battle.world;

        Object.assign(context, {
            isGM: this.local.user.isGM,
            isViewer: this.local.isViewer
        });

        context.icons = {
            deck: 'modules/ldnd5e/ui/icons/battle/deck.svg',
            events: 'modules/ldnd5e/ui/icons/battle/events.svg'
        };

        context.sides = {
            top: this.world.sides.top,
            bottom: this.world.sides.bottom,
            ready: this.world.sides.top.length > 0 && this.world.sides.bottom.length > 0,
            empty: {
                top: this.world.sides.top.length === 0,
                bottom: this.world.sides.bottom.length === 0
            }
        }

        context.score = {
            enemy: {
                attack: this.world.scoreboard.top.attack,
                impetus: this.world.scoreboard.top.impetus
            },
            ally: {
                attack: this.world.scoreboard.bottom.attack,
                impetus: this.world.scoreboard.bottom.impetus
            }
        }

        context.fields = {
            top: {
                rows: Object.entries(world.fields.top.rows).map(([n, { effect }]) => ({
                    number: Number(n),
                    label: game.i18n.format('ldnd5e.battle.rowNumber', { number: n }),
                    hasEffect: effect !== null,
                    effect: {
                        value: effect,
                        icon: battleData.rowEffectsIcons[effect] ?? '',
                        label: effect ? game.i18n.localize(`ldnd5e.battle.rowEffects.${effect}`) : ''
                    }
                }))
            },
            bottom: {
                rows: Object.entries(world.fields.bottom.rows).map(([n, { effect }]) => ({
                    number: Number(n),
                    label: game.i18n.format('ldnd5e.battle.rowNumber', { number: n }),
                    hasEffect: effect !== null,
                    effect: {
                        value: effect,
                        icon: battleData.rowEffectsIcons[effect] ?? '',
                        label: effect ? game.i18n.localize(`ldnd5e.battle.rowEffects.${effect}`) : ''
                    }
                }))
            }
        };

        // Prepare all the unit context for display.
        this._prepareUnits(context);

        return {
            ...context,
            state: this.state,
            editable: this.isEditable,
            options: this.options
        };
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

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
        context.setupStage = (this.world.stage.value === battleData.stages.setup.value);
        context.stage = this.world.stage;

        context.turns = this.world.turns;

        context.effects = Object.values(this.world.fields).map(f => {
            return Object.values(f.rows).map(r => r.effect);
        });

        Object.assign(context.turns, {
            elapsed: context.turns.max - context.turns.current,
            value: ((context.turns.max - context.turns.current) / context.turns.max),
            pct: Math.clamp(((context.turns.max - context.turns.current) / context.turns.max) * 100, 0, 100)
        });

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareControlsContext(context, options) {
        if (context.isViewer) return context;

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

        // Prepare the commander's deck.
        this._prepareDeck(context);

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

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareEventsContext(context, options) {
        context.rowEffects = [
            { value: '', label: '—' },
            ...Object.values(battleData.rowEffects).map(effect => ({
                value: effect,
                label: game.i18n.localize(`ldnd5e.battle.rowEffects.${effect}`)
            }))
        ];

        return context;
    }

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
                // Ignore if the tatic doesn't exist.
                if (!tatic) return null;

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
                        name: unit.name,
                        impetus: unit.system.abilities.wll
                    }
                };
            }).filter(tatic => tatic !== null && tatic !== undefined), // Filter out the nulls
            piles: {
                tatics: deck.piles.tatics.map(taticUuid => {
                    const tatic = fromUuidSync(taticUuid);
                    // Ignore if the tatic doesn't exist.
                    if (!tatic) return null;

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
                    // Ignore if the tatic doesn't exist.
                    if (!tatic) return null;

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
                    const asset = fromUuidSync(assetId);
                    // Ignore if the asset doesn't exist.
                    if (!asset) return null;

                    const unit = tatic.actor;

                    return {
                        uuid: asset.uuid,
                        name: asset.name,
                        img: {
                            src: asset.img,
                            svg: asset.img.endsWith('.svg')
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

    /**
   * Prepare the combat units for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
    _prepareUnits(context) {
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
                        for (let unit of units) {
                            let unitFound = false;
                            for (let field of Object.values(world.fields)) {
                                for (let row of Object.values(field.rows)) {
                                    if (row.units.includes(unit.id)) {
                                        unit.deployed = true;
                                        unitFound = true;
                                        break;
                                    } else {
                                        unit.deployed = false;
                                    }
                                }

                                if (unitFound) break;
                            }
                            unitsList.push(unit);
                        }
                    }
                });

                context.units = unitsList;
            }
        }

        return context;
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);

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

        for (const select of this.element.querySelectorAll(".events-controls .row-effect")) {
            select.addEventListener("change", this._onRowEffectChange.bind(this));
        }

        for (const input of this.element.querySelectorAll('.score span input')) {
            input.addEventListener('change', this._onScoreChange.bind(this));
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
        options.push(
            {
                id: "show",
                name: "ldnd5e.unit.show",
                icon: '<i class="fas fa-eye"></i>',
                condition: () => true,
                callback: li => this._onAction(li, "showUnit")
            },
            {
                id: "delete",
                name: "ldnd5e.unit.delete",
                icon: '<i class="fas fa-trash fa-fw"></i>',
                condition: () => true,
                callback: li => this._onAction(li, "deleteUnit")
            }
        );

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
        let worldChanged = false;

        switch (action) {
            case "showUnit": {
                const side = target.closest(".field").dataset.side;
                const row = target.closest(".row").dataset.row;
                const unitId = target.dataset.unitId;

                const unit = game.actors.get(unitId);
                unit.sheet.render({ force: true, focus: true });
            } break;
            case "deleteUnit": {
                const side = target.closest(".field").dataset.side;
                const row = target.closest(".row").dataset.row;
                const unitId = target.dataset.unitId;

                this.world.fields[side].rows[row].units = this.world.fields[side].rows[row].units.filter(u => u !== unitId);
                worldChanged = true;
            } break;
            case "deleteCompany": {
                const side = target.closest(".side").dataset.side;
                const companyId = target.dataset.companyId;

                this.world.sides[side] = this.world.sides[side].filter(c => c !== companyId);
                worldChanged = true;
            } break;
        }

        if (worldChanged) {
            await game.settings.set('ldnd5e', 'battle', this.world);
            this.render({ force: true });
        }
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

    async _onRowEffectChange(event) {
        const { rowNumber, rowField } = event.target.closest(".row").dataset;

        this.world.fields[rowField].rows[rowNumber].effect = event.target.value;
        await game.settings.set('ldnd5e', 'battle', this.world);

        this.render({ force: true });
    }

    async _onScoreChange(event) {
        const input = event.currentTarget;
        const property = input.dataset.property;

        if (foundry.utils.setProperty(this.world, property, Number(input.value))) {
            await game.settings.set('ldnd5e', 'battle', this.world);
            this.render({ force: true });
        }
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

        rows.forEach(row => {
            const rowType = row.dataset.rowType;
            const prof = unit.system.prof[rowType];
            row.dataset.prof = unitData.uLevelProf[prof];
        });
        rowsNumbers.forEach(row => {
            const rowType = row.dataset.rowType;
            const prof = unit.system.prof[rowType];
            row.dataset.prof = unitData.uLevelProf[prof];
        });

        const dragData = unit.toDragData();
        dragData.origin = {
            field: li.closest(".field")?.dataset.side ?? 'list',
            row: li.closest(".row")?.dataset.row ?? null
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        event.dataTransfer.effectAllowed = li?.dataset.dragType ?? null;

        // Toggle the overlay only when the event didn't start from a field row.
        if (!li.closest(".fields"))
            this._toggleOverLay(false);
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

        // TODO: Implement a visual feedback indicator of the drop unit proficiency to the field row.
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

        // Drop data.
        const data = foundry.applications.ux.TextEditor.getDragEventData(event);
        if (data.type !== "Actor") return;

        rows.forEach(row => {
            delete row.dataset.prof;
        });
        rowsNumbers.forEach(row => {
            delete row.dataset.prof;
        });

        const field = event.currentTarget.closest(".field");
        const fieldSide = field.dataset.side;
        const rowNumber = unitRow.dataset.row;

        // Check if the drop isn't from a list, if so, check if the drop is on the same row and side. 
        // In this case, ignore the drop.
        if (data.origin.field !== 'list' && data.origin.field === fieldSide && data.origin.row === rowNumber) return;

        let dragCounter = Number(unitRow.dataset.dragCounter);
        dragCounter = dragCounter > 0 ? dragCounter - 1 : 0;
        unitRow.dataset.dragCounter = dragCounter;

        const rowNumberSpan = field.querySelector(`.row-number[data-row="${rowNumber}"]`);

        if (dragCounter <= 0) {
            unitRow.classList.remove("drag-over");
            rowNumberSpan.classList.remove("drag-over");
        }

        // Obtain Actor.
        const actor = await fromUuid(data.uuid);
        if (!actor) return;

        if (actor.type !== 'ldnd5e.unit') {
            ui.notifications.warn(game.i18n.format("ldnd5e.messages.invalidActorOnBattle", { actor: actor.name }), { localize: true });
            return;
        }

        const rowName = unitRow.dataset.row;
        const sideName = unitRow.closest(".field")?.dataset.side;

        if (!rowName || !sideName) return;

        switch (event.dataTransfer.effectAllowed) {
            case "move": {
                await this._onDropUnit({ actor, sideName, rowName });
            } break;
            default: {
                await this._onDropUnit({ actor, sideName, rowName });
            } break
        }
    }

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

        // Remove from the old row, if any.
        Object.values(fields).forEach(field => {
            Object.values(field.rows).forEach(row => {
                row.units = row.units.filter(u => u !== data.actor.id);
            });
        });

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
    async _toggleOverLay(update = true) {
        const html = this.element;
        const overlay = html.querySelector('.sidebar-overlay');

        if (this.state.sidebar.overlay) overlay.classList.add('hidden');
        else overlay.classList.remove('hidden');

        if (update) {
            this.app.state.sidebar.overlay = !overlay.classList.contains('hidden');
            await game.user.setFlag('ldnd5e', 'battle', this.app);
        }
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
   * @param {object} deck           The deck array.
   * @param {object} tatic          The tatic to be discarded.
   * @param {PointerEvent} event    The originating click event.
   * @param {object} options        The options of the discarding.
   * 
   * @async
   */
    async _discardTatic(deck, tatic, event, options = { basicAtk: false }) {
        for (let taticUuid of deck.hand.tatics) {
            if (taticUuid == tatic.uuid) {
                deck.hand.tatics.splice(deck.hand.tatics.indexOf(taticUuid), 1);
                break;
            }
        }

        const unit = tatic.actor;
        if (unit && options.basicAtk) {
            const result = await unit.system.rollBasicAttack({
                prof: 'low',
                event: event
            });

            if (result) await this._updateScore(result, { unit, tatic, event });
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
   * Update deck entries.
   * @this {BattleApp}
   */
    async _updateDeck() {
        const deck = this.deck;

        if (game.user.isGM) {
            const companyId = this.local.company[this.currentCompanyIdx]?.id ?? null;
            const company = game.actors.get(companyId);
            if (!company) return;

            const commander = company.system.info.commander;
            if (!commander) return;

            await commander.setFlag("ldnd5e", "deck", { hand: deck.hand, piles: deck.piles });
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
    }

    /* -------------------------------------------- */

    /**
   * Update deck entries.
   * @this {BattleApp}
   * @param {object} result     The result of a tatic use.
   * @param {object} data       The data object of a tatic use.
   */
    async _updateScore(result, data) {
        const unit = data.unit;

        const scoreboard = this.world.scoreboard;
        const allySide = this.local.side === 'none' ? 'top' : this.local.side;
        const enemySide = allySide === 'top' ? 'bottom' : 'top';
        const impetusBonus = unit.system.abilities.wll.value;

        scoreboard[allySide].impetus += impetusBonus;

        for (let res of result) {
            if (!res) continue;

            switch (res.damageType) {
                case taticsData.activities.md: {
                    if (res.targetField === 'a')
                        scoreboard[allySide].attack += res.total;
                    else if (res.targetField === 'e')
                        scoreboard[enemySide].attack += res.total;
                } break;
                case taticsData.activities.mh: {
                    if (res.targetField === 'a') {
                        scoreboard[enemySide].attack -= res.total;
                        scoreboard[enemySide].attack = Math.max(scoreboard[enemySide].attack, 0);
                    } else if (res.targetField === 'e') {
                        scoreboard[allySide].attack -= res.total;
                        scoreboard[allySide].attack = Math.max(scoreboard[allySide].attack, 0);
                    }
                } break;
                case taticsData.activities.ib: {
                    if (res.targetField === 'a')
                        scoreboard[allySide].impetus += res.total;
                    else if (res.targetField === 'e')
                        scoreboard[enemySide].impetus += res.total;
                } break;
                case taticsData.activities.id: {
                    if (res.targetField === 'a') {
                        scoreboard[allySide].impetus -= res.total;
                        scoreboard[allySide].impetus = Math.max(scoreboard[allySide].impetus, 0);
                    } else if (res.targetField === 'e') {
                        scoreboard[enemySide].impetus -= res.total;
                        scoreboard[enemySide].impetus = Math.max(scoreboard[enemySide].impetus, 0);
                    }
                } break;
                default: break;
            }
        }

        this._discardTatic(this.deck, data.tatic, data.event);

        await game.settings.set('ldnd5e', 'battle', this.world);
    }

    /* -------------------------------------------- */
    /*  Form Actions                                */
    /* -------------------------------------------- */

    /**
   * Start a battle.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #startBattle(event, target) {
        if ((this.world.sides.bottom.length == 0 || this.world.sides.top.length == 0)) {
            ui.notifications.warn(game.i18n.localize("ldnd5e.messages.cannotStartBattle"));
            return;
        }

        this.world.stage = battleData.stages.prep;

        await game.settings.set('ldnd5e', 'battle', this.world);
        this.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Reset the battle data.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #resetBattle(event, target) {
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
   * Toggles the deck controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   * @async
   */
    static async #toggleDeckControls(event, target) {
        const content = target.closest(".window-content");

        const controls = content.querySelector(".side-controls");
        const viewer = content.querySelector(".extra-decks-viewer");

        if (this.state.sidebar.control) controls.classList.remove("active");
        else controls.classList.add("active");

        this.state.sidebar.control = controls.classList.contains("active");

        // If its closing, hide the viewer as well.
        if (!controls.classList.contains("active")) {
            viewer.classList.remove("active");

            const buttons = controls.querySelectorAll(".extra-decks .deck-button");

            // Clear all active elements.
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove("active");
            }

            // Clear active deck.
            viewer.dataset.deck = '';
            // Hide the viewer.
            this.state.sidebar.viewer = '';
        }

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

        if (this.state.sidebar.tabs) companyTabs.classList.remove("active");
        else companyTabs.classList.add("active");

        this.state.sidebar.tabs = companyTabs.classList.contains("active");

        await game.user.setFlag('ldnd5e', 'battle', this.app);
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
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #toggleExtraDeck(event, target) {
        const container = target.closest(".extra-decks");        
        const buttons = container?.querySelectorAll("deck-button") ?? this.element.querySelectorAll(".hand.events .deck-button");

        const content = target.closest(".window-content");
        const viewer = content.querySelector(".extra-decks-viewer");

        const oldActiveDeck = viewer.dataset.deck ?? '';
        const targetDeck = target.dataset.deck ?? '';

        const cardsSections = viewer.querySelectorAll(".deck-section");

        // Clear all active elements.
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("active");
            cardsSections[i].classList.add("hidden");
        }

        const targetCardsSection = viewer.querySelector(`.deck-section.${targetDeck}`);
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

        // Set the viewer.
        this.state.sidebar.viewer = viewer.dataset.deck;
        await game.user.setFlag('ldnd5e', 'battle', this.app);
    }

    /* -------------------------------------------- */

    /**
   * Toggles the events controls.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #toggleEventsControls(event, target) {
        const content = target.closest(".window-content");
        const controls = content.querySelector(".events-controls");

        if (this.state.sidebar.events) controls.classList.remove("active");
        else controls.classList.add("active");

        const targetCardsSection = viewer.querySelector(`.deck-section.${targetDeck}`);
        if (!targetCardsSection) return;

        const oldActiveDeck = viewer.dataset.deck ?? '';
        const targetDeck = target.dataset.deck ?? '';

        // Show the target section.
        targetCardsSection.classList.remove("hidden");

        // If the viewer is already active.
        if (viewer.classList.contains("active")) {
            
        }
        // If the viewer is not active.
        else {
            viewer.classList.add("active");
            target.classList.add("active");
            // Set the active deck.
            viewer.dataset.deck = targetDeck;
        }

        // Set the viewer.
        this.state.sidebar.viewer = viewer.dataset.deck; 
        await game.user.setFlag('ldnd5e', 'battle', this.app);

        // Set the events control.
        this.state.sidebar.events = controls.classList.contains("active");
        this._toggleOverLay();
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

    /* -------------------------------------------- */

    /**
   * Draws cards until the hand is full.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #drawCard(event, target) {
        const deck = this.deck;
        const drawAmount = deck.hand.max - deck.hand.tatics.length;

        if (deck.piles.tatics.length == 0) {
            ui.notifications.info(game.i18n.localize("ldnd5e.messages.emptyDeck"));
            return;
        }

        if (drawAmount <= 0) {
            ui.notifications.info(game.i18n.localize("ldnd5e.messages.fullHand"));
            return;
        }

        for (let i = 0; i < drawAmount; i++) {
            if (deck.piles.tatics.length == 0) break;

            const taticUuid = deck.piles.tatics.shift();
            deck.hand.tatics.push(taticUuid);
        }

        this._updateDeck();
    }

    /* -------------------------------------------- */

    /**
   * Shuffles all cards in the deck.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #shuffleDeck(event, target) {
        this._shuffleDeck(this.deck);
        this.render({ force: true, focus: false });
    }

    /* -------------------------------------------- */

    /**
   * Discard this tatic.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #discardTatic(event, target) {
        const taticUuid = target.closest("li").dataset.taticUuid;

        const tatic = await fromUuid(taticUuid);
        if (!tatic) return;

        await this._discardTatic(this.deck, tatic, event, { basicAtk: true });
    }

    /* -------------------------------------------- */

    /**
   * Restore this tatic.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #restoreTatic(event, target) {
        const taticUuid = target.closest("li").dataset.taticUuid;

        const tatic = await fromUuid(taticUuid);
        if (!tatic) return;

        await this._restoreTatic(this.deck, tatic);
        this._updateDeck();
    }

    /* -------------------------------------------- */

    /**
   * Restore all tatics in the discard pile.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #restoreAllTatics(event, target) {
        const deck = this.deck;
        const discarded = foundry.utils.deepClone(this.deck.piles.discarded);
        for (let taticUuid of discarded) {
            deck.piles.discarded.splice(deck.piles.discarded.indexOf(taticUuid), 1);
            deck.piles.tatics.push(taticUuid);
        }

        this._updateDeck();
    }

    /* -------------------------------------------- */

    /**
   * Show the tatic sheet.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #showTatic(event, target) {
        const taticUuid = target.closest("li").dataset.taticUuid;

        const tatic = await fromUuid(taticUuid);
        if (!tatic) return;

        tatic.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
   * Restore this tatic.
   * @this {BattleApp}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
    static async #useTatic(event, target) {
        const li = target.closest("li");
        const taticUuid = li.dataset.taticUuid;
        const unitId = li.dataset.unitId;

        const tatic = await fromUuid(taticUuid);
        if (!tatic) return;

        const unit = game.actors.get(unitId);
        if (!unit) return;

        if (!event.altKey) {
            const mainActivities = Object.values(tatic.system.activities).filter(a => a.mainRoll);

            let choosedMode = 'full';
            // If there are main activities, ask the user.            
            if (mainActivities.length > 0) {
                choosedMode = await foundry.applications.api.DialogV2.wait({
                    window: { title: game.i18n.localize("ldnd5e.battle.extraRoll.title") },
                    content: `<p>${game.i18n.localize("ldnd5e.battle.extraRoll.message")}</p>`,
                    position: {
                        width: 400
                    },
                    buttons: [
                        {
                            label: game.i18n.localize("ldnd5e.battle.extraRoll.main"),
                            action: 'main'
                        },
                        {
                            label: game.i18n.localize("ldnd5e.battle.extraRoll.extra"),
                            action: 'extra'
                        }
                    ]
                })
            }

            if (!choosedMode) return;

            let result = await tatic.use({ event, mode: choosedMode });
            if (!(result instanceof Array)) result = [result];

            if (result) {
                await this._updateScore(result, { unit, tatic, event });
            }
        } else {
            tatic.sheet.render(true);
        }
    }
}
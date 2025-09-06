const api = dnd5e.applications.api;
export default class BattleApp extends api.Application5e {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "battle"],
        window: {
            title: "ldnd5e.titles.battle"
        },
        actions: {
            toggleDeckControls: BattleApp.#toggleDeckControls
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
        }
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        context.isGM = game.user.isGM;

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

        Object.assign(context.icons, {
            full: 'modules/ldnd5e/ui/icons/battle/full-deck.svg',
            discarded: 'modules/ldnd5e/ui/icons/battle/discarded-deck.svg'
        });

        context.hand = {
            counter: 3,
            max: 5
        }
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

        if (!controls) return;

        controls.classList.toggle("active");
    }
}
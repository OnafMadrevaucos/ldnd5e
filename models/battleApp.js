const api = dnd5e.applications.api;
export default class BattleApp extends api.Application5e {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ldnd5e", "battle"],
        window: {
            title: "ldnd5e.titles.battle"
        },
        actions: {
            //choose: ActivityChoiceDialog.#onChooseActivity
        },
        position: {
            width: 900,
            height: 825
        }
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
            label: game.i18n.localize( 'ldnd5e.battle.phases.prep'),
            icon: 'ra-tower'
        }
        context.turns = {
            elapsed: 5,
            limit: 10,
            max: 20
        };

        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareControlsContext(context, options) {
        return context;
    }

    /* -------------------------------------------- */
}
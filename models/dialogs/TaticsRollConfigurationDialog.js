import { taticsData } from "../../scripts/constants.js";

const app = dnd5e.applications;

export default class TaticsRollConfigurationDialog extends app.dice.RollConfigurationDialog {

    /** @inheritDoc */
    static PARTS = {
        ...super.PARTS,
        formulas: {
            template: "modules/ldnd5e/templates/dialogs/tatics-roll.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @override */
    async _prepareButtonsContext(context, options) {
        context.buttons = {
            normal: {
                default: true,
                icon: '<i class="fa-solid fa-dice" inert></i>',
                label: game.i18n.localize("DND5E.Normal")
            }
        };
        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareFormulasContext(context, options) {
        context = await super._prepareFormulasContext(context, options);
        const taticsTypes = {};
        Object.entries(taticsData.activities).forEach(([type, value]) => {
            taticsTypes[type] = {
                label: game.i18n.localize(`ldnd5e.tatics.activities.${type}`),
                value: type,
                icon: taticsData.activityIcons[type]
            };
        });
        context.rolls = context.rolls.map(({ roll }) => ({
            roll,
            taticConfig: taticsTypes[roll.options.type],
        }));
        return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareConfigurationContext(context, options) {
        context = await super._prepareConfigurationContext(context, options);

        context.fields.push({
            field: new foundry.data.fields.StringField({
                label: game.i18n.localize("ldnd5e.battle.targetField"), blank: false, required: true
            }),
            name: "targetField",
            value: 'a',
            options: [
                { value: 'a', label: game.i18n.localize('ldnd5e.battle.fields.ally') },
                { value: 'e', label: game.i18n.localize('ldnd5e.battle.fields.enemy') },
                { value: 'b', label: game.i18n.localize('ldnd5e.battle.fields.both') }
            ]
        });

        return context;
    }

    /* -------------------------------------------- */
    /*  Roll Handling                               */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _buildConfig(config, formData, index) {
        config = super._buildConfig(config, formData, index);
        const targetField = formData?.get(`targetField`);
        if (targetField) config.options.targetField = targetField;
        return config;
    }
}
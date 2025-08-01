import { unitChoices } from "../../scripts/constants.js";
const { DocumentSheet, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CategoryEditor extends HandlebarsApplicationMixin(DocumentSheet) {
    static DEFAULT_OPTIONS = {
        window: {
            title: "ldnd5e.unit.configureCategory"
        },
        position: {
            width: 360
        },
        sheetConfig: false,
        classes: ["unit", "unit-category"],
        form: {
            submitOnChange: true
        }
    };

    static PARTS = {
        body: {
            template: "modules/ldnd5e/templates/unit-category-dialog.hbs",
            root: true
        }
    };

    /** @inheritdoc */
    _initializeApplicationOptions(options) { 
        options = super._initializeApplicationOptions(options);        
        return options;
    }

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.actor = this.document;
       
        // Prepare the actor's category.
        this._prepareCategories(context);

        return context;
    }

    _prepareCategories(context) {
        const categories = {};
        for (const category in unitChoices.categories) {
            categories[category] = game.i18n.localize(`ldnd5e.categories.${category}`);            
        }

        context.categories = categories;
    }

}
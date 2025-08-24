import { i18nStrings, taticsChoices } from "../../scripts/constants.js";

export default class TaticsL5e extends foundry.abstract.TypeDataModel {

    /** @inheritDoc */
    static metadata = Object.freeze({
        hasEffects: false
    });


    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            // Nome da Tática.
            name: new fields.StringField({ required: true, label: "ldnd5e.tatics.name" }),
            info: new fields.SchemaField({
                flavor: new fields.StringField({ textSearch: true, initial: "" }),
                description: new fields.StringField({ textSearch: true, initial: "" }),
                // Unidade que a Tática pertence.
                unit: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "TYPES.Actor.ldnd5e.unit",
                }),
                // Nível de Complexidade (NC) da Tática.
                cr: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                // Preço da Tática.
                price: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                    denomination: new fields.StringField({
                        required: true,
                        nullable: false,
                        initial: "gp",
                        choices: dnd5e.config.currencies,
                    }),
                }),
            }),
            // Flag indicando se a Tática está sendo treinada.
            trainning: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            attributes: new fields.SchemaField({
                // Se a Tática é uma ação de preparação.
                prep: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática é uma ação de surpresa.
                surp: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática é uma ação de reação.
                reac: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                // Se a Tática se mantém permanentemente durante a batalha.
                pers: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            }),
            // Lista de Atividades que a Tática fornece.
            activities: new dnd5e.dataModels.fields.ActivitiesField(),
        };
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareBaseData() {
        this.system = {
            info: this.info,
            trainning: this.trainning,
            attributes: this.attributes,
            activities: this.activities,
        }
    }

    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareDerivedData() {
        this.labels = {};
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getSheetData(context) {
        const unit = this.parent.actor;
        const impetus = unit?.system.abilities.frt.value ?? 0;

        context.info = [{
            label: "ldnd5e.tatics.impetus",
            classes: "info-lg",
            value: dnd5e.utils.formatModifier(impetus)
        }];

        if (this.parent.labels.damages?.length) {


        }
    }    
}
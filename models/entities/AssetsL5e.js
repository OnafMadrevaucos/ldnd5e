export default class AssetsL5e extends foundry.abstract.TypeDataModel {

    /** @inheritDoc */
    static metadata = Object.freeze({
        hasEffects: false
    });

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            name: new fields.StringField({ required: true, label: "ldnd5e.events.name" }),
            // Estoque do Insumo (número de cartas desse Insumo no baralho).
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0 }),
            info: new fields.SchemaField({
                flavor: new fields.StringField({ textSearch: true, initial: "" }),
                description: new fields.StringField({ textSearch: true, initial: "" }), 
                // Tipo do Insumo.
                type: new fields.StringField({ required: true, initial: "alch" }), 
                // Preço de manutenção do Insumo.
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
            details: new fields.SchemaField({
                charges: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0 }),
            }),                        
            // Lista de Atividades que o Insumo fornece.
            activities: new fields.ObjectField({ required: true, nullable: false }),
        };
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareBaseData() {
        // Nothing to do.
    }

    /* -------------------------------------------- */

    /**@inheritdoc */
    prepareDerivedData() {
        this.labels = {};              
    }

    /* -------------------------------------------- */
    /*  Utility Functions                           */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async getSheetData(context) {
        const unit = this.parent.actor;
        const impetus = unit?.system.abilities.frt.value ?? 0;

        context.info = [];

        if (Object.keys(this.activities).length > 0) {
            context.info.push({
                value: Object.values(this.activities).reduce((a, b) => {
                    const formula = `${b.number}d${b.die}${b.bonus}`;

                    return `${a}
                    <span class="formula" data-type="activity" data-id="${b.id}" data-tooltip aria-label="${b.name}">${formula}</span>
                    <span class="damage-type" data-tooltip aria-label="${game.i18n.localize(`ldnd5e.tatics.activities.${b.type}`)}">
                        <dnd5e-icon src="modules/ldnd5e/ui/icons/${b.type}.svg"></dnd5e-icon>
                    </span>
                    `;
                }, ""),
                classes: "info-grid damage"
            });
        }
    }

    /* -------------------------------------------- */
}
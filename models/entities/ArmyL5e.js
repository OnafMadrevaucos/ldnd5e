import { i18nStrings } from "../../scripts/constants.js";
export default class ArmyL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        const data = {
            name: new fields.StringField({ required: true, label: "ldnd5e.army.name" }),
            info: new fields.SchemaField({
                org: new fields.StringField({ textSearch: true, required: true, label: "ldnd5e.army.org" }),
                commander: new fields.ForeignDocumentField(getDocumentClass("Actor"), {
                    textSearch: true, label: "ldnd5e.army.commander"
                }),
            }),
            prestige: new fields.SchemaField({
                base: new fields.NumberField({
                    required: true,
                    initial: 10,
                    min: 0
                }),
                bonus: new fields.NumberField({
                    required: true,
                    initial: 0
                }),
                mod: new fields.StringField({
                    required: true,
                    initial: "0"
                })
            }),
            supplies: new fields.SchemaField({
                value: new fields.NumberField({ required: true, initial: 10, label: "ldnd5e.army.supplies.value" }),
                min: new fields.NumberField({ required: true, initial: 0, label: "ldnd5e.army.supplies.min" }),
            }),
            
            companies: new fields.ArrayField(new fields.StringField({ textSearch: true, label: "ldnd5e.company", })),
        };

        return data;
    }

    /**
   * Prepare data related to this DataModel itself, before any derived data is computed.
   * @inheritdoc
   */
    prepareBaseData() {
        this.military = true;

        this.supplies.max = 30;

        this.system = {
            info: this.info,
            prestige: this.prestige,
            supplies: this.supplies,
            companies: this.companies
        }
    }

    prepareDerivedData() {
        const commander = this.system.info.commander;

        const chaMod = commander ? Math.floor((commander.system.abilities.cha.value - 10) / 2) : 0;

        this.system.prestige.base = 10 + chaMod;
        this.system.prestige.value = this.system.prestige.base + this.system.prestige.bonus;

        const mod = Math.floor((this.system.prestige.value - 10) / 2);
        this.system.prestige.mod = (mod >= 0 ? "+" : "") + mod;

        this.system.supplies.pct = Math.clamp((this.system.supplies.value / this.system.supplies.max) * 100, 0, 100);
    }
}

export default class CompanyL5e extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        details: new fields.SchemaField({
            biography: new fields.SchemaField({
                value: new fields.HTMLField({required: false, blank: true}),
                public: new fields.HTMLField({required: false, blank: true})
            }),
            description: new fields.SchemaField({
                full: new fields.HTMLField({required: false, blank: true}),
                summary: new fields.HTMLField({required: false, blank: true})
            })
        }),
        prestige: new fields.SchemaField({
            value: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
            mod: new fields.StringField({required: true, blank: true, initial: ""})
        }),
        abilities: new fields.SchemaField({
            for: new fields.SchemaField({
                value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                bonuses: new fields.SchemaField({
                    check:  new fields.StringField({required: true, blank: true, initial: ""}),
                    save:  new fields.StringField({required: true, blank: true, initial: ""})
                })
            }),
            mrl: new fields.SchemaField({
                value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                bonuses: new fields.SchemaField({
                    check:  new fields.StringField({required: true, blank: true, initial: ""}),
                    save:  new fields.StringField({required: true, blank: true, initial: ""})
                })
            }),
            wil: new fields.SchemaField({
                value:  new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                bonuses: new fields.SchemaField({
                    check:  new fields.StringField({required: true, blank: true, initial: ""}),
                    save:  new fields.StringField({required: true, blank: true, initial: ""})
                })
            })
        }),
        members: new fields.ArrayField(new fields.StringField()),
        units: new fields.SchemaField({
            light: new fields.StringField({required: true, blank: true}),
            heavy: new fields.StringField({required: true, blank: true}),
            merc: new fields.StringField({required: true, blank: true})
        }),
        attributes: new fields.SchemaField({
            movement: new fields.SchemaField({
                normal: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                full: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0})
            }),
            nobleTitle: new fields.StringField({required: true, blank: true, initial: ""}),
            ctype:  new fields.StringField({required: true, blank: true, initial: ""}),
            isolated: new fields.BooleanField({initial: false})
        }),
        treasure: new fields.SchemaField({
            currency: new fields.SchemaField({
                pp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                gp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                ep: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                sp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
                cp: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
            }),
            properties: new fields.ArrayField(new fields.StringField()),
        })
      };
    }
  
    prepareDerivedData() {
    }
  }
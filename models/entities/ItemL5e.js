import { i18nStrings } from "../../scripts/constants.js";

/**
 * Sobrescreve e amplia a implementação padrão do Sistema DnD5e.
 * @extends {Item5e}
 */
export default class ItemL5e extends dnd5e.documents.Item5e {   
    
    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**
    * @override
    * Augment the basic Item data model with additional dynamic data.
    */
    prepareDerivedData() {
        super.prepareDerivedData();

        // Get the Item's data
        const itemData = this;
        const data = itemData.system;

        const armorData = this.getFlag("ldnd5e", "armorSchema");

        // Expand Armor/Shields item schema with Damage Absorvition properties.
        if(this.isArmor) {

            // Armor Damage Level
            data.armor.DL = armorData?.DL ?? {
                bldg: 0,
                pierc: 0,
                slsh: 0
            }

            data.armor.RealDL = armorData?.RealDL ?? 0;

            // Armor Absorved Damage.
            data.armor.AD = armorData?.AD ?? {
                bldg: 0,
                pierc: 0,
                slsh: 0
            }
    
            data.armor.HalfAD = armorData?.HalfAD ?? {
                bldg: false,
                pierc: false,
                slsh: false
            }
    
            data.armor.ACPenalty = armorData?.ACPenalty ?? "0"; 

            data.armor.destroyed = armorData?.destroyed ?? false;
        }       
    }

    /**@override */
    getChatData(htmlOptions={}) {
        const data = super.getChatData(htmlOptions);
        const itemData = this.system;

        if(this.isArmor && itemData.armor.destroyed)
            data.properties.push(game.i18n.localize(i18nStrings.itemDestroyed));

        return data;
    }

    /**@override */
    async rollAttack(options={}) {
        options.parts = (options.parts ?? []);
        const exh = this.actor.system.attributes.exhaustion;

        // Use Exhaustion One D&D Rule
        if(game.settings.get('ldnd5e','oneDNDExhaustionRule')) {          
            // New Rule: '-1' in D20 Rolls for each Exhaustion Level.
            if(exh > 0) options.parts.push(-1 * exh);          
        }

        // New Fumble Treshold from ARSystem
        options.fumble = this.actor.system.attributes.fumbleRange;

        super.rollAttack(options);
    }

    /**@override */
    rollToolCheck(options={}) {
        // New Fumble Treshold from ARSystem
        options.fumble = this.actor.system.attributes.fumbleRange;

        super.rollToolCheck(options);
    }
}
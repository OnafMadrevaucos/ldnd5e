import Item5e from "../../../../systems/dnd5e/module/item/entity.js";
import { damageRoll } from "../../../../systems/dnd5e/module/dice.js";
import { i18nStrings } from "../../scripts/constants.js";

/**
 * Sobrescreve e amplia a implementação padrão do Sistema DnD5e.
 * @extends {Item5e}
 */
export default class ItemL5e extends Item5e {   
    
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
        const itemData = this.data;
        const data = itemData.data;

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
        const itemData = this.data.data;

        if(this.isArmor && itemData.armor.destroyed)
            data.properties.push(game.i18n.localize(i18nStrings.itemDestroyed));

        return data;
    }

    /**@override */
    async rollAttack(options={}) {
        // New Fumble Treshold from ARSystem
        options.fumble = this.actor.data.data.attributes.fumbleRange;

        super.rollAttack(options);
    }

    /**@override */
    rollToolCheck(options={}) {
        // New Fumble Treshold from ARSystem
        options.fumble = this.actor.data.data.attributes.fumbleRange;

        super.rollToolCheck(options);
    }
}
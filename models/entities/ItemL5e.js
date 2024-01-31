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

        const armorData = this.getFlag("ldnd5e", "armorSchema");  
        const specialEffects = this.getFlag("ldnd5e", "specialEffects");     

        // Expand Armor/Shields item schema with Damage Absorvition properties.
        if(this.isArmor) {
            this._prepareArmorData(armorData);            
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

    _prepareArmorData(armorData) {
        // Get the Item's data
        const itemData = this;
        const data = itemData.system;

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
        
        // Armor Half Absorved Damage.
        data.armor.HalfAD = armorData?.HalfAD ?? {
            bldg: false,
            pierc: false,
            slsh: false
        }
        
        // AC Penalty and Armor Destroyed Flag.
        data.armor.ACPenalty = armorData?.ACPenalty ?? "0"; 
        data.armor.destroyed = armorData?.destroyed ?? false;
    }
}
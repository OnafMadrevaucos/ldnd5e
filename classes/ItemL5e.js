import Item5e from "../../../systems/dnd5e/module/item/entity.js";

/**
 * Sobrescreve e amplia a implementação padrão do Sistema DnD5e.
 * @extends {Item5e}
 */
export default class ItemL5e extends Item5e {
    
    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**
    * Augment the basic Item data model with additional dynamic data.
    */
    prepareDerivedData() {
        super.prepareDerivedData();

        // Get the Item's data
        const itemData = this.data;
        const data = itemData.data;

        data.armor.DL = {
            bldg: 0,
            pierc: 0,
            slsh: 0
        }
    
        data.armor.HalfDamage = {
            bldg: false,
            pierc: false,
            slsh: false
        }
    
        data.armor.ACPenalty = null;
    }
}
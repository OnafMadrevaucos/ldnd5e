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

        // Armor Damage Level
        data.armor.DL = {
            bldg: 0,
            pierc: 0,
            slsh: 0
        }

        data.armor.RealDL = this._getRealDamageLevel(data.armor.DL);

        // Armor Absorved Damage.
        data.armor.AD = {
            bldg: 0,
            pierc: 0,
            slsh: 0
        }
    
        data.armor.HalfAD = {
            bldg: false,
            pierc: false,
            slsh: false
        }
    
        data.armor.ACPenalty = null;

        
    }

    /**
    * Obtain the real (max) Damage Level of a armor.
    * @param {object} damageLavels          The Damage Level for all damage types.
    * @param {number} realDamageLevel       The max Damage Level between all damage types.
    */
    _getRealDamageLevel(damageLevels) {

        let realDamageLevel = damageLevels.bldg;
        if(damageLevels.pierc > realDamageLevel) realDamageLevel = damageLevels.pierc;
        if(damageLevels.slsh > realDamageLevel) realDamageLevel = damageLevels.slsh;

        return realDamageLevel;
    }
}
import { constants, i18nStrings } from "../../scripts/constants.js";

export default class ItemSheetL5e extends constants.ItemSheet5e{

    get itemType() {
        return this.item.type;
    }
    
    /**@override */
    async getData() {
        const sheetData = await super.getData(); 
        
        if(["weapon"].includes(this.itemType)) {
            const bleedFlag = this.item.getFlag('ldnd5e', 'bleed');
            const stunFlag = this.item.getFlag('ldnd5e', 'stun');

            if(bleedFlag == undefined || bleedFlag == null) await item.setFlag('ldnd5e', 'bleed', 0);
            if(stunFlag == undefined || stunFlag == null) await item.setFlag('ldnd5e', 'stun', 0);           
        }        

        return sheetData;
    }    
}
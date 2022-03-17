import Actor5e from "../../../../systems/dnd5e/module/actor/entity.js";
import * as das from "../../scripts/DASystem.js";
import { i18nStrings } from "../../scripts/constants.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends Actor5e {

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();

        const actorData = this.data;
        const data = actorData.data;

        this._computeActiveEffectsfromArmors(data).then(() => {
            data.attributes.ac.lan = das.prepareLAN(data);
            data.attributes.ac.ldo = das.prepareLDO(data);
        });        
    }

    _computeArmorClass(data) {
        const ac = super._computeArmorClass(data);
        const equipArmor = data.attributes.ac.equippedArmor;
        const equipShield = data.attributes.ac.equippedShield;

        if(equipArmor || equipShield) {            
            this.applyActiveEffects();
        }  

        return ac;
    } 

    async _computeActiveEffectsfromArmors(data) {

        const equipArmor = data.attributes.ac.equippedArmor;
        const equipShield = data.attributes.ac.equippedShield;

        const armorEffect = (this.getFlag("ldnd5e", "armorEffect"));

        if(armorEffect) {
            if(!equipArmor) { 
                await this.deleteEmbeddedDocuments("ActiveEffect", [armorEffect._id]);
                await this.setFlag("ldnd5e", "armorEffect", null);
            } else {
                const armor = this.items.get(armorEffect.sourceArmor);

                if(!armor) { 
                    await this.deleteEmbeddedDocuments("ActiveEffect", [armorEffect._id]);
                    await this.setFlag("ldnd5e", "armorEffect", null); 
                } else if(equipArmor.data._id !== armor.data._id){
                    await this.deleteEmbeddedDocuments("ActiveEffect", [armorEffect._id]);
                    await this.setFlag("ldnd5e", "armorEffect", null);
                }
            }
        }

        const shieldEffect = (this.getFlag("ldnd5e", "sourceShield"));

        if(shieldEffect) {
            if(!equipShield) { 
                await this.deleteEmbeddedDocuments("ActiveEffect", [shieldEffect]._id);
                await this.setFlag("ldnd5e", "sourceShield", null);
            } else {
                const shield = this.items.get(shieldEffect.sourceShield);

                if(!shield) { 
                    await this.deleteEmbeddedDocuments("ActiveEffect", [shieldEffect]._id);
                    await this.setFlag("ldnd5e", "sourceShield", null);
                } else if(equipShield.data._id !== shield.data._id){
                    await this.deleteEmbeddedDocuments("ActiveEffect", [shieldEffect]._id);
                    await this.setFlag("ldnd5e", "sourceShield", null);
                }
            }
        }
    }
}
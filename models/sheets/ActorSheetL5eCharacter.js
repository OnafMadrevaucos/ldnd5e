import ActorSheet5eCharacter from "../../../../systems/dnd5e/module/actor/sheets/character.js";

export default class ActorSheetL5eCharacter extends ActorSheet5eCharacter {

    /**
    * Advantage mode of a 5e d20 roll
    * @enum {number}
    */
     static ACTION_TYPE = {
        DELETE: -1,
        UPDATE: 0,        
        NEW: 1
    }

    getData() {
        const sheetData = super.getData();

        return sheetData;
    }
    /** @override */
    async _onToggleItem(event) {
        event.preventDefault();
        const actor = this.actor;
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const item = actor.items.get(itemId);
        const data = actor.data.data;        

        if(!["spell"].includes(item?.type))
            await this._computeEquipArmorShield(data, ACTION_TYPE.UPDATE);

        return super._onToggleItem(event);
    }

    async _onItemDelete(event) {
        event.preventDefault();
        const actor = this.actor;
        const li = event.currentTarget.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);  
        const data = actor.data.data; 
        
        if(["armor"].includes(item?.type))
            await this._computeEquipArmorShield(data, item, ACTION_TYPE.DELETE);
        
        super._onItemDelete(event);
      }

    async _computeEquipArmorShield(data, item, action) {

        const equip = { armor: data.attributes.ac.equippedArmor,
                        shield: data.attributes.ac.equippedShield
                    };

        if(equip.armor || equip.shield) {

            const flags = { armor: this.actor.getFlag("ldnd5e", "armorEffect"),
                            shield: this.actor.getFlag("ldnd5e", "shieldEffect")};

            if(flags.armor && flags.shield) { 
                await this._computeActiveEffectsfromArmors(equip, flags, item, action);            
            }
        }

        this.actor.applyActiveEffects();
    }

    async _computeActiveEffectsfromArmors(equip, flags, item, action) {

        const effects = { armor: this.actor.effects.get(flags.armor.effectID),
                          shield: this.actor.effects.get(flags.shield.effectID)};  

        // O Actor tem uma Armadura equipada? Isso é um desequip então.
        if(equip.armor && action === ACTION_TYPE.UPDATE) { 
            // Remova o efeito de avaria.
            await this.updateArmorDamageEffects(effects.armor.data, "0");
            await this.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
        } else {
            // O Actor tem uma Armadura atribuída ao Active Effect?
            if(flags.armor.armorID !== "none") {
            // Recupera a Armadura atribuída ao Active Effect.
            const armor = this.items.get(flags.armor.armorID);
            // A Armadura atribuída ao Active Effect ainda existe?
            if(!armor) { 
                // Remova o efeito de avaria.
                
            // A Armadura equipada é diferente da Armadura atribuída ao Active Effect.
            } else if(equip.armor.data._id !== armor.data._id){
                
            }
            } else {
                // Atribua a Armadura atualmente equipada pelo Actor ao Active Effect.
            
            }
        }

        // O Actor não tem uma Escudo equipado?
        if(!equip.shield) { 
            // Remova o efeito de avaria.
            await this.updateArmorDamageEffects(effects.armor.data, "0");
            await this.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
        } else {
        // O Actor tem um Escudo atribuído ao Active Effect?
            if(flags.shield.shieldID !== "none") {
            // Recupera o Escudo atribuído ao Active Effect.
            const shield = this.items.get(flags.shield.shieldID);
            // O Escudo atribuído ao Active Effect ainda existe?
                if(!shield) { 
                // Remova o efeito de avaria.
            // O Escudo equipado é diferente do Escudo atribuído ao Active Effect.
                } else if(equip.shield.data._id !== shield.data._id){
                }
            } else {
                // Atribua o Escudo atualmente equipado pelo Actor ao Active Effect.            
            }
        }

        if(this.apps) {
            const adControl = this.getFlag("ldnd5e", "adControlID");
            this.apps[adControl]?.refresh(true);
        }
    }    
}
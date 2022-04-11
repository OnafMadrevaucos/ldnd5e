import ActorSheet5eCharacter from "../../../../systems/dnd5e/module/actor/sheets/character.js";
import { i18nStrings } from "../../scripts/constants.js";

export default class ActorSheetL5eCharacter extends ActorSheet5eCharacter {

    /**
    * Advantage mode of a 5e d20 roll
    * @enum {number}
    */
    ACTION_TYPE = {
        DELETE: -1,
        UPDATE: 0,        
        NEW: 1
    }

    /* -------------------------------------------- */
    /*  Métodos Herdados
    /* -------------------------------------------- */

    /**@override */
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

        if(item.data.data.armor?.Destroyed) {
            ui.notifications.warn(game.i18n.format(i18nStrings.messages.itemDestroyed, {item: item.data.name}));
            return;
        }

        if(!["spell"].includes(item?.type))
            await this._computeEquipArmorShield(data, item, this.ACTION_TYPE.UPDATE);

        return super._onToggleItem(event);
    }

    /**@override */
    async _onItemCreate(event) {
        event.preventDefault();        
        const actor = this.actor;
        const items = await super._onItemCreate(event);
        const data = actor.data.data;   

        for(let item of items) {
            if(["armor", "shield"].includes(item?.subtype) && item?.equipped) {
                await this._computeEquipArmorShield(data, item, this.ACTION_TYPE.NEW);
            }
        }
    }

    /**@override */
    async _onDropItemCreate(itemData) {
        const items = await super._onDropItemCreate(itemData);

        for(let item of items) {
            if(["armor", "shield"].includes(item?.subtype) && item?.equipped) {
                await this._computeEquipArmorShield(data, item, this.ACTION_TYPE.NEW);
            }
        }

        const i = 1;       
    }   

    /**@override */
    async _onItemDelete(event) {
        event.preventDefault();
        const actor = this.actor;
        const li = event.currentTarget.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);  
        const data = actor.data.data; 
        
        if(["armor", "shield"].includes(item?.subtype))
            await this._computeEquipArmorShield(data, item, this.ACTION_TYPE.DELETE);
        
        super._onItemDelete(event);
    }

    /**@override */
    _prepareActiveEffectAttributions(target) {
        let atrib = [];

        if(["data.attributes.ac.bonus"].includes(target)) {
            atrib = this.actor.effects.reduce((arr, e) => {
                let source = e.data.label;
                if ( !source || e.data.disabled || e.isSuppressed ) return arr;
                const value = e.data.changes.reduce((n, change) => {
                  if ( (change.key !== target) || !Number.isNumeric(change.value) ) return n;
                  if ( change.mode !== CONST.ACTIVE_EFFECT_MODES.ADD ) return n;
                  return n + Number(change.value);
                }, 0);
                if ( !value ) return arr;
                arr.push({value, label: source, mode: CONST.ACTIVE_EFFECT_MODES.ADD});
                return arr;
              }, []);

        } else atrib = super._prepareActiveEffectAttributions(target);

        return atrib;
    }

    /* -------------------------------------------- */

    async _computeEquipArmorShield(data, item, action) {

        const equip = { armor: data.attributes.ac.equippedArmor,
                        shield: data.attributes.ac.equippedShield};

        const flags = { armor: this.actor.getFlag("ldnd5e", "armorEffect"),
                        shield: this.actor.getFlag("ldnd5e", "shieldEffect")};
        
        const effects = { armor: this.actor.effects.get(flags.armor.effectID),
                          shield: this.actor.effects.get(flags.shield.effectID)};  
  
        // O tipo de ação é um UPDATE?
        if(action === this.ACTION_TYPE.UPDATE) { 

            // O item alterado é uma Armadura?
            if(["armor"].includes(item.subtype)) {
                // O Actor tem uma Armadura equipada? Isso é um desequip então.
                if(equip.armor) {
                    // A Armadura alterada é a mesma que está equipada?
                    if(item.id === equip.armor.id) {
                        // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.armor.data, "0");
                        await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
                    }
                // Isso é um equip então.
                } else {
                    // O Actor já tem uma Armadura atribuída ao Active Effect?
                    if(flags.armor.armorID !== "none") {
                        // Recupera a Armadura atribuída ao Active Effect.
                        const armor = this.actor.items.get(flags.armor.armorID);
                        // A Armadura atribuída ao Active Effect não existe mais?
                        if(!armor) {                        
                            // Atribua a Armadura alterada pelo Actor ao Active Effect.
                            await this.actor.updateArmorDamageEffects(effects.armor.data, item.data.data.armor.ACPenalty);
                            await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});
                            
                        // A Armadura alterada é diferente da Armadura atribuída ao Active Effect.
                        } else if(item.id !== armor.id){
                            // Atribua a Armadura alterada pelo Actor ao Active Effect.
                            await this.actor.updateArmorDamageEffects(effects.armor.data, item.data.data.armor.ACPenalty);
                            await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});
                        }
                    } else {
                        // Atribua a Armadura alterada pelo Actor ao Active Effect.
                        await this.actor.updateArmorDamageEffects(effects.armor.data, item.data.data.armor.ACPenalty);
                        await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});                    
                    }
                }
            }
            
            // O item alterado é um Escudo?
            if(["shield"].includes(item.subtype)) {
            // O Actor tem um Escudo equipado? Isso é um desequip então.
                if(equip.shield) {
                    // O Escudo alterado é o mesmo que está equipado?
                    if(item.id === equip.shield.id) {
                    // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.shield.data, "0");
                        await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});
                    }
                // Isso é um equip então.
                } else {
                    // O Actor já tem um Escudo atribuído ao Active Effect?
                    if(flags.shield.shieldID !== "none") {
                        // Recupera o Escudo atribuído ao Active Effect.
                        const shield = this.actor.items.get(flags.shield.shieldID);
                        // O Escudo atribuído ao Active Effect não existe mais?
                        if(!shield) {
                            // Atribua o Escudo alterado pelo Actor ao Active Effect.
                            await this.actor.updateArmorDamageEffects(effects.shield.data, item.data.data.armor.ACPenalty);
                            await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});
                        // O Escudo alterado é diferente do Escudo atribuído ao Active Effect.
                        } else if(item.id !== shield.id){
                        // Atribua o Escudo alterado pelo Actor ao Active Effect.
                            await this.actor.updateArmorDamageEffects(effects.shield.data, item.data.data.armor.ACPenalty);
                            await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});
                        }
                    } else {
                        // Atribua o Escudo alterado pelo Actor ao Active Effect.
                        await this.actor.updateArmorDamageEffects(effects.shield.data, item.data.data.armor.ACPenalty);
                        await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});                    
                    }
                } 
            }
        // O tipo de ação é um DELETE?           
        } else if(action === this.ACTION_TYPE.DELETE){
            // O item deletado é uma Armadura?
            if(["armor"].includes(item.subtype)) {
                // O Actor tem uma Armadura atribuída ao Active Effect?
                if(flags.armor.armorID !== "none") {
                    // Recupera a Armadura atribuída ao Active Effect.
                    const armor = this.actor.items.get(flags.armor.armorID);
                    // A Armadura atribuída ao Active Effect ainda existe?
                    if(!armor) {
                        // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.armor.data, "0");
                        await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
                    // A Armadura deletada é a Armadura atribuída ao Active Effect.
                    } else if(item.id === armor.data._id){    
                        // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.armor.data, "0");
                        await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});              
                    }
                }
            }

            // O item deletado é um Escudo?
            if(["shield"].includes(item.subtype)) {
                // O Actor tem um Escudo atribuído ao Active Effect?
                if(flags.shield.shieldID !== "none") {
                    // Recupera o Escudo atribuída ao Active Effect.
                    const shield = this.actor.items.get(flags.shield.shieldID);
                    // O Escudo atribuído ao Active Effect ainda existe?
                    if(!shield) { 
                        // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.shield.data, "0");
                        await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});                  
                    // O Escudo deletado é a Armadura atribuída ao Active Effect.
                    } else if(item.id === shield.data._id){    
                        // Remova o efeito de avaria.
                        await this.actor.updateArmorDamageEffects(effects.shield.data, "0");
                        await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});              
                    }
                }
            }
        // O tipo de ação é um NEW? 
        } else if(action === this.ACTION_TYPE.NEW) {
            // O item criado é uma Armadura?
            if(["armor"].includes(item.subtype)) {
                // O Actor não tem uma Armadura equipada?
                if(!equip.armor) {                
                    // Atribua a Armadura criado pelo Actor ao Active Effect.
                    await this.actor.updateArmorDamageEffects(effects.armor.data, item.data.data.armor.ACPenalty);
                    await this.actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});  
                }              
            }

            // O item criado é um Escudo?
            if(["shield"].includes(item.subtype)) {
                // O Actor não tem um Escudo equipado?
                if(!equip.shield) {                
                    // Atribua o Escudo criado pelo Actor ao Active Effect.
                    await this.actor.updateArmorDamageEffects(effects.shield.data, item.data.data.armor.ACPenalty);
                    await this.actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});       
                }         
            }
        }
        
        if(this.actor.apps) {
            const adControl = this.actor.getFlag("ldnd5e", "adControlID");
            this.actor.apps[adControl]?.refresh(true);
        }

        this.actor.applyActiveEffects();
    }   
}
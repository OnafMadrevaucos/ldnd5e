import Actor5e from "../../../../systems/dnd5e/module/actor/entity.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends Actor5e { 

    _onCreate(data, options, user) {
        super._onCreate(data, options, user); 

        const armorFlag = this.getFlag("ldnd5e", "armorEffect");
        const shieldFlag = this.getFlag("ldnd5e", "shieldEffect");

        if(!armorFlag && !shieldFlag) {

            // Active Effect padrão usado para controlar os efeitos de avaria das Armaduras.
            const armorEffect = {
                _id: randomID(),
                label: game.i18n.localize(i18nStrings.activeEffectLabel),
                icon: constants.images.armorEffectDefault,
                origin: this.uuid,
                changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: "0" }], 
                duration: {}
            };
      
            // Active Effect padrão usado para controlar os efeitos de avaria dos Escudos.
            const shieldEffect = {
                _id: randomID(),
                label: game.i18n.localize(i18nStrings.activeEffectShieldLabel),
                icon: constants.images.shieldEffectDefault,
                origin: this.uuid,
                changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 51, value: "0" }], 
                duration: {}
            };

            const createEffectsPromise = this.createEmbeddedDocuments("ActiveEffect", [armorEffect, shieldEffect]);

            createEffectsPromise.then((createdEffects) => {
                // Cria flgas para armazenar e gerênciar os ids tanto dos Active Effect quanto das Armaduras/Escudos.
                this.setFlag("ldnd5e", "armorEffect", {effectID: createdEffects[0].data._id, armorID: "none"});
                this.setFlag("ldnd5e", "shieldEffect", {effectID: createdEffects[1].data._id, shieldID: "none"});
            });
        }         
    }

    _onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId) {        
    }

    /** @override */
    prepareData() {
        this._equippedProtection = {
            armor: undefined,
            shield: undefined,
            set Armor (value) {
                if(value) {

                    const actorData = value.parent.data;
                    const data = actorData.data;
    
                    value.parent._computeEquipArmorShield(data);                    
                } 
            },
    
            set Shield (value) {
                if(value) {

                    const actorData = value.parent.data;
                    const data = actorData.data;
    
                    value.parent._computeEquipArmorShield(data);                    
                }
            }
        }
        super.prepareData();
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();

        const actorData = this.data;
        const data = actorData.data;        
        
        data.attributes.ac.lan = das.prepareLAN(data);
        data.attributes.ac.ldo = das.prepareLDO(data);        
    } 

    _computeArmorClass(data) {
        super._computeArmorClass(data);
        
        const ac = data.attributes.ac;

        if(ac?.equippedArmor) this._equippedProtection.Armor = ac.equippedArmor;
        if(ac?.equippedShield) this._equippedProtection.Shield = ac.equippedShield;
    }

    async _computeEquipArmorShield(data) {

        const equip = { armor: data.attributes.ac.equippedArmor,
                        shield: data.attributes.ac.equippedShield
                    };

        if(equip.armor || equip.shield) {

            const flags = { armor: this.getFlag("ldnd5e", "armorEffect"),
                            shield: this.getFlag("ldnd5e", "shieldEffect")};

            if(flags.armor && flags.shield) { 
                await this._computeActiveEffectsfromArmors(equip, flags);            
            }
        }

        this.applyActiveEffects();
    }

    async _computeActiveEffectsfromArmors(equip, flags) {

        const effects = { armor: this.effects.get(flags.armor.effectID),
                          shield: this.effects.get(flags.shield.effectID)};   

        // O Actor não tem uma Armadura equipada?
        if(!equip.armor) { 
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
                    await this.updateArmorDamageEffects(effects.armor.data, "0");
                // A Armadura equipada é diferente da Armadura atribuída ao Active Effect.
                } else if(equip.armor.data._id !== armor.data._id){
                    await this.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: equip.armor.data._id});
                }
            } else {
                // Atribua a Armadura atualmente equipada pelo Actor ao Active Effect.
                await this.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: equip.armor.data._id});
            }
        }

        // O Actor não tem uma Escudo equipado?
        if(!equip.shield) { 
            // Remova o efeito de avaria.
            await this.updateArmorDamageEffects(effects.shield.data, "0");
            await this.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});
        } else {
            // O Actor tem um Escudo atribuído ao Active Effect?
            if(flags.shield.shieldID !== "none") {
                // Recupera o Escudo atribuído ao Active Effect.
                const shield = this.items.get(flags.shield.shieldID);
                // O Escudo atribuído ao Active Effect ainda existe?
                if(!shield) { 
                    // Remova o efeito de avaria.
                    await this.updateArmorDamageEffects(effects.shield.data, "0");
                // O Escudo equipado é diferente do Escudo atribuído ao Active Effect.
                } else if(equip.shield.data._id !== shield.data._id){
                    await this.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: equip.shield.data._id});
                }
            } else {
                // Atribua o Escudo atualmente equipado pelo Actor ao Active Effect.
                await this.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: equip.shield.data._id});
            }
        }
        
    }

    async updateArmorDamageEffects(data, value) {

        // Active Effect padrão que será atualizado.
        const newEffect = {
            _id: data._id,
            label: data.label,
            icon: data.icon,
            origin: data.origin,
            changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: value }], 
            duration: {}
        };
        await this.updateEmbeddedDocuments("ActiveEffect", [newEffect]);
    }
}
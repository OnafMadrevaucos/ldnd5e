import { documents } from "../../../../systems/dnd5e/dnd5e.mjs";
import * as ars from "../../scripts/ARSystem.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends documents.Actor5e { 

    /** @override */
    async _onCreate(data, options, user) {
        super._onCreate(data, options, user); 

        if(["character"].includes(data.type)) await this.configL5e();     
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();  
        
        const actorData = this;
        const data = actorData.system;
        
        data.profMod = data.attributes.prof > 0 ? `+${data.attributes.prof}` : data.attributes.prof.toString();
        data.abilities.con.strMod = data.abilities.con.mod > 0 ? `+${data.abilities.con.mod}` : data.abilities.con.mod.toString();

        this._prepareARMods(data);

        data.attributes.ac.lan = das.prepareLAN(data);
        data.attributes.ac.ldo = das.prepareLDO(data); 

        if(CONFIG.adControl && (["character"].includes(this.type))) {
            CONFIG.adControl.refresh(true);
        }

        if((["character"].includes(this.type)) && game.settings.get('ldnd5e', 'massiveCombatRules')) {
            data.commander = data.commander ?? false;
        }

        if((["npc"].includes(this.type)) && game.settings.get('ldnd5e', 'massiveCombatRules')) {
            data.isUnit = data.isUnit ?? false;
        }
    }  

    /** @override */
    _prepareBaseAbilities(updates) {
        super._prepareBaseAbilities(updates);        

        if(["npc"].includes(this.type) && this.system.isUnit && game.settings.get('ldnd5e', 'massiveCombatRules')) {
            const key = "mrl";

            if(!this.system.abilities[key])
            {
                const mrl = foundry.utils.deepClone(game.system.template.Actor.templates.common.abilities.cha);
                mrl.value = 10;
                mrl.min = 0;
                this.system.abilities.mrl = mrl;               

                updates[`system.abilities.${key}`] = foundry.utils.deepClone(mrl);
            }
        }
    }
    //------------------------------------------------------
    //  Funções Novas 
    // ----------------------------------------------------- 
    
    /**
     * Prepara os Modificadores utilizado pelo ARSystem
     * @param {object} data        Dados do Actor para preparação dos Modificadores do ARSystem
     */
    _prepareARMods(data) {

        data.attributes.rpMod = data.attributes.rpMod ?? ars.prepareRPMod(data);
        data.attributes.fumbleRange = data.attributes.fumbleRange ?? 1;
        data.attributes.maxFumbleRange = ars.getMaxFumbleRange(data);

        data.attributes.fumbleRange = data.attributes.fumbleRange > data.attributes.maxFumbleRange ? data.attributes.maxFumbleRange : data.attributes.fumbleRange;
    }

    configArmorData() {
        return this.items.reduce((arr, item) => {
   
            if(item.type === "equipment" && CONFIG.DND5E.armorTypes[item.system.armor?.type]) {

               item.equipped = (item.actor.system.attributes.ac.equippedArmor?.id === item.id ||
                                item.actor.system.attributes.ac.equippedShield?.id === item.id);
               
               item.armorType = item.system.armor.type; 
               item.destroyed = item.system.armor.destroyed; 
               item.subtype =  (item.armorType === "shield" ? "shield" : "armor");                     
               arr.push(item); 
            }
            return arr;
        }, []);
    }

    async configL5e() {
        const armorFlag = this.getFlag("ldnd5e", "armorEffect");
        const shieldFlag = this.getFlag("ldnd5e", "shieldEffect");

        if(!armorFlag && !shieldFlag) {

            // Active Effect padrão usado para controlar os efeitos de avaria das Armaduras.
            const armorEffect = {
                _id: randomID(),
                label: game.i18n.localize(i18nStrings.activeEffectLabel),
                icon: constants.images.armorEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 50, value: "0" }], 
                duration: {}
            };
      
            // Active Effect padrão usado para controlar os efeitos de avaria dos Escudos.
            const shieldEffect = {
                _id: randomID(),
                label: game.i18n.localize(i18nStrings.activeEffectShieldLabel),
                icon: constants.images.shieldEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 51, value: "0" }], 
                duration: {}
            };

            const createEffectsPromise = this.createEmbeddedDocuments("ActiveEffect", [armorEffect, shieldEffect]);

            createEffectsPromise.then((createdEffects) => {
                // Cria flgas para armazenar e gerênciar os ids tanto dos Active Effect quanto das Armaduras/Escudos.
                this.setFlag("ldnd5e", "armorEffect", {effectID: createdEffects[0].data._id, armorID: "none"});
                this.setFlag("ldnd5e", "shieldEffect", {effectID: createdEffects[1].data._id, shieldID: "none"});                
            }); 
            
            this.setFlag("ldnd5e", "L5eConfigured", true);
        }
    }

    async updateArmorDamageEffects(data, value) {

        // Active Effect padrão que será atualizado.
        const newEffect = {
            _id: data._id,
            label: data.label,
            icon: data.icon,
            origin: data.origin,
            changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 50, value: value }], 
            duration: {}
        };
        await this.updateEmbeddedDocuments("ActiveEffect", [newEffect]);
    }
}
import Actor5e from "../../../../systems/dnd5e/module/actor/entity.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";
import adControl from "../adControl.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends Actor5e { 

    /** @override */
    _onCreate(data, options, user) {
        super._onCreate(data, options, user); 

        if(["character"].includes(data.type)) this.configL5e();     
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();  
        
        const actorData = this.data;
        const data = actorData.data;

        data.attributes.ac.lan = das.prepareLAN(data);
        data.attributes.ac.ldo = das.prepareLDO(data); 

        const adControl = this.getFlag("ldnd5e", "adControlID");

        if(this.apps && adControl) {
            this.apps[adControl]?.refresh(true);
        }
    } 

    configL5e() {
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
            changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: value }], 
            duration: {}
        };
        await this.updateEmbeddedDocuments("ActiveEffect", [newEffect]);
    }
}
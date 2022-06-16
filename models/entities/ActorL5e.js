import Actor5e from "../../../../systems/dnd5e/module/actor/entity.js";
import * as ars from "../../scripts/ARSystem.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

import { DND5E } from "../../../../systems/dnd5e/module/config.js";
import { d20Roll } from "../../../../systems/dnd5e/module/dice.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends Actor5e { 

    /** @override */
    async _onCreate(data, options, user) {
        super._onCreate(data, options, user); 

        if(["character"].includes(data.type)) await this.configL5e();     
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();  
        
        const actorData = this.data;
        const data = actorData.data;

        data.profMod = data.prof.flat > 0 ? `+${data.prof.flat}` : data.prof.flat.toString();
        data.abilities.con.strMod = data.abilities.con.mod > 0 ? `+${data.abilities.con.mod}` : data.abilities.con.mod.toString();

        this._prepareARMods(data);

        data.attributes.ac.lan = das.prepareLAN(data);
        data.attributes.ac.ldo = das.prepareLDO(data); 

        if(CONFIG.adControl && (["character"].includes(this.type))) {
            CONFIG.adControl.refresh(true);
        }
    } 

    /** @override */
    rollSkill(skillId, options={}) {
        const skl = this.data.data.skills[skillId];
        const abl = this.data.data.abilities[skl.ability];
        const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    
        const parts = [];
        const data = this.getRollData();
    
        // Add ability modifier
        parts.push("@mod");
        data.mod = skl.mod;
    
        // Include proficiency bonus
        if ( skl.prof.hasProficiency ) {
          parts.push("@prof");
          data.prof = skl.prof.term;
        }
    
        // Global ability check bonus
        if ( bonuses.check ) {
          parts.push("@checkBonus");
          data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
        }
    
        // Ability-specific check bonus
        if ( abl?.bonuses?.check ) {
          const checkBonusKey = `${skl.ability}CheckBonus`;
          parts.push(`@${checkBonusKey}`);
          data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
        }
    
        // Skill-specific skill bonus
        if ( skl.bonuses?.check ) {
          const checkBonusKey = `${skillId}CheckBonus`;
          parts.push(`@${checkBonusKey}`);
          data[checkBonusKey] = Roll.replaceFormulaData(skl.bonuses.check, data);
        }
    
        // Global skill check bonus
        if ( bonuses.skill ) {
          parts.push("@skillBonus");
          data.skillBonus = Roll.replaceFormulaData(bonuses.skill, data);
        }
    
        // Add provided extra roll parts now because they will get clobbered by mergeObject below
        if (options.parts?.length > 0) {
          parts.push(...options.parts);
        }
    
        // Reliable Talent applies to any skill check we have full or better proficiency in
        const reliableTalent = (skl.value >= data.attributes.fumbleRange && this.getFlag("dnd5e", "reliableTalent"));

        // New Fumble Treshold from ARSystem
        options.fumble = data.attributes.fumbleRange;
    
        // Roll and return
        const rollData = foundry.utils.mergeObject(options, {
          parts: parts,
          data: data,
          title: `${game.i18n.format("DND5E.SkillPromptTitle", {skill: CONFIG.DND5E.skills[skillId]})}: ${this.name}`,
          halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
          reliableTalent: reliableTalent,
          messageData: {
            speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
            "flags.dnd5e.roll": {type: "skill", skillId }
          }
        });
        return d20Roll(rollData);
    }

    /**@override */
    rollAbility(abilityId, options={}) {
        const data = this.getRollData();
        
        // New Fumble Treshold from ARSystem
        options.fumble = data.attributes.fumbleRange;

        super.rollAbility(abilityId, options);
    }

    async rollDeathSave(options={}) {

        // Display a warning if we are not at zero HP or if we already have reached 3
        const death = this.data.data.attributes.death;
        if ( (this.data.data.attributes.hp.value > 0) || (death.failure >= 3) || (death.success >= 3)) {
          ui.notifications.warn(game.i18n.localize("DND5E.DeathSaveUnnecessary"));
          return null;
        }
    
        // Evaluate a global saving throw bonus
        const parts = [];
        const data = this.getRollData();
        const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    
        // Diamond Soul adds proficiency
        if ( this.getFlag("dnd5e", "diamondSoul") ) {
          parts.push("@prof");
          data.prof = new Proficiency(this.data.data.attributes.prof, 1).term;
        }
    
        // Include a global actor ability save bonus
        const bonuses = foundry.utils.getProperty(this.data.data, "bonuses.abilities") || {};
        if ( bonuses.save ) {
          parts.push("@saveBonus");
          data.saveBonus = Roll.replaceFormulaData(bonuses.save, data);
        }

        // New Fumble Treshold from ARSystem
        options.fumble = data.attributes.fumbleRange;
    
        // Evaluate the roll
        const rollData = foundry.utils.mergeObject(options, {
          parts: parts,
          data: data,
          title: `${game.i18n.localize("DND5E.DeathSavingThrow")}: ${this.name}`,
          halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
          targetValue: 10,
          messageData: {
            speaker: speaker,
            "flags.dnd5e.roll": {type: "death"}
          }
        });
        const roll = await d20Roll(rollData);
        if ( !roll ) return null;
    
        // Take action depending on the result
        const success = roll.total >= 10;
        const d20 = roll.dice[0].total;
    
        let chatString;
    
        // Save success
        if ( success ) {
          let successes = (death.success || 0) + 1;
    
          // Critical Success = revive with 1hp
          if ( d20 === 20 ) {
            await this.update({
              "data.attributes.death.success": 0,
              "data.attributes.death.failure": 0,
              "data.attributes.hp.value": 1
            });
            chatString = "DND5E.DeathSaveCriticalSuccess";
          }
    
          // 3 Successes = survive and reset checks
          else if ( successes === 3 ) {
            await this.update({
              "data.attributes.death.success": 0,
              "data.attributes.death.failure": 0
            });
            chatString = "DND5E.DeathSaveSuccess";
          }
    
          // Increment successes
          else await this.update({"data.attributes.death.success": Math.clamped(successes, 0, 3)});
        }
    
        // Save failure
        else {
          let failures = (death.failure || 0) + (d20 <= data.attributes.fumbleRange ? 2 : 1);
          await this.update({"data.attributes.death.failure": Math.clamped(failures, 0, 3)});
          if ( failures >= 3 ) {  // 3 Failures = death
            chatString = "DND5E.DeathSaveFailure";
          }
        }
    
        // Display success/failure chat message
        if ( chatString ) {
          let chatData = { content: game.i18n.format(chatString, {name: this.name}), speaker };
          ChatMessage.applyRollMode(chatData, roll.options.rollMode);
          await ChatMessage.create(chatData);
        }
    
        // Return the rolled result
        return roll;
    }

    /**@override */
    async shortRest() {
        const data = {
            actor: this,
            rightClick: true,
            rest: 1
        };
        ars.updateFumbleRange(data);

        return super.shortRest();
    }

    /**@override */
    async longRest() {
        const data = {
            actor: this,
            rightClick: true,
            rest: 2
        };
        ars.updateFumbleRange(data);

        return super.longRest();
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
   
            if(item.type === "equipment" && DND5E.armorTypes[item.data.data.armor?.type]) {

               item.equipped = (item.actor.data.data.attributes.ac.equippedArmor?.id === item.id ||
                                item.actor.data.data.attributes.ac.equippedShield?.id === item.id);
               
               item.armorType = item.data.data.armor.type; 
               item.destroyed = item.data.data.armor.destroyed; 
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
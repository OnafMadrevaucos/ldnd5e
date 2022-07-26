import { constants, i18nStrings } from "../scripts/constants.js";
import { computaDA, computaHALF, computaSUB, computaZERAR } from "../scripts/DASystem.js";
import { updateFumbleRange, updateExhaustionLevel } from "../scripts/ARSystem.js";
import { simplifyRollFormula, d20Roll } from "../../../systems/dnd5e/module/dice.js";
import Item5e from "../../../systems/dnd5e/module/item/entity.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class adControl extends Application {

   constructor( options = {} ) {
      super(options);

      CONFIG.adControl = this;      
      this.data = this.computeData();
   }

   // Desvincula as Sheets dos PJs do Controle do AD System.
   /**@override */
   async close() {
      CONFIG.adControl = null;
      return super.close();
   }

   /**
    * Tipo de Ação no Controle de Avaria
    * @enum {number}
    */
    static ACTION_TYPE = {
      SUB: -1,
      HALF: 0,        
      DA: 1,
      ZERAR: 2,
      AR: 3,
      AR_EXAU: 4
   }

   /**
    * Repair DC by Item Rarity
    * @enum {number}
    */
    static DC_REPAIR = {
      common: 10,
      uncommon: 15,
      rare: 20,
      veryRare: 25,
      legendary: 30,
      artifact: 30
   }

   /**@override */
   getData() {    
      
      // Retorna data para a tela.
      return this.data;
   }

   static get defaultOptions()
   {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName],
         template: constants.templates.mainTemplate,
         width: 900,
         height: 650,
         minimizable: true,
         resizable: false,
         title: game.i18n.localize(i18nStrings.title),
         tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'npcs-stats' }]
      });
   }

   /** @override */
   activateListeners(html) {

      if(game.user.isGM) {

          // Clicks sem Rolagem -------------------------------------------
          // Listeners do DASystem
          html.find(".owner-image").click(this._onOwnerImageClick.bind(this));
          html.find(".dl-control").click(this._onDLControlClick.bind(this));  
          html.find(".full-repair-control").click(this._onFullRepairControlClick.bind(this));  
          html.find(".refresh-pcs").click(this._onRefreshPCsClick.bind(this));  
          // Listeners do ARSystem
          html.find(".actor-image").click(this._onActorImageClick.bind(this)); 
          html.find(".ar-control").click(this._onARControlClick.bind(this));
          html.find(".ar-control").contextmenu(this._onARControlClick.bind(this));
          //Listeners de Rolagem de NPCs
          html.find(".save-control").click(this._onNPCSaveClick.bind(this));
          html.find(".attack-control").click(this._onNPCRollClick.bind(this));
          html.find(".damage-control").click(this._onNPCDamageClick.bind(this));
      }

      super.activateListeners(html);
  }

   async _onNPCSaveClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.data.items.get(itemID);

      if(item.hasSave) {  
         const card = await item.displayCard();
         const targets = Item5e._getChatCardTargets(card);
         for ( let token of targets ) {
            const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
            await token.actor.rollAbilitySave(event.currentTarget.dataset.ability, { event, speaker });
         }
      }
   }
   async _onNPCRollClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.data.items.get(itemID);

      if(item.hasAttack) {  
         await item.displayCard();
         item.rollAttack();
      }
   }

   async _onNPCDamageClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.data.items.get(itemID);

      if(item.hasDamage) {
         await item.displayCard();
         item.rollDamage();
      }
   }

   _onOwnerImageClick(event){
      event.preventDefault();

      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;
      const owner = game.actors.get(ownerID);

      return owner.sheet.render(true);
   }
   _onActorImageClick(event){
      event.preventDefault();

      const actorID = event.currentTarget.closest(".item").dataset.actorId;
      const actor = game.actors.get(actorID);

      return actor.sheet.render(true);
   }

   async _onDLControlClick(event) {
      event.preventDefault();

      const dlType = event.currentTarget.closest(".dl-control").dataset.dlType;
      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;

      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      const configured = await this._configureDialog({
         title: game.i18n.localize("ldnd5e.dlControlTitle"),
         data: {
           damageType: dlType,
           price: item.data.data.price,
           owner: owner,
           item: item
         },
         template: constants.templates.dlControlTemplate
      });
      if ( configured === null ) return null;   
      
      this.render(true);

      return item;
   }

  async _onARControlClick(event) {
     event.preventDefault();

     const rightClick = (event.type === "contextmenu");
     const actorID = event.currentTarget.closest(".item").dataset.actorId;
     const actor = game.actors.get(actorID);

     const configured = await this._configureDialog({
         title: game.i18n.localize("ldnd5e.arControlTitle"),
         data: {
            actor: actor,
            labelObs: game.i18n.localize(i18nStrings.messages.arControlLabelObs)
         },
         template: constants.templates.arControlTemplate
      },{confirmAR: true, rightClick: rightClick});
   if ( configured === null ) return null;   
   
   this.render(true);
  }

  async _onFullRepairControlClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;
      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);
      const configured = await this._configureDialog({
         title: game.i18n.localize("ldnd5e.frControlTitle"),
         data: {
           price: item.data.data.price * constants.fullRepairFee,
           owner: owner,
           item: item
         },
         template: constants.templates.frControlTemplate
      }, {fullRepair: true});
      if ( configured === null ) return null;   
      
      this.render(true);

      return item;
  }

  refresh(force) {
   this.data = this.computeData();

   this.render(force);
  }

  _onRefreshPCsClick(event) {

   this.data = this.computeData();

   this.render(false);
  }

  /* -------------------------------------------- */

  async _configureDialog({title, data, template}={}, options={}) {

   let content = null;

   if(options.confirmAR) {
      if(!options.rightClick) {
         if(data.actor.data.data.attributes.fumbleRange < data.actor.data.data.attributes.maxFumbleRange) {
            const label = game.i18n.format(i18nStrings.messages.arControlLabel, {action: "aumentar",value: data.actor.data.data.attributes.rpMod, actor: data.actor.data.name});           

            // Render the Dialog inner HTML
            content = await renderTemplate(template, {
               actor: data.actor, 
               label: label,   
               labelObs: data.labelObs,                    
            });

            data.rightClick = false;  

            return new Promise(resolve => {
               new Dialog({
                  title,
                  content,
                  buttons: {
                     yes: {
                        label: game.i18n.localize(i18nStrings.yesBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.AR))
                     },
                     no: {
                        label: game.i18n.localize(i18nStrings.noBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, 99))
                     }
                  },
                  default: "da",
                  close: () => resolve(null)
               }, options).render(true);
            });
         } else {
            const label = game.i18n.format(i18nStrings.messages.arMaxedOut, {actor: data.actor.data.name});        

            // Render the Dialog inner HTML
            content = await renderTemplate(template, {
               actor: data.actor, 
               label: label                
            });

            return new Promise(resolve => {
               new Dialog({
                  title,
                  content,
                  buttons: {
                     yes: {
                        label: game.i18n.localize(i18nStrings.yesBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.AR_EXAU))
                     },
                     no: {
                        label: game.i18n.localize(i18nStrings.noBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, 99))
                     }
                  },
                  default: "da",
                  close: () => resolve(null)
               }, options).render(true);
            });
            return null;
         }     
      } else {
         if(data.actor.data.data.attributes.fumbleRange > 1) {
            const label = game.i18n.format(i18nStrings.messages.arControlLabel, {action: "remover", value: data.actor.data.data.attributes.rpMod, actor: data.actor.data.name}); 
            // Render the Dialog inner HTML
            content = await renderTemplate(template, {
               actor: data.actor, 
               label: label,   
               labelObs: data.labelObs   
            });

            data.rightClick = true; 

            return new Promise(resolve => {
               new Dialog({
                  title,
                  content,
                  buttons: {
                     yes: {
                        label: game.i18n.localize(i18nStrings.yesBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.AR))
                     },
                     no: {
                        label: game.i18n.localize(i18nStrings.noBtn),
                        callback: html => resolve(this._onDialogSubmit(html, data, 99))
                     }
                  },
                  default: "da",
                  close: () => resolve(null)
               }, options).render(true);
            });
         }  
      }
   }

   if(!options.fullRepair) {
      // Render the Dialog inner HTML
      content = await renderTemplate(template, {
         item: data.item, 
         owner: data.owner,
         damageType: game.i18n.localize(`ldnd5e.damageTypes.${data.damageType}`),
         repairsToolTips: {smith: game.i18n.localize(i18nStrings.dlControlSmithRepair), notSmith: game.i18n.localize(i18nStrings.dlControlNotSmithRepair)},
         price: data.price.toString(),
         fee: constants.repairFee
      });

      return new Promise(resolve => {
         new Dialog({
            title,
            content,
            buttons: {
               da: {
                  label: game.i18n.localize(i18nStrings.addBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.DA))
               },
               half: {
                  label: game.i18n.localize(i18nStrings.halfBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.HALF))
               },
               sub: {
                  label: game.i18n.localize(i18nStrings.subBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.SUB))
               },
               zerar: {
                  label: game.i18n.localize(i18nStrings.zerarBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.ZERAR))
               }
            },
            default: "da",
            close: () => resolve(null)
         }, options).render(true);
      });
   } else {
      var smithRepair = false;
      // Render the Dialog inner HTML
      content = await renderTemplate(template, {
         item: data.item, 
         owner: data.owner,
         price: data.price.toString(),
         smithRepair: smithRepair
      });

      return new Promise(resolve => {
         new Dialog({
            title,
            content,
            buttons: {
               yes: {
                  label: game.i18n.localize(i18nStrings.yesBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.ZERAR, {fullRepair: options.fullRepair, price: data.price}))
               },
               no: {
                  label: game.i18n.localize(i18nStrings.noBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, 99))
               }
            },
            default: "no",
            close: () => resolve(null)
         }, options).render(true);
      });
   }    
  }

   /* -------------------------------------------- */

   /**
   * Handle submission of the Roll evaluation configuration Dialog
   * @param {jQuery} html            The submitted dialog content
   * @param {object} data            The data used
   * @param {number} action          The action selected by the user
   * @returns {D20Roll}              This damage roll.
   * @private
   */
   async _onDialogSubmit(html, data, action, options={}) {
      const form = html[0].querySelector("form");

      const item = data.item;
      const owner = data.owner;
      const tipoDano = data.damageType;

      let result = {};

      switch(action) {
         case adControl.ACTION_TYPE.AR: {
            await updateFumbleRange(data);
         }
         break;

         case adControl.ACTION_TYPE.AR_EXAU: {
            await updateExhaustionLevel(data);
         }
         break;

         case adControl.ACTION_TYPE.DA: {
            result = computaDA(item, owner, tipoDano);   
            this._prepareActiveEffects(item, owner, result);            
         } 
         break;

         case adControl.ACTION_TYPE.HALF: {
            result = computaHALF(item, owner, tipoDano);   
            this._prepareActiveEffects(item, owner, result);
         } 
         break;

         case adControl.ACTION_TYPE.SUB: {
            options.repair = true;
            options.price = parseInt(form.repairLvlPrice.value);
            options.repairLvl = parseInt(form.repairLvlSlider.value);

            if(options.repairLvl === 0) return;

            const toExpensive = this._verifyRepairCost(((options?.price ?? 0)), owner);      
            if(toExpensive) {
               ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, {actor: owner.data.name}));
               return;
            }

            options.smithRepairChk = form.querySelector('.not-smith') ? false : true;

            result = computaSUB(item, owner, tipoDano, options); 
            this._prepareActiveEffects(item, owner, result, options);
         } 
         break;

         case adControl.ACTION_TYPE.ZERAR: {
            options.repair = true;

            if(options?.fullRepair) {
               options.price = data.price;
               options.smithRepairChk = form.querySelector('.smith-repair')?.checked ?? false;
            }
            else {               
               options.price = data.price * constants.repairFee * item.data.data.armor.RealDL;   
               options.smithRepairChk = form.querySelector('.not-smith') ? false : true;
            }
               
            const toExpensive = this._verifyRepairCost(((options?.price ?? 0)), owner);      
            if(toExpensive) {
               ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, {actor: owner.data.name}));
               return;
            }             

            result = computaZERAR(item, owner);
            this._prepareActiveEffects(item, owner, result, options);
         } 
         break;       
         default: return null;
      }     

      return this;
   }

   async _prepareActiveEffects(item, owner, result, options={}) {     

      //@TODO: Implementar controle para que as armaduras ao serem desequipadas parem de tentar apagar o Efeito mesmo quando ele já foi apagado.
      //       Implementar um controle para mostrar mensagens no chat quando certos Níveis de Avaraias é atingido.      
      //
      let effect = null;
      const itemData = foundry.utils.deepClone(item.data.data); 
      const NivelDL = itemData.armor.RealDL;
      const ACPenalty = itemData.armor.ACPenalty;        

      if(result.temMudanca.normal) {
         effect = owner.effects.get(result.effectsID.normal);
         effect._id = result.effectsID.normal;  
      } else if(result.temMudanca.escudo) {
         effect = owner.effects.get(result.effectsID.escudo);
         effect._id = result.effectsID.escudo;          
      } 

      let info = "";
      let extraMessage = "";
      let desequipItem = false;     

      // Contabiliza qual mensagem enviar ao chat para informar o usuário sobre a condição de seu equipamento.
      if(NivelDL === 6) { 
         info = game.i18n.localize(i18nStrings.messages.sixthDLMessage);
         desequipItem = true;
         itemData.armor.destroyed = true;
      } else { 
         if(NivelDL === 5) extraMessage = game.i18n.format(i18nStrings.messages.fithDLMessage, {owner: owner.data.name});
         info = game.i18n.format(i18nStrings.messages.newDLMessage, {item: item.data.name, owner: owner.data.name, penalty: ACPenalty.toString(), extra: extraMessage});         
      }

      let repairSucess = false;
      // Realiza reparo no item.
      if(options?.repair) {         
         this._computeRepairCost(options?.price, owner);

         repairSucess = await this._rollRepair(item, owner, options);
         if(repairSucess == null) return;
         
         if(!repairSucess) { 
            info = game.i18n.format(i18nStrings.messages.repairFailed, {item: item.data.name});
         } else {
            if(options?.fullRepair) {
               info = game.i18n.format(i18nStrings.messages.reconstructedMessage, {item: item.data.name});
               itemData.armor.destroyed = false;
            }else 
               info = game.i18n.format(i18nStrings.messages.repairMessage, {item: item.data.name, penalty: ACPenalty.toString()});  
         }       
      }

      const messageData = {
         data: itemData,
         info: info,
         item: item,
         owner: owner,
         repairDC: (adControl.DC_REPAIR[item.data.data.rarity.toLowerCase()]) ?? 10
      };

      if(result.temMudanca.mensagem || options?.repair)
            await this.toMessage(messageData); 

      if(!options?.repair || (options?.repair && repairSucess)) {            
         // Salva as alterações nos valores de avarias do Item.
         await item.setFlag("ldnd5e", "armorSchema", itemData.armor);

         if(effect) await owner.updateArmorDamageEffects(effect.data, ACPenalty.toString());

         if(desequipItem)
            await item.update({["data.equipped"]: !getProperty(item.data, "data.equipped")});
      }      
   }

   /** @inheritdoc */
   async toMessage(messageData={}) {
      const html = await renderTemplate(constants.templates.newDLTemplate, messageData);

      // Create the ChatMessage data object
      const chatData = {
         user: game.user.data._id,
         type: CONST.CHAT_MESSAGE_TYPES.OTHER,
         content: html,
         speaker: ChatMessage.getSpeaker(),
         flags: {"core.canPopout": true}
      };

      ChatMessage.create(chatData, {});
   }
   
   computeData() {
   
      const data = {
          npcs:{ actors: [], npcs: true, ad: false, ar: false },
          pcs: { label: "ldnd5e.pcsLabel", actors: [], npcs: false, ad: false, ar: true },
          armor: { label: "ldnd5e.armorLabel", items: [], tipoShield: false, dataset: {type: "equipament", subtype: "", armorType: ""}, npcs: false, ad: true, ar: false },
          shield: { label: "ldnd5e.shieldLabel", items: [], tipoShield: true, dataset: {type: "equipament", subtype: "", armorType: ""}, npcs: false, ad: true, ar: false }
      };
   
      for(let actor of game.actors) {
          if(actor.type == "character") {   
               const items = actor.configArmorData();
   
               // Organize items
               for ( let i of items ) {             
                  data[i.subtype].items.push(i);
               }

               data.pcs.actors.push(actor);
          } 
      }

      for(let token of canvas.tokens.ownedTokens) {
         const actor = token.actor;
         if(actor.type == "npc"){
            const npc = {};
            npc.data = actor;
            npc.actions = this.prepareNPCsItems(actor.data);

            let isNew = true;
            for(let oldNpc of data.npcs.actors) {
               if(oldNpc.data.id == npc.data.id) {
                  isNew = false;
                  break;
               }
            }

            if(isNew) data.npcs.actors.push(npc);
         }
      }
   
      return data;
   }

   _convertCurrency(curr) {
      const conversion = Object.entries(CONFIG.DND5E.currencies);
      conversion.reverse();
      for ( let [c, data] of conversion ) {
        const t = data.conversion;
        if ( !t ) continue;
        let change = Math.floor(curr[c] / t.each);
        curr[c] -= (change * t.each);
        curr[t.into] += change;
      }
      return {total: (curr.pp + curr.gp/10 + curr.ep/2 + curr.sp/10 + curr.cp/100), curr: curr};
   }  

   _verifyRepairCost(cost, owner) {
      const curr = this._convertCurrency(foundry.utils.deepClone(owner.data.data.currency));
      const price = this._convertCurrency({pp: 0, gp: cost, ep: 0, sp: 0, cp: 0});
      
      return (price.total > curr.total);
   }

   async _computeRepairCost(cost, actor) {
      const conversion = Object.entries(CONFIG.DND5E.currencies);

      const curr = this._convertCurrency(foundry.utils.deepClone(actor.data.data.currency));
      const price = this._convertCurrency({pp: 0, gp: cost, ep: 0, sp: 0, cp: 0});
      const newCurr = foundry.utils.deepClone(actor.data.data.currency);

      var change = curr.total - price.total;
      for (let [c, data] of conversion) {
         const t = data.conversion;
         if ( !t ) { 
            if(c === "pp"){ 
               var wholeChange = Math.trunc(change);
               var decimalChange = change - wholeChange;
               newCurr[c] = wholeChange;
               change = decimalChange;             
            }
            continue; 
         }

         change *= data.conversion.each;
         var wholeChange = Math.trunc(change);
         var decimalChange = change - wholeChange;         
         newCurr[c] = wholeChange;

         if(decimalChange === 0) break;
         else change = decimalChange;
      }

      await actor.update({ [`data.currency`]: newCurr});
   }

   async _rollRepair(item, owner, options={}) {
      if(!options.smithRepairChk) {
         const label = CONFIG.DND5E.abilities.dex;
         const abl = owner.data.data.abilities.dex;
         const abilityId = "dex";

         const parts = [];
         const data = owner.getRollData();
         const ownerData = owner.data.data;

         // Add ability modifier
         parts.push("@mod");
         data.mod = abl.mod;

         // Include proficiency bonus
         if ( ownerData.traits.toolProf.value.includes('smith') ) {
            parts.push("@prof");
            data.prof = ownerData.attributes.prof;
         }

         // Add ability-specific check bonus
         if ( abl.bonuses?.check ) {
            const checkBonusKey = `${abilityId}CheckBonus`;
            parts.push(`@${checkBonusKey}`);
            data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
         }

         // Add global actor bonus
         const bonuses = getProperty(owner.data.data, "bonuses.abilities") || {};
         if ( bonuses.check ) {
            parts.push("@checkBonus");
            data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
         } 

         // Add provided extra roll parts now because they will get clobbered by mergeObject below
         if (options.parts?.length > 0) {
            parts.push(...options.parts);
         }

         // Roll and return
         const rollData = foundry.utils.mergeObject(options, {
            parts: parts,
            data: data,
            title: `${game.i18n.format("DND5E.AbilityPromptTitle", {ability: label})}: ${owner.name}`,
            halflingLucky: owner.getFlag("dnd5e", "halflingLucky"),
            messageData: {
               speaker: options.speaker || ChatMessage.getSpeaker({actor: owner}),
               "flags.dnd5e.roll": {type: "ability", abilityId }
            }
         });
         const roll = await d20Roll(rollData);
         if(!roll) return null;

         return (roll._total >= (adControl.DC_REPAIR[item.data.data.rarity.toLowerCase()] ?? 10));
      } else return true;
   }

   /**
   * Organize Owned Items for rendering the NPC sheet.
   * @param {object} data  Copy of the actor data being prepared for displayed. *Will be mutated.*
   * @private
   */
   prepareNPCsItems(data) {
      const items = {};
      // Categorize Items as Features and Spells
      const features = {
         weapons: { label: game.i18n.localize("DND5E.AttackPl"), items: [], hasActions: true, dataset: {type: "weapon", "weapon-type": "natural"} },
         actions: { label: game.i18n.localize("DND5E.ActionPl"), items: [], hasActions: true, dataset: {type: "feat", "activation.type": "action"} }
      };

      // Start by classifying items into groups for rendering
      let [spells, other] = data.items.reduce((arr, item) => {
         if ( item.type === "spell" ) arr[0].push(item);
         else arr[1].push(item);
         return arr;
      }, [[], []]);

      // Organize Features
      for ( let item of other ) {
         const itemData = item.data;         
         if ( item.type === "weapon" ) {
            item.labels.simpleFormula = this._getSimpleFormula(item); 
            features.weapons.items.push(item);
         } else if ( item.type === "feat" ){
            if ( itemData.data.activation.type ) {
               item.labels.simpleFormula = this._getSimpleFormula(item); 
               features.actions.items.push(item);
            }
         }
      }

      // Organize Spells
      for ( let item of spells ) {      
         item.labels.simpleFormula = this._getSimpleFormula(item);          
      }

      // Assign and return
      items.features = Object.values(features);
      items.spellbook = spells;

      return items;
   }

   _getSimpleFormula(item) {
      const rollData = item.getRollData();
      const data = item.data.data;

      let formula = "";
      for ( let damage of data.damage.parts ) {
         try {
           const roll = new Roll(damage[0], rollData);
           if(formula === "") formula = simplifyRollFormula(roll.formula, { preserveFlavor: true })
           else formula = formula.concat("+", simplifyRollFormula(roll.formula, { preserveFlavor: true }));
         }
         catch(err) { console.warn(`Unable to simplify formula for ${this.name}: ${err}`); }
      }

      return formula.replaceAll(" ","");
   }
}
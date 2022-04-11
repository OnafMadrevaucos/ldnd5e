import { constants, i18nStrings } from "../scripts/constants.js";
import { computaDA, computaHALF, computaSUB, computaZERAR } from "../scripts/DASystem.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class adControl extends Application {

   constructor( options = {} ) {
      super(options);

      // Vincula todas as Sheets de PJs ao Controle do AD System.
      for(let actor of game.actors) {
         if(actor.type == "character") {            
            actor.apps[this.appId] = this;
            actor.setFlag("ldnd5e", "adControlID", this.appId);
         }
      }
      this.data = this.computePCArmorData();    
   }

   // Desvincula as Sheets dos PJs do Controle do AD System.
   /**@override */
   async close() {
      for(let actor of game.actors) {
         if(actor.type == "character") {
            delete actor.apps[this.appId];
            actor.setFlag("ldnd5e", "adControlID");
         }
      } 
      return super.close();
   }

   /**
    * Advantage mode of a 5e d20 roll
    * @enum {number}
    */
    static ACTION_TYPE = {
      SUB: -1,
      HALF: 0,        
      DA: 1,
      ZERAR: 2
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
         width: 700,
         height: 480,
         minimizable: true,
         resizable: false,
         title: game.i18n.localize(i18nStrings.title),
         tabs: [{ navSelector: '.log-tabs', contentSelector: '.log-body', initial: 'active' }]
      });
   }

   /** @override */
   activateListeners(html) {

      if(game.user.isGM) {

          // Clicks sem Rolagem
          html.find(".owner-image").click(this._onOwnerImageClick.bind(this));
          html.find(".dl-control").click(this._onDLControlClick.bind(this));  
          html.find(".full-repair-control").click(this._onFullRepairControlClick.bind(this));  
          html.find(".refresh-pcs").click(this._onRefreshPCsClick.bind(this));     
      }

      super.activateListeners(html);
  }

  _onOwnerImageClick(event){
      event.preventDefault();

      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;
      const owner = game.actors.get(ownerID);

      return owner.sheet.render(true);
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
           info: dlType,
           owner: owner,
           item: item
         },
         template: constants.templates.dlControlTemplate
      });
      if ( configured === null ) return null;   
      
      this.render(true);

      return item;
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
           info: item.data.data.price * 2,
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
   this.data = this.computePCArmorData();

   this.render(force);
  }

  _onRefreshPCsClick(event) {

   this.data = this.computePCArmorData();

   this.render(false);
  }

  /* -------------------------------------------- */

  async _configureDialog({title, data, template}={}, options={}) {

   let content = null;

   if(!options.fullRepair) {
      // Render the Dialog inner HTML
      content = await renderTemplate(template, {
         item: data.item, 
         owner: data.owner,
         damageType: game.i18n.localize(`ldnd5e.damageTypes.${data.info}`)
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
      // Render the Dialog inner HTML
      content = await renderTemplate(template, {
         item: data.item, 
         owner: data.owner,
         price: data.info.toString()
      });

      return new Promise(resolve => {
         new Dialog({
            title,
            content,
            buttons: {
               yes: {
                  label: game.i18n.localize(i18nStrings.yesBtn),
                  callback: html => resolve(this._onDialogSubmit(html, data, adControl.ACTION_TYPE.ZERAR, {fullRepair: options.fullRepair, price: data.info}))
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
      const tipoDano = data.info;

      let result = {};

      switch(action) {
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
            result = computaSUB(item, owner, tipoDano); 
            this._prepareActiveEffects(item, owner, result);
         } 
         break;

         case adControl.ACTION_TYPE.ZERAR: {

            if(options?.fullRepair) {
               const curr = this._convertCurrency(owner);
               const price = this._convertRawCurrency(options?.price);
      
               const toExpensive = (price.total > curr.total);
      
               if(toExpensive) {
                  ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, {actor: owner.data.name}));
                  return;
               } else {
                  options.curr = curr;
                  options.price = price;
               }
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
      const itemData = item.data.data; 
      const NivelDL = itemData.armor.RealDL;
      const ACPenalty = itemData.armor.ACPenalty;        

      if(result.temMudanca.normal) {
         effect = owner.effects.get(result.effectsID.normal);
         effect._id = result.effectsID.normal;  
      } else if(result.temMudanca.escudo) {
         effect = owner.effects.get(result.effectsID.escudo);
         effect._id = result.effectsID.escudo;          
      } 

      let extraMessage = "";
      let desequipItem = false;

      if(NivelDL === 5) extraMessage = game.i18n.localize(i18nStrings.messages.fithDLMessage);
      else if(NivelDL === 6){ 
         extraMessage = game.i18n.localize(i18nStrings.messages.sixthDLMessage);
         desequipItem = true;
         item.data.data.armor.Destroyed = true;
      }

      // Realiza reparo completo.
      if(options?.fullRepair) {

         item.data.data.armor.Destroyed = false;
      }

      // Salva as alterações nos valores de avarias do Item.
      await item.setFlag("ldnd5e", "armorSchema", item.data.data.armor);

      if(effect) await owner.updateArmorDamageEffects(effect.data, ACPenalty);

      const messageData = {
         data: itemData,
         info: game.i18n.format(i18nStrings.messages.newDLMessage, {item: item.data.name, penalty: ACPenalty.toString(), extra: extraMessage}),
         item: item,
         owner: owner
      };

      if(result.temMudanca.mensagem)
            await this.toMessage(messageData);

      if(desequipItem)
         await item.update({["data.equipped"]: !getProperty(item.data, "data.equipped")});

      
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
   
   computePCArmorData() {
   
      const data = {
          armor: { label: "ldnd5e.armorLabel", items: [], owner: {}, tipoShield: false, dataset: {type: "equipament", subtype: "", armorType: ""} },
          shield: { label: "ldnd5e.shieldLabel", items: [], owner: {}, tipoShield: true, dataset: {type: "equipament", subtype: "", armorType: ""} }
      };
   
      for(let actor of game.actors) {
          if(actor.type == "character") {
   
              let [items] = actor.items.reduce((arr, item) => {
   
                  if(item.type === "equipment") {

                     item.equipped = (item.actor.data.data.attributes.ac.equippedArmor?.id === item.id ||
                                      item.actor.data.data.attributes.ac.equippedShield?.id === item.id);
                     item.owner = actor;
                     item.armorType = item.data.data.armor.type; 
                     item.destroyed = item.data.data.armor.Destroyed; 
                     item.subtype =  (item.armorType === "shield" ? "shield" : "armor");                     
                     arr[0].push(item); 
                  }
                  return arr;
              }, [[]]);
   
              // Organize items
              for ( let i of items ) {             
                  data[i.subtype].items.push(i);
              }
          }
      }
   
      return data;
   }

   _convertCurrency(actor) {
      const curr = foundry.utils.deepClone(actor.data.data.currency);
      const conversion = Object.entries(CONFIG.DND5E.currencies);
      conversion.reverse();
      for ( let [c, data] of conversion ) {
        const t = data.conversion;
        if ( !t ) continue;
        let change = Math.floor(curr[c] / t.each);
        curr[c] -= (change * t.each);
        curr[t.into] += change;
      }
      return {total: (curr.pp*0.1 + curr.gp + curr.ep*2 + curr.sp*10 + curr.cp*100), curr: curr};
   }

   _convertRawCurrency(GPvalue) {
      const curr = {
         pp: 0,
         gp: GPvalue,
         ep: 0,
         sp: 0,
         cp: 0
       };

      const conversion = Object.entries(CONFIG.DND5E.currencies);
      conversion.reverse();
      for ( let [c, data] of conversion ) {
        const t = data.conversion;
        if ( !t ) continue;
        let change = Math.floor(curr[c] / t.each);
        curr[c] -= (change * t.each);
        curr[t.into] += change;
      }
      return {total: (curr.pp*0.1 + curr.gp + curr.ep*2 + curr.sp*10 + curr.cp*100), curr: curr};
   }
}
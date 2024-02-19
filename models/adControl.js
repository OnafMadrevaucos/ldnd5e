import { constants, UnarmoredClasses, NDs, i18nStrings } from "../scripts/constants.js";
import * as das from "../scripts/DASystem.js";
import { updateExhaustionLevel } from "../scripts/ARSystem.js";

import ConfigDialog from "./dialogs/ConfigDialog.js";
import AdDialog from "./dialogs/AdDialog.js";
import ArDialog from "./dialogs/ArDialog.js";

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

   /** @inheritDoc */
  async _renderOuter() {
      const html = await super._renderOuter();
      const header = html[0].querySelector(".window-header");

      // Adjust header buttons.
      header.querySelectorAll(".header-button").forEach(btn => {
         const label = btn.querySelector(":scope > i").nextSibling;
         btn.dataset.tooltip = label.textContent;
         btn.setAttribute("aria-label", label.textContent);
         label.remove();
      });

      return html;
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
      AR: 3
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
         classes: [constants.moduleName, (CONFIG.IsDnD2 ? "dnd5e2" : "dnd5e")],
         template: constants.templates.mainTemplate,
         width: 900,
         height: 650,
         minimizable: true,
         resizable: false,
         title: game.i18n.localize(i18nStrings.title),
         tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'pcs-list' }]
      });
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
               const dasEnabled = actor.getFlag("ldnd5e", "dasEnabled");  
               if(dasEnabled){
                  const items = actor.configArmorData();
                  // Organize items
                  for ( let i of items ) {             
                     data[i.subtype].items.push(i);
                  }
               }

               data.pcs.actors.push(actor);
          } 
      }

      for(let token of canvas.tokens.ownedTokens) {

         if(token.combatant)
         {
            const actor = token.actor;
            if(actor.type == "npc"){
               const npc = {};
               npc.data = actor;
               npc.nd = NDs[actor.system.details.cr];
               npc.actions = this.prepareNPCsItems(actor);

               let isNew = true;
               for(let oldNpc of data.npcs.actors) {
                  if(oldNpc.data.id == npc.data.id) {
                     isNew = false;
                     break;
                  }
               }

               if(isNew){ 
                  data.npcs.actors.push(npc);
                  data.npcs.actors.sort(function (a, b) {
                     if (a.data.name > b.data.name) {
                       return 1;
                     }
                     if (a.data.name < b.data.name) {
                       return -1;
                     }
                     // a must be equal to b
                     return 0;
                  });
               }
            }
         }
      }
   
      return data;
   }

   /** @override */
   activateListeners(html) {

      if(game.user.isGM) {
          // Clicks sem Rolagem -------------------------------------------
          // Listeners do DASystem
          html.find(".owner-image").click(this._onOwnerImageClick.bind(this));
          html.find(".dl-control").click(this._onDLControlClick.bind(this)); 
          html.find(".refresh-pcs").click(this._onRefreshPCsClick.bind(this));  
          html.find(".config-control").click(this._onConfigClick.bind(this));
          // Listeners do ARSystem
          html.find(".actor-image").click(this._onActorImageClick.bind(this));
          html.find(".action-image").click(this._onActionImageClick.bind(this)); 
          html.find(".ar-control").click(this._onARControlClick.bind(this));
          html.find(".ar-control").contextmenu(this._onARControlClick.bind(this));
          //Listeners de Rolagem de NPCs
          html.find(".npc-name").click(this._onNPCNameClick.bind(this));
          html.find(".save-control").click(this._onNPCSaveClick.bind(this));
          html.find(".attack-control").click(this._onNPCRollClick.bind(this));
          html.find(".damage-control").click(this._onNPCDamageClick.bind(this));
          
      }

      super.activateListeners(html);
   }

   _onNPCNameClick(event) {
      event.preventDefault();

      const div = $(event.currentTarget).parents(".npc-summary");

      // Toggle summary
      if ( div.hasClass("expanded") ) {
         let featureOL = div.children(".feature-list");
         let spellOL = div.children(".spell-list");
         featureOL.slideUp(200, () => featureOL.hide());
         spellOL.slideUp(200, () => spellOL.hide());
      } else {
         let featureOL = div.children(".feature-list");
         let spellOL = div.children(".spell-list");
                
         featureOL.slideDown(200, 'linear', () => featureOL.show());
         spellOL.slideDown(200, 'linear' ,() => spellOL.show());
      }
      div.toggleClass("expanded");
   }

   async _onNPCSaveClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.system.items.get(itemID);

      if(item.hasSave) {  
         const card = await item.displayCard();
         const targets = dnd5e.documents.Item5e._getChatCardTargets(card);
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
      const item = owner.items.get(itemID);
      
      const rollResult = await item.roll();

      if(rollResult && item.hasAttack) { 
         item.rollAttack();
      }
   }

   async _onNPCDamageClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      const rollResult = await item.roll();

      if(rollResult && item.hasDamage) {         
         item.rollDamage();
      }
   }

   _onActionImageClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      return item.sheet.render(true);
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
      const unarmored = (event.currentTarget.closest(".item").dataset.unarmored) === "true";
      
      const owner = game.actors.get(ownerID);      
      const classes = owner.classes;

      var item = null;
      if(!unarmored) {
         item = owner.items.get(itemID);
      } else {
         if(UnarmoredClasses.barbarian.name in classes){
            item = await this._getUnarmoredItem(CONFIG.LDND5E.specialArmors.barbarian);
         }
         if(UnarmoredClasses.monk.name in classes) {
            item = await this._getUnarmoredItem(CONFIG.LDND5E.specialArmors.monk);            
         } 

         item = owner.system.attributes.ac.equippedArmor;
      }

      const dialog = await AdDialog.configDialog({
         owner: owner,
         item: item, 
         damageType: dlType,
         unarmored: unarmored 
      });   
   }

  async _onARControlClick(event) {
     event.preventDefault();

     const rightClick = (event.type === "contextmenu");
     const actorID = event.currentTarget.closest(".item").dataset.actorId;
     const actor = game.actors.get(actorID);

     const dialog = await ArDialog.configDialog({
         actor: actor,
         rightClick: rightClick
     });
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
           price: item.system.price * constants.fullRepairFee,
           owner: owner,
           item: item
         },
         template: constants.templates.frControlTemplate
      }, {fullRepair: true});
      if ( configured === null ) return null;   
      
      this.render(true);

      return item;
   }
   async _onConfigClick(event){
      event.preventDefault();

      const dialog = await ConfigDialog.configDialog({
         actors: this.data.pcs.actors
      });
   }

   refresh(force) {
      this.data = this.computeData();

      this.render(force);
   }

   async _onRefreshPCsClick(event) {
      event.preventDefault();
<<<<<<< HEAD
            
      var errorCount = 0;
      for(let actor of game.actors){
         if(actor.type == "character") {
            const hasError = await actor.fullAsyncConfigL5e();
            if(hasError) errorCount++;
         }
      }

      if(errorCount == 0){
         ui.notifications.info(game.i18n.localize(i18nStrings.messages.noEffectErrors));
      }
      
=======

      var errorCount = 0;
      for(let actor of game.actors){
         if(actor.type == "character") {
            const hasError = await actor.fullAsyncConfigL5e();
            if(hasError) errorCount++;
         }
      }

      if(errorCount == 0){
         ui.notifications.info(game.i18n.localize(i18nStrings.messages.noEffectErrors));
      }
>>>>>>> 978451120924eee7ae985c7ba4064f1d51ed8dc6
  }

  /* -------------------------------------------- */

   async _configureDialog({title, data, template}={}, options={}) {

   let content = null;
   const unarmored = data.unarmored;

   if(!options.fullRepair) {      
      const dialog = await AdDialog.configDialog({
         owner: data.actor,
         item: data.item, 
         damageType: game.i18n.localize(`ldnd5e.damageTypes.${data.damageType}`),
         unarmored: unarmored 
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

      const unarmored = data.unarmored;      
      const owner = data.owner;
      const item = ((data.item.armorType != das.TIPO_ARMOR.SHIELD) ? owner.system.attributes.ac.equippedArmor : data.item);
      const tipoDano = data.damageType;     

      let result = {};

      switch(action) {
         case adControl.ACTION_TYPE.AR: {
            await updateExhaustionLevel(data);
         }
         break;

         case adControl.ACTION_TYPE.DA: {
            result = await das.computaDA(item, owner, tipoDano);   
            das.prepareActiveEffects(item, owner, result, {unarmored: unarmored});            
         } 
         break;

         case adControl.ACTION_TYPE.HALF: {
            result = await das.computaHALF(item, owner, tipoDano);   
            das.prepareActiveEffects(item, owner, result, {unarmored: unarmored});
         } 
         break;

         case adControl.ACTION_TYPE.SUB: {
            options.repair = true;
            options.price = parseInt(form.repairLvlPrice.value);
            options.repairLvl = parseInt(form.repairLvlSlider.value);

            if(options.repairLvl === 0) return;

            const toExpensive = this._verifyRepairCost(((options?.price ?? 0)), owner);      
            if(toExpensive) {
               ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, {actor: owner.name}));
               return;
            }

            options.smithRepairChk = form.querySelector('.not-smith') ? false : true;

            result = das.computaSUB(item, owner, tipoDano, options); 
            das.prepareActiveEffects(item, owner, result, options);
         } 
         break;

         case adControl.ACTION_TYPE.ZERAR: {
            options.repair = true;

            if(options?.fullRepair) {
               options.price = data.price;
               options.smithRepairChk = form.querySelector('.smith-repair')?.checked ?? false;
            }
            else {               
               options.price = data.price * constants.repairFee * item.system.armor.RealDL;   
               options.smithRepairChk = form.querySelector('.not-smith') ? false : true;
            }
               
            const toExpensive = this._verifyRepairCost(((options?.price ?? 0)), owner);      
            if(toExpensive) {
               ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, {actor: owner.name}));
               return;
            }             

            result = das.computaZERAR(item, owner);
            das.prepareActiveEffects(item, owner, result, options);
         } 
         break;       
         default: return null;
      }     

      return this;
   }

   _verifyRepairCost(cost, owner) {
      const curr = das.convertCurrency(foundry.utils.deepClone(owner.system.currency));
      const price = das.convertCurrency({pp: 0, gp: cost, ep: 0, sp: 0, cp: 0});
      
      return (price.total > curr.total);
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
         if ( item.type === "weapon" ) {
            item.labels.simpleFormula = this._getSimpleFormula(item); 
            features.weapons.items.push(item);
         } else if ( item.type === "feat" ){
            if ( item.system.activation.type ) {
               item.labels.simpleFormula = this._getSimpleFormula(item); 
               features.actions.items.push(item);
            }
         }
      }

      // Organize Spells
      for ( let item of spells ) {      
         item.labels.simpleFormula = this._getSimpleFormula(item);                   
      }

      spells.sort(function (a, b) {
         return a.system.level - b.system.level;
      });

      // Assign and return
      items.features = Object.values(features);
      items.spellbook = spells;

      return items;
   }

   _getSimpleFormula(item) {
      const rollData = item.getRollData();
      const data = item.system;

      let formula = "";
      for ( let damage of data.damage.parts ) {
         try {
           const roll = new Roll(damage[0], rollData);
           if(formula === "") formula = dnd5e.dice.simplifyRollFormula(roll.formula, { preserveFlavor: true })
           else formula = formula.concat("+", dnd5e.dice.simplifyRollFormula(roll.formula, { preserveFlavor: true }));
         }
         catch(err) { console.warn(`Unable to simplify formula for ${this.name}: ${err}`); }
      }

      return formula.replaceAll(" ","");
   }

   async _getUnarmoredItem(itemID){
      const pack = game.packs.find(p => p.collection === "dnd5e.classfeatures");
      const item = await pack.getDocument(itemID);

      return item;
   }
}
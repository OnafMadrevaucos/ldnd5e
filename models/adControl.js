import { constants, i18nStrings } from "../scripts/constants.js";
import { computaDA, computaHALF, computaSUB } from "../scripts/DASystem.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class adControl extends Application {

   constructor( data, options = {} ) {
      super(options);

      this.data = data;
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

      const dlType = event.currentTarget.closest(".dl-control").dataset.dlType
      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;

      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      const configured = await this._configureDialog({
         title: game.i18n.localize("ldnd5e.dlControlTitle"),
         data: {
           damageType: dlType,
           owner: owner,
           item: item
         },
         template: constants.templates.dlControlTemplate
      });
      if ( configured === null ) return null;   
      
      this.render(true);

      return item
  }

  async _configureDialog({title, data, template}={}, options={}) {

   // Render the Dialog inner HTML
   const content = await renderTemplate(template, {
      item: data.item, 
      owner: data.owner,
      damageType: game.i18n.localize(`ldnd5e.damageTypes.${data.damageType}`)
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
   async _onDialogSubmit(html, data, action) {
      const form = html[0].querySelector("form");

      const item = data.item;
      const owner = data.owner;
      const tipoDano = data.damageType;

      switch(action) {
         case adControl.ACTION_TYPE.DA: {
            const result = await computaDA(item, owner, tipoDano);   
            item.setFlag("ldnd5e", "armorSchema", item.data.data.armor); 

            const effect = {
               _id: randomID(),
               label: "AC Damage Penalty",
               icon: item.data.img,
               origin: data.owner.uuid,
               changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: item.data.data.armor.ACPenalty }], 
               duration: {}
            };

            if(result.temMudanca) {
               if(!result.fazUpdate) await owner.createEmbeddedDocuments("ActiveEffect", [effect]);
               else { 
                  effect._id = result.fazUpdate;
                  await owner.updateEmbeddedDocuments("ActiveEffect", [effect]);   
               }
               
               data.owner.applyActiveEffects();
            }            
         } 
         break;

         case adControl.ACTION_TYPE.HALF: {
            const result = await computaHALF(item, owner, tipoDano);   
            item.setFlag("ldnd5e", "armorSchema", item.data.data.armor); 

            const effect = {
               _id: randomID(),
               label: "AC Damage Penalty",
               icon: item.data.img,
               origin: data.owner.uuid,
               changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: item.data.data.armor.ACPenalty }], 
               duration: {}
            };

            if(result.temMudanca) {
               if(!result.fazUpdate) await owner.createEmbeddedDocuments("ActiveEffect", [effect]);
               else { 
                  effect._id = result.fazUpdate;
                  await owner.updateEmbeddedDocuments("ActiveEffect", [effect]);   
               }
               
               data.owner.applyActiveEffects();
            }
         } 
         break;

         case adControl.ACTION_TYPE.SUB: {
            const result = await computaSUB(item, owner, tipoDano);   
            item.setFlag("ldnd5e", "armorSchema", item.data.data.armor); 

            const effect = {
               _id: randomID(),
               label: "AC Damage Penalty",
               icon: item.data.img,
               origin: data.owner.uuid,
               changes: [{ key: "data.attributes.ac.bonus", mode: ADD, priority: 50, value: item.data.data.armor.ACPenalty }], 
               duration: {}
            };

            if(result.temMudanca) {
               if(!result.fazUpdate) await owner.createEmbeddedDocuments("ActiveEffect", [effect]);
               else { 
                  effect._id = result.fazUpdate;
                  await owner.updateEmbeddedDocuments("ActiveEffect", [effect]);   
               }
               
               data.owner.applyActiveEffects();
            }
         } 
         break;

         case adControl.ACTION_TYPE.ZERAR: {

         } 
         break;
         default: return null;
      }     

      return this;
   }
}
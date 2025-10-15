import { constants, UnarmoredClasses, NDs, i18nStrings } from "../scripts/constants.js";
import * as das from "../scripts/DASystem.js";
import * as utils from "../scripts/utils.js";
import { updateExhaustionLevel } from "../scripts/ARSystem.js";

import ConfigDialog from "./dialogs/ConfigDialog.js";
import AdDialog from "./dialogs/AdDialog.js";
import ArDialog from "./dialogs/ArDialog.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ADControl extends Application {

   constructor(options = {}) {
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

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName, (CONFIG.IsDnD2 ? "dnd5e2" : "dnd5e"), 'ad-control'],
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
         pcs: { label: "ldnd5e.pcsLabel", actors: [], npcs: false, ad: false, ar: true, exaust: true },
         armor: { label: "ldnd5e.armorLabel", items: [], tipoShield: false, dataset: { type: "equipament", subtype: "", armorType: "" }, npcs: false, ad: true, ar: false, exaust: false },
         shield: { label: "ldnd5e.shieldLabel", items: [], tipoShield: true, dataset: { type: "equipament", subtype: "", armorType: "" }, npcs: false, ad: true, ar: false, exaust: false }
      };

      for (let actor of game.actors) {
         if (actor.type == "character") {
            const dasEnabled = actor.getFlag("ldnd5e", "dasEnabled"); // Se falso, o PC não irá aparecer na lista. 
            if (dasEnabled) {
               const items = actor.configArmorData();
               // Organize items
               for (let i of items) {
                  data[i.subtype].items.push(i);
               }
            }

            actor.showActor = dasEnabled;
            actor.exhaustLvl = {
               0: false,
               1: false,
               2: false,
               3: false,
               4: false,
               5: false,
               6: false,
               7: false,
               8: false,
               9: false,
               10: false
            };

            actor.exhaustLvl[actor.system.attributes.exhaustion] = true;

            data.pcs.actors.push(actor);
         }
      }
      return data;
   }

   /** @override */
   activateListeners(html) {

      if (game.user.isGM) {
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
         html.find(".exaust-pip").click(this._onExhaustControlClick.bind(this));
      }

      super.activateListeners(html);
   }   

   _onActionImageClick(event) {
      event.preventDefault();

      const itemID = event.currentTarget.closest(".item").dataset.itemId;
      const ownerID = event.currentTarget.closest(".item").dataset.actorId;
      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      return item.sheet.render(true);
   }

   _onOwnerImageClick(event) {
      event.preventDefault();

      const ownerID = event.currentTarget.closest(".item").dataset.ownerId;
      const owner = game.actors.get(ownerID);

      return owner.sheet.render(true);
   }
   _onActorImageClick(event) {
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

      try {
         var item = null;
         if (!unarmored) {
            item = owner.items.get(itemID);
         } else {
            if (UnarmoredClasses.barbarian.name in classes) {
               item = await utils._getUnarmoredItem(CONFIG.LDND5E.specialArmors.barbarian);
            }
            if (UnarmoredClasses.monk.name in classes) {
               item = await utils._getUnarmoredItem(CONFIG.LDND5E.specialArmors.monk);
            }

            item = owner.system.attributes.ac.equippedArmor;
         }
      } catch (error) { 
         ui.notifications.error(error);
      }

      try {
         const dialog = await AdDialog.configDialog({
            owner: owner,
            item: item,
            damageType: dlType,
            unarmored: unarmored
         });
      } catch (error) {
         console.error(error);
       }
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

   async _onExhaustControlClick(event) {
      event.preventDefault();

      const actorID = event.currentTarget.closest(".item").dataset.ownerId;
      const actor = game.actors.get(actorID);
      const n = Number(event.currentTarget.closest(".exaust-pip").dataset.n);

      const actorData = actor.system;
      const exhaustionLimit = (game.settings.get('ldnd5e', 'oneDNDExhaustionRule') ? 10 : 6);
      if (actorData.attributes.exhaustion != exhaustionLimit) {
         // O nível de Exaustão ainda está abaixo do limite máximo.
         if (n < exhaustionLimit)
            await actor.update({ "system.attributes.exhaustion": n });
         else // A criatura morreu de exaustão.
            await actor.update({
               "system.attributes.death.failure": 3,
               "system.attributes.exhaustion": n,
               "system.attributes.hp.value": 0
            });
      }
      actor.update({ "system.attributes.exhaustion": n });
   }
   
   async _onConfigClick(event) {
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

      var errorCount = 0;
      for (let actor of game.actors) {
         if (actor.type == "character") {
            const hasError = await actor.fullAsyncConfigL5e();
            if (hasError) errorCount++;
         }
      }

      if (errorCount == 0) {
         ui.notifications.info(game.i18n.localize(i18nStrings.messages.noEffectErrors));
      }
   }
}
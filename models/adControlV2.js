import { constants, UnarmoredClasses, NDs, i18nStrings } from "../scripts/constants.js";
import * as das from "../scripts/DASystem.js";
import * as utils from "../scripts/utils.js";
import { updateExhaustionLevel } from "../scripts/ARSystem.js";

import ConfigDialog from "./dialogs/ConfigDialog.js";
import AdDialogV2 from "./dialogs/AdDialogV2.js";
import AdDialog from "./dialogs/AdDialog.js";
import ConfigDialogV2 from "./dialogs/ConfigDialogV2.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

const api = dnd5e.applications.api;

export default class ADControlV2 extends api.Application5e {

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

   constructor(options = {}) {
      super(options);

      CONFIG.adControl = this;
   }

   /* -------------------------------------------- */

   // Desvincula as Sheets dos PJs do Controle do AD System.
   /**@override */
   async close() {
      CONFIG.adControl = null;
      return super.close();
   }

   /* -------------------------------------------- */

   /** @override */
   static DEFAULT_OPTIONS = {
      id: constants.moduleName,
      classes: [constants.moduleName, 'dnd5e2', 'ad-control2'],
      tag: 'form',
      window: {
         title: i18nStrings.titles.ac
      },
      form: {
         submitOnChange: true,
         closeOnSubmit: false,
         handler: ADControlV2.#handleFormSubmission
      },
      position: {
         width: 900,
         height: 650
      },
      actions: {
         // Main Actions
         showEquip: ADControlV2.#showEquip,
         showActor: ADControlV2.#showActor,
         doDamage: ADControlV2.#doDamage,
         refreshPCs: ADControlV2.#refreshPCs,
         openConfig: ADControlV2.#openConfig,
         // Exhaustion's Action
         updateExhaustion: ADControlV2.#updateExhaustion
      }
   }

   /* -------------------------------------------- */

   /** @override */
   static PARTS = {
      header: {
         template: "modules/ldnd5e/templates/main-control/header.hbs",
      },
      tabs: {
         template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
         templates: ["templates/generic/tab-navigation.hbs"]
      },
      pcs: {
         template: "modules/ldnd5e/templates/main-control/tabs/pcs-list.hbs",
      },
      exaust: {
         template: "modules/ldnd5e/templates/main-control/tabs/exaust-list.hbs",
      }
   };

   /* -------------------------------------------- */

   /** @override */
   tabGroups = {
      primary: "pcs"
   };

   /* -------------------------------------------- */
   /*  Rendering                                   */
   /* -------------------------------------------- */

   /** @inheritdoc */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);

      // Prepare the context with the configuration values from the system.
      context.CONFIG = dnd5e.config;

      // Send the tabs data to the context.
      context.tabs = this._getTabs();

      // Prepare actor's list for display.
      context.pcs = this._prepareActorsList();

      this.context = {
         ...context,
         options: this.options
      };

      return this.context;
   }

   /* -------------------------------------------- */

   /** @inheritdoc */
   async _preparePartContext(partId, context, options) {
      context.tab = context.tabs[partId];

      switch (partId) {
         case "header": await this._prepareHeaderContext(context, options); break;
         case "pcs": await this._preparePCsContext(context, options); break;
         case "exaust": await this._prepareExaustContext(context, options); break;
      }

      return context;
   }

   /* -------------------------------------------- */

   /**
    * Prepare rendering context for the header.
    * @param {ApplicationRenderContext} context  Context being prepared.
    * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
    * @returns {ApplicationRenderContext}
    * @protected
    */
   async _prepareHeaderContext(context, options) {
      return context;
   }

   /* -------------------------------------------- */

   /**
    * Prepare rendering context for the Player's Characters list tab.
    * @param {ApplicationRenderContext} context  Context being prepared.
    * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
    * @returns {ApplicationRenderContext}
    * @protected
    */
   async _preparePCsContext(context, options) {
      const equips = {
         armor: { label: "ldnd5e.armorLabel", items: [], tipoShield: false, dataset: { type: "equipament", subtype: "", armorType: "" } },
         shield: { label: "ldnd5e.shieldLabel", items: [], tipoShield: true, dataset: { type: "equipament", subtype: "", armorType: "" } }
      };

      // Obtain all visible PCs' equipament items.
      for (let actor of context.pcs.dasVisible) {
         const items = actor.configArmorData();
         // Organize items.
         for (let i of items) {
            equips[i.subtype].items.push(i);
         }
      }

      context.equips = equips;
      return context;
   }

   /* -------------------------------------------- */

   /**
    * Prepare rendering context for the Player's Characters exhaustion list tab.
    * @param {ApplicationRenderContext} context  Context being prepared.
    * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
    * @returns {ApplicationRenderContext}
    * @protected
    */
   async _prepareExaustContext(context, options) {

      return context;
   }

   /* -------------------------------------------- */

   /**
  * Prepare actor's list for display.
  * @returns {object}
  * @protected
  */
   _prepareActorsList() {
      const pcs = {
         label: "ldnd5e.pcsLabel",
         list: [],   // List of all Player's Characters actors.
         dasVisible: [] // List of all Player's Characters actors that are visible.
      };

      for (let actor of game.actors) {
         if (actor.type == "character") {
            // Se falso, o PC não irá aparecer na lista. 
            const dasEnabled = actor.getFlag("ldnd5e", "dasEnabled");            

            // By default, show the actor only if the user has marked it to show.
            actor.showActor = dasEnabled;

            // Obtain actor's equipped armor.
            const equippedArmor = actor.system.attributes.ac.equippedArmor;

            // If actor don't have armor, show it only if it is a barbarian or a monk.
            if (!equippedArmor) {
               let hasValidClass = false;
               for (let c of Object.keys(actor.classes)) {
                  if (c == 'barbarian' || c == 'monk') {                     
                     hasValidClass = true;
                     break;
                  }
               }

               // If actor is not a barbarian or a monk, don't add it to the visible list.
               if (!hasValidClass) actor.invalidArmor = true;
            }            

            actor.exhaustLvl = {
               0: false,
               1: false,
               2: false,
               3: false,
               4: false,
               5: false,
               6: false
            };

            actor.exhaustLvl[actor.system.attributes.exhaustion] = true;

            // All actors are added to the PCs'list.
            pcs.list.push(actor);

            // If actor is visible, add it to the visible list.
            if (actor.showActor && !actor.invalidArmor) {
               // Add actor to the list only it has avalid armor type.
               pcs.dasVisible.push(actor);
            }
         }
      }

      return pcs;
   }

   /* -------------------------------------------- */

   /**
    * Prepare the tab information for the sheet.
    * @returns {Record<string, Partial<ApplicationTab>>}
    * @protected
    */
   _getTabs() {
      return {
         pcs: {
            id: "pcs", group: "primary",
            label: "ldnd5e.adSystemTitle",
            active: this.tabGroups.primary === "pcs",
            cssClass: this.tabGroups.primary === "pcs" ? "active" : ""
         },
         exaust: {
            id: "exaust", group: "primary",
            label: "ldnd5e.exaustCtrlTitle",
            active: this.tabGroups.primary === "exaust",
            cssClass: this.tabGroups.primary === "exaust" ? "active" : ""
         }
      };
   }

   /* -------------------------------------------- */
   /*  Events Listeners and Handlers               */
   /* -------------------------------------------- */

   /**
   * Show the Equipament's sheet.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static #showEquip(event, target) {
      const isUnarmored = target.closest(".item").dataset.unarmored === "true";
      // Unarmored items don't have a sheet.
      if (isUnarmored) return;

      const ownerID = target.closest(".item").dataset.ownerId;
      const itemID = target.closest(".item").dataset.itemId;

      const owner = game.actors.get(ownerID);
      const item = owner.items.get(itemID);

      item.sheet.render(true);
   }


   /* -------------------------------------------- */

   /**
   * Show the Player's Characters sheet.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static #showActor(event, target) {
      const ownerID = target.closest(".item").dataset.ownerId;
      const owner = game.actors.get(ownerID);

      owner.sheet.render(true);
   }

   /* -------------------------------------------- */

   /**
   * Compute the damage on the equipament.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static async #doDamage(event, target) {
      const isValid = target.closest(".dl-control") ? true : false;
      // Abort if target is not a valid item to be damaged.
      if (!isValid) return;

      const itemID = target.closest(".item").dataset.itemId;
      const ownerID = target.closest(".item").dataset.ownerId;
      const unarmored = (target.closest(".item").dataset.unarmored) === "true";
      const dlType = target.closest(".dl-control").dataset.dlType;

      const owner = game.actors.get(ownerID);
      const classes = owner.classes;

      try {
         var item = null;
         if (!unarmored) {
            item = owner.items.get(itemID);
         } else {
            const unarmoredDef = owner.getFlag("ldnd5e", "unarmoredDef");

            if (UnarmoredClasses.barbarian.name in classes) {
               item = await utils._getUnarmoredItem(CONFIG.LDND5E.specialArmors.barbarian);
            }
            if (UnarmoredClasses.monk.name in classes) {
               item = await utils._getUnarmoredItem(CONFIG.LDND5E.specialArmors.monk);
            }

            item.system.armor = foundry.utils.deepClone(unarmoredDef);
            item.system.type.value = das.TIPO_ARMOR.UNARMORED;
         }
      } catch (error) {
         ui.notifications.error(error);
      }

      try {
         const ok = await AdDialogV2.create({
            actor: owner,
            item: item,
            damageType: dlType,
            unarmored: unarmored
         });

         if (ok) this.render({ force: true });
      } catch (error) {
         ui.notifications.error(error);
      }
   }

   /* -------------------------------------------- */

   /**
   * Refresh the list of Player's Characters.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static async #refreshPCs(event, target) {
      var errorCount = 0;
      for (let actor of game.actors) {
         if (actor.type == "character") {
            const hasError = await actor.configL5e();
            if (hasError) errorCount++;
         }
      }

      if (errorCount == 0) {
         ui.notifications.info(game.i18n.localize(i18nStrings.messages.noEffectErrors));
      }
   }

   /* -------------------------------------------- */

   /**
   * Open the control configuration dialog.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static async #openConfig(event, target) {
      const actors = {};
      let allSelected = false;

      this.context.pcs.list.forEach((a) => {
         actors[a.id] = {
            id: a.id,
            name: a.name,
            img: a.img,
            dasEnabled: a.getFlag("ldnd5e", "dasEnabled")
         };

         allSelected = allSelected & actors[a.id].dasEnabled;
      });

      try {
         const ok = await ConfigDialogV2.create({ actors, allSelected });
         if (ok) await this.render({ force: true });
      } catch (error) {
         ui.notifications.error(error);
      }
   }

   /* -------------------------------------------- */

   /**
   * Update the exhaustion level of the actor.
   * @this {adControlV2}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
   static async #updateExhaustion(event, target) {
      const actorID = target.closest(".item").dataset.ownerId;
      const actor = game.actors.get(actorID);
      const n = Number(target.closest(".exaust-pip").dataset.n);

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

      await this.render({ force: true });
   }

   /* -------------------------------------------- */
   /*  Form Handling                               */
   /* -------------------------------------------- */

   /**
   * Handle submitting the currency manager form.
   * @this {Award}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
   static async #handleFormSubmission(event, form, formData) {
      const data = foundry.utils.expandObject(formData.object);
   }
}
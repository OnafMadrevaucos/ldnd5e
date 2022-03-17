import adControl from "../models/adControl.js";

/**
 * Defines the main FQL constants for module name and the DB flag.
 *
 * @type {{folderState: string, flagDB: string, moduleName: string, moduleLabel: string, primaryState: string}}
 */
 const constants = {
    moduleName: 'ldnd5e',
    moduleLabel: `Lemurian Dungeons & Dragons 5th Edition`,
    
    templates: {
        mainTemplate: 'modules/ldnd5e/templates/mainControl.hbs',
        dlControlTemplate: 'modules/ldnd5e/templates/control-dialog.hbs'
    }
 };

 const i18nStrings = {
   title : "ldnd5e.title",
   armorLabel: "ldnd5e.armorLabel",
   shieldLabel: "ldnd5e.shieldLabel",
   itemOwner:"ldnd5e.itemOwner",
   ownerLan: "ldnd5e.ownerLan",
   ownerLdo: "ldnd5e.ownerLdo",

   pdTitle: "ldnd5e.pdTitle",
   sdTitle: "ldnd5e.sdTitle",
   bdTitle: "ldnd5e.bdTitle",
   tdTitle: "ldnd5e.tdTitle",

   dlControlTitle: "ldnd5e.dlControlTitle",
   dlControlItemLabel: "ldnd5e.dlControlItemLabel",
   dlControlDamageType: "ldnd5e.dlControlDamageType",

   addBtn: "ldnd5e.addBtn",
   halfBtn: "ldnd5e.halfBtn",
   subBtn: "ldnd5e.subBtn",
   zerarBtn: "ldnd5e.zerarBtn",

   damageTypes: {
    pierc: "ldnd5e.damageTypes.pierc",
    slsh: "ldnd5e.damageTypes.slsh",
    bldg: "ldnd5e.damageTypes.bldg"
   },

   messages: {
     halDmgShield: "ldnd5e.messages.halDmgShield"
   }
 };

 const gmControl = [
   {
      name: constants.moduleName,
      title: i18nStrings.title,
      icon: 'fas fa-shield-alt',
      visible: true,
      button: true
   }
 ]; 

 export { constants, gmControl, i18nStrings };
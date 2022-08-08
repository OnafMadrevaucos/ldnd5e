import { default as ActorSheetCharacterORIGINAL } from "../../../systems/dnd5e/module/actor/sheets/character.js";
import {default as ActorSheetNPCsORIGINAL} from "../../../systems/dnd5e/module/actor/sheets/npc.js";
/**
 * Defines the main FQL constants for module name and the DB flag.
 *
 * @type {{folderState: string, flagDB: string, moduleName: string, moduleLabel: string, primaryState: string}}
 */
 const constants = {
    moduleName: 'ldnd5e',
    moduleLabel: 'Lemurian Dungeons & Dragons 5th Edition',

    ActorSheet5eCharacter: ActorSheetCharacterORIGINAL,
    ActorSheet5eNPCs: ActorSheetNPCsORIGINAL,
    
    templates: {
        mainTemplate: 'modules/ldnd5e/templates/mainControl.hbs',
        dlControlTemplate: 'modules/ldnd5e/templates/control-dialog.hbs',
        arControlTemplate: 'modules/ldnd5e/templates/confirm-dialog.hbs',
        frControlTemplate: 'modules/ldnd5e/templates/full-repair-dialog.hbs',
        newDLTemplate: 'modules/ldnd5e/templates/newDL-template.hbs',
    },

    images: {
       armorEffectDefault: "icons/equipment/chest/breastplate-helmet-metal.webp",
       shieldEffectDefault: "icons/equipment/shield/heater-crystal-blue.webp"
    },

    repairFee: 0.1,
    fullRepairFee: 2
 };

 const NDs = {
   0: "0",
   0.125: "1/8",
   0.25: "1/4",
   0.5: "1/2",
   1: "1",
   2: "2",
   3: "3",
   4: "4",
   5: "5",
   6: "6",
   7: "7",
   8: "8",
   9: "9",
   10: "10",
   11: "11",
   12: "12",
   13: "13",
   14: "14",
   15: "15",
   16: "16",
   17: "17",
   18: "18",
   19: "19",
   20: "20",
   21: "21",
   22: "22",
   23: "23",
   24: "24",
   25: "25",
   26: "26",
   27: "27",
   28: "28",
   29: "29",
   30: "30"
 }

 const i18nStrings = {
   title : "ldnd5e.title",
   npcsStatsTitle: "ldnd5e.npcsStatsTitle",
   adSystemTitle: "ldnd5e.adSystemTitle",
   arSystemTitle: "ldnd5e.arSystemTitle",

   sheetTitle: "ldnd5e.sheetTitle",
   pcsLabel: "ldnd5e.pcsLabel",
   armorLabel: "ldnd5e.armorLabel",
   shieldLabel: "ldnd5e.shieldLabel",
   itemOwner:"ldnd5e.itemOwner",
   ownerLan: "ldnd5e.ownerLan",
   ownerLdo: "ldnd5e.ownerLdo",
   damageSystem: "ldnd5e.damageSystem",

   refreshBtn: "ldnd5e.refreshBtn",

   pdTitle: "ldnd5e.pdTitle",
   sdTitle: "ldnd5e.sdTitle",
   bdTitle: "ldnd5e.bdTitle",
   tdTitle: "ldnd5e.tdTitle",

   profTitle: "ldnd5e.profTitle",
   conTitle: "ldnd5e.conTitle",
   exauTitle: "ldnd5e.exauTitle",
   penTitle: "ldnd5e.penTitle",
   ftTitle: "ldnd5e.ftTitle",

   arControlTitle:"ldnd5e.arControlTitle",   

   dlControlTitle: "ldnd5e.dlControlTitle",
   dlControlItemLabel: "ldnd5e.dlControlItemLabel",
   dlControlDamageType: "ldnd5e.dlControlDamageType",
   dlControlRepairLvl: "ldnd5e.dlControlRepairLvl",
   dlControlDamageBtn: "ldnd5e.dllControlDamageBtn",
   dlControlRepairsBtn: "ldnd5e.dllControlRepairsBtn",

   dlControlSmithRepair: "ldnd5e.dlControlSmithRepair",
   dlControlNotSmithRepair: "ldnd5e.dlControlNotSmithRepair",

   dlControlRepairDC: "ldnd5e.dlControlRepairDC",

   frControlTitle: "ldnd5e.frControlTitle",
   frControlItemLabel: "ldnd5e.frControlItemLabel",
   frControlItemPrice: "ldnd5e.frControlItemPrice",
   frControlMessage: "ldnd5e.frControlMessage",

   activeEffectLabel: "ldnd5e.activeEffectLabel",
   activeEffectShieldLabel: "ldnd5e.activeEffectShieldLabel",

   addBtn: "ldnd5e.addBtn",
   halfBtn: "ldnd5e.halfBtn",
   subBtn: "ldnd5e.subBtn",
   zerarBtn: "ldnd5e.zerarBtn",

   yesBtn: "ldnd5e.yesBtn",
   noBtn: "ldnd5e.noBtn",

   damageTypes: {
    pierc: "ldnd5e.damageTypes.pierc",
    slsh: "ldnd5e.damageTypes.slsh",
    bldg: "ldnd5e.damageTypes.bldg"
   },

   itemDestroyed: "ldnd5e.itemDestroyed",
   groupRolls:"ldnd5e.groupRolls",

   messages: {
      bldgDmgLightArmor: "ldnd5e.messages.bldgDmgLightArmor",
      slshDmgHeavyArmor: "ldnd5e.messages.slshDmgHeavyArmor",      
      halDmgShield: "ldnd5e.messages.halDmgShield",
      newDLMessage: "ldnd5e.messages.newDLMessage",
      maxDLMessage: "ldnd5e.messages.maxDLMessage",
      fithDLMessage: "ldnd5e.messages.fithDLMessage",
      sixthDLMessage: "ldnd5e.messages.sixthDLMessage",
      itemDestroyed :"ldnd5e.messages.itemDestroyed",
      repairToExpensive: "ldnd5e.messages.repairToExpensive",
      repairMessage: "ldnd5e.messages.repairMessage",
      reconstructedMessage: "ldnd5e.messages.reconstructedMessage",
      repairFailed: "ldnd5e.messages.repairFailed",

      arControlLabel: "ldnd5e.messages.arControlLabel",
      arControlLabelObs: "ldnd5e.messages.arControlLabelObs",
      arMaxedOut:"ldnd5e.messages.arMaxedOut"
   },

   settings: {
      criticalName: "ldnd5e.settings.criticalName",
      criticalHint: "ldnd5e.settings.criticalHint"
   }
 };

 const feats = {
   
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

 export { constants, NDs, gmControl, i18nStrings };
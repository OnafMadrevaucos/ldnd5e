/**
 * Defines the main constants for module name and other flags.
 *
 * @type {{
 *    moduleName: string, 
 *    moduleLabel: string, 
 *    ActorSheet5eCharacter: Document, 
 *    ActorSheet5eNPCs: Document, 
 *    primaryState: string,
 *    templates: string,
 *    images: string,
 *    repairFee: number,
 *    fullRepairFee: number
 * }}
 */
const constants = {
   moduleName: 'ldnd5e',
   moduleLabel: 'Lemurian Dungeons & Dragons 5th Edition',

   ItemSheet5e: dnd5e.applications.item.ItemSheet5e,
   ActorSheet5eCharacter: (CONFIG.IsDnD2 ? dnd5e.applications.actor.ActorSheet5eCharacter2 : dnd5e.applications.actor.ActorSheet5eCharacter),
   ActorSheet5eNPCs: dnd5e.applications.actor.ActorSheet5eNPC,

   templates: {
      mainTemplate: 'modules/ldnd5e/templates/mainControl.hbs',
      dlControlTemplate: 'modules/ldnd5e/templates/control-dialog.hbs',
      dlConfigTemplate: 'modules/ldnd5e/templates/config-dialog.hbs',
      arControlTemplate: 'modules/ldnd5e/templates/confirm-dialog.hbs',
      fatigueDialogTemplate: 'modules/ldnd5e/templates/fatigue-dialog.hbs',
      cControlTemplate: 'modules/ldnd5e/templates/cControl.hbs',
      frControlTemplate: 'modules/ldnd5e/templates/full-repair-dialog.hbs',
      newDLTemplate: 'modules/ldnd5e/templates/newDL-template.hbs',
      specialConditions: "modules/ldnd5e/templates/partials/extra-conditions.hbs"
   },

   tabs: {
      mainTemplate: {
         pcsList: 'modules/ldnd5e/templates/partials/pcs-list.hbs',
         exaustControl: 'modules/ldnd5e/templates/partials/exaust-list.hbs',
         reacaoAgil: 'modules/ldnd5e/templates/partials/reacao-agil.hbs'
      }
   },

   images: {
      armorEffectDefault: "icons/equipment/chest/breastplate-helmet-metal.webp",
      shieldEffectDefault: "icons/equipment/shield/heater-crystal-blue.webp",
      noArmorDefault: "icons/magic/control/silhouette-hold-change-blue.webp"
   },

   repairFee: 0.1,
   fullRepairFee: 2
};

const UnarmoredClasses = {
   barbarian: {
      name: "barbarian",
      useShield: true,
      ability: "con"
   },
   monk: {
      name: "monk",
      useShield: false,
      ability: "dex"
   }
}

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

/**
* Defines the Unit constants.
*
* @enum {{
*    uTypes: object, 
*    uAbilities: object,
*    uCombatIcons: object
*    categories: object
* }}
*/
const unitChoices = {
   /**
   * Defines the Unit Types constants.      
   */
   uTypes: {
      light: "light",
      heavy: "heavy",
      special: "special",
      medical: "medical"
   },
   /**
   * Defines the Unit Abilities constants.      
   */
   uAbilities: {
      frt: "frt",
      mrl: "mrl",
      wll: "wll"
   },

   /**
   * Defines the Unit Combat Skills Icons constants.      
   */
   uCombatIcons: {
      dsp: "ra ra-crowned-heart",
      enc: "ra ra-muscle-up",
      def: "ra ra-shield"
   },

   /**
   * Defines the Unit Categories constants.      
   */
   categories: {
      arcanists: "arcanists",
      devotees: "devotees",
      fighters: "fighters",
      specialists: "specialists",
   }
}

/**
* Defines the Unit constants.
*
* @enum {{
*    activities: object, 
* }}
*/
const taticsChoices = {
   /**
   * Defines the Tatics Activities constants.      
   */
   activities: {
      moralDmg: "moralDmg",
      moralHeal: "moralHeal",
      impetusBuff: "impetusBuff",
      impetusDebuff: "impetusDebuff",
   },   
}

const i18nStrings = {
   title: "ldnd5e.title",
   npcsStatsTitle: "ldnd5e.npcsStatsTitle",
   adSystemTitle: "ldnd5e.adSystemTitle",
   arSystemTitle: "ldnd5e.arSystemTitle",

   sheetTitle: "ldnd5e.sheetTitle",
   pcsLabel: "ldnd5e.pcsLabel",
   armorLabel: "ldnd5e.armorLabel",
   shieldLabel: "ldnd5e.shieldLabel",
   itemOwner: "ldnd5e.itemOwner",
   ownerLan: "ldnd5e.ownerLan",
   ownerLdo: "ldnd5e.ownerLdo",
   damageSystem: "ldnd5e.damageSystem",
   noArmorName: "ldnd5e.noArmorName",

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

   arControlTitle: "ldnd5e.arControlTitle",

   dlControlTitle: "ldnd5e.dlControlTitle",
   dlControlItemLabel: "ldnd5e.dlControlItemLabel",
   dlControlDamageType: "ldnd5e.dlControlDamageType",
   dlControlACPenalty: "ldnd5e.dlControlACPenalty",
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

   cControlTitle: "ldnd5e.cControlTitle",

   cControlLightList: "ldnd5e.cControlLightList",
   cControlHeavyList: "ldnd5e.cControlHeavyList",
   cControlSpecialList: "ldnd5e.cControlSpecialList",

   fatigueDialogTitle: "ldnd5e.fatigueDialogTitle",
   fatigueDialogRollBtn: "ldnd5e.fatigueDialogRollBtn",

   activeEffectLabel: "ldnd5e.activeEffectLabel",
   activeEffectShieldLabel: "ldnd5e.activeEffectShieldLabel",

   extraConditions: "ldnd5e.extraConditions",
   bleedCondition: "ldnd5e.bleedCondition",
   bleedingLabel: "ldnd5e.bleedingLabel",
   bleedFooter: "ldnd5e.bleedFooter",
   stunCondition: "ldnd5e.stunCondition",
   stunLabel: "ldnd5e.stunLabel",
   stunFooter: "ldnd5e.stunFooter",
   specialCondition: "ldnd5e.specialCondition",
   specialLabel: "ldnd5e.specialLabel",
   specialFooter: "ldnd5e.specialFooter",
   disableConditions: "ldnd5e.disableConditions",

   addBtn: "ldnd5e.addBtn",
   halfBtn: "ldnd5e.halfBtn",
   subBtn: "ldnd5e.subBtn",
   zerarBtn: "ldnd5e.zerarBtn",

   yesBtn: "ldnd5e.yesBtn",
   noBtn: "ldnd5e.noBtn",
   saveBtn: "ldnd5e.saveBtn",
   cancelBtn: "ldnd5e.cancelBtn",

   damageTypes: {
      pierc: "ldnd5e.damageTypes.pierc",
      slsh: "ldnd5e.damageTypes.slsh",
      bldg: "ldnd5e.damageTypes.bldg"
   },

   dcLabel: "ldnd5e.dcLabel",

   itemDestroyed: "ldnd5e.itemDestroyed",
   groupRolls: "ldnd5e.groupRolls",

   army: {
      prestige: "ldnd5e.army.prestige",
      commander: "ldnd5e.army.commander",
      noCommander: "ldnd5e.army.noCommander",
      removeCommander: "ldnd5e.army.removeCommander",
      supplies: "ldnd5e.army.supplies",
      companies: "ldnd5e.army.companies",
   },

   company : {
      commander: "ldnd5e.company.commander",
      removeCommander: "ldnd5e.company.removeCommander",
      noCommander: "ldnd5e.company.noCommander",
      rest: "ldnd5e.company.rest",
   },

   unit: {
      category: "ldnd5e.unit.category",
      categoryDescription: "ldnd5e.unit.categoryDescription",
      description: "ldnd5e.unit.description",
      price: "ldnd5e.unit.price",
      combat: "ldnd5e.unit.combat",
      tatics: "ldnd5e.unit.tatics",
      configureCategory: "ldnd5e.unit.configureCategory",
      removeTatic: "ldnd5e.unit.removeTatic",
      isTrainning: "ldnd5e.unit.isTrainning"
   },

   tatics: {
      flavor: "ldnd5e.tatics.flavor",
      description: "ldnd5e.tatics.description",
      impetus: "ldnd5e.tatics.impetus",
      prep: "ldnd5e.tatics.prep",
      surp: "ldnd5e.tatics.surp",
      reac: "ldnd5e.tatics.reac",
      pers: "ldnd5e.tatics.pers",
      trainning: "ldnd5e.tatics.trainning"      
   },

   unitType: "ldnd5e.unit",
   uTypes: {
      light: "ldnd5e.uTypes.light",
      heavy: "ldnd5e.uTypes.heavy",
      special: "ldnd5e.uTypes.special",
      medical: "ldnd5e.uTypes.medical",
   },
   uAbilities: {
      frt: "ldnd5e.uAbilities.frt",
      mrl: "ldnd5e.uAbilities.mrl",
      wll: "ldnd5e.uAbilities.wll",
   },
   uCombat: {
      dsp: "ldnd5e.uCombat.dsp",
      enc: "ldnd5e.uCombat.enc",
      def: "ldnd5e.uCombat.def",
   },

   categories: {
      arcanists: "ldnd5e.categories.arcanists",
      devotees: "ldnd5e.categories.devotees",
      fighters: "ldnd5e.categories.fighters",
      specialists: "ldnd5e.categories.specialists",
   },

   messages: {
      bldgDmgLightArmor: "ldnd5e.messages.bldgDmgLightArmor",
      slshDmgHeavyArmor: "ldnd5e.messages.slshDmgHeavyArmor",
      halDmgShield: "ldnd5e.messages.halDmgShield",
      newDLMessage: "ldnd5e.messages.newDLMessage",
      maxDLMessage: "ldnd5e.messages.maxDLMessage",
      fithDLMessage: "ldnd5e.messages.fithDLMessage",
      sixthDLMessage: "ldnd5e.messages.sixthDLMessage",
      itemDestroyed: "ldnd5e.messages.itemDestroyed",
      repairToExpensive: "ldnd5e.messages.repairToExpensive",
      repairMessage: "ldnd5e.messages.repairMessage",
      reconstructedMessage: "ldnd5e.messages.reconstructedMessage",
      noTool: "ldnd5e.messages.noTool",
      repairFailed: "ldnd5e.messages.repairFailed",

      arControlLabel: "ldnd5e.messages.arControlLabel",
      arControlLabelObs: "ldnd5e.messages.arControlLabelObs",
      arMaxedOut: "ldnd5e.messages.arMaxedOut",

      fatigueMessage: "ldnd5e.messages.fatigueMessage",
      maxFatigueMessage: "ldnd5e.messages.tofatiguedMessage",
      fatigueGained: "ldnd5e.messages.fatigueGained",
      fatigueLost: "ldnd5e.messages.fatigueLost",

      addUnitTitle: "ldnd5e.messages.addUnitTitle",
      addUnitLabel: "ldnd5e.messages.addUnitLabel",
      dismissUnitTitle: "ldnd5e.messages.dismissUnitTitle",
      dismissUnitLabel: "ldnd5e.messages.dismissUnitLabel",

      noActiveCombat: "ldnd5e.messages.noActiveCombat",
      nonCobatantActor: "ldnd5e.messages.nonCobatantActor",

      noBothEffects: "ldnd5e.messages.noBothEffects",
      noArmorEffect: "ldnd5e.messages.noArmorEffect",
      noShieldEffect: "ldnd5e.messages.noShieldEffect",
      noEffectErrors: "ldnd5e.messages.noEffectErrors"
   },

   settings: {
      hideFromGMName: "ldnd5e.settings.hideFromGMName",
      hideFromGMHint: "ldnd5e.settings.hideFromGMHint",
      criticalName: "ldnd5e.settings.criticalName",
      criticalHint: "ldnd5e.settings.criticalHint",
      massCombatName: "ldnd5e.settings.massCombatName",
      massCombatHint: "ldnd5e.settings.massCombatHint",
      exhaustionName: "ldnd5e.settings.exhaustionName",
      exhaustionHint: "ldnd5e.settings.exhaustionHint"
   }
};

const feats = {

};

const gmControl =
{
   name: constants.moduleName,
   title: i18nStrings.title,
   icon: 'fas fa-shield-alt',
   visible: true,
   button: true
};

export { constants, UnarmoredClasses, NDs, gmControl, i18nStrings, unitChoices, taticsChoices };

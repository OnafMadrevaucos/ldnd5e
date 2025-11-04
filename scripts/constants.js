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

   controls: {
      ac: 'ac',
      battle: 'battle'
   },

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
* Defines the Supplies constants.
*
* @enum {{
*    sources: Object<string>,
*    sourcesValues: Object<number>,
*    sourcesImg: Object<string>
* }}
*/
const suppliesData = {
   /**
   * Defines the Supplies Sources constants.      
   */
   sources: {
      food: {
         farmI: 'farmI',
         farmII: 'farmII',
         farmIII: 'farmIII',
         farmIV: 'farmIV',
         meatI: 'meatI',
         meatII: 'meatII',
         meatIII: 'meatIII',
         meatIV: 'meatIV'
      },
      water: {
         wellI: 'wellI',
         wellII: 'wellII',
         wellIII: 'wellIII',
         wellIV: 'wellIV',
         riverI: 'riverI',
         riverII: 'riverII',
         riverIII: 'riverIII',
         riverIV: 'riverIV',
         riverV: 'riverV'
      },
      urban: {
         cityI: 'cityI',
         cityII: 'cityII',
         cityIII: 'cityIII',
         cityIV: 'cityIV',
         cityV: 'cityV'
      }
   },

   sourcesValues: {
      food: {
         farmI: 0.2,
         farmII: 0.5,
         farmIII: 3,
         farmIV: 5,
         meatI: 0.33,
         meatII: 1,
         meatIII: 4,
         meatIV: 5
      },
      water: {
         wellI: 1,
         wellII: 2,
         wellIII: 3,
         wellIV: 4,
         riverI: 1,
         riverII: 2,
         riverIII: 3,
         riverIV: 4,
         riverV: 5
      },
      urban: {
         cityI: 1,
         cityII: 2,
         cityIII: 4,
         cityIV: 6,
         cityV: 8
      }
   },

   sourcesImg: {
      food: {
         farmI: 'modules/ldnd5e/ui/supplies/farmI.webp',
         farmII: 'modules/ldnd5e/ui/supplies/farmII.webp',
         farmIII: 'modules/ldnd5e/ui/supplies/farmIII.webp',
         farmIV: 'modules/ldnd5e/ui/supplies/farmIV.webp',
         meatI: 'modules/ldnd5e/ui/supplies/meatI.webp',
         meatII: 'modules/ldnd5e/ui/supplies/meatII.webp',
         meatIII: 'modules/ldnd5e/ui/supplies/meatIII.webp',
         meatIV: 'modules/ldnd5e/ui/supplies/meatIV.webp'
      },
      water: {
         wellI: 'modules/ldnd5e/ui/supplies/wellI.webp',
         wellII: 'modules/ldnd5e/ui/supplies/wellII.webp',
         wellIII: 'modules/ldnd5e/ui/supplies/wellIII.webp',
         wellIV: 'modules/ldnd5e/ui/supplies/wellIV.webp',
         riverI: 'modules/ldnd5e/ui/supplies/riverI.webp',
         riverII: 'modules/ldnd5e/ui/supplies/riverII.webp',
         riverIII: 'modules/ldnd5e/ui/supplies/riverIII.webp',
         riverIV: 'modules/ldnd5e/ui/supplies/riverIV.webp',
         riverV: 'modules/ldnd5e/ui/supplies/riverV.webp'
      },
      urban: {
         cityI: 'modules/ldnd5e/ui/icons/supplies/cityI.webp',
         cityII: 'modules/ldnd5e/ui/icons/supplies/cityII.webp',
         cityIII: 'modules/ldnd5e/ui/icons/supplies/cityIII.webp',
         cityIV: 'modules/ldnd5e/ui/icons/supplies/cityIV.webp',
         cityV: 'modules/ldnd5e/ui/icons/supplies/cityV.webp',
      }
   }
}

/**
* Defines the Army constants.
*
* @enum {{
*    sizes: object,
*    needs: object
* }}
*/
const armyData = {
   sizes: {
      tiny: 0,
      sm: 1,
      med: 2,
      lg: 3,
      huge: 4,
      grg: 5
   },

   needs: {
      tiny: 5,
      sm: 10,
      med: 15,
      lg: 20,
      huge: 25,
      grg: 30
   }
}

/**
* Defines the Unit constants.
*
* @enum {{
*    uTypes: object, 
*    uAbilities: object,
*    uCombatIcons: object
*    categories: object,
*    uProfLevel: object,
*    uLevelProf: object,
*    basicAtk: object
* }}
*/
const unitData = {
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
   * Defines the Unit's Proficiency Level constants.      
   */
   uProfLevel: {
      none: 0,
      low: 1,
      medium: 2,
      high: 3
   },

   /**
   * Defines the Unit's Level Label constants.      
   */
   uLevelProf: {
      0: 'none',
      1: 'low',
      2: 'medium',
      3: 'high'
   },

   /**
   * Defines the Unit Categories constants.      
   */
   categories: {
      arcanists: "arcanists",
      devotees: "devotees",
      fighters: "fighters",
      specialists: "specialists",
   },

   /**
   * Defines the Unit Categories constants.      
   */
   basicAtk: {
      low: {
         value: 4,
         formula: "1d4"
      },
      medium: {
         value: 6,
         formula: "1d6"
      },
      high: {
         value: 8,
         formula: "1d8"
      }
   }
}

/**
* Defines the Assets constants.
*
* @enum {{
*    activities: object, 
* }}
*/
const assetsData = {
   /**
   * Defines the Assets Types constants.      
   */
   types: {
      alch: "alch",
      cint: "cint",
      equp: "equp",
      intl: "intl"
   },

   /**
   * Defines the Assets Types icons.      
   */
   typesIcons: {
      alch: "ra ra-fizzing-flask",
      cint: "fas fa-eye-slash",
      equp: "ra ra-sword",
      intl: "fas fa-eye"
   },

   /**
    * Defines the Tatics Activity Icons constants.
    * */
   activityIcons: {
      md: {
         src: 'modules/ldnd5e/ui/icons/md.svg',
         svg: true
      },
      mh: {
         src: 'modules/ldnd5e/ui/icons/mh.svg',
         svg: true
      },
      ib: {
         src: 'modules/ldnd5e/ui/icons/ib.svg',
         svg: true
      },
      id: {
         src: 'modules/ldnd5e/ui/icons/id.svg',
         svg: true
      },
   }
}

/**
* Defines the Tatics constants.
*
* @enum {{
*    activities: object, 
* }}
*/
const taticsData = {
   /**
   * Defines the Tatics Activities constants.      
   */
   activities: {
      md: "md",
      mh: "mh",
      ib: "ib",
      id: "id",
   },

   /**
    * Defines the Tatics Activity Icons constants.
    * */
   activityIcons: {
      md: {
         src: 'modules/ldnd5e/ui/icons/md.svg',
         svg: true
      },
      mh: {
         src: 'modules/ldnd5e/ui/icons/mh.svg',
         svg: true
      },
      ib: {
         src: 'modules/ldnd5e/ui/icons/ib.svg',
         svg: true
      },
      id: {
         src: 'modules/ldnd5e/ui/icons/id.svg',
         svg: true
      },
   }
}

/**
* Defines the Battle constants.
*
* @enum {{
*     
* }}
*/
const battleData = {
   /**
   * Defines the Battle Stages constants.      
   */
   stages: {
      setup: {
         value: 'setup',
         label: 'ldnd5e.battle.stages.setup',
         icon: 'fas fa-cogs'
      },
      prep: {
         value: 'prep',
         label: 'ldnd5e.battle.stages.prep',
         icon: 'ra ra-tower'
      },
      started: {
         value: 'started',
         label: 'ldnd5e.battle.stages.started',
         icon: 'ra ra-crossed-swords'
      },
      endgame: {
         value: 'endgame',
         label: 'ldnd5e.battle.stages.endgame',
         icon: 'fas fa-skull'
      }
   },

   /**
   * Defines the Effects on Rows constants.      
   */
   rowEffects: {
      blizzard: 'blizzard',
      fog: 'fog',
      rain: 'rain',
   },

   /**
   * Defines the Effects on Rows constants.      
   */
   rowEffectsIcons: {
      blizzard: 'fa-snowflake',
      fog: 'fa-smog',
      rain: 'fa-cloud-showers-heavy',
   }
}

const i18nStrings = {
   titles: {
      ac: "ldnd5e.titles.ac",
      battle: "ldnd5e.titles.battle",
      settings: "ldnd5e.titles.settings",
   },

   saveChanges: "ldnd5e.saveChanges",
   resetData: "ldnd5e.resetData",

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

   supplies: {
      title: 'ldnd5e.supplies.title',
      config: 'ldnd5e.supplies.config',
      needs: 'ldnd5e.supplies.needs',
      food: 'ldnd5e.supplies.food',
      water: 'ldnd5e.supplies.water',
      urban: 'ldnd5e.supplies.urban',
      sources: {
         food: {
            farmI: 'ldnd5e.supplies.sources.food.farmI',
            farmII: 'ldnd5e.supplies.sources.food.farmII',
            farmIII: 'ldnd5e.supplies.sources.food.farmIII',
            farmIV: 'ldnd5e.supplies.sources.food.farmIV',
            meatI: 'ldnd5e.supplies.sources.food.meatI',
            meatII: 'ldnd5e.supplies.sources.food.meatII',
            meatIII: 'ldnd5e.supplies.sources.food.meatIII',
            meatIV: 'ldnd5e.supplies.sources.food.meatIV'
         },
         water: {
            wellI: 'ldnd5e.supplies.sources.water.wellI',
            wellII: 'ldnd5e.supplies.sources.water.wellII',
            wellIII: 'ldnd5e.supplies.sources.water.wellIII',
            wellIV: 'ldnd5e.supplies.sources.water.wellIV',
            riverI: 'ldnd5e.supplies.sources.water.riverI',
            riverII: 'ldnd5e.supplies.sources.water.riverII',
            riverIII: 'ldnd5e.supplies.sources.water.riverIII',
            riverIV: 'ldnd5e.supplies.sources.water.riverIV',
            riverV: 'ldnd5e.supplies.sources.water.riverV',
         },
         urban: {
            cityI: 'ldnd5e.supplies.sources.urban.cityI',
            cityII: 'ldnd5e.supplies.sources.urban.cityII',
            cityIII: 'ldnd5e.supplies.sources.urban.cityIII',
            cityIV: 'ldnd5e.supplies.sources.urban.cityIV',
            cityV: 'ldnd5e.supplies.sources.urban.cityV',
         }
      },
      noFood: 'ldnd5e.supplies.noFood',
      totalFood: 'ldnd5e.supplies.totalFood',
      noWater: 'ldnd5e.supplies.noWater',
      totalWater: 'ldnd5e.supplies.totalWater',
      armySize: 'ldnd5e.supplies.armySize',
      starving: 'ldnd5e.supplies.starving',
      urbanHint: 'ldnd5e.supplies.urbanHint'
   },

   army: {
      org: "ldnd5e.army.org",
      prestige: "ldnd5e.army.prestige",
      commander: "ldnd5e.army.commander",
      noCommander: "ldnd5e.army.noCommander",
      removeCommander: "ldnd5e.army.removeCommander",
      supplies: "ldnd5e.army.supplies",
      companies: "ldnd5e.army.companies",
      config: "ldnd5e.army.config"
   },

   company: {
      model: "ldnd5e.company.model",
      full: "ldnd5e.company.full",
      commander: "ldnd5e.company.commander",
      removeCommander: "ldnd5e.company.removeCommander",
      removeUnit: "ldnd5e.company.removeUnit",
      noCommander: "ldnd5e.company.noCommander",
      stamina: "ldnd5e.company.stamina",
      rest: "ldnd5e.company.rest",
      restRoll: "ldnd5e.company.restRoll",
      restResult: "ldnd5e.company.restResult",
      hasRestoration: "ldnd5e.company.hasRestoration",
      fatigueRest: "ldnd5e.company.fatigueRest",
      noRestTatics: "ldnd5e.company.noRestTatics",
      accounting: "ldnd5e.company.accounting",
      cost: {
         total: "ldnd5e.company.cost.total",
         units: "ldnd5e.company.cost.units",
         tatics: "ldnd5e.company.cost.tatics"
      },
      delete: "ldnd5e.company.delete",
   },

   unit: {
      model: "ldnd5e.unit.model",
      category: "ldnd5e.unit.category",
      categoryDescription: "ldnd5e.unit.categoryDescription",
      descriptionTitle: "ldnd5e.unit.descriptionTitle",
      flavor: "ldnd5e.unit.flavor",
      description: "ldnd5e.unit.description",      
      price: "ldnd5e.unit.price",
      combat: "ldnd5e.unit.combat",
      tatics: "ldnd5e.unit.tatics",
      configureCategory: "ldnd5e.unit.configureCategory",
      editTatic: "ldnd5e.unit.editTatic",
      removeTatic: "ldnd5e.unit.removeTatic",
      isTrainning: "ldnd5e.unit.isTrainning",
      trainningLoad: "ldnd5e.unit.trainningLoad",
      show: "ldnd5e.unit.show",
      delete: "ldnd5e.unit.delete",
      isMainRoll: "ldnd5e.unit.isMainRoll",
      deployed: "ldnd5e.unit.deployed",
      assetsTitle: "ldnd5e.unit.assetsTitle",
      assets: "ldnd5e.unit.assets",
      totalAssetsCost: "ldnd5e.unit.totalAssetsCost",
      removeAsset: "ldnd5e.unit.removeAsset",
      proficienciesHint: "ldnd5e.unit.proficienciesHint",
      basicAtk: "ldnd5e.unit.basicAtk",
   },

   assets: {
      type: "ldnd5e.assets.type",      
      types: {
         alch: "ldnd5e.assets.types.alch",
         cint: "ldnd5e.assets.types.cint",
         equp: "ldnd5e.assets.types.equp",
         intl: "ldnd5e.assets.types.intl"
      },
      qtd: "ldnd5e.assets.qtd",
      price: "ldnd5e.assets.price",
      charges: "ldnd5e.assets.charges",
   },

   events: {      
      attr: {
         baix: "ldnd5e.events.attr.baix",
         infr: "ldnd5e.events.attr.infr",
         limt: "ldnd5e.events.attr.limt",
         prep: "ldnd5e.events.attr.prep",
         imps: "ldnd5e.events.attr.imps"
      }
   },

   tatics: {
      flavor: "ldnd5e.tatics.flavor",
      description: "ldnd5e.tatics.description",
      impetus: "ldnd5e.tatics.impetus",
      prep: "ldnd5e.tatics.prep",
      surp: "ldnd5e.tatics.surp",
      reac: "ldnd5e.tatics.reac",
      pers: "ldnd5e.tatics.pers",
      trainning: "ldnd5e.tatics.trainning",
      damage: "ldnd5e.tatics.damage",
      configuration: "ldnd5e.tatics.configuration",
      details: {
         use: 'ldnd5e.tatics.details.use',
         minimumDie: 'ldnd5e.tatics.details.minimumDie',
         collectImpetus: 'ldnd5e.tatics.details.collectImpetus',
         impetusBonus: 'ldnd5e.tatics.details.impetusBonus',
         isStealth: 'ldnd5e.tatics.details.isStealth',
         stealthDC: 'ldnd5e.tatics.details.stealthDC',                 
         property: 'ldnd5e.tatics.details.property',
         passive: 'ldnd5e.tatics.details.passive', 
         single: 'ldnd5e.tatics.details.single',
         unique: 'ldnd5e.tatics.details.unique',
         giveBonus: 'ldnd5e.tatics.details.giveBonus',
         actions: 'ldnd5e.tatics.details.actions',
         actionsInfo: 'ldnd5e.tatics.details.actionsInfo',
         events: 'ldnd5e.tatics.details.events',
         eventsInfo: 'ldnd5e.tatics.details.eventsInfo',
         bonusTitle: 'ldnd5e.tatics.details.bonusTitle',
         bonus: {
            frt: 'ldnd5e.tatics.details.bonus.frt',
            mrl: 'ldnd5e.tatics.details.bonus.mrl',
            wll: 'ldnd5e.tatics.details.bonus.wll'
         }
      },
      invalidItem: "ldnd5e.tatics.invalidItem",
      removeAction: "ldnd5e.tatics.removeAction",
      removeEvent: "ldnd5e.tatics.removeEvent",
      confirmChanges: "ldnd5e.tatics.confirmChanges",
      activity: "ldnd5e.tatics.activity",
      activityTitle: "ldnd5e.tatics.activityTitle",
      activityType: "ldnd5e.tatics.activityType",
      activities: {
         md: "ldnd5e.tatics.activities.md",
         mh: "ldnd5e.tatics.activities.mh",
         ib: "ldnd5e.tatics.activities.ib",
         id: "ldnd5e.tatics.activities.id",
      },
      invalidActivity: {
         name: "ldnd5e.tatics.invalidActivity.name",
         type: "ldnd5e.tatics.invalidActivity.type",
         formula: "ldnd5e.tatics.invalidActivity.formula",
      },
      cr: {
         0: "ldnd5e.tatics.cr.0",
         1: "ldnd5e.tatics.cr.1",
         2: "ldnd5e.tatics.cr.2",
         3: "ldnd5e.tatics.cr.3",
         4: "ldnd5e.tatics.cr.4",
         5: "ldnd5e.tatics.cr.5",
      },
      clash: "ldnd5e.tatics.clash",
      useTatic: "ldnd5e.tatics.useTatic",
      mainRecovery: "ldnd5e.tatics.mainRecovery",
      mainRoll: "ldnd5e.tatics.mainRoll",
      acceptExtras: "ldnd5e.tatics.acceptExtras",      
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
   uProf: {
      van: "ldnd5e.uProf.van",
      res: "ldnd5e.uProf.res",
      rea: "ldnd5e.uProf.rea",
   },
   uProfLevel: {
      none: "ldnd5e.uProfLevel.none",
      low: "ldnd5e.uProfLevel.low",
      medium: "ldnd5e.uProfLevel.medium",
      high: "ldnd5e.uProfLevel.high",
   },

   battle: {
      world: 'ldnd5e.battle.world',
      stages: {
         setup: "ldnd5e.battle.stages.setup",
         prep: "ldnd5e.battle.stages.prep",
         started: "ldnd5e.battle.stages.started",
         endgame: "ldnd5e.battle.stages.endgame",
      },
      notification: {
         title: "ldnd5e.battle.notification.title",
         message: "ldnd5e.battle.notification.message",
         start: "ldnd5e.battle.notification.start",
      },
      fields: {
         top: "ldnd5e.battle.fields.top",
         bottom: "ldnd5e.battle.fields.bottom",
         enemy: "ldnd5e.battle.fields.enemy",
         ally: "ldnd5e.battle.fields.ally",
         both: "ldnd5e.battle.fields.both",
      },
      commander: 'ldnd5e.battle.commander',
      deck: "ldnd5e.battle.deck",
      openDeck: "ldnd5e.battle.openDeck",
      closeDeck: "ldnd5e.battle.closeDeck",
      hand: "ldnd5e.battle.hand",
      drawHand: "ldnd5e.battle.drawHand",
      shuffleDeck: "ldnd5e.battle.shuffleDeck",
      extraDecks: {
         full: "ldnd5e.battle.extraDecks.full",
         discarded: "ldnd5e.battle.extraDecks.discarded",
         assets: "ldnd5e.battle.extraDecks.assets",
         events: "ldnd5e.battle.extraDecks.events",
      },
      summary: "ldnd5e.battle.summary",
      units: "ldnd5e.battle.units",
      events: "ldnd5e.battle.events",
      eventHand: "ldnd5e.battle.eventHand",
      drawEvent: "ldnd5e.battle.drawEvent",
      rowsControl: "ldnd5e.battle.rowsControl",
      rowEffects: {
         blizzard: "ldnd5e.battle.rowEffects.blizzard",
         fog: "ldnd5e.battle.rowEffects.fog",
         rain: "ldnd5e.battle.rowEffects.rain",
      },
      reset: "ldnd5e.battle.reset",
      resetConfirm: "ldnd5e.battle.resetConfirm",
      resetOK: "ldnd5e.battle.resetOK",
      restoreCard: "ldnd5e.battle.restoreCard",
      restoreAllCards: "ldnd5e.battle.restoreAllCards",
      discardCard: "ldnd5e.battle.discardCard",
      extraRoll: {
         title: "ldnd5e.battle.extraRoll.title",
         message: "ldnd5e.battle.extraRoll.message",
         main: "ldnd5e.battle.extraRoll.main",
         extra: "ldnd5e.battle.extraRoll.extra",
      },
      targetField: "ldnd5e.battle.targetField",
      affinity: 'ldnd5e.battle.affinity',
   },

   categories: {
      arcanists: "ldnd5e.categories.arcanists",
      devotees: "ldnd5e.categories.devotees",
      fighters: "ldnd5e.categories.fighters",
      specialists: "ldnd5e.categories.specialists",
   },

   messages: {
      loadingAffinities: "ldnd5e.messages.loadingAffinities",

      bldgDmgLightArmor: "ldnd5e.messages.bldgDmgLightArmor",
      slshDmgHeavyArmor: "ldnd5e.messages.slshDmgHeavyArmor",
      halDmgShield: "ldnd5e.messages.halDmgShield",
      newDLMessage: "ldnd5e.messages.newDLMessage",
      maxDLMessage: "ldnd5e.messages.maxDLMessage",
      fithDLMessage: "ldnd5e.messages.fithDLMessage",
      sixthDLMessage: "ldnd5e.messages.sixthDLMessage",
      itemDestroyed: "ldnd5e.messages.itemDestroyed",
      itemUndamaged: "ldnd5e.messages.itemUndamaged",
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
      noEffectErrors: "ldnd5e.messages.noEffectErrors",

      invalidActorOnBattle: "ldnd5e.messages.invalidActorOnBattle",

      cannotStartBattle: "ldnd5e.messages.cannotStartBattle",
      emptyBattleData: "ldnd5e.messages.emptyBattleData",
      fullHand: "ldnd5e.messages.fullHand",
      emptyDeck: "ldnd5e.messages.emptyDeck",
      noMainActivity: "ldnd5e.messages.noMainActivity",

      startBattleTitle: "ldnd5e.messages.startBattleTitle",
      startBattle: "ldnd5e.messages.startBattle",
      restartBattleTitle: "ldnd5e.messages.restartBattleTitle",
      restartBattle: "ldnd5e.messages.restartBattle",
      endBattleTitle: "ldnd5e.messages.endBattleTitle",
      endBattle: "ldnd5e.messages.endBattle",
   },

   settings: {      
      criticalName: "ldnd5e.settings.criticalName",
      criticalHint: "ldnd5e.settings.criticalHint",
      massCombatName: "ldnd5e.settings.massCombatName",
      massCombatHint: "ldnd5e.settings.massCombatHint",
      massCombatConfigName: "ldnd5e.settings.massCombatConfigName",
      massCombatConfigHint: "ldnd5e.settings.massCombatConfigHint",
      extraConditionsName: "ldnd5e.settings.extraConditionsName",
      extraConditionsHint: "ldnd5e.settings.extraConditionsHint",
   }
};

const feats = {

};

const gmControl =
{
   name: constants.controls.ac,
   title: i18nStrings.titles.ac,
   icon: 'fas fa-shield-alt',
   visible: true,
   button: true
};

const battleControl = {
   name: constants.controls.battle,
   title: i18nStrings.titles.battle,
   icon: 'fas fa-chess',
   visible: true,
   button: true
};

export {
   constants,
   UnarmoredClasses,
   NDs,
   gmControl,
   battleControl, 
   i18nStrings, 

   suppliesData, 
   armyData, 
   unitData, 
   assetsData, 
   taticsData, 
   battleData
};

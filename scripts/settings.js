import SettingsApp from "../models/settingsApp.js";
import { i18nStrings, battleData } from "../scripts/constants.js";

export const registerSystemSettings = function () {
    // Critical Damage Modifiers
    game.settings.register("ldnd5e", "criticalDamageModifiers", {
        name: "ldnd5e.settings.criticalName",
        hint: "ldnd5e.settings.criticalHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        restricted: true
    });

    // Massive Combat Rules
    game.settings.register("ldnd5e", "massiveCombatRules", {
        name: "ldnd5e.settings.massCombatName",
        hint: "ldnd5e.settings.massCombatHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        restricted: true
    });

    // Massive Combat Rules Configuration Menu
    game.settings.registerMenu("ldnd5e", "massiveCombatConfig", {
        name: "ldnd5e.settings.massCombatConfigName",
        label: "ldnd5e.settings.massCombatConfigLabel",
        hint: "ldnd5e.settings.massCombatConfigHint",
        scope: "world",
        icon: "fas fa-cogs",
        config: true,
        type: SettingsApp,
        restricted: true
    });

    // Weapons Special Effects
    game.settings.register("ldnd5e", "weaponsSpecialEffects", {
        name: "ldnd5e.settings.extraConditionsName",
        hint: "ldnd5e.settings.extraConditionsHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        restricted: true
    });

    // Units Affinity data.
    game.settings.register("ldnd5e", "affinity", {
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    // Local battle data.
    game.settings.register("ldnd5e", "appState", {        
        scope: "client",
        config: false,
        type: Object,
        default: {
            mode: 0, // 'PLAY' Mode.
            state: {
                sidebar: {
                    control: false,
                    viewer: '',
                    events: false,
                    eventsDeck: false,
                    tabs: false,
                    overlay: false
                },
                currentCompanyIdx: 0
            }
        }
    });

    // Global battle data.
    game.settings.register("ldnd5e", "battle", {        
        scope: "world",
        config: false,
        type: Object,
        default: {
            application: null,
            stage: battleData.stages.setup,
            scoreboard: {
                top: {
                    attack: 0,
                    impetus: 0
                },
                bottom: {
                    attack: 0,
                    impetus: 0
                }
            },
            turns: {
                max: 0,
                current: 0
            },
            events: {
                active: null,
                list: []
            },
            armies: {
                top: [],
                bottom: []
            },
            sides: {
                top: [],
                bottom: []
            },
            fields: {
                top: {
                    rows: {
                        1: {
                            units: [],
                            effect: ''
                        },
                        2: {
                            units: [],
                            effect: ''
                        },
                        3: {
                            units: [],
                            effect: ''
                        }
                    }
                },
                bottom: {
                    rows: {
                        1: {
                            units: [],
                            effect: ''
                        },
                        2: {
                            units: [],
                            effect: ''
                        },
                        3: {
                            units: [],
                            effect: ''
                        }
                    }
                }
            }
        }
    });
}
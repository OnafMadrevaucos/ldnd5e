import { i18nStrings, battleData } from "../scripts/constants.js";

export const registerSystemSettings = function () {
    // Critical Damage Modifiers
    game.settings.register("ldnd5e", "criticalDamageModifiers", {
        name: "ldnd5e.settings.criticalName",
        hint: "ldnd5e.settings.criticalHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    // Massive Combat Rules
    game.settings.register("ldnd5e", "massiveCombatRules", {
        name: "ldnd5e.settings.massCombatName",
        hint: "ldnd5e.settings.massCombatHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    // Weapons Special Effects
    game.settings.register("ldnd5e", "weaponsSpecialEffects", {
        name: "ldnd5e.settings.extraConditionsName",
        hint: "ldnd5e.settings.extraConditionsHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    // Global battle data.
    game.settings.register("ldnd5e", "battle", {
        name: "ldnd5e.settings.battleDataName",
        hint: "ldnd5e.settings.battleDataHint",
        scope: "world",
        config: false,
        type: Object,
        default: {
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
            events: [],
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
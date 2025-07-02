import { i18nStrings } from "../scripts/constants.js";

export const registerSystemSettings = function() {

    const reload = foundry.utils.debounce(() => window.location.reload(), 250);

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

    // One D&D New Exhaustion Rule
    game.settings.register("ldnd5e", "oneDNDExhaustionRule", {
        name: "ldnd5e.settings.exhaustionName",
        hint: "ldnd5e.settings.exhaustionHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    // Critical Damage Modifiers
    game.settings.register("ldnd5e", "weaponsSpecialEffects", {
        name: "ldnd5e.settings.extraConditionsName",
        hint: "ldnd5e.settings.extraConditionsHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
}
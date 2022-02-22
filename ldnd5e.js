import ItemL5e from "./classes/ItemL5e.js";
import ActorL5e from "./classes/ActorL5e.js";

import ActorSheetL5e from "./classes/sheets/ActorSheetL5e.js";

import ActorSheet5eCharacter from "../../../systems/dnd5e/module/actor/sheets/character.js";
import ActorSheetL5eCharacter from "./classes/sheets/ActorSheetL5eCharacter.js";

import * as templates from "./scripts/templates.js";

Hooks.once("init", function() {
    console.log("LDnD5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

    // Register sheet application classes
    //Actors.unregisterSheet("dnd5e", ActorSheet5eCharacter);
    //Actors.registerSheet("dnd5e", ActorSheetL5eCharacter, {
    //    types: ["character"],
    //    makeDefault: true,
    //   label: "DND5E.SheetClassCharacter" + " (L)"
    //});
});

Hooks.on(`renderActorSheet`, (app, html, data) => {

});


Hooks.on(`renderItemSheet`, (app, html, data) => {

    const d = data;
});
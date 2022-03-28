import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { Debugger } from "./scripts/helpers.js";
import { preloadTemplates } from "./scripts/templates.js";

import { gmControl } from "./scripts/constants.js";
import adControl from "./models/adControl.js";

import ActorSheet5eCharacter from "../../systems/dnd5e/module/actor/sheets/character.js";
import ActorSheetL5eCharacter from "./models/sheets/ActorSheetL5eCharacter.js";


Hooks.once("init", function() {
    console.log("LDnD5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

    // Register sheet application classes
    Actors.unregisterSheet("dnd5e", ActorSheet5eCharacter);
    Actors.registerSheet("dnd5e", ActorSheetL5eCharacter, {
        types: ["character"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });

    preloadTemplates();

    Handlebars.registerHelper('debug', Debugger);
});

Hooks.on(`renderActorSheet`, (app, html, data) => {

});

Hooks.on('getSceneControlButtons', (controls) => {

    if (game.user.isGM)
    {  
        gmControl[0].onClick = renderControl;

        const token = controls.find((c) => c.name === 'token');
        if (token) { token.tools.push(...gmControl); }
    }
});

function renderControl()
{
    //const data = adControl.computePCArmorData();
    const form = new adControl();
    
    return form.render(true);
}
import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { preloadTemplates } from "./scripts/templates.js";

import { constants, gmControl } from "./scripts/constants.js";


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
    preloadTemplates();
});

Hooks.on(`renderItemSheet`, (app, html, data) => {

    // Get the Item's data
    const itemData = data.item.data;


    if ( data.item.type === "equipment" ) {
        let l = '<ol class="properties-list"><li>';
        for(let i = 0; i < itemData.armor.RealDL; ++i) {
            l += '<i class="fas fa-shield-alt"></i>';
        }
        l += "</li></ol>";

        let prop = html.find('.item-properties');
        prop.append(l);
    }
});

Hooks.on('getSceneControlButtons', (controls) => {

    if (game.user.isGM)
    {
        const token = controls.find((c) => c.name === 'token');
        if (token) { token.tools.push(...gmControl); }
    }
});
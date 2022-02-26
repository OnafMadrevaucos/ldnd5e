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

    // Update the nav menu
    let lanLabel = $('<span class="spell-dc"> / Lan ' + data.data.attributes.ac.lan.toString() + '</span>');
    let lanSpan = html.find('.spell-dc');
    lanSpan.append(lanLabel);
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
import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { Debugger } from "./scripts/helpers.js";
import { preloadTemplates } from "./scripts/templates.js";

import { gmControl } from "./scripts/constants.js";
import adControl from "./models/adControl.js";


Hooks.once("init", function() {
    console.log("LDnD5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

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
    const data = computePCArmorData();
    const form = new adControl(data);
    
    return form.render(true);
}

function computePCArmorData() {

    const data = {
        armor: { label: "ldnd5e.armorLabel", items: [], owner: {}, tipoShield: false, dataset: {type: "equipament", subtype: "", armorType: ""} },
        shield: { label: "ldnd5e.shieldLabel", items: [], owner: {}, tipoShield: true, dataset: {type: "equipament", subtype: "", armorType: ""} }
    };

    for(let actor of game.actors) {
        if(actor.type == "character") {

            let [items] = actor.items.reduce((arr, item) => {

                if(item.type === "equipment") {
                    item.owner = actor;
                    item.armorType = item.data.data.armor.type;  
                    item.subtype =  (item.armorType === "shield" ? "shield" : "armor");                     
                    arr[0].push(item); 
                }
                return arr;
            }, [[]]);

            // Organize items
            for ( let i of items ) {             
                data[i.subtype].items.push(i);
            }
        }
    }

    return data;
}
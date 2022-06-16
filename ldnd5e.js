import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { Debugger } from "./scripts/helpers.js";
import { preloadTemplates } from "./scripts/templates.js";

import { constants, gmControl } from "./scripts/constants.js";
import adControl from "./models/adControl.js";

import * as ars from "./scripts/ARSystem.js";

import ActorSheetL5eCharacter from "./models/sheets/ActorSheetL5eCharacter.js";
import { ActorSheet5eCharacter as ActorSheetBR} from "../dnd5e_pt-BR/main.js";

Hooks.once("init", function() {
    console.log("LDnD5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

    // Verifica se o D&D 5E Português BR está atuivo ou não, para decidir qual Sheet o sistema deve Importar.
    if(game.modules.get('dnd5e_pt-BR')?.active) {
        constants.ActorSheet5eCharacter = ActorSheetBR;
    } 

    preloadTemplates();

    Handlebars.registerHelper('debug', Debugger);
});

Hooks.once('ready', () => {
    // Verifica se algums módulos necessários estão ativos.
    if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
        ui.notifications.error("LD&D 5e necessita do módulo 'libWrapper'. Favor instalá-lo e ativá-lo.");  

    if (!game.settings.get('dice-calculator', 'enableDiceTray')) {
        ui.notifications.error("LD&D 5e necessita do módulo 'Dice Tray'. Favor instalá-lo e ativá-lo."); 
        return;
    }  
        
    // Registra a nova classe de ActorSheet na Application.
    Actors.registerSheet("dnd5e", ActorSheetL5eCharacter, {
        types: ["character"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });

    Hooks.on("renderCombatTracker", async (app, html, data) => {
        // Sair se não tiver Combates ativos.
        if (!data.combat) return;
    
        // Create groups
        ars.manageGroups(app.popOut);
    });
    
    // Re-render the combat tracker in case the initial render was missed
    ui.combat.render(true);
});

Hooks.on('renderActorSheet', (app, html, data) => {
    const actor = app.actor;
    const isActorL5e = actor.getFlag("ldnd5e", "L5eConfigured");

    if(isActorL5e != undefined && (!isActorL5e && ["character"].includes(actor.type))) actor.configL5e();   
    if (!game.user.isGM) hideEffects(actor, html);    
});

Hooks.on('getSceneControlButtons', (controls) => {

    if (game.user.isGM)
    {  
        gmControl[0].onClick = renderControl;

        const token = controls.find((c) => c.name === 'token');
        if (token) { token.tools.push(...gmControl); }
    }
});  

/** ---------------------------------------------------- */
/** Funções Internas                                     */
/** ---------------------------------------------------- */
function renderControl()
{
    // Cria um instância do Controle de Dano Absorvido
    const form = new adControl();
    
    return form.render(true);
}

/**
 * Esconde os controle dos efeitos do Ator.
 * 
 * @param {object} actor    Ator que terá os efeitos escondido. 
 * @param {html} html       Tela de ActorSheet.
 */
function hideEffects(actor, html) {
    //Recupera as Flags dos Efeitos de Armadura e Escudo.
    const armorFlag = actor.getFlag("ldnd5e", "armorEffect");
    const shieldFlag = actor.getFlag("ldnd5e", "shieldEffect");

    //Procura os efeitos 
    const effects = html.find('.effect');
    for(var effect of effects) {
        if(effect.dataset.effectId === armorFlag.effectID || effect.dataset.effectId === shieldFlag.effectID) {
            effect.draggable = false;
            const control = effect.getElementsByClassName("effect-controls");
            const btns = control[0].getElementsByClassName("effect-control");
            Array.from(btns).forEach((value) => {value.hidden = true;});
        }
    }
}


import { DND5E } from "../../../systems/dnd5e/dnd5e.mjs";
import cControl from "../models/companyControl.js";

/**
 * Adiciona à ficha do Actor as Parts que compõem as Regras de Combate Massivo.
 * 
 * @param {object} actor    Ator que terá a Sheet alterada. 
 * @param {html} html       Tela de ActorSheet.
 */
 export const addMassiveCombatParts = function(actor, html) {    
    const centerPane = html.find('.center-pane');
    const traitsDiv = html.find('.traits');    
    const cmdDiv = document.createElement("div");
    cmdDiv.classList.add("counters");
    cmdDiv.classList.add("commander-control");
    cmdDiv.dataset.actorId = actor.id;

    const div = document.createElement("div");
    div.classList.add("counter");
    div.classList.add("flexrow");
    div.classList.add("commander");

    const label = (["npc"].includes(actor.type) ? "Unidade Militar" : "Comandante");
    
    const h4 = document.createElement("h4");
    h4.innerHTML = label;
    div.appendChild(h4);

    const checkClass = (["npc"].includes(actor.type) ? "unit-check" : "commander-check");
    const attribute = (["npc"].includes(actor.type) ? "system.isUnit" : "system.commander");

    const valueDiv = document.createElement("div");
    valueDiv.classList.add("counter-value");    
    const input = document.createElement("input");
    input.classList.add(checkClass);
    input.setAttribute('type', 'checkbox');
    input.setAttribute('name', attribute);    
    input.setAttribute('data-dtype', 'Boolean');   
    input.checked = (["npc"].includes(actor.type) ? actor.system.isUnit : actor.system.commander);
    valueDiv.appendChild(input);
    div.appendChild(valueDiv);
    cmdDiv.appendChild(div)

    traitsDiv.remove();
    centerPane[0].appendChild(cmdDiv);
    centerPane[0].appendChild(traitsDiv[0]);

    const i = 0;
}

/**
 * Adiciona à ficha do Actor do Personagem a Section de Comandante.
 * 
 * @param {object} actor    Ator que terá a Sheet alterada. 
 * @param {html} html       Tela de ActorSheet.
 * @param {app} app         Instância atual da ActorSheet.
 */
export const setCommanderSection = function(html, app) {
    const div = html.find(".commander-control");
    const h4 = document.createElement("h4");
    h4.classList.add("company");
    h4.classList.add("box-title");
    h4.classList.add("rollable");
    h4.innerHTML = "Abrir Companhia";
    h4.onclick = _onCompanyClick;    
    div[0].appendChild(h4);
}

async function _onCompanyClick(event){
    event.preventDefault();
    const actorID = event.currentTarget.closest(".commander-control").dataset.actorId;
    const actor = game.actors.get(actorID);

    // Cria um instância do Controle de Companhias Militares
    const form = new cControl(actor);

    if (game.modules.get('rpg-styled-ui')?.active) {
        form.options.classes.push("dnd5e", "sheet", "actor");
    }
    
    return form._render(true);
}
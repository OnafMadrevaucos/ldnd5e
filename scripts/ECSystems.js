import { constants, i18nStrings } from "./constants.js";
import { dice } from "../../../../systems/dnd5e/dnd5e.mjs";
/**
 * Adiciona à ficha do Item da Arma a opção de Condições Especiais.
 * 
 * @param {object} item     Item que terá a Sheet alterada. 
 * @param {html} html       Tela de ItemSheet.
 * @param {app} app         Instância atual da ItemSheet.
 */
export const addWeaponSpecialEffects = async function(data, html, app) {    
    const wpnProp = html.find('.weapon-properties')[0]; 
    const item = data.item;

    const request = new XMLHttpRequest();
    request.open('GET', constants.templates.specialConditions, false);  // `false` makes the request synchronous
    request.send(null);

    var htmlTxt = request.responseText;
    htmlTxt = htmlTxt.replaceAll("#header-text", game.i18n.localize(i18nStrings.extraConditions));
    htmlTxt = htmlTxt.replaceAll("#bleed-label", game.i18n.localize(i18nStrings.bleedCondition));
    htmlTxt = htmlTxt.replaceAll("#stun-label", game.i18n.localize(i18nStrings.stunCondition));

    // Item pertence a um Actor.
    if(item.actor != null)
        htmlTxt = htmlTxt.replaceAll("#actor-id", item.actor._id);
    else
        htmlTxt = htmlTxt.replaceAll("#actor-id", "");

    htmlTxt = htmlTxt.replaceAll("#item-id", data.data._id);
    
    const bleedFlag = item.getFlag('ldnd5e', 'bleed');
    const stunFlag = item.getFlag('ldnd5e', 'stun');

    if(bleedFlag == null) await item.setFlag('ldnd5e', 'bleed', 0);
    if(stunFlag == null) await item.setFlag('ldnd5e', 'stun', 0);

    htmlTxt = htmlTxt.replaceAll("#bleed-value", bleedFlag);
    htmlTxt = htmlTxt.replaceAll("#stun-value", stunFlag);
    
    wpnProp.insertAdjacentHTML('afterend', htmlTxt);

    html.find('.condition-control').change(async (ev) => {
        ev.preventDefault();
        const input = ev.currentTarget;
        const actorId = input.dataset.actorId;
        const actor = game.actors.get(actorId);
        const itemId = input.dataset.itemId;
        const item = (actor ? actor.items.get(itemId) :  game.items.get(itemId));

        if(input.classList.contains('bleed')){
            await item.setFlag('ldnd5e', 'bleed', Number(input.value));
        }
        if(input.classList.contains('stun')){
            await item.setFlag('ldnd5e', 'stun', Number(input.value));
        }
    });
}

export const patchRollDamageType = async function(item, rollData) {
    const damageData = rollData.data.item.damage;
    const rollTerms = [...rollData.terms];
    var i = 0;

    for(const term of rollTerms) {
        term.idx = i++;
    }

    for(const damage of damageData.parts) {
        const partialRoll = new dice.DamageRoll(damage[0], rollData.data);
        const type = damage[1];
        for(const term of partialRoll.terms) {
            if(!(term instanceof Die)) continue; // Só termos do tipo 'Die' importam.

            for(var i = 0; i < rollTerms.length; i++) {
                if(!(rollTerms[i] instanceof Die)) { // Só termos do tipo 'Die' importam.
                    rollTerms.splice(i, 1); // Retira item indesejado.
                    i--; // Volta o indicador uma posição para compensar o item removido.

                    continue;
                } 
                
                if(term.formula == rollTerms[i].formula) {
                    rollData.terms[rollTerms[i].idx].dmgType = type;
                    rollTerms.splice(i, 1);

                    break;  // O termo já foi encontrado, passe para o próximo.
                }   
            }
        }       
    }
}

export const patchRollDamage = async function(item, rollData) {
    var causedBleeding = false;
    var hasStunned = false;

    const bleedFlag = item.getFlag('ldnd5e', 'bleed');
    const stunFlag = item.getFlag('ldnd5e', 'stun');

    if((bleedFlag != null) && (stunFlag != null)) {
        for(var term of rollData.terms) {
            if(!(term instanceof Die)) continue;            
            for(var result of term.results) {
                if(term.dmgType == "bludgeoning" && result.result >= stunFlag) {
                    hasStunned = true;
                    break;
                }
                else if (term.dmgType == "slashing" && result.result >= bleedFlag) {
                    causedBleeding = true;                    
                    break;
                }
            }
        }
    } 
    
    item.system.causedBleeding = causedBleeding;
    item.system.hasStunned = hasStunned;
}

export const patchChatMessage = async function(message, html, messageData) {
    const actorId = message.speaker.actor;
    const actor = game.actors.get(actorId);

    const rollFlag = message.getFlag("dnd5e", "roll");
    const item = actor.items.get(rollFlag?.itemId); 

    const content = html.find('.message-content')[0];
    
    if (content.querySelector('.dice-roll') !== null && rollFlag.type == 'damage') {
        const itemData = item?.system;

        var causedBleeding = message.getFlag("ldnd5e", "causedBleeding");
        if(causedBleeding == null) {
            await message.setFlag("ldnd5e", "causedBleeding", (itemData?.causedBleeding ?? false));
            causedBleeding = false;
        }
        var hasStunned = message.getFlag("ldnd5e", "hasStunned");
        if(hasStunned == null) {
            await message.setFlag("ldnd5e", "hasStunned", (itemData?.hasStunned ?? false));
            hasStunned = false;
        }    
        const footer = document.createElement("footer");
        footer.classList.add("extra-conditions");

        if(causedBleeding) {
            
            const a = document.createElement("a");    
            const i = document.createElement("i");
            i.classList.add("fas");
            i.classList.add("fa-droplet");
            a.appendChild(i);
            const span = document.createElement("span");    
            span.textContent = game.i18n.localize(i18nStrings.bleedingLabel);
            footer.appendChild(a);
            footer.appendChild(span);

            content.appendChild(footer);
        }

        if(hasStunned) {
            const a = document.createElement("a");    
            const i = document.createElement("i");
            i.classList.add("fas");
            i.classList.add("fa-spinner");
            a.appendChild(i);
            const span = document.createElement("span");    
            span.textContent = game.i18n.localize(i18nStrings.stunLabel);
            footer.appendChild(a);
            footer.appendChild(span);

            content.appendChild(footer);
        }
    }
}
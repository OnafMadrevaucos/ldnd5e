import { constants, i18nStrings } from "./constants.js";
import { dice } from "../../../../systems/dnd5e/dnd5e.mjs";
/**
 * Adiciona à ficha do Item da Arma a opção de Condições Especiais.
 * 
 * @param {object} item     Item que terá a Sheet alterada. 
 * @param {html} html       Tela de ItemSheet.
 * @param {app} app         Instância atual da ItemSheet.
 */
export const addWeaponSpecialEffects = async function (data, html, app) {
    const wpnProp = html.querySelector('.details.tab');
    const item = data.item;
    const baseDmg = item.system.damage.base;

    const disabled = app._mode == 1;

    const owner = item.actor;
    const ownerID = owner ? (owner.token ? owner.token._id : owner._id) : "";

    const rollFormula = new Roll(baseDmg.formula);
    const terms = rollFormula?.terms ?? [];

    let maxDmg = 0;
    terms.forEach(term => {
        if (term instanceof Die && term.faces > maxDmg) {
            maxDmg = term.faces;
        }
    });

    const bleedFlag = item.getFlag('ldnd5e', 'bleed');
    const stunFlag = item.getFlag('ldnd5e', 'stun');
    const specialFlag = item.getFlag('ldnd5e', 'special');

    if (bleedFlag == null) await item.setFlag('ldnd5e', 'bleed', 0);
    if (stunFlag == null) await item.setFlag('ldnd5e', 'stun', 0);
    if (specialFlag == null) await item.setFlag('ldnd5e', 'special', 0);

    const fieldset = document.createElement('fieldset');
    fieldset.innerHTML = `<legend>${game.i18n.localize(i18nStrings.extraConditions)}</legend>`;

    const stunDiv = document.createElement('div');
    stunDiv.classList.add('form-group');
    stunDiv.innerHTML = `<label>${game.i18n.localize(i18nStrings.stunCondition)}</label>`;

    const stunField = document.createElement('div');
    stunField.classList.add('form-fields');
    stunField.innerHTML = `<input class="condition-control stun" type="number" placeholder="1" data-actor-id="${ownerID}" data-item-id="${item._id}" value="${stunFlag ?? 1}" min="1" max="${maxDmg}">`;

    const stunInput = stunField.querySelector('.condition-control.stun');
    stunInput.disabled = disabled;

    stunDiv.appendChild(stunField);
    fieldset.appendChild(stunDiv);

    const bleedDiv = document.createElement('div');
    bleedDiv.classList.add('form-group');
    bleedDiv.innerHTML = `<label>${game.i18n.localize(i18nStrings.bleedCondition)}</label>`;

    const bleedField = document.createElement('div');
    bleedField.classList.add('form-fields');
    bleedField.innerHTML = `<input class="condition-control bleed" type="number" placeholder="1" data-actor-id="${ownerID}" data-item-id="${item._id}" value="${bleedFlag ?? 1}" min="1" max="${maxDmg}">`;

    const bleedInput = bleedField.querySelector('.condition-control.bleed');
    bleedInput.disabled = disabled;

    bleedDiv.appendChild(bleedField);
    fieldset.appendChild(bleedDiv);

    const specialDiv = document.createElement('div');
    specialDiv.classList.add('form-group');
    specialDiv.innerHTML = `<label>${game.i18n.localize(i18nStrings.specialCondition)}</label>`;

    const specialField = document.createElement('div');
    specialField.classList.add('form-fields');
    specialField.innerHTML = `<input class="condition-control special" type="number" placeholder="1" data-actor-id="${ownerID}" data-item-id="${item._id}" value="${specialFlag ?? 1}" min="1" max="${maxDmg}">`;

    const specialInput = specialField.querySelector('.condition-control.special');
    specialInput.disabled = disabled;

    specialDiv.appendChild(specialField);
    fieldset.appendChild(specialDiv);

    wpnProp.appendChild(fieldset);

    const conditionControls = html.querySelectorAll('.condition-control');

    conditionControls.forEach(conditionControl => {
        conditionControl.addEventListener('change', async (ev) => {
            ev.preventDefault();
            const input = ev.currentTarget;
            const actorId = input.dataset.actorId;
            const actor = game.actors.get(actorId);
            const itemId = input.dataset.itemId;
            const item = (actor ? actor.items.get(itemId) : game.items.get(itemId));

            if (input.classList.contains('bleed')) {
                await item.setFlag('ldnd5e', 'bleed', Number(input.value));
            }
            if (input.classList.contains('stun')) {
                await item.setFlag('ldnd5e', 'stun', Number(input.value));
            }
            if (input.classList.contains('special')) {
                await item.setFlag('ldnd5e', 'special', Number(input.value));
            }
        });
    });
}

export const patchRollDamage = async function (roll, rollData) {
    const subject = rollData.subject;
    const baseDamage = roll[0];

    const dmgType = baseDamage.options?.type ?? 'none';
    const item = subject.item;

    var causedBleeding = false;
    var hasStunned = false;
    var specialTrigged = false;

    const bleedFlag = item.getFlag('ldnd5e', 'bleed');
    const stunFlag = item.getFlag('ldnd5e', 'stun');
    const specialFlag = item.getFlag('ldnd5e', 'special');

    if ((bleedFlag != null) && (stunFlag != null)) {
        for (var term of baseDamage.terms) {
            if (!(term instanceof Die)) continue;
            for (var result of term.results) {
                if (dmgType == "bludgeoning" && (stunFlag > 0 && result.result >= stunFlag)) {
                    hasStunned = true;
                    break;
                }
                else if (dmgType == "slashing" && (bleedFlag > 0 && result.result >= bleedFlag)) {
                    causedBleeding = true;
                    break;
                }
                else if ((specialFlag > 0 && result.result >= specialFlag)) {
                    specialTrigged = true;
                    break;
                }
            }
        }
    }

    await item.setFlag('ldnd5e', 'causedBleeding', causedBleeding);
    await item.setFlag('ldnd5e', 'hasStunned', hasStunned);
    await item.setFlag('ldnd5e', 'specialTrigged', specialTrigged);
}

export const patchChatUseMessage = async function (item, html) {
    const content = html[0].querySelector('.message-content');
    const messageId = html[0].dataset.messageId;
    const message = game.messages.get(messageId);

    let cardFooter = content.querySelector('.card-footer');

    if (!cardFooter) return;

    // As flags do item é usada apenas se não houver nenhuma flag inserida na mensagem ainda.
    const itemBleedFlag = item.getFlag('ldnd5e', 'bleed') ?? 0;
    const itemStunFlag = item.getFlag('ldnd5e', 'stun') ?? 0;
    const itemSpecialFlag = item.getFlag('ldnd5e', 'special') ?? 0;

    let bleedFlag = message.getFlag('ldnd5e', 'bleed') ?? null;
    let stunFlag = message.getFlag('ldnd5e', 'stun') ?? null;
    let specialFlag = message.getFlag('ldnd5e', 'special') ?? null;

    // Verifica se a mensagem possui a flag 'bleed'. Se não, busca a flag no item e a inclui na mensagem. 
    if (bleedFlag == undefined || bleedFlag == null) {
        await message.setFlag('ldnd5e', 'bleed', itemBleedFlag);
        bleedFlag = itemBleedFlag;
    }

    // Verifica se a mensagem possui a flag 'stun'. Se não, busca a flag no item e a inclui na mensagem.
    if (stunFlag == undefined || stunFlag == null) {
        await message.setFlag('ldnd5e', 'stun', itemStunFlag)
        stunFlag = itemStunFlag;
    };

    // Verifica se a mensagem possui a flag 'special'. Se não, busca a flag no item e a inclui na mensagem. 
    if (specialFlag == undefined || specialFlag == null) {
        await message.setFlag('ldnd5e', 'special', itemSpecialFlag);
        bleedFlag = itemSpecialFlag;
    }

    if (bleedFlag > 0) {
        const li = document.createElement("li");
        li.classList.add("pill");
        li.classList.add("pill-sm");
        li.classList.add("extra-conditions");

        const a = document.createElement("a");
        const i = document.createElement("i");
        i.classList.add("fas");
        i.classList.add("fa-droplet");
        a.appendChild(i);

        const bleedSpan = document.createElement("span");
        bleedSpan.textContent = game.i18n.format(i18nStrings.bleedFooter, {value: bleedFlag});;

        li.appendChild(a);
        li.appendChild(bleedSpan);
        cardFooter.appendChild(li);
    }
    if (stunFlag > 0) {
        const li = document.createElement("li");
        li.classList.add("pill");
        li.classList.add("pill-sm");
        li.classList.add("extra-conditions");

        const a = document.createElement("a");
        const i = document.createElement("i");
        i.classList.add("fas");
        i.classList.add("fa-spinner");
        a.appendChild(i);

        const stunSpan = document.createElement("span");
        stunSpan.textContent = game.i18n.format(i18nStrings.stunFooter, {value: stunFlag});

        li.appendChild(a);
        li.appendChild(stunSpan);
        cardFooter.appendChild(li);
    }
    if (specialFlag > 0) {
        const li = document.createElement("li");
        li.classList.add("pill");
        li.classList.add("pill-sm");
        li.classList.add("extra-conditions");

        const a = document.createElement("a");
        const i = document.createElement("i");
        i.classList.add("fas");
        i.classList.add("fa-star");
        a.appendChild(i);

        const specialSpan = document.createElement("span");
        specialSpan.textContent = game.i18n.format(i18nStrings.specialFooter, {value: specialFlag});

        li.appendChild(a);
        li.appendChild(specialSpan);
        cardFooter.appendChild(li);
    }
}
export const patchChatDmgMessage = async function (message, html, messageData) {
    const actorId = message.speaker.actor;
    if(!actorId) return; // Mensagem não está vinculada a um ator. Abortar rolagem.

    const actor = game.actors.get(actorId);

    const baseDamage = message.rolls[0];

    const itemData = messageData.message.flags.dnd5e?.item ?? {};
    const item = actor.items.get(itemData?.id ?? null);
    if (!item) return; // O Actor não possui mais o item selecionado. Abortar rolagem.

    const dmgType = baseDamage.options?.type ?? 'none';

    var causedBleeding = message.getFlag("ldnd5e", "causedBleeding");
    var hasStunned = message.getFlag("ldnd5e", "hasStunned");
    var specialTrigged = message.getFlag("ldnd5e", "specialTrigged");

    if ((causedBleeding == undefined || causedBleeding == null) || 
        (hasStunned == undefined || hasStunned == null) ||
        (specialTrigged == undefined || specialTrigged == null)) {

        const bleedFlag = item.getFlag('ldnd5e', 'bleed');
        const stunFlag = item.getFlag('ldnd5e', 'stun');
        const specialFlag = item.getFlag('ldnd5e', 'special');

        if ((bleedFlag != null) && (stunFlag != null)) {
            for (var term of baseDamage.terms) {
                if (!(term instanceof Die)) continue;
                for (var result of term.results) {
                    if ((specialFlag > 0 && result.result >= specialFlag)) {
                        specialTrigged = true;                        
                    } else if (dmgType == "bludgeoning" && (stunFlag > 0 && result.result >= stunFlag)) {
                        hasStunned = true;
                        break;
                    }
                    else if (dmgType == "slashing" && (bleedFlag > 0 && result.result >= bleedFlag)) {
                        causedBleeding = true;
                        break;
                    }                    
                }
            }
        }

        await message.setFlag('ldnd5e', 'causedBleeding', causedBleeding || false);
        await message.setFlag('ldnd5e', 'hasStunned', hasStunned || false);
        await message.setFlag('ldnd5e', 'specialTrigged', specialTrigged || false);
    }

    const content = html[0].querySelector('.chat-card');

    // Verifica se a mensagem é uma mensagem de resultado de rolagem de dados.
    if (html[0].querySelector('.dice-roll') !== null) {
        const ul = document.createElement('ul');
        ul.classList.add('card-footer', 'pills', 'unlist','extra-conditions', 'flexrow');

        if (causedBleeding) {
            const pill = document.createElement('li');
            pill.classList.add('pill', 'pill-sm', 'bleeding');

            const a = document.createElement("a");
            const i = document.createElement("i");
            i.classList.add("fas");
            i.classList.add("fa-droplet");
            a.appendChild(i);
            const span = document.createElement("span");
            span.textContent = game.i18n.localize(i18nStrings.bleedingLabel);
            pill.appendChild(a);
            pill.appendChild(span);
            
            ul.appendChild(pill);

            content.appendChild(ul);
        }

        if (hasStunned) {
            const pill = document.createElement('li');
            pill.classList.add('pill', 'pill-sm', 'stunned');

            const a = document.createElement("a");
            const i = document.createElement("i");
            i.classList.add("fas");
            i.classList.add("fa-spinner");
            a.appendChild(i);
            const span = document.createElement("span");
            span.textContent = game.i18n.localize(i18nStrings.stunLabel);
            pill.appendChild(a);
            pill.appendChild(span);
            
            ul.appendChild(pill);

            content.appendChild(ul);
        }

        if (specialTrigged) {
            const pill = document.createElement('li');
            pill.classList.add('pill', 'pill-sm', 'special');

            const a = document.createElement("a");
            const i = document.createElement("i");
            i.classList.add("fas");
            i.classList.add("fa-star");
            a.appendChild(i);
            const span = document.createElement("span");
            span.textContent = game.i18n.localize(i18nStrings.specialLabel);
            pill.appendChild(a);
            pill.appendChild(span);
            
            ul.appendChild(pill);

            content.appendChild(ul);
        }
    }
}
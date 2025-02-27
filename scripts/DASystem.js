import { constants, UnarmoredClasses, i18nStrings } from "../scripts/constants.js";
import adControl from "../models/adControl.js";
import { DND5E } from "../../../systems/dnd5e/dnd5e.mjs";

const NIVEL_DA = [
    {valor: 2, mod: "-1"},
    {valor: 4, mod: "-2"},
    {valor: 6, mod: "-4"},
    {valor: 8, mod: "-6"},
    {valor: 10, mod: "-6"},
    {valor: 20, mod: "-6"}
];

const NIVEL_DA_ESCUDO = [
    {valor: 2, mod: "+0"},
    {valor: 3, mod: "-1"},
    {valor: 4, mod: "-1"},
    {valor: 5, mod: "-1"},
    {valor: 6, mod: "-2"},
    {valor: 10, mod: "-2"}
];

export const TIPO_ARMOR = {
    LIGHT: "light",
    MEDIUM: "medium",
    HEAVY: "heavy",
    SHIELD:"shield",
    UNARMORED: "unarmored"
}

export const TIPO_DANO = {
    NONE: "none",
    BLDG: "bldg",
    SLSH: "slsh",
    PIERC:"pierc",
}

/**
    * Advantage mode of a 5e d20 roll
    * @enum {number}
    */
export const ACTION_TYPE = {
    DELETE: -1,
    UPDATE: 0,        
    NEW: 1,
    DESEQUIP: 2
}


/**
 * Cálculo do Limiar de Armadura Natural.
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const prepareLAN = function(data) {   

    const armor = data.attributes.ac;
    const armorType = armor.equippedArmor?.system.type.value;
    const armorProf = data.traits.armorProf;
    
    let lan = null;
    if(armorType) {
        switch(armorType){
            case TIPO_ARMOR.LIGHT: lan = Math.floor((0.75 * armor.base)) + Math.floor((0.5 * data.abilities.dex.mod));
                break;
            case TIPO_ARMOR.MEDIUM: lan = Math.floor((0.65 * armor.base)) + Math.floor((0.8 * data.abilities.dex.mod));
                break;
            case TIPO_ARMOR.HEAVY: lan = Math.floor((0.5 * armor.base)) + data.abilities.dex.mod;
                break;

            case TIPO_ARMOR.UNARMORED: lan = Math.floor((0.75 * armor.base)) + Math.floor((0.5 * data.abilities.dex.mod));
                break;
        }
    }
    else lan = Math.floor((0.75 * armor.base)) + Math.floor((0.5 * data.abilities.dex.mod));

    if(armor.equippedArmor && armorType != TIPO_ARMOR.UNARMORED) {   
        const equipArmorData = armor.equippedArmor.system;

        if(!armorProf?.value.has(DND5E.armorProficienciesMap[armorType])) {
            if(!armorProf?.value.has(equipArmorData.baseItem)) {
                lan -= Math.floor(6/data.attributes.prof); 
            }    
        }
    }

    return lan;
}

/**
 * Cálculo do Limiar de Armadura Natural.
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const prepareLDO = function(data) {   

    const armor = data.attributes.ac;    
    return armor.base;
}

/**
 * Computa da dinâmica dos Danos Absorvidos (DA).
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaDA = async function(item, owner, tipoDano) {      
    const itemData = item.system;
    const tipoArmor = itemData.type.value;
    const result = {
        temMudanca: {
            normal: false, 
            escudo: false,
            mensagem: false,
            itemDestruido: false
        }, 
        effectsID: {
            normal: null, 
            escudo: null            
        }
    };

    if(itemData.armor.DL[tipoDano] < 6) {
        if(tipoArmor === TIPO_ARMOR.LIGHT || tipoArmor == TIPO_ARMOR.UNARMORED) {
            if(tipoDano === TIPO_DANO.BLDG) {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.bldgDmgLightArmor));
                return result;
            }
            if(tipoDano === TIPO_DANO.SLSH) itemData.armor.AD[tipoDano]++;
            else itemData.armor.AD[tipoDano] += 2;        
        } else if(tipoArmor === TIPO_ARMOR.MEDIUM) {
            if(tipoDano === TIPO_DANO.PIERC) itemData.armor.AD[tipoDano]++;        
            else if(tipoDano === TIPO_DANO.BLDG) {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === TIPO_DANO.SLSH) {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            }
        } else if(tipoArmor === TIPO_ARMOR.HEAVY) {
            if(tipoDano === TIPO_DANO.BLDG) itemData.armor.AD[tipoDano] += 2; 
            else if(tipoDano === TIPO_DANO.SLSH) {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.slshDmgHeavyArmor));
                return result;
            }
            else itemData.armor.AD[tipoDano]++; 
        } else if(tipoArmor === TIPO_ARMOR.SHIELD) {
            if(tipoDano !== TIPO_DANO.PIERC) itemData.armor.AD[tipoDano]++;        
            else {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                }
                else itemData.armor.HalfAD.pierc = true;        
            } 
        }    

        let dl = 0;
        if(tipoArmor === TIPO_ARMOR.SHIELD) dl = NIVEL_DA_ESCUDO[itemData.armor.DL[tipoDano]];
        else dl = NIVEL_DA[itemData.armor.DL[tipoDano]];

        if(itemData.armor.AD[tipoDano] >= dl.valor) {           

            itemData.armor.DL[tipoDano]++;
            itemData.armor.AD[tipoDano] = 0;
            if(itemData.armor.DL[tipoDano] > itemData.armor.RealDL) {
                result.temMudanca.mensagem = true;

                if(tipoArmor === TIPO_ARMOR.SHIELD) result.temMudanca.escudo = true;
                else result.temMudanca.normal = true;

                itemData.armor.RealDL = itemData.armor.DL[tipoDano];            
                itemData.armor.ACPenalty = (itemData.type.value === TIPO_ARMOR.SHIELD ? NIVEL_DA_ESCUDO[itemData.armor.RealDL-1].mod : NIVEL_DA[itemData.armor.RealDL-1].mod);           

                if(result.temMudanca.normal) {
                    var armorEffect = owner.getFlag("ldnd5e", "armorEffect");
                    if(armorEffect) result.effectsID.normal = armorEffect.effectID;
                    else {
                        // No Armor Effect was found, config Actor to LDnD5E.
                        await owner.fullAsyncConfigL5e();

                        armorEffect = owner.getFlag("ldnd5e", "armorEffect");
                        result.effectsID.normal = armorEffect.effectID;
                    }
                } else if(result.temMudanca.escudo) {
                    var shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
                    if(shieldEffect) result.effectsID.escudo = shieldEffect.effectID;
                    else {
                        // No Armor Effect was found, config Actor to LDnD5E.
                        await owner.fullAsyncConfigL5e();

                        shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
                        result.effectsID.escudo = shieldEffect.effectID;
                    }            
                }            
            }
        }
    } else {
        ui.notifications.info(game.i18n.format(i18nStrings.messages.maxDLMessage, {item: item.name}));
        result.temMudanca.itemDestruido = true;
    }

    return result;
}

/**
 * Computa da dinâmica dos Acertos de Raspão.
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaHALF = async function(item, owner, tipoDano) {      
    const itemData = item.system;
    const tipoArmor = itemData.type.value;
    const result = {
        temMudanca: {
            normal: false, 
            escudo: false, 
            mensagem: false,
            itemDestruido: false
        }, 
        effectsID: {
            normal: null, 
            escudo: null            
        }
    };

    if(itemData.armor.DL[tipoDano] < 6) {
        if(tipoArmor === TIPO_ARMOR.LIGHT || tipoArmor == TIPO_ARMOR.UNARMORED) {
            if(tipoDano === TIPO_DANO.BLDG) {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.bldgDmgLightArmor));
                return result;
            }
            if(tipoDano === TIPO_DANO.SLSH) {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            } else if(tipoDano === TIPO_DANO.PIERC) {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano] += 2;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;
            }               
        } else if(tipoArmor === TIPO_ARMOR.MEDIUM) {
            if(tipoDano === TIPO_DANO.PIERC) {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;        
            } else if(tipoDano === TIPO_DANO.BLDG) {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === TIPO_DANO.SLSH) {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            }
        } else if(tipoArmor === TIPO_ARMOR.HEAVY) {
            if(tipoDano === TIPO_DANO.SLSH) {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.slshDmgHeavyArmor));
                return result;
            }
            if(tipoDano === TIPO_DANO.BLDG) {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano] += 2;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === TIPO_DANO.PIERC) {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;
            }     
        } else if(tipoArmor === TIPO_ARMOR.SHIELD) {
            ui.notifications.info(game.i18n.localize(i18nStrings.messages.halDmgShield));
        }      

        let dl = 0;
        if(tipoArmor === TIPO_ARMOR.SHIELD) dl = NIVEL_DA_ESCUDO[itemData.armor.DL[tipoDano]];
        else dl = NIVEL_DA[itemData.armor.DL[tipoDano]];

        if(itemData.armor.AD[tipoDano] >= dl.valor) {   
            itemData.armor.DL[tipoDano]++;
            itemData.armor.AD[tipoDano] = 0;
            if(itemData.armor.DL[tipoDano] > itemData.armor.RealDL) {

                result.temMudanca.mensagem = true;

                if(tipoArmor === TIPO_ARMOR.SHIELD) result.temMudanca.escudo = true;
                else result.temMudanca.normal = true;

                itemData.armor.RealDL = itemData.armor.DL[tipoDano];            
                itemData.armor.ACPenalty = (itemData.type.value === TIPO_ARMOR.SHIELD ? NIVEL_DA_ESCUDO[itemData.armor.RealDL-1].mod : NIVEL_DA[itemData.armor.RealDL-1].mod);           

                if(result.temMudanca.normal) {
                    var armorEffect = owner.getFlag("ldnd5e", "armorEffect");
                    if(armorEffect) result.effectsID.normal = armorEffect.effectID;
                    else {
                        // No Armor Effect was found, config Actor to LDnD5E.
                        await owner.fullAsyncConfigL5e();

                        armorEffect = owner.getFlag("ldnd5e", "armorEffect");
                        result.effectsID.normal = armorEffect.effectID;
                    }
                } else if(result.temMudanca.escudo) {
                    var shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
                    if(shieldEffect) result.effectsID.escudo = shieldEffect.effectID;
                    else {
                        // No Armor Effect was found, config Actor to LDnD5E.
                        await owner.fullAsyncConfigL5e();

                        shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
                        result.effectsID.escudo = shieldEffect.effectID;
                    }            
                }
            } 
        }
    } else {
        ui.notifications.info(game.i18n.format(i18nStrings.messages.maxDLMessage, {item: item.name}));
        result.temMudanca.itemDestruido = true;
    }

    return result;
}

/**
 * Computa da dinâmica dos Danos Absorvidos (DA).
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaSUB = function(item, owner, damageType, options={}) {      
    const itemData = item.system;
    const tipoArmor = itemData.type.value;
    const result = {
        temMudanca: {
            normal: false, 
            escudo: false,
            mensagem: false
        }, 
        effectsID: {
            normal: null, 
            escudo: null            
        }
    };

    let tipoDano = damageType;
    if(itemData.armor.RealDL > 0 && itemData.armor.DL[tipoDano] > 0) {

        if(tipoArmor === TIPO_ARMOR.SHIELD) result.temMudanca.escudo = true;
        else result.temMudanca.normal = true;

        
        for(let key of Object.keys(itemData.armor.DL)) {
            if(itemData.armor.DL[key] > itemData.armor.DL[tipoDano])
            tipoDano = key;
        }

        if(!options?.repairLvl) {
            itemData.armor.DL[tipoDano]--;

            for(let [dlkey, dlValue] of Object.entries(itemData.armor.DL)) {
                if(dlValue > itemData.armor.DL[tipoDano]) itemData.armor.DL[dlkey] = itemData.armor.DL[tipoDano];
            } 

            if((itemData.armor.DL.bldg < itemData.armor.RealDL) &&
                (itemData.armor.DL.slsh < itemData.armor.RealDL) &&
                (itemData.armor.DL.pierc < itemData.armor.RealDL)) itemData.armor.RealDL--;       
            
        } else {
            itemData.armor.DL[tipoDano] -= options.repairLvl;

            for(let [dlkey, dlValue] of Object.entries(itemData.armor.DL)) {
                if(dlValue > itemData.armor.DL[tipoDano]) itemData.armor.DL[dlkey] = itemData.armor.DL[tipoDano];
            }

            if((itemData.armor.DL.bldg < itemData.armor.RealDL) &&
                (itemData.armor.DL.slsh < itemData.armor.RealDL) &&
                (itemData.armor.DL.pierc < itemData.armor.RealDL)) itemData.armor.RealDL-= options.repairLvl; 
        }

        const novoIndex = itemData.armor.RealDL-1;

        itemData.armor.AD.bldg = 0;
        itemData.armor.AD.slsh = 0;
        itemData.armor.AD.pierc = 0;

        itemData.armor.HalfAD.bldg = false;
        itemData.armor.HalfAD.slsh = false;
        itemData.armor.HalfAD.pierc = false;    
        
        itemData.armor.ACPenalty = (itemData.type.value === TIPO_ARMOR.SHIELD ? (NIVEL_DA_ESCUDO[novoIndex]?.mod ?? "+0") : (NIVEL_DA[novoIndex]?.mod ?? "+0"));

        if(result.temMudanca.normal) {
            const armorEffect = owner.getFlag("ldnd5e", "armorEffect");
            if(armorEffect) result.effectsID.normal = armorEffect.effectID;
        } else if(result.temMudanca.escudo) {
            const shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
            if(shieldEffect) result.effectsID.escudo = shieldEffect.effectID;            
        }          
    }

    return result;
}

/**
 * Computa da dinâmica dos Danos Absorvidos (DA).
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaZERAR = function(item, owner) {      
    const itemData = item.system;
    const tipoArmor = itemData.type.value;
    const result = {
        temMudanca: {
            normal: false, 
            escudo: false,
            mensagem: false
        }, 
        effectsID: {
            normal: null, 
            escudo: null            
        }
    };
     
    if(tipoArmor === TIPO_ARMOR.SHIELD) result.temMudanca.escudo = true;
    else result.temMudanca.normal = true;

    itemData.armor.RealDL = 0;
        
    itemData.armor.DL.bldg = 
    itemData.armor.DL.slsh = 
    itemData.armor.DL.pierc = itemData.armor.RealDL;

    itemData.armor.AD.bldg = 
    itemData.armor.AD.slsh = 
    itemData.armor.AD.pierc = 0;

    itemData.armor.HalfAD.bldg = 
    itemData.armor.HalfAD.slsh = 
    itemData.armor.HalfAD.pierc = false;    
        
    itemData.armor.ACPenalty = "+0";

    if(result.temMudanca.normal) {
        const armorEffect = owner.getFlag("ldnd5e", "armorEffect");
        if(armorEffect) result.effectsID.normal = armorEffect.effectID;
    } else if(result.temMudanca.escudo) {
        const shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
        if(shieldEffect) result.effectsID.escudo = shieldEffect.effectID;            
    }

    return result;
}

/**
 * Computa da dinâmica dos Danos Absorvidos (DA).
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaREST = function(item, owner, amountRecovered) {      
    const itemData = item.system;
    const tipoArmor = itemData.type.value;
    const result = {
        temMudanca: {
            normal: false, 
            escudo: false,
            mensagem: true
        }, 
        effectsID: {
            normal: null, 
            escudo: null            
        }
    };

    var tipoDanoMax = TIPO_DANO.NONE;
    if(itemData.armor.RealDL > 0) {

        if(tipoArmor === TIPO_ARMOR.SHIELD) result.temMudanca.escudo = true;
        else result.temMudanca.normal = true;        
        
        for(let key of Object.keys(itemData.armor.DL)) {            
            if(tipoDanoMax == TIPO_DANO.NONE) {
                tipoDanoMax = key;
            } 
            else {
                if(itemData.armor.DL[key] > itemData.armor.DL[tipoDanoMax])
                    tipoDanoMax = key;
            }            
        }
        
        if(itemData.armor.DL[tipoDanoMax] - amountRecovered < 0)
            itemData.armor.DL[tipoDanoMax] = 0
        else
            itemData.armor.DL[tipoDanoMax] -= amountRecovered;

        for(let [dlkey, dlValue] of Object.entries(itemData.armor.DL)) {
            if(dlValue > itemData.armor.DL[tipoDanoMax]) itemData.armor.DL[dlkey] = itemData.armor.DL[tipoDanoMax];
        } 

        if((itemData.armor.DL.bldg < itemData.armor.RealDL) &&
            (itemData.armor.DL.slsh < itemData.armor.RealDL) &&
            (itemData.armor.DL.pierc < itemData.armor.RealDL)) itemData.armor.RealDL -= amountRecovered;

        const novoIndex = itemData.armor.RealDL - 1;

        itemData.armor.AD.bldg = 0;
        itemData.armor.AD.slsh = 0;
        itemData.armor.AD.pierc = 0;

        itemData.armor.HalfAD.bldg = false;
        itemData.armor.HalfAD.slsh = false;
        itemData.armor.HalfAD.pierc = false;    
        
        itemData.armor.ACPenalty = (itemData.type.value === TIPO_ARMOR.SHIELD ? (NIVEL_DA_ESCUDO[novoIndex]?.mod ?? "+0") : (NIVEL_DA[novoIndex]?.mod ?? "+0"));

        if(result.temMudanca.normal) {
            const armorEffect = owner.getFlag("ldnd5e", "armorEffect");
            if(armorEffect) result.effectsID.normal = armorEffect.effectID;
        } else if(result.temMudanca.escudo) {
            const shieldEffect = owner.getFlag("ldnd5e", "shieldEffect");
            if(shieldEffect) result.effectsID.escudo = shieldEffect.effectID;            
        }          
    }

    return result;
}
 
/** @inheritdoc */
export const toMessage = async function(messageData={}) {
    const html = await renderTemplate(constants.templates.newDLTemplate, messageData);

    // Create the ChatMessage data object
    const chatData = {
       user: game.user._id,
       type: CONST.CHAT_MESSAGE_STYLES.OTHER,
       content: html,
       speaker: ChatMessage.getSpeaker(),
       flags: {"core.canPopout": true}
    };

    ChatMessage.create(chatData, {});
}

export const prepareActiveEffects = async function(item, owner, result, options={}) {     

    //@TODO: Implementar controle para que as armaduras ao serem desequipadas parem de tentar apagar o Efeito mesmo quando ele já foi apagado.
    //       Implementar um controle para mostrar mensagens no chat quando certos Níveis de Avaraias é atingido.      
    //
    var effect = null;
    const itemData = foundry.utils.deepClone(item.system); 
    const NivelDL = itemData.armor.RealDL;
    const ACPenalty = itemData.armor.ACPenalty; 
    const unarmored = options.unarmored ?? false;
    const isFatigueLost = options.fatigueLost ?? false;  
    const amountRecovered = options.amountRecovered ?? 0;     

    if(result.temMudanca.normal) {
       effect = owner.effects.get(result.effectsID.normal);
       //effect.id = result.effectsID.normal;  
    } else if(result.temMudanca.escudo) {
       effect = owner.effects.get(result.effectsID.escudo);
       //effect.id = result.effectsID.escudo;          
    } 

    let info = "";
    let extraMessage = "";
    let desequipItem = false;     

    // Contabiliza qual mensagem enviar ao chat para informar o usuário sobre a condição de seu equipamento.
    if(NivelDL === 6) { 
        if(!unarmored){
            info = game.i18n.localize(i18nStrings.messages.sixthDLMessage);
            desequipItem = true;
            itemData.armor.destroyed = true;
        } 
        else {
            info = game.i18n.format(i18nStrings.messages.maxFatigueMessage, {owner: owner.name});
        }        
    } else { 
        if(!unarmored){
            if(NivelDL === 5) extraMessage = game.i18n.format(i18nStrings.messages.fithDLMessage, {owner: owner.name});
            info = game.i18n.format(i18nStrings.messages.newDLMessage, {item: item.name, owner: owner.name, penalty: ACPenalty, extra: extraMessage});             
        } else {
            if(isFatigueLost){ 
                info = game.i18n.format(i18nStrings.messages.fatigueLost, {owner: owner.name, amount: amountRecovered, penalty: ACPenalty});             
            } else {
                info = game.i18n.format(i18nStrings.messages.fatigueGained, {owner: owner.name, penalty: ACPenalty});             
            }
        }
    }    

    let repairSucess = false;
    // Realiza reparo no item.
    if(options?.repair) {         
       computeRepairCost(options?.price, owner);

       repairSucess = await rollRepair(item, owner, options);
       if(repairSucess == null) return;
       
       if(!repairSucess) { 
          info = game.i18n.format(i18nStrings.messages.repairFailed, {item: item.name});
       } else {
          if(options?.fullRepair) {
             info = game.i18n.format(i18nStrings.messages.reconstructedMessage, {item: item.name});
             itemData.armor.destroyed = false;
          }else 
             info = game.i18n.format(i18nStrings.messages.repairMessage, {item: item.name, penalty: ACPenalty});  
       }       
    }

    const messageData = {
       data: itemData,
       info: info,
       item: item,
       owner: owner,
       repairDC: (unarmored ? 8 + itemData.armor.RealDL : (adControl.DC_REPAIR[item.system.rarity.toLowerCase()] ?? 10)),
       unarmored: unarmored
    };

    if(result.temMudanca.mensagem || options?.repair)
          await this.toMessage(messageData); 

    if(!options?.repair || (options?.repair && repairSucess)) {   
       
       if(!unarmored){
          // Salva as alterações nos valores de avarias do Item.
          await item.setFlag("ldnd5e", "armorSchema", itemData.armor);            
       }
       else {
          // Salva as alterações nos valores de fatiga do Ator.
          await owner.setFlag("ldnd5e", "unarmoredDef", itemData.armor);
       }

       if(effect) 
          await owner.updateArmorDamageEffects(effect, ACPenalty);

       if(desequipItem)
          await item.update({["system.equipped"]: !getProperty(item.system, "system.equipped")});
    }      
 }

 export const computeRepairCost = async function(cost, actor) {
    const curr = convertCurrency(foundry.utils.deepClone(actor.system.currency));
    const price = convertCurrency({pp: 0, gp: cost, ep: 0, sp: 0, cp: 0});

    const newCurr = {
       pp: 0,
       gp: (curr.total - price.total),
       ep: 0, 
       sp: 0, 
       cp: 0
    };

    await actor.update({ [`system.currency`]: newCurr});
    CONFIG.CurrencyManager.convertCurrency(actor);
 }

 export const convertCurrency = function(curr) {
    const conversion = Object.entries(CONFIG.DND5E.currencies);
    let total = 0;
    conversion.reverse();
    for ( let [c, data] of conversion ) {
      const t = data.conversion;
      if ( curr[c] == 0 ) continue;
      const gp = curr[c] / t;
      total += gp;
    }
    return {total: total, curr: {pp: 0, gp: total, ep: 0, sp: 0, cp: 0}};
 }

 export const rollRepair = async function(item, owner, options={}) {
    if(!options.smithRepairChk) {
       const label = CONFIG.DND5E.abilities.dex;
       const abl = owner.system.abilities.dex;
       const abilityId = "dex";

       const parts = [];
       const data = owner.getRollData();
       const ownerData = owner.system;

       // Add ability modifier
       parts.push("@mod");
       data.mod = abl.mod;

       // Include proficiency bonus
       if ( ownerData.tools.hasOwnProperty('smith') ) {
          parts.push("@prof");
          data.prof = ownerData.attributes.prof;
       }

       // Add ability-specific check bonus
       if ( abl.bonuses?.check ) {
          const checkBonusKey = `${abilityId}CheckBonus`;
          parts.push(`@${checkBonusKey}`);
          data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
       }

       // Add global actor bonus
       const bonuses = getProperty(owner.system, "bonuses.abilities") || {};
       if ( bonuses.check ) {
          parts.push("@checkBonus");
          data.checkBonus = Roll.replaceFormulaData(bonuses.check, data);
       } 

       // Add provided extra roll parts now because they will get clobbered by mergeObject below
       if (options.parts?.length > 0) {
          parts.push(...options.parts);
       }

       // Roll and return
       const rollData = foundry.utils.mergeObject(options, {
          parts: parts,
          data: data,
          title: `${game.i18n.format("DND5E.AbilityPromptTitle", {ability: label})}: ${owner.name}`,
          halflingLucky: owner.getFlag("dnd5e", "halflingLucky"),
          messageData: {
             speaker: options.speaker || ChatMessage.getSpeaker({actor: owner}),
             "flags.dnd5e.roll": {type: "ability", abilityId }
          }
       });
       const roll = await dnd5e.dice.d20Roll(rollData);
       if(!roll) return null;

       return (roll._total >= (adControl.DC_REPAIR[item.system.rarity.toLowerCase()] ?? 10));
    } else return true;
 }

 export const rollFatigue = async function(item, owner, options={}) {
    const itemData = item.system;
    const saveCD = 8 + itemData.armor.RealDL;

    const roll = await owner.rollSavingThrow({ability: "con", target: saveCD}); 
    return roll[0].isSuccess;
 }

 export const verifyRepairCost = function(cost, owner) {
    const curr = convertCurrency(foundry.utils.deepClone(owner.system.currency));
    const price = convertCurrency({pp: 0, gp: cost, ep: 0, sp: 0, cp: 0});
      
    return (price.total > curr.total);
 }

 export const computeEquipArmorShield = async function(actor, item, action) {
    const data = actor.system;

    if(this.token) {

    }

    const equip = { armor: data.attributes.ac.equippedArmor,
                    shield: data.attributes.ac.equippedShield};

    const flags = { armor: actor.getFlag("ldnd5e", "armorEffect"),
                    shield: actor.getFlag("ldnd5e", "shieldEffect")};
    
    const effects = { armor: actor.effects.get(flags.armor.effectID),
                      shield: actor.effects.get(flags.shield.effectID)};  

    // O tipo de ação é um UPDATE?
    if(action === this.ACTION_TYPE.UPDATE || action === this.ACTION_TYPE.DESEQUIP) { 

        // O item alterado é uma Armadura?
        if(["armor"].includes(item.subtype)) {
            // O Actor tem uma Armadura equipada? Isso é um desequip então.
            if(equip.armor) {
                // A Armadura alterada é a mesma que está equipada?
                if(item.id === equip.armor.id && action === this.ACTION_TYPE.DESEQUIP) {
                    // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.armor, "+0");
                    await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
                }
            // Isso é um equip então.
            } else {
                // O Actor já tem uma Armadura atribuída ao Active Effect?
                if(flags.armor.armorID !== "none") {
                    // Recupera a Armadura atribuída ao Active Effect.
                    const armor = actor.items.get(flags.armor.armorID);
                    // A Armadura atribuída ao Active Effect não existe mais?
                    if(!armor) {                        
                        // Atribua a Armadura alterada pelo Actor ao Active Effect.
                        await actor.updateArmorDamageEffects(effects.armor, item.system.armor.ACPenalty);
                        await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});
                        
                    // A Armadura alterada é diferente da Armadura atribuída ao Active Effect.
                    } else if(item.id !== armor.id){
                        // Atribua a Armadura alterada pelo Actor ao Active Effect.
                        await actor.updateArmorDamageEffects(effects.armor, item.system.armor.ACPenalty);
                        await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});
                    }
                } else {
                    // Atribua a Armadura alterada pelo Actor ao Active Effect.
                    await actor.updateArmorDamageEffects(effects.armor, item.system.armor.ACPenalty);
                    await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});                    
                }
            }
        }
        
        // O item alterado é um Escudo?
        if(["shield"].includes(item.subtype)) {
        // O Actor tem um Escudo equipado? Isso é um desequip então.
            if(equip.shield) {
                // O Escudo alterado é o mesmo que está equipado?
                if(item.id === equip.shield.id) {
                // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.shield, "+0");
                    await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});
                }
            // Isso é um equip então.
            } else {
                // O Actor já tem um Escudo atribuído ao Active Effect?
                if(flags.shield.shieldID !== "none") {
                    // Recupera o Escudo atribuído ao Active Effect.
                    const shield = actor.items.get(flags.shield.shieldID);
                    // O Escudo atribuído ao Active Effect não existe mais?
                    if(!shield) {
                        // Atribua o Escudo alterado pelo Actor ao Active Effect.
                        await actor.updateArmorDamageEffects(effects.shield, item.system.armor.ACPenalty);
                        await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});
                    // O Escudo alterado é diferente do Escudo atribuído ao Active Effect.
                    } else if(item.id !== shield.id){
                    // Atribua o Escudo alterado pelo Actor ao Active Effect.
                        await actor.updateArmorDamageEffects(effects.shield, item.system.armor.ACPenalty);
                        await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});
                    }
                } else {
                    // Atribua o Escudo alterado pelo Actor ao Active Effect.
                    await actor.updateArmorDamageEffects(effects.shield, item.system.armor.ACPenalty);
                    await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});                    
                }
            } 
        }
    // O tipo de ação é um DELETE?           
    } else if(action === this.ACTION_TYPE.DELETE){
        // O item deletado é uma Armadura?
        if(["armor"].includes(item.subtype)) {
            // O Actor tem uma Armadura atribuída ao Active Effect?
            if(flags.armor.armorID !== "none") {
                // Recupera a Armadura atribuída ao Active Effect.
                const armor = actor.items.get(flags.armor.armorID);
                // A Armadura atribuída ao Active Effect ainda existe?
                if(!armor) {
                    // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.armor, "+0");
                    await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});
                // A Armadura deletada é a Armadura atribuída ao Active Effect.
                } else if(item.id === armor._id){    
                    // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.armor, "+0");
                    await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: "none"});              
                }
            }
        }

        // O item deletado é um Escudo?
        if(["shield"].includes(item.subtype)) {
            // O Actor tem um Escudo atribuído ao Active Effect?
            if(flags.shield.shieldID !== "none") {
                // Recupera o Escudo atribuída ao Active Effect.
                const shield = actor.items.get(flags.shield.shieldID);
                // O Escudo atribuído ao Active Effect ainda existe?
                if(!shield) { 
                    // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.shield, "+0");
                    await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});                  
                // O Escudo deletado é a Armadura atribuída ao Active Effect.
                } else if(item.id === shield._id){    
                    // Remova o efeito de avaria.
                    await actor.updateArmorDamageEffects(effects.shield, "+0");
                    await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: "none"});              
                }
            }
        }
    // O tipo de ação é um NEW? 
    } else if(action === this.ACTION_TYPE.NEW) {
        // O item criado é uma Armadura?
        if(["armor"].includes(item.subtype)) {
            // O Actor não tem uma Armadura equipada?
            if(!equip.armor) {                
                // Atribua a Armadura criado pelo Actor ao Active Effect.
                await actor.updateArmorDamageEffects(effects.armor, item.system.armor.ACPenalty);
                await actor.setFlag("ldnd5e", "armorEffect", {effectID: flags.armor.effectID, armorID: item.id});  
            }              
        }

        // O item criado é um Escudo?
        if(["shield"].includes(item.subtype)) {
            // O Actor não tem um Escudo equipado?
            if(!equip.shield) {                
                // Atribua o Escudo criado pelo Actor ao Active Effect.
                await actor.updateArmorDamageEffects(effects.shield, item.system.armor.ACPenalty);
                await actor.setFlag("ldnd5e", "shieldEffect", {effectID: flags.shield.effectID, shieldID: item.id});       
            }         
        }
    }  
    
    actor.applyActiveEffects();
}
import { i18nStrings} from "./constants.js";

const NIVEL_DA = [
    {valor: 2, mod: "-1"},
    {valor: 4, mod: "-2"},
    {valor: 6, mod: "-4"},
    {valor: 8, mod: "-6"},
    {valor: 10, mod: "-6"},
    {valor: 20, mod: "-6"}
];

const NIVEL_DA_ESCUDO = [
    {valor: 2, mod: "0"},
    {valor: 3, mod: "-1"},
    {valor: 4, mod: "-1"},
    {valor: 5, mod: "-1"},
    {valor: 6, mod: "-2"},
    {valor: 10, mod: "-2"}
];

/**
 * Cálculo do Limiar de Armadura Natural.
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const prepareLAN = function(data) {   

    const armor = data.attributes.ac;
    const armorType = armor.equippedArmor?.data.data.armor.type;
    
    let lan = null;
    if(armorType) {
        switch(armorType){
            case "light": lan = Math.floor((0.75 * armor.base)) + Math.floor((0.5 * data.abilities.dex.mod));
                break;
            case "medium": lan = Math.floor((0.65 * armor.base)) + Math.floor((0.8 * data.abilities.dex.mod));
                break;
            case "heavy": lan = Math.floor((0.5 * armor.base)) + data.abilities.dex.mod;
                break;
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
export const computaDA = function(item, owner, tipoDano) {      
    const itemData = item.data.data;
    const tipoArmor = itemData.armor.type;
    const result = {temMudanca: {normal: false, escudo: false}, fazUpdate: {normal: null, escudo: {value: null, delete: false}}};

    if(itemData.armor.DL[tipoDano] < 6) {
        if(tipoArmor === "light") {
            if(tipoDano === "bldg") {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.bldgDmgLightArmor));
                return result;
            }
            if(tipoDano === "slsh") itemData.armor.AD[tipoDano]++;
            else itemData.armor.AD[tipoDano] += 2;        
        } else if(tipoArmor === "medium") {
            if(tipoDano === "pierc") itemData.armor.AD[tipoDano]++;        
            else if(tipoDano === "bldg") {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === "slsh") {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            }
        } else if(tipoArmor === "heavy") {
            if(tipoDano === "bldg") itemData.armor.AD[tipoDano] += 2; 
            else if(tipoDano === "slsh") {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.slshDmgHeavyArmor));
                return result;
            }
            else itemData.armor.AD[tipoDano]++; 
        } else if(tipoArmor === "shield") {
            if(tipoDano !== "pierc") itemData.armor.AD[tipoDano]++;        
            else {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                }
                else itemData.armor.HalfAD.pierc = true;        
            } 
        }    

        let dl = 0;
        if(tipoArmor === "shield") dl = NIVEL_DA_ESCUDO[itemData.armor.DL[tipoDano]];
        else dl = NIVEL_DA[itemData.armor.DL[tipoDano]];

        if(itemData.armor.AD[tipoDano] >= dl.valor) {           

            itemData.armor.DL[tipoDano]++;
            itemData.armor.AD[tipoDano] = 0;
            if(itemData.armor.DL[tipoDano] > itemData.armor.RealDL) {
                if(tipoArmor === "shield") result.temMudanca.escudo = true;
                else result.temMudanca.normal = true;

                itemData.armor.RealDL = itemData.armor.DL[tipoDano];            
                itemData.armor.ACPenalty = (itemData.armor.type === "shield"? NIVEL_DA_ESCUDO[itemData.armor.RealDL-1].mod : NIVEL_DA[itemData.armor.RealDL-1].mod);           

                let novoEfeito = null;
                if(result.temMudanca.normal) {
                    novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectLabel)].includes(e.data.label));
                    if(novoEfeito) result.fazUpdate.normal = novoEfeito.data._id;
                } else if(result.temMudanca.escudo) {
                    novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectShieldLabel)].includes(e.data.label));
                    if(novoEfeito) result.fazUpdate.escudo.value = novoEfeito.data._id;            
                }            
            }
        }
    }

    return result;
}

/**
 * Computa da dinâmica dos Acertos de Raspão.
 * @param {object} data     Dados do Actor a ser configurado.
 * @returns {number<LAN>}   Valor do Lan.
 * @public
*/
export const computaHALF = function(item, owner, tipoDano) {      
    const itemData = item.data.data;
    const tipoArmor = itemData.armor.type;
    const result = {temMudanca: {normal: false, escudo: false}, fazUpdate: {normal: null, escudo: {value: null, delete: false}}};

    if(itemData.armor.DL[tipoDano] < 6) {
        if(tipoArmor === "light") {
            if(tipoDano === "bldg") {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.bldgDmgLightArmor));
                return result;
            }
            if(tipoDano === "slsh") {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            } else if(tipoDano === "pierc") {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano] += 2;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;
            }               
        } else if(tipoArmor === "medium") {
            if(tipoDano === "pierc") {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;        
            } else if(tipoDano === "bldg") {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === "slsh") {
                if(itemData.armor.HalfAD.slsh) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.slsh = false;
                } else itemData.armor.HalfAD.slsh = true;
            }
        } else if(tipoArmor === "heavy") {
            if(tipoDano === "slsh") {
                ui.notifications.info(game.i18n.localize(i18nStrings.messages.slshDmgHeavyArmor));
                return result;
            }
            if(tipoDano === "bldg") {
                if(itemData.armor.HalfAD.bldg) { 
                    itemData.armor.AD[tipoDano] += 2;
                    itemData.armor.HalfAD.bldg = false;
                } else itemData.armor.HalfAD.bldg = true;
            } else if(tipoDano === "pierc") {
                if(itemData.armor.HalfAD.pierc) { 
                    itemData.armor.AD[tipoDano]++;
                    itemData.armor.HalfAD.pierc = false;
                } else itemData.armor.HalfAD.pierc = true;
            }     
        } else if(tipoArmor === "shield") {
            ui.notifications.info(game.i18n.localize(i18nStrings.messages.halDmgShield));
        }      

        let dl = 0;
        if(tipoArmor === "shield") dl = NIVEL_DA_ESCUDO[itemData.armor.DL[tipoDano]];
        else dl = NIVEL_DA[itemData.armor.DL[tipoDano]];

        if(itemData.armor.AD[tipoDano] >= dl.valor) {   
            itemData.armor.DL[tipoDano]++;
            itemData.armor.AD[tipoDano] = 0;
            if(itemData.armor.DL[tipoDano] > itemData.armor.RealDL) {
                if(tipoArmor === "shield") result.temMudanca.escudo = true;
                else result.temMudanca.normal = true;

                itemData.armor.RealDL = itemData.armor.DL[tipoDano];            
                itemData.armor.ACPenalty = (itemData.armor.type === "shield"? NIVEL_DA_ESCUDO[itemData.armor.RealDL-1].mod : NIVEL_DA[itemData.armor.RealDL-1].mod);           

                let novoEfeito = null;
                if(result.temMudanca.normal) {
                    novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectLabel)].includes(e.data.label));
                    if(novoEfeito) result.fazUpdate.normal = novoEfeito.data._id;
                } else if(result.temMudanca.escudo) {
                    novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectShieldLabel)].includes(e.data.label));
                    if(novoEfeito) result.fazUpdate.escudo.value = novoEfeito.data._id;            
                }
            }
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
export const computaSUB = function(item, owner, damageType) {      
    const itemData = item.data.data;
    const tipoArmor = itemData.armor.type;
    const result = {temMudanca: {normal: false, escudo: false}, fazUpdate: {normal: null, escudo: {value: null, delete: false}}};

    let tipoDano = damageType;
    if(itemData.armor.RealDL > 0 && itemData.armor.DL[tipoDano] > 0) {

        if(tipoArmor === "shield") result.temMudanca.escudo = true;
        else result.temMudanca.normal = true;

        
        for(let key of Object.keys(itemData.armor.DL)) {
            if(itemData.armor.DL[key] > itemData.armor.DL[tipoDano])
            tipoDano = key;
        }

        itemData.armor.DL[tipoDano]--;

        for(let [dlkey, dlValue] of Object.entries(itemData.armor.DL)) {
            if(dlValue > itemData.armor.DL[tipoDano]) itemData.armor.DL[dlkey] = itemData.armor.DL[tipoDano];
        }        

        if((itemData.armor.DL.bldg < itemData.armor.RealDL) &&
           (itemData.armor.DL.slsh < itemData.armor.RealDL) &&
           (itemData.armor.DL.pierc < itemData.armor.RealDL)) itemData.armor.RealDL--;
        
        const novoIndex = itemData.armor.RealDL-1;

        itemData.armor.AD.bldg = 0;
        itemData.armor.AD.slsh = 0;
        itemData.armor.AD.pierc = 0;

        itemData.armor.HalfAD.bldg = false;
        itemData.armor.HalfAD.slsh = false;
        itemData.armor.HalfAD.pierc = false;    
        
        itemData.armor.ACPenalty = (itemData.armor.type === "shield" ? (NIVEL_DA_ESCUDO[novoIndex]?.mod ?? "0") : (NIVEL_DA[novoIndex]?.mod ?? "0"));  

        result.fazUpdate.escudo.delete = (itemData.armor.RealDL === 0);

        let novoEfeito = null;
        if(result.temMudanca.normal) {
            novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectLabel)].includes(e.data.label));
            if(novoEfeito) result.fazUpdate.normal = novoEfeito.data._id;
        } else if(result.temMudanca.escudo) {
            novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectShieldLabel)].includes(e.data.label));
            if(novoEfeito) result.fazUpdate.escudo.value = novoEfeito.data._id;            
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
    const itemData = item.data.data;
    const tipoArmor = itemData.armor.type;
    const result = {temMudanca: {normal: false, escudo: false}, fazUpdate: {normal: null, escudo: {value: null, delete: false}}};
     
    if(tipoArmor === "shield") result.temMudanca.escudo = true;
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
        
    itemData.armor.ACPenalty = "0";
    result.fazUpdate.escudo.delete = true;

    let novoEfeito = null;
    if(result.temMudanca.normal) {
        novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectLabel)].includes(e.data.label));
        if(novoEfeito) result.fazUpdate.normal = novoEfeito.data._id;
    } else if(result.temMudanca.escudo) {
        novoEfeito = owner.effects.find(e => [game.i18n.localize(i18nStrings.activeEffectShieldLabel)].includes(e.data.label));
        if(novoEfeito) result.fazUpdate.escudo.value = novoEfeito.data._id;            
    }

    return result;
}
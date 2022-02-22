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
    switch(armorType){
        case "light": lan = Math.floor((0.75 * armor.base)) + Math.floor((0.5 * data.abilities.dex.mod));
            break;
        case "medium": lan = Math.floor((0.65 * armor.base)) + Math.floor((0.8 * data.abilities.dex.mod));
            break;
        case "heavy": lan = Math.floor((0.5 * armor.base)) + data.abilities.dex.mod;
            break;
    }

    return lan;
}
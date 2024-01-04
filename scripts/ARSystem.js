import { recursiveGetPropertyConcat } from "./helpers.js";
import { i18nStrings } from "./constants.js";

export const iniGroup = new Map();

iniGroup.set("ini25+", 5);
iniGroup.set("ini24-20", 4);
iniGroup.set("ini19-15", 3);
iniGroup.set("ini14-10", 2);
iniGroup.set("ini9-5", 1);
iniGroup.set("ini5-", 0);

export const onNewCombatTurn = function(combat, updateData, updateOptions){
    const arFlag = combat.getFlag("ldnd5e", "arData");

    if(arFlag){        
        const combatants = combat.turns;
        const combatant = combatants[combatants?.findIndex(c => c.actorId == arFlag.actorId)];
        combat.setInitiative(combatant.id, combatant.initiative - 5); 

        combat.unsetFlag("ldnd5e", "arData");
    }
}

export const updateExhaustionLevel = async function(data) {
    const actorData = data.actor.system;  
    var exhaustionLimit = (game.settings.get('ldnd5e', 'oneDNDExhaustionRule') ? 10 : 6);

    const isInCombat = await updateARIniciative(data);

    if(isInCombat && actorData.attributes.exhaustion != exhaustionLimit)
    {
        // O nível de Exaustão ainda está abaixo do limite máximo.
        if(actorData.attributes.exhaustion + 1 < exhaustionLimit)
            await data.actor.update({"data.attributes.exhaustion": actorData.attributes.exhaustion + 1});
        else // A criatura morreu de exaustão.
            await data.actor.update({"data.attributes.death.failure": 3, 
                                     "data.attributes.exhaustion": actorData.attributes.exhaustion + 1,
                                     "data.attributes.hp.value": 0
                                    });     
    }       
}

/** Manage and create Combat Tracker groups
     * @param {boolean} popOut - Whether this Combat Tracker is popped out
*/
export const manageGroups = function (popOut) {
    // If trying to use the pop out, check if one actually exists first
    if (popOut && !document.querySelector("#combat-popout")) return;

    /** The current parent html element */
    const html = popOut ? document.querySelector("#combat-popout") : document.querySelector("#combat");

    // Get groups
    const groups = computeIniciativeGroups();
    // Go through each of the groups
    groups?.forEach((group, index) => {
        // Go through each of the combatants
        group.forEach((combatant, i, arr) => {
            const classKeys = Array.from(iniGroup.keys()).reverse();

            /** The DOM element of this combatant */
            const element = html.querySelector(`[data-combatant-id="${combatant.id}"]`);
            element.classList.add(`${classKeys[combatant.iniGroup]}`);
            const iniSpan = element.getElementsByClassName("initiative")[0];

            const iniGrpSpan = document.createElement("span");
            iniGrpSpan.innerHTML = `<span class="initiative"> (${combatant.iniGroup})</span>`;  
            
            iniSpan?.append(iniGrpSpan);  
        });
    });
 }

async function updateARIniciative (data){
    const actorId = data.actor.id; 
    const combat = game.combat;
    if(combat && combat.isActive && combat.started)
    {
        const combatants = combat.turns;
        const combatant = combatants[combatants?.findIndex(c => c.actorId == actorId)];

        if(combatant)
        {
            await combat.setFlag("ldnd5e", "arData", {actorId: actorId});
            combat.setInitiative(combatant.id, combatant.initiative + 5);            
        }
        else {
            const actor = game.actors.get(actorId);
            ui.notifications.warn(game.i18n.format(i18nStrings.messages.nonCobatantActor, {actor: actor.name}));
            return false;
        }

        return true;
    }
    else {
        ui.notifications.warn(game.i18n.localize(i18nStrings.messages.noActiveCombat));
        return false;
    }
}

function computeIniciativeGroups() {
    /** @type {Combatant[][]} */
    let groups;
    const path = "initiative";

    // Reduce combat turns into an array of groups by matching a given property path
    groups = Object.values(game.combat?.turns.reduce((accumulator, current) => {       
        // Group by the property
        accumulator[recursiveGetPropertyConcat(current, path)] = [...accumulator[recursiveGetPropertyConcat(current, path)] || [], current];
        return accumulator;
    }, {}));

    if(groups.length > 1) {
        groups = groups
			.map(group => group.sort(sortCombatants)) // Sort each group
			.sort((a, b) => sortCombatants(a[0], b[0])); // Sort by the first combatant
    } else if(groups.length > 0){
        // Agrupa por valor de Iniciativa
        const path = "initiative";
        groups[0][0].iniGroup = getGroup(recursiveGetPropertyConcat(groups[0][0], path));
    }
	return groups;
 }

 /** Sort the combatants
     * @param {Combatant} a
     * @param {Combatant} b
     * @return {1 | -1}
     */
function sortCombatants(a, b) {
    // Agrupa por valor de Iniciativa
    const path = "initiative";

    // Get the values for the two combatants
    let ia = getGroup(recursiveGetPropertyConcat(a, path));
    let ib = getGroup(recursiveGetPropertyConcat(b, path));

    a.iniGroup = ia;
    b.iniGroup = ib;

    const ci = ib - ia;
    if (ci !== 0) return ci ? 1 : -1;
    return a.id > b.id ? 1 : -1;
}

function getGroup(ini) {
    if (ini >= 25) return iniGroup.get("ini25+");
    if (ini < 25 && ini >= 20) return iniGroup.get("ini24-20");
    if (ini < 20 && ini >= 15) return iniGroup.get("ini19-15");
    if (ini < 15 && ini >= 10) return iniGroup.get("ini14-10");
    if (ini < 10 && ini >= 5)  return iniGroup.get("ini9-5");
    if (ini && ini < 5) return iniGroup.get("ini5-");
    
    return 99;
}
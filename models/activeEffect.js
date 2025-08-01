export default class ActiveEffectL5e {
    static prepareActiveEffectCategories(data) {   
        // If the actor is a military entity, we don't want to modify the effects.
        if(data.actor.system.military) return;
        
        var categories = data.effects;

        const actor = game.actors.get(data.actor._id);

        const armorFlag = actor?.getFlag("ldnd5e", "armorEffect");
        const shieldFlag = actor?.getFlag("ldnd5e", "shieldEffect");       

        for(let cat in categories) {           
            const armorEffect = categories[cat].effects.find(e => e.id === armorFlag?.effectID);
            if(armorEffect) armorEffect.readOnly = true;

            const shieldEffect = categories[cat].effects.find(e => e.id === shieldFlag?.effectID);
            if(shieldEffect) shieldEffect.readOnly = true;
        }
        
        return categories;
    }
}
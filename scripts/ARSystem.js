export const prepareRPMod = function (data) {
    return Math.floor((25/(data.abil.con.mod + 10)) - (data.prof.flat/15));
}

export const getMaxFumbleRange = function(data) {
    return data.attributes.rpMod * 5;
}

export const updateFumbleRange = async function(data) {
    const actorData = data.actor.data.data;

    let valueChange = actorData.attributes.rpMod;
    if(data.rest) valueChange = (data.rest === 2 ? Math.floor(actorData.attributes.fumbleRange/2) : 1);

    let newValue = data.rightClick ? actorData.attributes.fumbleRange - valueChange : actorData.attributes.fumbleRange + valueChange;
    newValue = (newValue > actorData.attributes.maxFumbleRange && !data.rightClick) ? actorData.attributes.maxFumbleRange : newValue;
    newValue = (newValue < 1 && data.rightClick) ? 1 : newValue;

    await data.actor.update({"data.attributes.fumbleRange": newValue});
}
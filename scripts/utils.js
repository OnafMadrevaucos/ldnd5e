function _verifyRepairCost(cost, owner) {
    const curr = das.convertCurrency(foundry.utils.deepClone(owner.system.currency));
    const price = das.convertCurrency({ pp: 0, gp: cost, ep: 0, sp: 0, cp: 0 });

    return (price.total > curr.total);
}

async function _getUnarmoredItem(itemID) {
    const pack = game.packs.find(p => p.collection === "dnd5e.classfeatures");
    const item = await pack.getDocument(itemID);

    return item;
}

export { _verifyRepairCost, _getUnarmoredItem };
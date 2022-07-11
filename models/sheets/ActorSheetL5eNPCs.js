import { constants } from "../../scripts/constants.js";
export default class ActorSheetL5eNPCs extends constants.ActorSheet5eNPCs {
    
    /* -------------------------------------------- */
    /*  Métodos Herdados
    /* -------------------------------------------- */

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 825,
            height: Math.max(710, 237 + (Object.keys(CONFIG.DND5E.abilities).length * 70))
        });
    }
}
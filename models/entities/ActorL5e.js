import Actor5e from "../../../../systems/dnd5e/module/actor/entity.js";
import * as das from "../../scripts/DASystem.js";

export default class ActorL5e extends Actor5e {

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();

        const actorData = this.data;
        const data = actorData.data;

        data.attributes.ac.lan = das.prepareLAN(data);
    }
}
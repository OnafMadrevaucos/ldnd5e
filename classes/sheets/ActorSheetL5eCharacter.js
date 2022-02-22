import ActorSheetL5e from "./ActorSheetL5e.js";
/**
 * Extend the basic ActorSheet class to suppose system-specific logic and functionality.
 * @abstract
 * @extends {ActorSheetL5e}
 */
export default class ActorSheetL5eCharacter extends ActorSheetL5e {

    /**
    * Activate event listeners using the prepared sheet HTML.
    * @param {jQuery} html   The prepared HTML object ready to be rendered into the DOM.
    */
    activateListeners(html) {
        console.log("LDnD5e | Configurando os Listeners da Actor Sheet...");
        super.activateListeners(html);
    }
}
import ActorSheet5e from "../../../../systems/dnd5e/module/actor/sheets/base.js";

/**
 * Extend the basic ActorSheet class to suppose system-specific logic and functionality.
 * @abstract
 * @extends {ActorSheet5e}
 */
 export default class ActorSheetL5e extends ActorSheet5e {   

    /**
   * Produce a list of armor class attribution objects.
   * @param {object} data                 Actor data to determine the attributions from.
   * @returns {AttributionDescription[]}  List of attribution descriptions.
   * @protected
   */
  _prepareArmorClassAttribution(data) {    
    const attribution = super._prepareArmorClassAttribution(data);
    const ac = data.attributes.ac;

    // Base AC Attribution
    switch ( ac.calc ) {

      // Equipment-based AC
      case "default":
        if ( ac.lan ) {
          attribution.push({
            label: game.i18n.localize("DND5E.AbilityDex"),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: ac.lan
          });
        }
        break;
    }
    return attribution;
  }

  /* -------------------------------------------- */
 }
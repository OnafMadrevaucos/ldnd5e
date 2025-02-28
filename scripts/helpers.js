/**
 * Define Helpers para o Handlebar.
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {HTMLContent}
*/
export const Debugger = function(data) {
    console.log("ldnd5e | Debugando o sistema LD&D 5e para Foundry VTT...");
    console.log(data);
}

/**
 * Define Helpers para o Handlebar.
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {HTMLContent}
 */
 export const CondHelper = function (v1, operator, v2, content) {
    
    switch (operator) {
        case '==':
            return (v1 == v2) ? content.fn(this) : content.inverse(this);
        case '===':
            return (v1 === v2) ? content.fn(this) : content.inverse(this);
        case '!=':
            return (v1 != v2) ? content.fn(this) : content.inverse(this);
        case '!==':
            return (v1 !== v2) ? content.fn(this) : content.inverse(this);
        case '<':
            return (v1 < v2) ? content.fn(this) : content.inverse(this);
        case '<=':
            return (v1 <= v2) ? content.fn(this) : content.inverse(this);
        case '>':
            return (v1 > v2) ? content.fn(this) : content.inverse(this);
        case '>=':
            return (v1 >= v2) ? content.fn(this) : content.inverse(this);
        case '&&':
            return (v1 && v2) ? content.fn(this) : content.inverse(this);
        case '||':
            return (v1 || v2) ? content.fn(this) : content.inverse(this);
        default:
            return content.inverse(this);
    }
}

/**
 * A recursive version of the core `getProperty` helper
 * @param {object} object - The object to traverse
 * @param {string} key - An object property with notation a.b.*.c where * is a wildcard
 * @param {number} [l=0] - The initial level of recursion
 * @return {*[] | *} The value of the found property
 */
 export function recursiveGetProperty(object, key, l = 0) {
    const target = foundry.utils.getProperty(object, key.split(".*.")[l]);
    const nextTarget = foundry.utils.getProperty(object, key.split(".*.")[l + 1]);
    const descend = () => { l++; return target.map(t => recursiveGetProperty(t, key, l)); }
    return Array.isArray(target) && target && nextTarget ? descend() : target;
}

/** A wrapper around the `recursiveGetProperty` helper above which always gives a single value
 * @param {object} object - The object to traverse
 * @param {string} key - An object property with notation a.b.*.c where * is a wildcard
 * @return {*} A single concatenated value of the found properties
 */
export function recursiveGetPropertyConcat(object, key) {
    const target = recursiveGetProperty(object, key);
    return Array.isArray(target) ? target.sort().deepFlatten().join("") : target;
}

/**
 * Storage for pre-localization configuration.
 * @type {object}
 * @private
 */
const _preLocalizationRegistrations = {};

/**
 * Mark the provided config key to be pre-localized during the init stage.
 * @param {string} configKeyPath          Key path within `CONFIG.DND5E` to localize.
 * @param {object} [options={}]
 * @param {string} [options.key]          If each entry in the config enum is an object,
 *                                        localize and sort using this property.
 * @param {string[]} [options.keys=[]]    Array of localization keys. First key listed will be used for sorting
 *                                        if multiple are provided.
 * @param {boolean} [options.sort=false]  Sort this config enum, using the key if set.
 */
export function preLocalize(configKeyPath, { key, keys=[], sort=false }={}) {
    if ( key ) keys.unshift(key);
    _preLocalizationRegistrations[configKeyPath] = { keys, sort };
}

/**
 * Execute previously defined pre-localization tasks on the provided config object.
 * @param {object} config  The `CONFIG.DND5E` object to localize and sort. *Will be mutated.*
 */
export function performPreLocalization(config) {
    for ( const [keyPath, settings] of Object.entries(_preLocalizationRegistrations) ) {
      const target = foundry.utils.getProperty(config, keyPath);
      _localizeObject(target, settings.keys);
      if ( settings.sort ) foundry.utils.setProperty(config, keyPath, sortObjectEntries(target, settings.keys[0]));
    }
}

/**
 * Localize the values of a configuration object by translating them in-place.
 * @param {object} obj       The configuration object to localize.
 * @param {string[]} [keys]  List of inner keys that should be localized if this is an object.
 * @private
 */
function _localizeObject(obj, keys) {
    for ( const [k, v] of Object.entries(obj) ) {
      const type = typeof v;
      if ( type === "string" ) {
        obj[k] = game.i18n.localize(v);
        continue;
      }
  
      if ( type !== "object" ) {
        console.error(new Error(
          `Pre-localized configuration values must be a string or object, ${type} found for "${k}" instead.`
        ));
        continue;
      }
      if ( !keys?.length ) {
        console.error(new Error(
          "Localization keys must be provided for pre-localizing when target is an object."
        ));
        continue;
      }
  
      for ( const key of keys ) {
        if ( !v[key] ) continue;
        v[key] = game.i18n.localize(v[key]);
      }
    }
  }

/* -------------------------------------------- */
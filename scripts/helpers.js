/**
 * Define Helpers para o Handlebar.
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {HTMLContent}
*/
export const Debugger = function(data) {
    console.log("unionV3 | Debugando o sistema Union v3 para Foundry VTT...");
    console.log(data);
}

/**
 * A recursive version of the core `getProperty` helper
 * @param {object} object - The object to traverse
 * @param {string} key - An object property with notation a.b.*.c where * is a wildcard
 * @param {number} [l=0] - The initial level of recursion
 * @return {*[] | *} The value of the found property
 */
 export function recursiveGetProperty(object, key, l = 0) {
    const target = getProperty(object, key.split(".*.")[l]);
    const nextTarget = getProperty(object, key.split(".*.")[l + 1]);
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
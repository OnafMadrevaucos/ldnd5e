import adControl from "../models/adControl.js";

/**
 * Defines the main FQL constants for module name and the DB flag.
 *
 * @type {{folderState: string, flagDB: string, moduleName: string, moduleLabel: string, primaryState: string}}
 */
 const constants = {
    moduleName: 'ldnd5e',
    moduleLabel: `Lemurian Dungeons & Dragons 5th Edition`
 };

 const i18nStrings = {
   title : "ldnd5e.title"
 };

 const gmControl = [
   {
      name: constants.moduleName,
      title: i18nStrings.title,
      icon: 'fas fa-shield-alt',
      visible: true,
      button: true
   }
 ]; 

 export { constants, gmControl, i18nStrings };
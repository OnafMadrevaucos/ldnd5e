/**
    * Preloads templates for partials
    */
 export const preloadTemplates = function()
 {
    let templates = [
       "templates/partials/pcs-list.hbs"
    ];

    templates = templates.map((t) => `modules/ldnd5e/${t}`);
    loadTemplates(templates);
 }
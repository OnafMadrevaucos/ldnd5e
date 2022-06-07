/**
    * Preloads templates for partials
    */
 export const preloadTemplates = function()
 {
    let templates = [
       "templates/partials/pcs-list.hbs",
       "templates/partials/reacao-agil.hbs",
       "templates/control-dialog.hbs",
       "templates/mainControl.hbs",
    ];

    templates = templates.map((t) => `modules/ldnd5e/${t}`);
    loadTemplates(templates);
 }
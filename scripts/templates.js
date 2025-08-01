/**
    * Preloads templates for partials
    */
 export const preloadTemplates = function()
 {
    let templates = [
         "templates/partials/unit-list.hbs",
         "templates/partials/npcs-stats.hbs", 
         "templates/partials/pcs-list.hbs",
         "templates/partials/exaust-list.hbs",
         "templates/partials/reacao-agil.hbs",
         
         "templates/control-dialog.hbs",
         "templates/config-dialog.hbs",
         "templates/mainControl.hbs",
         "templates/fatigue-dialog.hbs",

         "templates/sheets/army/header.hbs",
         "templates/sheets/army/body.hbs",
         "templates/sheets/army/footer.hbs",

         "templates/sheets/company/header.hbs",
         "templates/sheets/company/body.hbs",
         "templates/sheets/company/footer.hbs",

         "templates/sheets/unit/header.hbs",
         "templates/sheets/unit/body.hbs",
         "templates/sheets/unit/footer.hbs"
    ];

    templates = templates.map((t) => `modules/ldnd5e/${t}`);
    loadTemplates(templates);
 }
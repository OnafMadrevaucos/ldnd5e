import BaseDialog from "./BaseDialog.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

export default class ConfigDialog extends BaseDialog {
    constructor(actors, dialogData={}, options={}) {
        super(dialogData, options);
        this.actors = actors;
    }
    
    /** @inheritDoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: constants.templates.dlConfigTemplate,
            width: 420,
            classes: [(CONFIG.IsDnD2 ? "dnd5e2" : "dnd5e"), "dialog"]
        });
    }

    /** @inheritDoc */
    getData() {
        const data = super.getData();
        data.actors = this.actors;        
        return data;
    }

    /** @override */
   activateListeners(html) {
        html.find(".select-all").click(this._onSelectAllClick.bind(this));

        super.activateListeners(html);
    }

    /**
   * A helper constructor function which displays the Absorved Damage dialog and returns a Promise once it's
   * workflow has been resolved.
   * @param {object}  [options={}]
   * @param {Array[Actor5e]} [actors]       Array of Player's Characters Actors.   
   * @returns {Promise}                     Promise that resolves when the rest is completed or rejects when canceled.
   */
    static async configDialog({actors} = {}) {        
        return new Promise((resolve, reject) => {
            const dlg = new this(actors, {
                title: game.i18n.localize(i18nStrings.dlControlTitle),             
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-floppy-disk"></i>',
                        label: game.i18n.localize(i18nStrings.saveBtn),
                        callback: html => resolve(ConfigDialog.onDialogSubmit(html))
                    },
                    no: {
                        icon: '<i class="fas fa-ban"></i>',
                        label: game.i18n.localize(i18nStrings.cancelBtn),
                        callback: reject()
                    }
                },
                default: "yes",
                close: reject()
            });

            dlg.render(true);
        });
    }   

    /**
    * The submition function for the dialog.
    * @param {object}  [hmtl]       The DOM Element for the dialog context.   
    * @returns null                 Promise that resolves when the rest is completed or rejects when canceled.
    */    
    static async onDialogSubmit(html) {
        const app = html[0];
        var selectAll = false;          
        [...app.querySelectorAll('li')].forEach(async (item) => {
            const checkbox = item.querySelectorAll('input')[0];

            if(!item.classList.contains("select-all")) {                                   
                const actorId = item.dataset.actorId;
                const actor = game.actors.get(actorId);

                await actor.setFlag("ldnd5e", "dasEnabled", (selectAll ? true : checkbox.checked));
            }
            else selectAll = checkbox.checked;                
        });
    }

    _onSelectAllClick(event) {
        const app = event.currentTarget.parentElement;
        var selectAll = false;

        [...app.querySelectorAll('li')].forEach(async (item) => {
            const checkbox = item.querySelectorAll('input')[0];

            if(!item.classList.contains("select-all")) {                                   
                checkbox.checked = selectAll;
            }
            else selectAll = checkbox.checked;  
        });
    }
}
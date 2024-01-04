import ActorL5e from "../entities/ActorL5e.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

export default class FatigueDialog extends Dialog {
    constructor(owner, item, dialogData={}, options={}) {
        super(dialogData, options);
    
        /**
         * Store a reference to the Actor document which is resting
         * @type {ActorL5e}
         */
        this.owner = owner;

        /**
         * Store a reference to the Unarmored pseudo-Item document
         * @type {pseudo-ItemL5e}
         */
        this.item = item;
    }

    /** @inheritDoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: constants.templates.fatigueDialogTemplate,
            classes: ["dnd5e", "dialog"]
        });
    }

    /** @inheritDoc */
    getData() {
        const data = super.getData(); 
        data.label = game.i18n.format(i18nStrings.messages.fatigueMessage, {owner: this.owner.name});
        data.RollDC = 8 + this.item.system.armor.RealDL;       
        return data;
    } 

    /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Long Rest confirmation dialog and returns a Promise once it's
   * workflow has been resolved.
   * @param {object} [options={}]
   * @param {Actor5e} [options.owner]  Actor that is taking the long rest.
   * @param {pseudo-ItemL5e} [options.item]  Unarmored pseudo-Item document.
   * @returns {Promise}                Promise that resolves when the rest is completed or rejects when canceled.
   */
    static async fatigueDialog({ owner, item } = {}) {
        return new Promise((resolve, reject) => {
            const dlg = new this(owner, item, {
            title: game.i18n.localize(i18nStrings.fatigueDialogTitle),           
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: game.i18n.localize(i18nStrings.fatigueDialogRollBtn),
                    callback: html => {
                        const result = das.rollFatigue(item, owner);
                        resolve(result);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize(i18nStrings.cancelBtn),
                    callback: reject
                }
            },
            close: reject
        });
        dlg.render(true);
    });
  }
}
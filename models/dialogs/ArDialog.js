import * as ars from "../../scripts/ARSystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

export default class ArDialog extends Dialog {
    constructor(actor, rightClick, dialogData={}, options={}) {
        super(dialogData, options);
    
        /**
         * Store a reference to the Actor document which is executing an Agile Reaction
         * @type {ActorL5e}
         */
        this.actor = actor;

        /**
         * Store a reference to the type of event
         * @type {Event}
         */
        this.rightClick = rightClick;
    }

    /** @inheritDoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: constants.templates.arControlTemplate,            
            classes: ["dnd5e", "dialog"]
        });
    }

    /** @inheritDoc */
    getData() {
        const data = super.getData();

        data.actor = this.actor;
        data.label = game.i18n.format(i18nStrings.messages.arMaxedOut, {actor: this.actor.name});        
        data.labelObs = game.i18n.localize(i18nStrings.messages.arControlLabelObs);
        return data;
    } 

    /* -------------------------------------------- */

    /**
   * A helper constructor function which displays the Confirm Agile Reaction's Dialog and returns a Promise once it's
   * workflow has been resolved.
   * @param {object}  [options={}]
   * @param {Actor5e} [options.actor]        Actor document which is executing an Agile Reaction.
   * @param {ItemL5e} [options.rightClick]   Type of event.
   * @returns {Promise}                     Promise that resolves when the rest is completed or rejects when canceled.
   */
    static async configDialog({ actor, rightClick } = {}) {
        const onSubmit = async function(html, data, options={}) {
            await ars.updateExhaustionLevel(data);    
        }

        return new Promise((resolve, reject) => {
            const dlg = new this(actor, rightClick, {
                title: game.i18n.localize(i18nStrings.dlControlTitle),             
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize(i18nStrings.yesBtn),
                        callback: html => resolve(onSubmit(html, {actor, rightClick}))                        
                    },
                    nos: {
                        icon: '<i class="fas fa-xmark"></i>',
                        label: game.i18n.localize(i18nStrings.noBtn),
                        callback: reject
                    }
                },
                default: "yes",
                close: reject
            });
    
            dlg.render(true);
        });        
    }

    /* -------------------------------------------- */
}
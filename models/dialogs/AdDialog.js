import BaseDialog from "./BaseDialog.js";
import * as das from "../../scripts/DASystem.js";
import { constants, i18nStrings } from "../../scripts/constants.js";

export default class AdDialog extends BaseDialog {
    constructor(owner, item, damageType, unarmored, dialogData = {}, options = {}) {
        super(dialogData, options);

        /**
         * Store a reference to the Actor document which is resting
         * @type {ActorL5e}
         */
        this.owner = owner;

        /**
         * Store a reference to the Damaged Equipament document
         * @type {ItemL5e}
         */
        this.item = item;

        /**
         * Store a reference to the Equipament's absorved damage type.
         * @type {string}
         */
        this.damageType = damageType;

        /**
         * Store a reference to the type of Equipament (Armored or Unarmored).
         * @type {boolean}
         */
        this.unarmored = unarmored;

        /**
         * Store a reference to the Dialog's Height.
         * @type {boolean}
        */
        this.height = (unarmored ? 165 : 220);
    }

    /** @inheritDoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: constants.templates.dlControlTemplate,
            width: 420,
            height: this.height
        });
    }

    /** @inheritDoc */
    getData() {
        const data = super.getData();
        const itemData = this.item.system;

        data.owner = this.owner;
        data.item = this.item;
        data.damageType = game.i18n.localize(`ldnd5e.damageTypes.${this.damageType}`);
        data.ACPenalty = itemData.armor.ACPenalty;
        data.RealDL = itemData.armor.RealDL;
        data.unarmored = this.unarmored;
        data.repairsToolTips = {
            smith: game.i18n.localize(i18nStrings.dlControlSmithRepair),
            notSmith: game.i18n.localize(i18nStrings.dlControlNotSmithRepair)
        };
        data.price = itemData.price?.value ?? 0;
        data.fee = constants.repairFee;
        return data;
    }

    /* -------------------------------------------- */

    /**
    * A helper constructor function which displays the Absorved Damage dialog and returns a Promise once it's
    * workflow has been resolved.
    * @param {object}  [options={}]
    * @param {Actor5e} [options.owner]       Actor that is taking the long rest.
    * @param {ItemL5e} [options.item]        Damaged Equipament document.
    * @param {string}  [options.damageType]   Equipament's absorved damage type.
    * @param {boolean} [options.unarmored]    Equipament type (Armored or Unarmored).
    * @returns {Promise}                     Promise that resolves when the rest is completed or rejects when canceled.
    */
    static async configDialog({ owner, item, damageType, unarmored } = {}) {

        const onSubmitDA = async function (html, data, options = {}) {
            const unarmored = data.unarmored;
            const owner = data.owner;
            const item = ((data.item.type !== 'feat' && data.item.armorType != das.TIPO_ARMOR.SHIELD) ? owner.system.attributes.ac.equippedArmor : data.item);
            const dlType = data.damageType;

            const result = await das.computaDA(item, owner, dlType);
            await das.prepareActiveEffects(item, owner, result, { unarmored: unarmored });
        }

        const onSubmitHALF = async function (html, data, options = {}) {
            const unarmored = data.unarmored;
            const owner = data.owner;
            const item = ((data.item.type !== 'feat' && data.item.armorType != das.TIPO_ARMOR.SHIELD) ? owner.system.attributes.ac.equippedArmor : data.item);
            const dlType = data.damageType;

            const result = await das.computaHALF(item, owner, dlType);
            await das.prepareActiveEffects(item, owner, result, { unarmored: unarmored });
        }

        const onSubmitSUB = async function (html, data, options = {}) {
            const form = html[0].querySelector("form");
            const owner = data.owner;
            const item = ((data.item.type !== 'feat' && data.item.armorType != das.TIPO_ARMOR.SHIELD) ? owner.system.attributes.ac.equippedArmor : data.item);
            const dlType = data.damageType;

            options.repair = true;
            options.price = parseInt(form.repairLvlPrice.value);
            options.repairLvl = parseInt(form.repairLvlSlider.value);

            if (options.repairLvl === 0) return;

            const toExpensive = das.verifyRepairCost(((options?.price ?? 0)), owner);
            if (toExpensive) {
                ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, { actor: owner.name }));
                return;
            }

            options.smithRepairChk = form.querySelector('.not-smith') ? false : true;

            const result = das.computaSUB(item, owner, dlType, options);
            await das.prepareActiveEffects(item, owner, result, options);
        }

        const onSubmitZERAR = async function (html, data, options = {}) {
            const form = html[0].querySelector("form");
            const owner = data.owner;
            const item = ((data.item.type !== 'feat' && data.item.armorType != das.TIPO_ARMOR.SHIELD) ? owner.system.attributes.ac.equippedArmor : data.item);
            const itemData = item.system;

            const price = itemData.price?.value ?? 0;
            options.repair = true;

            if (options?.fullRepair) {
                options.price = price;
                options.smithRepairChk = form.querySelector('.smith-repair')?.checked ?? false;
            }
            else {
                options.price = price * constants.repairFee * itemData.armor.RealDL;
                options.smithRepairChk = form.querySelector('.not-smith') ? false : true;
            }

            const toExpensive = das.verifyRepairCost(((options?.price ?? 0)), owner);
            if (toExpensive) {
                ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, { actor: owner.name }));
                return;
            }

            const result = das.computaZERAR(item, owner);
            await das.prepareActiveEffects(item, owner, result, options);
        }

        if (unarmored) {
            return new Promise((resolve, reject) => {
                const dlg = new this(owner, item, damageType, unarmored, {
                    title: game.i18n.localize(i18nStrings.dlControlTitle),
                    buttons: {
                        da: {
                            icon: '<i class="fas fa-shield"></i>',
                            label: game.i18n.localize(i18nStrings.addBtn),
                            callback: (html) => {
                                onSubmitDA(html, { owner, item, damageType, unarmored });
                                resolve(true);
                            }
                        },
                        half: {
                            icon: '<i class="fas fa-shield-halved"></i>',
                            label: game.i18n.localize(i18nStrings.halfBtn),
                            callback: (html) => {
                                onSubmitHALF(html, { owner, item, damageType, unarmored })
                                resolve(true);
                            }
                        }
                    },
                    default: "da",
                    close: reject
                });

                dlg.render(true);
            });
        } else {
            return new Promise((resolve, reject) => {
                const dlg = new this(owner, item, damageType, unarmored, {
                    title: game.i18n.localize(i18nStrings.dlControlTitle),
                    buttons: {
                        da: {
                            icon: '<i class="fas fa-shield"></i>',
                            label: game.i18n.localize(i18nStrings.addBtn),
                            callback: (html) => {
                                onSubmitDA(html, { owner, item, damageType, unarmored });
                                resolve(true);
                            }
                        },
                        half: {
                            icon: '<i class="fas fa-shield-halved"></i>',
                            label: game.i18n.localize(i18nStrings.halfBtn),
                            callback: (html) => {
                                onSubmitHALF(html, { owner, item, damageType, unarmored })
                                resolve(true);
                            }
                        },
                        sub: {
                            icon: '<i class="fa-regular fa-heart"></i>',
                            label: game.i18n.localize(i18nStrings.subBtn),
                            callback: (html) => {
                                onSubmitSUB(html, { owner, item, damageType, unarmored });
                                resolve(true);
                            }
                        },
                        zerar: {
                            icon: '<i class="fa-solid fa-heart"></i>',
                            label: game.i18n.localize(i18nStrings.zerarBtn),
                            callback: (html) => {
                                onSubmitZERAR(html, { owner, item, damageType, unarmored })
                                resolve(true);
                            }
                        }
                    },
                    default: "da",
                    close: reject
                });
                dlg.render(true);
            });
        }
    }

    /* -------------------------------------------- */
}
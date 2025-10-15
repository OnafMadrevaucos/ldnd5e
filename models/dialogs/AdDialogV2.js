import { constants, i18nStrings } from "../../scripts/constants.js";
import * as das from "../../scripts/DASystem.js";

const api = dnd5e.applications.api;

export default class AdDialogV2 extends api.Dialog5e {
    constructor(config, options = {}) {
        super(options);

        this.config = config;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["ad-dialog", "dialog"],
        window: {
            title: "ldnd5e.dlControlTitle"
        },
        form: {
            handler: AdDialogV2.#handleFormSubmission
        },
        actions: {
            daClick: AdDialogV2.#daClick,
            halfClick: AdDialogV2.#halfClick,
            subClick: AdDialogV2.#subClick,
            zerarClick: AdDialogV2.#zerarClick,

            smithRepair: AdDialogV2.#smithRepair
        },
        position: {
            width: 420,
            height: this.height
        },
        buildConfig: null
    };

    /* -------------------------------------------- */

    /** @override */
    static PARTS = {
        content: {
            template: "modules/ldnd5e/templates/dialogs/damage-control/body.hbs"
        },
        footer: {
            template: "modules/ldnd5e/templates/dialogs/damage-control/footer.hbs"
        }
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The target actor.
     * @type {ActorL5e|null}
     */
    get actor() {
        return this.config.actor ?? null;
    }

    /**
     * The target actor.
     * @type {ItemL5e|null}
     */
    get item() {
        return this.config.item ?? null;
    }

    /**
     * The damage type taken by the item.
     * @type {string|null}
     */
    get damageType() {
        return this.config.damageType ?? null;
    }

    /**
     * If the actor has or not an armor equipped.
     * @type {boolean|null}
     */
    get unarmored() {
        return this.config.unarmored ?? null;
    }

    /**
     * The dialog height.
     * @type {Number}
     */
    get height() {
        return this.config.unarmored ? 165 : 220;
    }

    get ok() {
        return this.#ok;
    }

    #ok = false;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        if (options.isFirstRender) options.window.icon ||= this.actor.img;
    }

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
        context = { ...(await super._preparePartContext(partId, context, options)) };

        context.actor = this.actor;
        context.item = this.item;
        context.unarmored = this.unarmored;

        if (partId === "content") return this._prepareContentContext(context, options);
        if (partId === "footer") return this._prepareButtonsContext(context, options);
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the main body section.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _prepareContentContext(context, options) {
        const itemData = this.item.system;
        
        context.damageType = game.i18n.localize(`ldnd5e.damageTypes.${this.damageType}`);
        context.ACPenalty = itemData.armor.ACPenalty;
        context.RealDL = itemData.armor.RealDL;       

        context.repairLevelLabel = game.i18n.format(i18nStrings.dlControlRepairLvl, { level: '0' });
        context.price = itemData.price?.value ?? 0;
        context.fee = constants.repairFee;       

        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare rendering context for the buttons.
     * @param {ApplicationRenderContext} context  Context being prepared.
     * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
     * @returns {Promise<ApplicationRenderContext>}
     * @protected
     */
    async _prepareButtonsContext(context, options) {        
        context.repairTooltip = game.i18n.localize(i18nStrings.dlControlSmithRepair);       

        context.buttons = {
            da: {
                default: true,
                icon: '<i class="fas fa-shield"></i>',
                label: game.i18n.localize(i18nStrings.addBtn),
            },
            half: {
                icon: '<i class="fas fa-shield-halved"></i>',
                label: game.i18n.localize(i18nStrings.halfBtn),
            },
            sub: {
                icon: '<i class="fa-regular fa-heart"></i>',
                label: game.i18n.localize(i18nStrings.subBtn),
                hidden: this.unarmored
            },
            zerar: {
                icon: '<i class="fa-solid fa-heart"></i>',
                label: game.i18n.localize(i18nStrings.zerarBtn),
                hidden: this.unarmored
            }
        };

        return context;
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);

        this.activateListeners();
    }

    /* -------------------------------------------- */

    /**
     * Activate listeners for the application.
     * @return {void}
     */
    activateListeners() {
        // Unarmored Defenses cannot be repaired.
        if(this.unarmored) return;

        const slider = this.element.querySelector(".repair-level");
        slider.addEventListener("input", AdDialogV2.#changeRepairLevel.bind(this));
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
   * Handle submission of the dialog using the form buttons.
   * @this {AdDialogV2}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
    static async #handleFormSubmission(event, form, formData) {
        foundry.utils.mergeObject(this.config, formData.object);
        await this.close();
    }

    /* -------------------------------------------- */

    /**
     * Handle choosing a full damage to the armor.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #daClick(event, target) {
        const unarmored = this.unarmored;
        const actor = this.actor;
        const item = ((this.item.type !== 'feat' && this.item.armorType != das.TIPO_ARMOR.SHIELD) ? actor.system.attributes.ac.equippedArmor : this.item);
        const dlType = this.damageType;

        var result = await das.computaDA(item, actor, dlType);
        this.#ok = await das.prepareActiveEffects(item, actor, result, { unarmored: unarmored });
    }

    /* -------------------------------------------- */

    /**
     * Handle choosing only half damage to the armor.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #halfClick(event, target) {
        const unarmored = this.unarmored;
        const actor = this.actor;
        const item = ((this.item.type !== 'feat' && this.item.armorType != das.TIPO_ARMOR.SHIELD) ? actor.system.attributes.ac.equippedArmor : this.item);
        const dlType = this.damageType;

        const result = await das.computaHALF(item, actor, dlType);
        this.#ok = await das.prepareActiveEffects(item, actor, result, { unarmored: unarmored });
    }

    /* -------------------------------------------- */

    /**
     * Handle choosing clear some damage taken from the armor.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #subClick(event, target) {
        const content = this.element.querySelector(".dialog-content");
        const repairLvlSlider = content.querySelector(".repair-level");
        const repairPriceInput = content.querySelector(".repair-price");

        const actor = this.actor;
        const item = ((this.item.type !== 'feat' && this.item.armorType != das.TIPO_ARMOR.SHIELD) ? actor.system.attributes.ac.equippedArmor : this.item);
        const itemData = item.system;
        const dlType = this.damageType;

        if(itemData.armor.RealDL === 0) {
            ui.notifications.info(game.i18n.format(i18nStrings.messages.itemUndamaged, { item: item.name }));
            return;
        }

        const options = {
            ...this.config,
            repair: true,
            price: parseInt(repairPriceInput.value),
            repairLvl: parseInt(repairLvlSlider.value),
            smithRepair: this.smithRepair
        }

        if (options.repairLvl === 0) return;

        const toExpensive = das.verifyRepairCost(((options?.price ?? 0)), actor);
        if (toExpensive) {
            ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, { actor: actor.name }));
            return;
        }

        const result = das.computaSUB(item, actor, dlType, options);
        this.#ok = await das.prepareActiveEffects(item, actor, result, options);
    }

    /* -------------------------------------------- */

    /**
     * Handle choosing clear all damage taken form the armor.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #zerarClick(event, target) {
        const actor = this.actor;
        const item = ((this.item.type !== 'feat' && this.item.armorType != das.TIPO_ARMOR.SHIELD) ? actor.system.attributes.ac.equippedArmor : data.item);
        const itemData = item.system;

        if(itemData.armor.RealDL === 0) {
            ui.notifications.info(game.i18n.format(i18nStrings.messages.itemUndamaged, { item: item.name }));
            return;
        }

        const price = itemData.price?.value ?? 0;
        const options = {
            ...this.config,
            repair: true,
            smithRepair: this.smithRepair
        }

        if (options?.fullRepair) {
            options.price = price;
        }
        else {
            options.price = price * constants.repairFee * itemData.armor.RealDL;
        }

        const toExpensive = das.verifyRepairCost(((options?.price ?? 0)), actor);
        if (toExpensive) {
            ui.notifications.warn(game.i18n.format(i18nStrings.messages.repairToExpensive, { actor: actor.name }));
            return;
        }

        const result = das.computaZERAR(item, actor);
        this.#ok = await das.prepareActiveEffects(item, actor, result, options);         
    }

    /* -------------------------------------------- */

    /**
     * Handle changing the repair level.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #changeRepairLevel(event) {
        const target = event.target;

        if (!this.unarmored) {
            const section = target.closest('.dialog-content');
            const slider = target;

            const levelLabel = section.querySelector(".repair-level-label");
            levelLabel.innerText = game.i18n.format(i18nStrings.dlControlRepairLvl, { level: slider.value });

            const priceInput = section.querySelector(".repair-price");
            const price = priceInput.dataset.price;
            const fee = priceInput.dataset.fee;

            priceInput.value = Number(price) * Number(fee) * Number(slider.value);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling the smith repair option.
     * @this {AdDialogV2}
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The activity button that was clicked.
     */
    static async #smithRepair(event, target) {
        target.classList.toggle('smith-repair');
        this.smithRepair = target.classList.contains('smith-repair');
    }

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Display the creation dialog.
     * @param {object} config               Configuration options.
     * @param {ActorL5e} config.actor       The target actor.
     * @param {ItemL5e} config.item         The damaged item.
     * @param {string} config.damageType    The absorved damage type.
     * @param {boolean} config.unarmored    If the actor is unarmored.
     * 
     * @param {object} [options={}]         Additional options for the application.
     * @returns {Promise<boolean|null>}     Transformation settings to apply.
     */
    static async create(config, options = {}) {
        return new Promise((resolve, reject) => {
            const dialog = new this(config, options);
            dialog.addEventListener("close", () => dialog.ok === true ? resolve(true) : dialog.ok === false ? resolve(false) : reject(null), { once: true });
            dialog.render({ force: true });
        });
    }
}
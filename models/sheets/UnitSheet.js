import { assetsData, constants, i18nStrings, unitData } from "../../scripts/constants.js";
import CategoryEditor from "../dialogs/CategoryEditor.js";

const { api: api, sheets: sheets } = foundry.applications;

export default class UnitSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
  static MODES = {
    PLAY: 0,
    EDIT: 1
  }

  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2", "sheet", "actor", "ldnd5e", "unit", "standard-form", "npc", "interactable"],
    position: {
      width: 750,
      height: 740
    },
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    actions: {
      removeTatic: UnitSheet.#removeTatic,
      removeAsset: UnitSheet.#removeAsset,
      showConfiguration: UnitSheet.#showConfiguration,
      showTooltip: UnitSheet.#showTooltip,
      changeProf: UnitSheet.#changeProf,
      showTatic: UnitSheet.#showTatic,
      useTatic: UnitSheet.#useTatic,
      roll: UnitSheet.#roll,
      toggleTraining: UnitSheet.#toggleTraining,
      decrease: UnitSheet.#decrease,
      increase: UnitSheet.#increase
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "modules/ldnd5e/templates/sheets/unit/header.hbs",
    },
    body: {
      template: "modules/ldnd5e/templates/sheets/unit/body.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  get isModel() {
    return this.actor.system.info.company === null;
  }

  get unitButtons() {
    return this.#unitButtons;
  }

  #unitButtons = {
    description: {
      name: "description",
      active: false,
      icon: 'ra ra-scroll-unfurled'
    },
    assets: {
      name: "assets",
      active: false,
      icon: 'ra ra-knight-helmet'
    }
  };

  /**
  * A map of proficiency level labels.
  * @type {Object|null}
  */
  get profLevelLabel() {
    return {
      0: 'none',
      1: 'low',
      2: 'medium',
      3: 'high'
    }
  }

  /**
  * A flag indicating if the actor is a medical unit.
  * @type {Boolean|null}
  */
  get isMedical() {
    return this.actor.system.info.type === unitData.uTypes.medical;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Set toggle state and add status class to frame
    this._renderModeToggle();
    this.element.classList.toggle("editable", this.isEditable && (this._mode === this.constructor.MODES.EDIT));
    this.element.classList.toggle("interactable", this.isEditable && (this._mode === this.constructor.MODES.PLAY));
    this.element.classList.toggle("locked", !this.isEditable);

    // Handle delta inputs
    this.element.querySelectorAll('input[type="text"][data-dtype="Number"]')
      .forEach(i => i.addEventListener("change", this._onChangeInputDelta.bind(this)));
  }

  /* -------------------------------------------- */

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @protected
   */
  _renderModeToggle() {
    const header = this.element.querySelector(".window-header");
    const toggle = header.querySelector(".mode-slider");
    if (this.isEditable && !toggle) {
      const toggle = document.createElement("slide-toggle");
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
      toggle.classList.add("mode-slider");
      toggle.dataset.tooltip = "DND5E.SheetModeEdit";
      toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
      toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
      toggle.addEventListener("dblclick", event => event.stopPropagation());
      toggle.addEventListener("pointerdown", event => event.stopPropagation());
      header.prepend(toggle);
    } else if (this.isEditable) {
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
    } else if (!this.isEditable && toggle) {
      toggle.remove();
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onClose() {
    // Reset unit buttons before closing.
    Object.values(this.#unitButtons).forEach(ub => ub.active = false);

    super._onClose();
  }

  /* -------------------------------------------- */

  /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
     * @param {Event} event  Triggering event.
     * @protected
     */
  async _onChangeInputDelta(event) {
    const input = event.target;
    const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;

    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const activity = (target.type !== 'ldnd5e.tatic' ? target.system.activities.get(activityId) : null);

    const result = dnd5e.utils.parseInputDelta(input, activity ?? target);
    if (result !== undefined) {
      await target.update({ [input.dataset.name]: result });
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Set editable the current form mode.
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

    // Prepare the actor data for rendering.
    Object.assign(context, {
      actor: this.actor,
      system: this.actor.system,
      fullPrice: this.actor.system.fullPrice,
      isModel: this.isModel,
      hasCompany: !!this.actor.system.info.company,
      company: this.actor.system.info.company || null,
      hasCommander: !!this.actor.system.info.company?.system.info.commander,
      commander: this.actor.system.info.company?.system.info.commander || null,
      isLight: this.actor.system.info.type === unitData.uTypes.light,
      isHeavy: this.actor.system.info.type === unitData.uTypes.heavy,
      isSpecial: this.actor.system.info.type === unitData.uTypes.special,
      isMedical: this.isMedical,
    });

    // Prepare the actor's unit types.
    this._prepareUTypes(context);

    // Prepare the actor's unit proficiencies.
    this._prepareUProf(context);

    // Prepare the actor's category.
    this._prepareCategories(context);

    // Prepare the actor's skills.
    this._prepareCombat(context);

    // Prepare the actor's items.
    this._prepareTatics(context);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {

    switch (partId) {
      case "header": await this._prepareHeaderContext(context, options); break;
      case "body": await this._prepareBodyContext(context, options); break;
      case "footer": break;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the header.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    context.portrait = this._preparePortrait(context);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the body.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareBodyContext(context, options) {
    // Prepare the unit buttons.    
    context.buttons = this._prepareUnitButtons();

    // Prepare Unit's assets.
    context.assets = this._prepareAssets();

    // Calculate total assets cost.
    let totalAssetsCost = 0;
    context.assets.forEach(asset => {
      totalAssetsCost += asset.price.value * asset.quantity;
    });
    context.totalAssetsCost = totalAssetsCost;

    return context;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor portrait for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _preparePortrait(context) {
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    const defaultArtwork = Actor.implementation.getDefaultArtwork(this.actor._source)?.img;
    return {
      token: showTokenPortrait,
      src: showTokenPortrait ? token.texture.src : this.actor.img ?? defaultArtwork,
      // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
      path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
    };
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor unit type for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareUTypes(context) {
    const uTypes = {};

    for (const type in unitData.uTypes) {
      uTypes[type] = {};

      uTypes[type].type = type;
      uTypes[type].label = game.i18n.localize(`ldnd5e.uTypes.${type}`);
    }

    context.uTypes = uTypes;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor unit proficiencies for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareUProf(context) {
    const uProf = {};

    Object.entries(this.actor.system.prof).forEach(([key, value]) => {
      uProf[key] = {
        value: this.profLevelLabel[value],
        label: `${game.i18n.localize(`ldnd5e.uProf.${key}`)} (${game.i18n.localize(`ldnd5e.uProfLevel.${this.profLevelLabel[value]}`)})`
      };
    });

    context.uProf = uProf;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor unit category for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareCategories(context) {
    const categories = {};

    for (const category in unitData.categories) {
      categories[category] = {};

      categories[category].value = category;
      categories[category].label = game.i18n.localize(`ldnd5e.categories.${category}`);
    }

    context.categories = categories;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor unit type for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareCombat(context) {
    const skills = this.actor.system.combat;

    context.skills = skills;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor tatics' items.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareTatics(context) {
    const items = this.actor.items.filter(i => i.type === "ldnd5e.tatic");
    const tatics = [
      { label: game.i18n.localize('ldnd5e.tatics.cr.0'), items: [] },
      { label: game.i18n.localize('ldnd5e.tatics.cr.1'), items: [] },
      { label: game.i18n.localize('ldnd5e.tatics.cr.2'), items: [] },
      { label: game.i18n.localize('ldnd5e.tatics.cr.3'), items: [] },
      { label: game.i18n.localize('ldnd5e.tatics.cr.4'), items: [] },
      { label: game.i18n.localize('ldnd5e.tatics.cr.5'), items: [] },
    ];

    items.forEach(item => {
      tatics[item.system.info.cr].items.push(item);
    });

    context.tatics = tatics;
  }

  /* -------------------------------------------- */

  /**
 * Prepare sheet buttons.
 * @returns {object}
 * @protected
 */
  _prepareUnitButtons() {
    const buttons = this.element.querySelectorAll(".unit-info .unit-buttons a.icon");
    const tooltips = this.element.querySelectorAll(".unit-info .unit-tooltip");

    for (const tooltip of tooltips) {
      const name = tooltip.dataset.name;
      const btnState = this.unitButtons[name];

      btnState.active = tooltip.classList.contains("active");
    }

    return this.unitButtons;
  }

  /* -------------------------------------------- */

  /**
 * Prepare Unit's assets.
 * @returns {object}
 * @protected
 */
  _prepareAssets() {
    const items = this.actor.items.filter(i => i.type === "ldnd5e.asset");
    const assets = [];

    items.forEach(item => {
      assets.push({
        uuid: item.uuid,
        id: item.id,
        name: item.name,
        img: item.img,
        quantity: item.system.quantity,
        price: item.system.info.price,
        assetType: {
          label: game.i18n.localize(`ldnd5e.assets.types.${item.system.info.type}`),
          icon: assetsData.typesIcons[item.system.info.type]
        },
      });
    });

    return assets;
  }

  /* -------------------------------------------- */

  /**
 * Prepare actor tatics' items.
 * @this {UnitSheet}
 * @param {TaticsL5e} tatic  The updated Tatic.
 * @async
 * @protected
 */
  async _updateDeckTatic(tatic) {
    // TODO: Prevent any update if a battle is active.

    const company = this.actor.system.info.company;
    // If this unit is part of a company.
    if (company) {
      const commander = company?.system.info.commander ?? null;
      if (!commander) return;

      await this._buildDeck(commander);
    }
  }

  /* -------------------------------------------- */

  async _buildDeck(commander) {
    let deck = {
      hand: {
        tatics: [],
        max: 5
      },
      piles: {
        tatics: [],
        discarded: [],
        assets: []
      }
    };

    this.actor.items.forEach(tatic => {
      if (tatic.system.trainning) {
        for (let i = 0; i < tatic.system.quantity; i++) {
          deck.piles.tatics.push(tatic.uuid);
        }
      }
    });

    await commander.setFlag("ldnd5e", "deck", deck);
  }

  /* -------------------------------------------- */
  /*  Events Listeners                            */
  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sheet mode.
   * @param {Event} event  The triggering event.
   * @protected
   */
  async _onChangeSheetMode(event) {
    const { MODES } = this.constructor;
    const toggle = event.currentTarget;
    const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    await this.submit();
    this.render();
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, data) {
    const windowContent = this.element.querySelector(".window-content");
    if (windowContent.classList.contains("disabled")) {
      ui.notifications.warn(game.i18n.localize("ldnd5e.unit.model"));
      return;
    }
    const item = await Item.implementation.fromDropData(data);

    await this.actor.createEmbeddedDocuments("Item", [item]);
  }

  /* -------------------------------------------- */
  /*  Form Actions                                */
  /* -------------------------------------------- */

  /**
   * Removes a tatics from the unit.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #removeTatic(event, target) {
    const item = target.closest('li.item');
    const taticId = item.dataset.itemId;
    const tatic = this.actor.items.get(taticId);

    // Ignore if no tatic found.
    if (!tatic) return;

    await this.actor.deleteEmbeddedDocuments("Item", [tatic.id]);
  }

  /* -------------------------------------------- */

  /**
   * Removes an asset from the unit.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #removeAsset(event, target) {
    const item = target.closest('li.item');
    const assetId = item.dataset.itemId;
    const asset = this.actor.items.get(assetId);

    // Ignore if no asset found.
    if (!asset) return;

    await this.actor.deleteEmbeddedDocuments("Item", [asset.id]);
  }

  /* -------------------------------------------- */

  /**
   * Opens the unit's category editor.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #showConfiguration(event, target) {
    const categoryEditor = new CategoryEditor({
      document: this.actor
    });
    categoryEditor.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Opens the unit's description.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #showTooltip(event, target) {
    const button = target.closest("a");
    const clickedName = button.dataset.name;

    const unitInfo = target.closest(".unit-info");
    const buttons = unitInfo.querySelectorAll("a.icon");
    const tooltips = unitInfo.querySelectorAll(".unit-tooltip");

    buttons.forEach(btn => {
      const btnState = this.unitButtons[btn.dataset.name];
      

      if (btnState.name !== clickedName) {
        btnState.active = false;
        btn.classList.remove("active");
      }
      else {
        btnState.active = !btnState.active;
        btn.classList.toggle("active");
      }      
    });

    tooltips.forEach(tooltip => {
      if (tooltip.dataset.name !== clickedName)
        tooltip.classList.remove("active");
      else
        tooltip.classList.toggle("active");
    });    
  }

  /* -------------------------------------------- */

  /**
   * Toggles the unit's proficiency.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #changeProf(event, target) {
    const key = target.dataset.prof;

    this.actor.system.prof[key] = (this.actor.system.prof[key] == unitData.uProfLevel.high ?
      unitData.uProfLevel.none : this.actor.system.prof[key] + 1);

    await this.actor.update({ [`system.prof`]: this.actor.system.prof });
  }

  /* -------------------------------------------- */

  /**
   * Opens the unit's description.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #showTatic(event, target) {
    const taticId = target.closest('.tatic')?.dataset.itemId;
    if (!taticId) return;

    const tatic = this.actor.items.get(taticId);
    tatic.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Opens the unit's description.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #useTatic(event, target) {
    // Ignore if this is a model sheet.
    if (this.isModel) return;

    const taticId = target.closest('.tatic')?.dataset.itemId;
    if (!taticId) return;

    const tatic = this.actor.items.get(taticId);
    if (!tatic) return;

    await tatic.use({ event });
  }

  /* -------------------------------------------- */

  /**
   * Roll any check or saving throw fo the company.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #roll(event, target) {
    // Ignore if this is a model sheet.
    if (this.isModel) return;

    if (!target.classList.contains("rollable")) return;

    switch (target.dataset.type) {
      case "ability": {
        const ability = target.closest("[data-ability]")?.dataset.ability;
        return this.actor.system.rollAbilityCheck({ ability: ability }, { event }, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
      };
      case "save": {
        const ability = target.closest("[data-ability]")?.dataset.ability;
        return this.actor.system.rollSavingThrow({ skill: ability, event }, {}, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });        
      };
      case "skill": {
        const skill = target.closest("[data-key]")?.dataset.key;
        return this.actor.system.rollSkill({ skill: skill }, { event }, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll any check or saving throw fo the company.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #toggleTraining(event, target) {
    const taticId = target.closest(".tatic")?.dataset.itemId;
    if (!taticId) return;

    const tatic = this.actor.items.get(taticId);
    await tatic.update({
      ["system.trainning"]: !tatic.system.trainning,
      ["system.quantity"]: 1
    });

    this._updateDeckTatic();
  }

  /* -------------------------------------------- */

  /**
   * Decrease an unit property value.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #decrease(event, target) {
    const property = target.dataset.property;
    const itemId = target.closest(".item")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    const value = foundry.utils.getProperty(item, property);

    // There is no sense in a 0 number of tatics.
    if (item.type === "ldnd5e.tatic") {
      // Prevent decreasing the quantity to 0.
      if (value - 1 == 0) return;
    } else {
      // Prevent decreasing below 0.
      if (value - 1 < 0) return;
    }

    await item.update({ [property]: value - 1 });

    this._updateDeckTatic();
  }

  /* -------------------------------------------- */

  /**
   * Increase an unit property value.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #increase(event, target) {
    const property = target.dataset.property;
    const itemId = target.closest(".item")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    const value = foundry.utils.getProperty(item, property);
    await item.update({ [property]: value + 1 });

    this._updateDeckTatic();
  }

  /* -------------------------------------------- */
}
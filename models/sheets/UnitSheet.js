import { constants, i18nStrings, unitChoices } from "../../scripts/constants.js";
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
      width: 800,
      height: 680
    },
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    actions: {
      showConfiguration: this.#showConfiguration,
      showDescription: this.#showDescription
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
  }

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

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Set editable the current form mode.
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);

    // Prepare the actor data for rendering.
    Object.assign(context, {
      actor: this.actor,
      system: this.actor.system,
      hasCompany: !!this.actor.system.info.company,
      company: this.actor.system.info.company || null,
      hasCommander: !!this.actor.system.info.company?.system.info.commander,
      commander: this.actor.system.info.company?.system.info.commander || null,
      isLight: this.actor.system.info.type === unitChoices.uTypes.light,
      isHeavy: this.actor.system.info.type === unitChoices.uTypes.heavy,
      isSpecial: this.actor.system.info.type === unitChoices.uTypes.special,
      isMedical: this.actor.system.info.type === unitChoices.uTypes.medical,
    });

    this._prepareUTypes(context);

    // Prepare the actor's category.
    this._prepareCategories(context);

    // Prepare the actor's skills.
    this._prepareCombat(context);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {

    switch (partId) {
      case "header": await this._prepareHeaderContext(context, options); break;
      case "body": break;
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

    for (const type in unitChoices.uTypes) {
      uTypes[type] = {};

      uTypes[type].type = type;
      uTypes[type].label = game.i18n.localize(`ldnd5e.uTypes.${type}`);
    }

    context.uTypes = uTypes;
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

    for (const category in unitChoices.categories) {
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
  /*  Form Actions                                */
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

  /**
   * Opens the unit's description.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #showDescription(event, target) {
    const button = target.closest("a");
    button.classList.toggle("active");

    const description = document.querySelector(".description-tooltip");
    description.classList.toggle("active");
  }
}
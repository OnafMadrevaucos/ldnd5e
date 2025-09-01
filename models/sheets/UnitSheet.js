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
      width: 750,
      height: 700
    },
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    actions: {
      removeTatic: this.#removeTatic,
      showConfiguration: this.#showConfiguration,
      showDescription: this.#showDescription,
      editDescription: this.#editDescription,
      showTatic: this.#showTatic,
      useTatic: this.#useTatic,
      roll: this.#roll,
      toggleTraining: this.#toggleTraining
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

  /**
   * The chosen activity.
   * @type {Activity|null}
   */
  get isMedical() {
    return this.actor.system.info.type === unitChoices.uTypes.medical;
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

  /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
     * @param {Event} event  Triggering event.
     * @protected
     */
  _onChangeInputDelta(event) {
    const input = event.target;
    const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;
    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const activity = target?.system.activities?.get(activityId);
    const result = dnd5e.utils.parseInputDelta(input, activity ?? target);
    if (result !== undefined) {
      // Special case handling for Item uses.
      if (input.dataset.name === "system.uses.value") {
        target.update({ "system.uses.spent": target.system.uses.max - result });
      } else if (activity && (input.dataset.name === "uses.value")) {
        target.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
      }
      else target.update({ [input.dataset.name]: result });
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
      isMedical: this.isMedical,
      editDescription: this.actor.getFlag("ldnd5e", "editingDescription") || false,
    });

    this._prepareUTypes(context);

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

  /**
 * Prepare actor tatics' items.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareTatics(context) {
    const items = this.actor.items;

    context.tatics = items;
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

    await this.actor.deleteEmbeddedDocuments("Item", [tatic.id]);
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
  static async #showDescription(event, target) {
    const button = target.closest("a");
    button.classList.toggle("active");

    const description = document.querySelector(".description-tooltip");
    description.classList.toggle("active");

    // If the button is being deactivated, also disable the edit mode.
    if (!button.classList.contains("active"))
      await this.actor.setFlag("ldnd5e", "editingDescription", false);
  }

  /* -------------------------------------------- */

  /**
   * Opens the unit's description editor.
   * @this {UnitSheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #editDescription(event, target) {
    target.classList.toggle("active");

    await this.actor.setFlag("ldnd5e", "editingDescription", target.classList.contains("active"));
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
    const taticId = target.closest('.tatic')?.dataset.itemId;
    if (!taticId) return;

    const tatic = this.actor.items.get(taticId);
    if (!tatic) return;

    await tatic.use({ event });
  }

  /* -------------------------------------------- */

  /**
   * Roll any check or saving throw fo the company.
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #roll(event, target) {
    if (!target.classList.contains("rollable")) return;

    switch (target.dataset.type) {
      case "ability": {
        const ability = target.closest("[data-ability]")?.dataset.ability;

        if (target.classList.contains("saving-throw")) return this.actor.system.rollSavingThrow({ skill: ability, event }, {}, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
        else return this.actor.system.rollAbilityCheck({ ability: ability }, { event }, { speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
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
   * @this {CompanySheet}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defines the [data-action].
   */
  static async #toggleTraining(event, target) {
    const taticId = target.closest(".tatic")?.dataset.itemId;
    if (!taticId) return;

    const tatic = this.actor.items.get(taticId);
    await tatic.update({ "system.trainning": !tatic.system.trainning });
  }

  /* -------------------------------------------- */
}
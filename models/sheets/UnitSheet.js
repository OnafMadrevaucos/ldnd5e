import { assetsData, constants, i18nStrings, unitData, taticsData } from "../../scripts/constants.js";
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

    context.profHint = this._prepareProficiencyHint();

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
 * Prepare actor proficiency hint for display.
 * @param {ApplicationRenderContext} context  Context being prepared.
 * @returns {object}
 * @protected
 */
  _prepareProficiencyHint() {
    const combatIcons = taticsData.combatIcons;
    const always = game.i18n.localize('ldnd5e.unit.proficiencies.always');
    const perLevel = game.i18n.localize('ldnd5e.unit.proficiencies.perLevel');
    const noBonus = game.i18n.localize('ldnd5e.unit.proficiencies.noBonus');
    const noPenalty = game.i18n.localize('ldnd5e.unit.proficiencies.noPenalty');

    const hint = document.createElement('span');
    hint.classList.add('tooltip-hint');

    // Título da Hint.
    const title = document.createElement('span');
    title.classList.add('title');
    title.textContent = game.i18n.localize('ldnd5e.unit.proficiencies.title');

    // Adicionar títulos ao hint.
    hint.appendChild(title);

    // Descrição da Hint.
    const description = document.createElement('span');
    description.classList.add('desc');
    description.textContent = game.i18n.localize('ldnd5e.unit.proficiencies.description');

    // Adicionar descrições ao hint.
    hint.appendChild(description);

    // Linha separadora.
    const hr = document.createElement('hr');
    hr.classList.add('ampersand');
    hint.appendChild(hr);

    // Adicionar proficiências.
    const mainContent = document.createElement('ul');
    mainContent.classList.add('prof-list', 'unlist');

    // Item de Proficiência de Vanguarda.
    const vProf = document.createElement('li');
    vProf.classList.add('prof', 'van');   

    const vProfDiv = document.createElement('div');
    vProfDiv.classList.add('field', 'flexcol');
    vProfDiv.innerHTML = `<span class='field-name'>${game.i18n.localize('ldnd5e.uProf.van')}</span>`;

    vProf.appendChild(vProfDiv);

    const vProfUnitsDiv = document.createElement('div');
    vProfUnitsDiv.classList.add('units-type', 'flexrow');

    // Modificador de Proficiência para unidades Leves.
    const vProfLight = document.createElement('div');
    vProfLight.classList.add('unit', 'light', 'flexcol');
    vProfLight.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.light')}</span>`;

    // Bônus de Proficiência para unidades Leves.
    const vProfLightBonus = document.createElement('a');
    vProfLightBonus.classList.add('mod', 'bonus');    
    vProfLightBonus.innerHTML = `<i class='fas fa-plus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.attack} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Leves.
    const vProfLightPenalty = document.createElement('a');
    vProfLightPenalty.classList.add('mod', 'penalty');
    vProfLightPenalty.innerHTML += `<i class='fas fa-minus sign'></i><i class='fas fa-2'></i><i class='${combatIcons.defense} type'></i> ${always}`;
    
    vProfLight.appendChild(vProfLightBonus);
    vProfLight.appendChild(vProfLightPenalty);

    // Modificador de Proficiência para unidades Pesadas.
    const vProfHeavy = document.createElement('div');
    vProfHeavy.classList.add('unit', 'heavy', 'flexcol');
    vProfHeavy.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.heavy')}</span>`;

    // Bônus de Proficiência para unidades Pesadas.
    const vProfHeavyBonus = document.createElement('a');
    vProfHeavyBonus.classList.add('mod', 'bonus');    
    vProfHeavyBonus.innerHTML = `<i class='fas fa-plus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.defense} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Pesadas.
    const vProfHeavyPenalty = document.createElement('a');
    vProfHeavyPenalty.classList.add('mod', 'penalty');
    vProfHeavyPenalty.innerHTML += `${noPenalty}`;
    
    vProfHeavy.appendChild(vProfHeavyBonus);
    vProfHeavy.appendChild(vProfHeavyPenalty);

    // Modificador de Proficiência para unidades Especiais.
    const vProfSpecial = document.createElement('div');
    vProfSpecial.classList.add('unit', 'special', 'flexcol');
    vProfSpecial.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.special')}</span>`;

    // Bônus de Proficiência para unidades Especiais.
    const vProfSpecialBonus = document.createElement('a');
    vProfSpecialBonus.classList.add('mod', 'bonus');    
    vProfSpecialBonus.innerHTML = `${noBonus}`;
    
    // Penalidade de Proficiência para unidades Especiais.
    const vProfSpecialPenalty = document.createElement('a');
    vProfSpecialPenalty.classList.add('mod', 'penalty');
    vProfSpecialPenalty.innerHTML += `${noPenalty}`;
    
    vProfSpecial.appendChild(vProfSpecialBonus);
    vProfSpecial.appendChild(vProfSpecialPenalty);

    vProfUnitsDiv.appendChild(vProfLight);
    vProfUnitsDiv.appendChild(vProfHeavy);
    vProfUnitsDiv.appendChild(vProfSpecial);

    vProfDiv.appendChild(vProfUnitsDiv);

    // Adiciona a Proficiência de Vanguarda ao corpo da Tooltip.
    mainContent.appendChild(vProf);

    // Item de Proficiência de Reserva.
    const rProf = document.createElement('li');
    rProf.classList.add('prof', 'res');   

    const rProfDiv = document.createElement('div');
    rProfDiv.classList.add('field', 'flexcol');
    rProfDiv.innerHTML = `<span class='field-name'>${game.i18n.localize('ldnd5e.uProf.res')}</span>`;

    rProf.appendChild(rProfDiv);

    const rProfUnitsDiv = document.createElement('div');
    rProfUnitsDiv.classList.add('units-type', 'flexrow');

    // Modificador de Proficiência para unidades Leves.
    const rProfLight = document.createElement('div');
    rProfLight.classList.add('unit', 'light', 'flexcol');
    rProfLight.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.light')}</span>`;

    // Bônus de Proficiência para unidades Leves.
    const rProfLightBonus = document.createElement('a');
    rProfLightBonus.classList.add('mod', 'bonus');    
    rProfLightBonus.innerHTML = `<i class='fas fa-plus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.attack} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Leves.
    const rProfLightPenalty = document.createElement('a');
    rProfLightPenalty.classList.add('mod', 'penalty');
    rProfLightPenalty.innerHTML += `<i class='fas fa-minus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.defense} type'></i> ${always}`;
    
    rProfLight.appendChild(rProfLightBonus);
    rProfLight.appendChild(rProfLightPenalty);

    // Modificador de Proficiência para unidades Pesadas.
    const rProfHeavy = document.createElement('div');
    rProfHeavy.classList.add('unit', 'heavy', 'flexcol');
    rProfHeavy.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.heavy')}</span>`;

    // Bônus de Proficiência para unidades Pesadas.
    const rProfHeavyBonus = document.createElement('a');
    rProfHeavyBonus.classList.add('mod', 'bonus');    
    rProfHeavyBonus.innerHTML = `<i class='fas fa-minus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.casualty} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Pesadas.
    const rProfHeavyPenalty = document.createElement('a');
    rProfHeavyPenalty.classList.add('mod', 'penalty');
    rProfHeavyPenalty.innerHTML += `<i class='fas fa-minus sign'></i><i class='fas fa-2'></i><i class='${combatIcons.attack} type'></i> ${always}`;
    
    rProfHeavy.appendChild(rProfHeavyBonus);
    rProfHeavy.appendChild(rProfHeavyPenalty);

    // Modificador de Proficiência para unidades Especiais.
    const rProfSpecial = document.createElement('div');
    rProfSpecial.classList.add('unit', 'special', 'flexcol');
    rProfSpecial.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.special')}</span>`;

    // Bônus de Proficiência para unidades Especiais.
    const rProfSpecialBonus = document.createElement('a');
    rProfSpecialBonus.classList.add('mod', 'bonus');    
    rProfSpecialBonus.innerHTML = `${noBonus}`;
    
    // Penalidade de Proficiência para unidades Especiais.
    const rProfSpecialPenalty = document.createElement('a');
    rProfSpecialPenalty.classList.add('mod', 'penalty');
    rProfSpecialPenalty.innerHTML += `${noPenalty}`;
    
    rProfSpecial.appendChild(rProfSpecialBonus);
    rProfSpecial.appendChild(rProfSpecialPenalty);

    rProfUnitsDiv.appendChild(rProfLight);
    rProfUnitsDiv.appendChild(rProfHeavy);
    rProfUnitsDiv.appendChild(rProfSpecial);

    rProfDiv.appendChild(rProfUnitsDiv);

    // Adiciona a Proficiência de Reserva ao corpo da Tooltip.
    mainContent.appendChild(rProf);

    // Item de Proficiência de Retaguarda.
    const reProf = document.createElement('li');
    reProf.classList.add('prof', 'rea');   

    const reProfDiv = document.createElement('div');
    reProfDiv.classList.add('field', 'flexcol');
    reProfDiv.innerHTML = `<span class='field-name'>${game.i18n.localize('ldnd5e.uProf.rea')}</span>`;

    reProf.appendChild(reProfDiv);

    const reProfUnitsDiv = document.createElement('div');
    reProfUnitsDiv.classList.add('units-type', 'flexrow');

    // Modificador de Proficiência para unidades Leves.
    const reProfLight = document.createElement('div');
    reProfLight.classList.add('unit', 'light', 'flexcol');
    reProfLight.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.light')}</span>`;

    // Bônus de Proficiência para unidades Leves.
    const reProfLightBonus = document.createElement('a');
    reProfLightBonus.classList.add('mod', 'bonus');    
    reProfLightBonus.innerHTML = `<i class='fas fa-minus sign'></i><i class='fas fa-1'></i><i class='${combatIcons.casualty} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Leves.
    const reProfLightPenalty = document.createElement('a');
    reProfLightPenalty.classList.add('mod', 'penalty');
    reProfLightPenalty.innerHTML += `${noPenalty}`;
    
    reProfLight.appendChild(reProfLightBonus);
    reProfLight.appendChild(reProfLightPenalty);

    // Modificador de Proficiência para unidades Pesadas.
    const reProfHeavy = document.createElement('div');
    reProfHeavy.classList.add('unit', 'heavy', 'flexcol');
    reProfHeavy.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.heavy')}</span>`;

    // Bônus de Proficiência para unidades Pesadas.
    const reProfHeavyBonus = document.createElement('a');
    reProfHeavyBonus.classList.add('mod', 'bonus');    
    reProfHeavyBonus.innerHTML = `<i class='fas fa-minus sign'></i><i class='fas fa-2'></i><i class='${combatIcons.casualty} type'></i> ${perLevel}`;
    
    // Penalidade de Proficiência para unidades Pesadas.
    const reProfHeavyPenalty = document.createElement('a');
    reProfHeavyPenalty.classList.add('mod', 'penalty');
    reProfHeavyPenalty.innerHTML += `<i class='fas fa-minus sign'></i><i class='fas fa-4'></i><i class='${combatIcons.attack} type'></i> ${always}`;
    
    reProfHeavy.appendChild(reProfHeavyBonus);
    reProfHeavy.appendChild(reProfHeavyPenalty);

    // Modificador de Proficiência para unidades Especiais.
    const reProfSpecial = document.createElement('div');
    reProfSpecial.classList.add('unit', 'special', 'flexcol');
    reProfSpecial.innerHTML = `<span class='type'>${game.i18n.localize('ldnd5e.uTypes.special')}</span>`;

    // Bônus de Proficiência para unidades Especiais.
    const reProfSpecialBonus = document.createElement('a');
    reProfSpecialBonus.classList.add('mod', 'bonus');    
    reProfSpecialBonus.innerHTML = `${noBonus}`;
    
    // Penalidade de Proficiência para unidades Especiais.
    const reProfSpecialPenalty = document.createElement('a');
    reProfSpecialPenalty.classList.add('mod', 'penalty');
    reProfSpecialPenalty.innerHTML += `${noPenalty}`;
    
    reProfSpecial.appendChild(reProfSpecialBonus);
    reProfSpecial.appendChild(reProfSpecialPenalty);

    reProfUnitsDiv.appendChild(reProfLight);
    reProfUnitsDiv.appendChild(reProfHeavy);
    reProfUnitsDiv.appendChild(reProfSpecial);

    reProfDiv.appendChild(reProfUnitsDiv);

    // Adiciona a Proficiência de Retaguarda ao corpo da Tooltip.
    mainContent.appendChild(reProf);
    
    hint.appendChild(mainContent);

    return hint.outerHTML;
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
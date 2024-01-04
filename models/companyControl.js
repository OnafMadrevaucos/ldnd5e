import { DND5E } from "../../../systems/dnd5e/dnd5e.mjs";
import { constants, NDs, i18nStrings } from "../scripts/constants.js";
import ActorL5e from "./entities/ActorL5e.js";
import CompanyL5e from "./entities/CompanyL5e.js";

export default class companyControl extends FormApplication{

    constructor( owner, options = {} ) {
        super(options);
        this.owner = owner;        
    }

    /**@override */
    async getData() {

        this.data = {
            owner: this.owner,
            company: new CompanyL5e(`Companhia de ${this.owner.name}`, this.owner),
            config: CONFIG.DND5E
        };

        // Retorna data para a tela.
        return this.data;
    }

    static get defaultOptions()
    {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName],
         template: constants.templates.cControlTemplate,
         width: 1050,
         height: 950,
         minimizable: true,
         resizable: false,
         title: game.i18n.localize(i18nStrings.cControlTitle),
         dragDrop: [{dragSelector: null, dropSelector: null}],
         tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'light-list' }]
      });
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Item Rolling
        html.find(".rollable .item-image").click(event => this._onItemUse(event));

        // Dismiss an Unit from Company
        html.find(".dismiss").click(event => this._dismissUnit(event));

        // Ability Checks
        html.find(".ability-name").click(this._onRollAbilityTest.bind(this));

        const inputs = html.find("input");
        inputs.focus(ev => ev.currentTarget.select());
        inputs.addBack().find('[type="number"]').change(this._onChangeInputDelta.bind(this));
    }

    /**
    * Get active Unit.
    * @returns {Actor5e}      An Actor5e object of the active Unit.
    * @private
    */
    _getActiveUnit() {
        const unitsData = this.data.company.units;
        const activeTab = document.querySelectorAll('.unit-list.active');
        const tabName = activeTab[0]?.dataset.tab;

        var unit = undefined;
        switch(tabName)
        {
            case "light":{
                unit = unitsData.light.actor;
            }
            break;
            case "heavy":{
                unit = unitsData.heavy.actor;
            }
            break;
            case "special":{
                unit = unitsData.special.actor;
            }
            break;
            default: return unit;
        }   
        return unit;
    }

    /** @override */
    async _onDrop(event) {
        super._onDrop(event);
        const owner = this.data.owner;
        const data = TextEditor.getDragEventData(event);

        // Apenas Actors podem ser inseridos em um Batalhão.
        if(!["Actor"].includes(data.type)) { 
            ui.notifications.warn("Apenas Documents do tipo 'Actors' podem ser inseridos em um Batalhão.");
            return;
        }

        const actorId = data.uuid?.split('.')[1];
        const actor = game.actors.get(actorId);

        // Apenas NPCs podem ser inseridos em um Batalhão como Unidade.
        if(["character"].includes(actor.type)){ 
            ui.notifications.warn("Apenas NPCs podem ser inseridos em um Batalhão como Unidade.");
            return;
        }

        // Somente NPCs marcados como Unidades Militares pode inserido em um Batalhão.
        if(!actor.system.isUnit) { 
            ui.notifications.warn("O NPC não é uma Unidade Militar e não pode ser inserido na Companhia.");
            return;
        }

        const dialog = new Dialog({
            title: game.i18n.localize("ldnd5e.messages.addUnitTitle"),
            content: game.i18n.format("ldnd5e.messages.addUnitLabel", {unit: actor.name}),
            buttons: {
              yes: { label: game.i18n.localize("ldnd5e.yesBtn"), callback: this._setUnit.bind(this, actor) },
              no: { label: game.i18n.localize("ldnd5e.noBtn") }
            },
        });

        await dialog.render(true);
        this.render(true);
    }

    /**
    * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
    * @param {Event} event  Triggering event.
    * @private
    */
    _onChangeInputDelta(event) {
        const unit = this._getActiveUnit();
        const input = event.target;
        const value = input.value;
        if ( ["+", "-"].includes(value[0]) ) {
        let delta = parseFloat(value);
        input.value = foundry.utils.getProperty(unit, input.name) + delta;
        }
        else if ( value[0] === "=" ) input.value = value.slice(1);
    }
    /**
    * Handle input changes to numeric form fields.
    * @param {Event} event  Triggering event.
    * @private
    */
    /**@override */
    async _onChangeInput(event) {
        const unit = this._getActiveUnit();    
        const input = event.target;   
        await unit.update({[`${input.name}`]: parseInt(input.value)})

        this.render(true);
    }

    /**
    * Dismiss an Unit from its company.    
    * @private
    */
    async _dismissUnit(event){
        event.preventDefault();    
        const summary = event.currentTarget.parentElement.getElementsByClassName("unit-summary");
        const unitId = summary[0]?.dataset.unitId;
        const unit = game.actors.get(unitId);
        
        const dialog = new Dialog({
            title: game.i18n.localize("ldnd5e.messages.dismissUnitTitle"),
            content: game.i18n.format("ldnd5e.messages.dismissUnitLabel", {unit: unit.name}),
            buttons: {
              yes: { label: game.i18n.localize("ldnd5e.yesBtn"), callback: this._unsetUnit.bind(this) },
              no: { label: game.i18n.localize("ldnd5e.noBtn") }
            },
        });

        await dialog.render(true);
    }

    /**
    * Handle rolling an Ability test or saving throw.
    * @param {Event} event      The originating click event.
    * @private
    */
    _onRollAbilityTest(event) {
        event.preventDefault();
        const ability = event.currentTarget.parentElement.dataset.ability;
        const unit = this._getActiveUnit();

        unit.rollAbility(ability, {event: event});
    }

    /**
    * Handle using an item from the Actor sheet, obtaining the Item instance, and dispatching to its use method.
    * @param {Event} event  The triggering click event.
    * @returns {Promise}    Results of the usage.
    * @protected
    */
    _onItemUse(event) {
        event.preventDefault();
        const unit = this._getActiveUnit();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const item = unit.items.get(itemId);
        if ( item ) return item.use();
    } 

    /**
    * Set an Unit from a company.    
    * @private
    */
    async _setUnit(actor){
        const owner = this.data.owner;
        const activeTab = document.querySelectorAll('.unit-list.active');
        const activeTabName = activeTab[0]?.dataset.tab;

        await owner.setFlag("ldnd5e", `${activeTabName}UnitID`, actor.id);
        this.render(true);            
    }
    
    /**
    * Unset an Unit from a company.    
    * @private
    */
    async _unsetUnit(html){
        const owner = this.data.owner;
        const activeTab = document.querySelectorAll('.unit-list.active');
        const activeTabName = activeTab[0]?.dataset.tab;

        await owner.unsetFlag("ldnd5e", `${activeTabName}UnitID`);
        this.render(true);            
    }
}
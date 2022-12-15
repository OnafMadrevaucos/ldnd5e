import { DND5E } from "../../../systems/dnd5e/dnd5e.mjs";
import { constants, NDs, i18nStrings } from "../scripts/constants.js";

export default class companyControl extends FormApplication{

    constructor( owner, options = {} ) {
        super(options);
        this.owner = owner;
    }

    /**@override */
    async getData() {           
        this.data = {
            owner: this.owner,
            units: this._prepareUnits(),
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

        const inputs = html.find("input");
        inputs.focus(ev => ev.currentTarget.select());
        inputs.addBack().find('[type="number"]').change(this._onChangeInputDelta.bind(this));
    }
    
    /**
   * Get the font-awesome icon used to display a certain level of skill proficiency.
   * @param {number} level  A proficiency mode defined in `CONFIG.DND5E.proficiencyLevels`.
   * @returns {string}      HTML string for the chosen icon.
   * @private
   */
    _getProficiencyIcon(level) {
        const icons = {
            0: '<i class="far fa-circle"></i>',
            0.5: '<i class="fas fa-adjust"></i>',
            1: '<i class="fas fa-check"></i>',
            2: '<i class="fas fa-check-double"></i>'
        };
        return icons[level] || icons[0];
    }

     /**
   * Get active Unit.
   * @returns {Actor5e}      An Actor5e object of the active Unit.
   * @private
   */
    _getActiveUnit() {
        const unitsData = this.data.units;
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

    _prepareUnits(){   
        const owner = this.owner;

        const lightUnitID = owner.getFlag("ldnd5e", "lightUnitID");
        const heavyUnitID = owner.getFlag("ldnd5e", "heavyUnitID");
        const specialUnitID = owner.getFlag("ldnd5e", "specialUnitID");   
        
        const lightUnit = game.actors.get(lightUnitID);
        const heavyUnit = game.actors.get(heavyUnitID);
        const specialUnit = game.actors.get(specialUnitID);
        
        const units = {
            light: {                 
                actor: (lightUnit ?? null), 
                features: this._prepareFeatures(lightUnit), 
                labels: this._prepareLabels(lightUnit)
            },
            heavy: { 
                actor: (heavyUnit ?? null), 
                features: this._prepareFeatures(heavyUnit), 
                labels: this._prepareLabels(heavyUnit)
            },
            special: { 
                actor: (specialUnit ?? null),
                features: this._prepareFeatures(specialUnit),  
                labels: this._prepareLabels(specialUnit)
            }
        }

        return units;
    }

    _prepareFeatures(unit)
    {
        // Categorize Items as Features and Spells
        const features = {
            weapons: { label: game.i18n.localize("DND5E.AttackPl"), items: [], hasActions: true,
                dataset: {type: "weapon", "weapon-type": "natural"} },
            actions: { label: game.i18n.localize("DND5E.ActionPl"), items: [], hasActions: true,
                dataset: {type: "feat", "activation.type": "action"} },
            passive: { label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
            equipment: { label: game.i18n.localize("DND5E.ItemTypeEquipmentPl"), items: [], dataset: {type: "loot"}}
        };

        // Start by classifying items into groups for rendering
        let [other] = unit.items.reduce((arr, item) => {
            const {quantity, uses, recharge, target} = item.system;
            item.img = item.img || CONST.DEFAULT_TOKEN;
            item.isStack = Number.isNumeric(quantity) && (quantity !== 1);
            item.hasUses = uses && (uses.max > 0);
            item.isOnCooldown = recharge && !!recharge.value && (recharge.charged === false);
            item.isDepleted = item.isOnCooldown && (uses.per && (uses.value > 0));
            if ( item.type !== "spell" ) arr[0].push(item);
            return arr;
        }, [[]]);
  
        // Organize Features
        for ( let item of other ) {
            if ( item.type === "weapon" ) features.weapons.items.push(item);
            else if ( item.type === "feat" ) {
                if ( item.system.activation.type ) features.actions.items.push(item);
                else features.passive.items.push(item);
            }
            else features.equipment.items.push(item);
        }
  
        // Return and assign
        return Object.values(features);
    }

    _prepareLabels(unit) {
        const cr = parseFloat(unit.system.details.cr ?? 0);
        const crLabels = {0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2"};

        // Ability Scores
        for ( const [a, abl] of Object.entries(unit.system.abilities) ) {
            abl.icon = this._getProficiencyIcon(abl.proficient);
            abl.hover = CONFIG.DND5E.proficiencyLevels[abl.proficient];
            abl.label = CONFIG.DND5E.abilities[a];
            abl.baseProf = unit.system.abilities[a]?.proficient ?? 0;
        }

        return {
              cr: cr >= 1 ? String(cr) : crLabels[cr] ?? 1,
              type: unit.constructor.formatCreatureType(unit.system.details.type),
              armorType: this.getArmorLabel(unit)
            };
    }

    getArmorLabel(actor) {
        const ac = actor.system.attributes.ac;
        const label = [];
        if ( ac.calc === "default" ) label.push(actor.armor?.name || game.i18n.localize("DND5E.ArmorClassUnarmored"));
        else label.push(game.i18n.localize(CONFIG.DND5E.armorClasses[ac.calc].label));
        if ( actor.shield ) label.push(actor.shield.name);
        return label.filterJoin(", ");
    }

    /** @override */
    async _onDrop(event) {
        super._onDrop(event);
        const owner = this.data.owner;
        const data = TextEditor.getDragEventData(event);

        // Apenas Actors podem ser inseridos em um Batalhão.
        if(!["Actor"].includes(data.type)) return;

        const actorId = data.uuid?.split('.')[1];
        const actor = game.actors.get(actorId);

        // Apenas NPCs podem ser inseridos em um Batalhão como Unidade.
        if(["character"].includes(actor.type)) return;

        // Somente NPCs marcados como Unidades Militares pode inserido em um Batalhão.
        if(!actor.system.isUnit) return;

        const activeTab = document.querySelectorAll('.unit-list.active');

        switch(activeTab[0]?.dataset.tab)
        {
            case "light":{
                await owner.setFlag("ldnd5e", "lightUnitID", actor.id);
            }
            break;
            case "heavy":{
                await owner.setFlag("ldnd5e", "heavyUnitID", actor.id);
            }
            break;
            case "special":{
                await owner.setFlag("ldnd5e", "specialUnitID", actor.id);
            }
            break;
            default: return;
        }

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
}
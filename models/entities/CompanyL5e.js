import { documents, utils } from "../../../../systems/dnd5e/dnd5e.mjs";
import { constants, i18nStrings } from "../../scripts/constants.js";
import ActorL5e from "./ActorL5e.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class CompanyL5e {

    constructor(name, owner) {  
        this.name = name;        
        this.owner = owner;

        this.units = this._prepareUnits();        
        this.system = this._prepareData();
    }

    set units(value){

        if(value == null) return;

        this._units = value;

        const lightUnit = this._units.light.actor ?? null;
        const heavyUnit = this._units.heavy.actor ?? null;
        const specialUnit = this._units.special.actor ?? null;
        
        this.flags = {
            hasLight: lightUnit ? true : false,
            hasHeavy: heavyUnit ? true : false,
            hasSpecial: specialUnit ? true : false
        }
    }
    get units() {
        return this._units;
    }

    set system(value){
        this._system = value;
    }
    get system(){
        return this._system;
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
                features: (lightUnit ? this._prepareFeatures(lightUnit) : null), 
                labels: (lightUnit ? this._prepareLabels(lightUnit) : null)
            },
            heavy: { 
                actor: (heavyUnit ?? null), 
                features: (heavyUnit ? this._prepareFeatures(heavyUnit) : null), 
                labels: (heavyUnit ? this._prepareLabels(heavyUnit) : null)
            },
            special: { 
                actor: (specialUnit ?? null),
                features: (specialUnit ? this._prepareFeatures(specialUnit) : null),  
                labels: (specialUnit ? this._prepareLabels(specialUnit) : null)
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
              armorType: this._getArmorLabel(unit)
            };
    }

    _prepareData(){
        const system = foundry.utils.deepClone(game.model["Actor"]['npc']);

        const cr = system.details.cr;
        // Proficiency
        system.attributes.prof = Math.floor((Math.max(cr, 1) + 7) / 4);

        this._prepareBaseAbilities(system);

        return system;
    }

    _prepareBaseAbilities(system){
        const lightData = this.units.light.actor?.system;
        const heavyData = this.units.heavy.actor?.system;
        const specialData = this.units.special.actor?.system;
        const onwerData = this.owner.system;

        for ( const [id, abl] of Object.entries(system.abilities) ){
            abl.value = (lightData?.abilities[id].mod ?? 0) + 
                        (heavyData?.abilities[id].mod ?? 0) + 
                        (specialData?.abilities[id].mod ?? 0) +
                        (onwerData.abilities[id].mod ?? 0)
                                 
            this._prepareAbilities(abl, system);
        }       
    }

    _prepareAbilities(abl, system) { 
        const dcBonus = utils.simplifyBonus(system.bonuses?.spell?.dc);
        abl.mod = Math.floor((abl.value - 10) / 2);
        abl.checkProf = new documents.Proficiency(system.attributes.prof);
        const saveBonusAbl = utils.simplifyBonus(abl.bonuses?.save);
        abl.saveBonus = saveBonusAbl;
    
        abl.saveProf = new documents.Proficiency(system.attributes.prof, abl.proficient);
        const checkBonusAbl = utils.simplifyBonus(abl.bonuses?.check);
        abl.checkBonus = checkBonusAbl;
    
        abl.save = abl.mod + abl.saveBonus;
        if ( Number.isNumeric(abl.saveProf.term) ) abl.save += abl.saveProf.flat;
        abl.dc = 8 + abl.mod + system.attributes.prof + dcBonus;
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

    _getArmorLabel(actor) {
        const ac = actor.system.attributes.ac;
        const label = [];
        if ( ac.calc === "default" ) label.push(actor.armor?.name || game.i18n.localize("DND5E.ArmorClassUnarmored"));
        else label.push(game.i18n.localize(CONFIG.DND5E.armorClasses[ac.calc].label));
        if ( actor.shield ) label.push(actor.shield.name);
        return label.filterJoin(", ");
    }
}
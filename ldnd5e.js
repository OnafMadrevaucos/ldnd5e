import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { Debugger, CondHelper, preLocalize, performPreLocalization } from "./scripts/helpers.js";
import { preloadTemplates } from "./scripts/templates.js";
import { registerSystemSettings } from "./scripts/settings.js"

import { i18nStrings, gmControl, constants } from "./scripts/constants.js";
import adControl from "./models/adControl.js";

import * as ars from "./scripts/ARSystem.js";
import * as mss from "./scripts/MSSystem.js";
import * as ecs from "./scripts/ECSystems.js";

import ItemSheetL5e from "./models/sheets/ItemSheetL5e.js";
import ActorSheetL5eCharacter from "./models/sheets/ActorSheetL5eCharacter.js";
import ActorSheetL5eNPCs from "./models/sheets/ActorSheetL5eNPCs.js";
import CompanyL5e from "./models/entities/CompanyL5e.js";
import UnitL5e from "./models/entities/UnitL5e.js";
import ActorSheetL5eUnit from "./models/sheets/ActorSheetL5eUnit.js";
import ActorSheetL5eCompany from "./models/sheets/ActorSheetL5eCompany.js";

Hooks.once("init", function() {
    console.log("LDnD5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    CONFIG.DND5E = dnd5e.config;

    CONFIG.LDND5E = {
        specialArmors: {
            barbarian: "SZbsNbaxFFGwBpNK",  // Unarmored Defense (Barbarian)
            monk: "UAvV7N7T4zJhxdfI"        // Unarmored Defense (Monk)          
        }
    };

    //preloadSpecialArmors(); // Extra special armors.

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

    preLocalize("consumableTypes");
    preLocalize("uTypes", {sort: true});
    preLocalize("uAbilities", {sort: true});
 
    preloadTemplates();

    registerStrings();
    registerSubtypes();    
    registerSystemSettings();

    patchRollDamage();

    if (game.modules.get('rpg-styled-ui')?.active && game.modules.get('gm-screen')?.active)
        patchSheetText();    

    Handlebars.registerHelper('debug', Debugger);
    Handlebars.registerHelper('cond', CondHelper);
});

Hooks.once('ready', () => {
    // Verifica se algums módulos necessários estão ativos.
    if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
        ui.notifications.error("LD&D 5e necessita do módulo 'libWrapper'. Favor instalá-lo e ativá-lo.");      
  
    // Registra a nova classe de ActorSheet na Application.
    Items.registerSheet("dnd5e", ItemSheetL5e, {
        types: ["weapon"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });

    // Registra a nova classe de ActorSheet na Application.
    Actors.registerSheet("dnd5e", ActorSheetL5eCharacter, {
        types: ["character"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });

    // Registra a nova classe de ActorSheet na Application.
    Actors.registerSheet("dnd5e", ActorSheetL5eNPCs, {
        types: ["npc"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });

    Hooks.on("renderCombatTracker", async (app, html, data) => {
        // Sair se não tiver Combates ativos.
        if (!data.combat) return;
    
        // Create groups
        ars.manageGroups(app.popOut);

        if(CONFIG.adControl)
            CONFIG.adControl.refresh(true);        
    });
    
    // Re-render the combat tracker in case the initial render was missed
    ui.combat.render(true);
});

/**
 * Perform one-time pre-localization and sorting of some configuration objects
 */
Hooks.once("i18nInit", () => performPreLocalization(i18nStrings));

Hooks.on('renderActorSheet', (app, html, data) => {
    const actor = app.actor;
    const isActorL5e = actor.getFlag("ldnd5e", "L5eConfigured");

    if(isActorL5e != undefined && (!isActorL5e && ["character"].includes(actor.type))) actor.configL5e();

    if(game.settings.get('ldnd5e', 'massiveCombatRules')) {
        mss.addMassiveCombatParts(actor, html);
        if(["character"].includes(actor.type) && actor.system.commander) 
            mss.setCommanderSection(html, app);
    }
    
    /** Esconde os controles dos Active Effects sempre para Jogadores e para o GM
     *  apenas quando a Opção estiver marcada.
    */
    if (game.settings.get('ldnd5e','hideArmorEffectsFromGM') || !game.user.isGM) 
        hideEffects(actor, html);        
});

Hooks.on('renderItemSheet', async (app, html, data) => {   
    if(game.settings.get('ldnd5e', 'weaponsSpecialEffects')) {
        const itemData = data.data;
        const item = game.items.get(itemData._id);

        if(["weapon"].includes(itemData.type)) {    
            ecs.addWeaponSpecialEffects(data, html, app);
        }
    }   
});

Hooks.on('getSceneControlButtons', (controls) => {

    if (game.user.isGM)
    {  
        gmControl[0].onClick = renderControl;

        const token = controls.find((c) => c.name === 'token');
        if (token) { token.tools.push(...gmControl); }
    }
});
Hooks.on('combatTurn', ars.onNewCombatTurn);
Hooks.on('combatRound', ars.onNewCombatTurn);

/** ---------------------------------------------------- */
/** Funções do Sistema D&D                               */
/** ---------------------------------------------------- */
Hooks.on('dnd5e.preRollSkill', (actor, rollData, skillId) => {
    patchExtraRollRoutines(actor, rollData);
});
Hooks.on('dnd5e.preRollAbilityTest', (actor, rollData, abilityId) => {
    patchExtraRollRoutines(actor, rollData);
});
Hooks.on('dnd5e.preRollAbilitySave', (actor, rollData, abilityId) => {
    patchExtraRollRoutines(actor, rollData);
});
Hooks.on('dnd5e.preRollDeathSave', (actor, rollData) => {
    patchExtraRollRoutines(actor, rollData);
});

Hooks.on('dnd5e.preRollAttack', (item, rollData) => {
    const actor = item.actor;
    patchExtraRollRoutines(actor, rollData);
});
Hooks.on('dnd5e.preRollToolCheck', (item, rollData) => {
    const actor = item.actor;
    patchExtraRollRoutines(actor, rollData);
});
Hooks.on('dnd5e.preRollDamage', (item, rollData) => {
    const button = rollData.event.currentTarget;
    item.rolledVersatile = (button.dataset.action == 'versatile');
});
Hooks.on('dnd5e.rollDamage', (item, rollData) => {
    ecs.patchRollDamageType(item, rollData);
    ecs.patchRollDamage(item, rollData);
});
Hooks.on('renderChatMessage', async (message, html, messageData) => {    
    const useFlag = message.getFlag("dnd5e", "use"); 
    if(useFlag) {
        const item = await fromUuid(useFlag?.itemUuid);    
        if(!item) return;
        ecs.patchChatUseMessage(item, html);
    }     
     
    const rollFlag = message.getFlag("dnd5e", "roll");  
    if(rollFlag?.type == 'damage') {     
        await ecs.patchChatDmgMessage(message, html, messageData);
    }
});

/** ---------------------------------------------------- */
/** Funções Internas                                     */
/** ---------------------------------------------------- */
function renderControl()
{
    // Cria um instância do Controle de Dano Absorvido
    const form = new adControl();

    if (game.modules.get('rpg-styled-ui')?.active) {
        form.options.classes.push("dnd5e", "sheet", "actor");
    }
    
    return form._render(true);
}

function registerStrings() {
    CONFIG.DND5E.consumableTypes.ointment = i18nStrings.consumableTypes.ointment;
    CONFIG.DND5E.consumableTypes.elixir = i18nStrings.consumableTypes.elixir;
}
function registerSubtypes(){
    Object.assign(CONFIG.Actor.dataModels, {
        "ldnd5e.unit": UnitL5e
    });
    Actors.registerSheet("ldnd5e", ActorSheetL5eUnit, {
        types: ["ldnd5e.unit"],
        makeDefault: true,
        label: "ldnd5e.unit"
    });

    Object.assign(CONFIG.Actor.dataModels, {
        "ldnd5e.company": CompanyL5e
    });    
    Actors.registerSheet("ldnd5e", ActorSheetL5eCompany, {
        types: ["ldnd5e.company"],
        makeDefault: true,
        label: "ldnd5e.sheetTitle"
    });
}
function patchExtraRollRoutines(actor, rollData) {
    const exh = actor.system.attributes.exhaustion;
    const data = actor.getRollData();

    // Use Exhaustion One D&D Rule
    if(game.settings.get('ldnd5e','oneDNDExhaustionRule')) {          
        // New Rule: '-1' in D20 Rolls for each Exhaustion Level.
        if(exh > 0) { 
          rollData.parts.push("@exhPenalty");
          rollData.data.exhPenalty = (-1 * exh);
        }
    }

    // New Fumble Treshold from ARSystem
    rollData.fumble = data.attributes.fumbleRange;
}

/**
 * Esconde os controle dos efeitos do Ator.
 * 
 * @param {object} actor    Ator que terá os efeitos escondido. 
 * @param {html} html       Tela de ActorSheet.
 */
function hideEffects(actor, html) {
    //Recupera as Flags dos Efeitos de Armadura e Escudo.
    const armorFlag = actor.getFlag("ldnd5e", "armorEffect");
    const shieldFlag = actor.getFlag("ldnd5e", "shieldEffect");

    //Procura os efeitos 
    const effects = html.find('.effect');
    for(var effect of effects) {
        if(effect.dataset.effectId === armorFlag?.effectID || effect.dataset.effectId === shieldFlag?.effectID) {
            effect.draggable = false;
            const control = effect.getElementsByClassName("effect-controls");
            const btns = control[0].getElementsByClassName("effect-control");
            Array.from(btns).forEach((value) => {value.hidden = true;});
        }
    }
}

function patchSheetText() {
    const head = document.getElementsByTagName("head")[0];
	const mainCss = document.createElement("link");
	mainCss.setAttribute("rel", "stylesheet")
	mainCss.setAttribute("type", "text/css")
	mainCss.setAttribute("href", "modules/ldnd5e/css/rpg-ui.css")
	mainCss.setAttribute("media", "all")
	head.insertBefore(mainCss, head.lastChild);
}

/** ---------------------------------------------------- */
/** Funções de Wrapper                                   */
/** ---------------------------------------------------- */
function patchRollDamage() {
    libWrapper.register('ldnd5e', 'CONFIG.Dice.DamageRoll.prototype.configureDamage', async function(wrapper, config, ...rest) {
        if(this.isCritical && game.settings.get('ldnd5e','criticalDamageModifiers')) {        
            let flatBonus = 0;
            
            // Add powerful critical bonus
            if ( this.options.powerfulCritical && (flatBonus > 0) ) {
                this.terms.push(new OperatorTerm({operator: "+"}));
                this.terms.push(new NumericTerm({number: flatBonus}, {flavor: game.i18n.localize("DND5E.PowerfulCritical")}));
            }

            // Add extra critical damage term
            if ( this.isCritical && this.options.criticalBonusDamage ) {
                const extra = new Roll(this.options.criticalBonusDamage, this.data);
                if ( !(extra.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
                this.terms.push(...extra.terms);
            }

            // Re-compile the underlying formula
            this._formula = this.constructor.getFormula(this.terms);

            // Mark configuration as complete
            this.options.configured = true;
        } else await wrapper(config, ...rest);
    });

    libWrapper.register('ldnd5e', 'CONFIG.Dice.DamageRoll.prototype.evaluate', async function(wrapper, config, ...rest) {
        if(game.settings.get('ldnd5e', 'criticalDamageModifiers') && this.isCritical) {
            let criticalFormula = "";
            let criticalTerms = [];
            for (let term of this.terms) {
                if (term instanceof DiceTerm) {
                    criticalFormula += `((${term.formula})*2)`;
                    criticalTerms.push(term);
                    criticalTerms.push(new OperatorTerm({operator: "*"}));
                    criticalTerms.push(new NumericTerm({number: 2}));
                }
                if (term instanceof OperatorTerm) {
                    criticalFormula += term.operator;
                    criticalTerms.push(term);
                }
                if (term instanceof NumericTerm) {
                    criticalFormula += term.number;
                    criticalTerms.push(term);
                }
            }
            this._formula = criticalFormula;
            this.terms = criticalTerms;            
        } 

        await wrapper(config, ...rest);
    });
}
  
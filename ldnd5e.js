import ItemL5e from "./models/entities/ItemL5e.js";
import ActorL5e from "./models/entities/ActorL5e.js";

import { Debugger, CondHelper, RepeatHelper } from "./scripts/helpers.js";
import { preloadTemplates } from "./scripts/templates.js";
import { registerSystemSettings } from "./scripts/settings.js"

import { constants, i18nStrings, gmControl, battleControl, battleData } from "./scripts/constants.js";

import ADControl from "./models/adControl.js";
import ADControlV2 from "./models/adControlV2.js";

import BattleApp from "./models/battleApp.js";

import * as das from "./scripts/DASystem.js"
import * as ars from "./scripts/ARSystem.js";
import * as mss from "./scripts/MSSystem.js";
import * as ecs from "./scripts/ECSystems.js";

import ActiveEffectL5e from "./models/activeEffect.js";

import ArmyL5e from "./models/entities/ArmyL5e.js";
import CompanyL5e from "./models/entities/CompanyL5e.js";
import UnitL5e from "./models/entities/UnitL5e.js";
import CompanySheet from "./models/sheets/CompanySheet.js";
import UnitSheet from "./models/sheets/UnitSheet.js";
import ArmySheet from "./models/sheets/ArmySheet.js";
import TaticsL5e from "./models/entities/TaticsL5e.js";
import TaticsSheet from "./models/sheets/TaticsSheet.js";
import TaticsRoll from "./scripts/TaticsRoll.js";
import AssetsL5e from "./models/entities/AssetsL5e.js";
import AssetsSheet from "./models/sheets/AssetsSheet.js";
import EventsL5e from "./models/entities/EventsL5e.js";
import EventsSheet from "./models/sheets/EventsSheet.js";

const typeArmy = "ldnd5e.army";
const typeCompany = "ldnd5e.company";
const typeUnit = "ldnd5e.unit";

const typeAsset = "ldnd5e.asset";
const typeEvent = "ldnd5e.event";
const typeTatic = "ldnd5e.tatic";

const isV13 = !foundry.utils.isNewerVersion("13", game.version);

Hooks.once("init", function () {
    console.log("LD&D 5e | Inicializando o Módulo Lemurian D&D 5th Edition...");

    registerSystemSettings();
    registerRPGAwesome();

    CONFIG.DND5E = dnd5e.config;
    CONFIG.isV13 = isV13;

    CONFIG.Dice.TaticsRoll = TaticsRoll;

    // Load D&D Currency Manager library;
    CONFIG.CurrencyManager = dnd5e.applications.CurrencyManager;

    // The D&D used is the newer than 3.0.0 Version.
    CONFIG.IsDnD2 = foundry.utils.isNewerVersion(dnd5e.version, "3.0.0");

    CONFIG.LDND5E = {
        specialArmors: {
            barbarian: "SZbsNbaxFFGwBpNK",  // Unarmored Defense (Barbarian)
            monk: "UAvV7N7T4zJhxdfI"        // Unarmored Defense (Monk)          
        }
    };

    //preloadSpecialArmors(); // Extra special armors.

    CONFIG.Item.documentClass = ItemL5e;
    CONFIG.Actor.documentClass = ActorL5e;

    Object.assign(CONFIG.Actor.dataModels, {
        [typeArmy]: ArmyL5e,
        [typeCompany]: CompanyL5e,
        [typeUnit]: UnitL5e
    });

    const Actors = foundry.documents.collections.Actors;

    Actors.registerSheet('ldnd5e', ArmySheet, {
        types: ['ldnd5e.army'],
        makeDefault: true,
        label: "Exército"
    });

    Actors.registerSheet('ldnd5e', CompanySheet, {
        types: ['ldnd5e.company'],
        makeDefault: true,
        label: "Companhia"
    });

    Actors.registerSheet('ldnd5e', UnitSheet, {
        types: ['ldnd5e.unit'],
        makeDefault: true,
        label: "Unidade"
    });

    Object.assign(CONFIG.Item.dataModels, {
        [typeAsset]: AssetsL5e,
        [typeEvent]: EventsL5e,
        [typeTatic]: TaticsL5e,
    });

    const Items = foundry.documents.collections.Items;

    Items.registerSheet('ldnd5e', AssetsSheet, {
        types: ['ldnd5e.asset'],
        makeDefault: true,
        label: "Insumo"
    });

    Items.registerSheet('ldnd5e', EventsSheet, {
        types: ['ldnd5e.event'],
        makeDefault: true,
        label: "Evento"
    });

    Items.registerSheet('ldnd5e', TaticsSheet, {
        types: ['ldnd5e.tatic'],
        makeDefault: true,
        label: "Tática"
    });

    CONFIG.DND5E.defaultArtwork.Item[typeAsset] = "modules/ldnd5e/ui/icons/assets-dark.svg";
    CONFIG.DND5E.defaultArtwork.Item[typeEvent] = "modules/ldnd5e/ui/icons/events-dark.svg";
    CONFIG.DND5E.defaultArtwork.Item[typeTatic] = "modules/ldnd5e/ui/icons/tatics-dark.svg";

    preloadTemplates();

    patchRollDamage();

    Handlebars.registerHelper('debug', Debugger);
    Handlebars.registerHelper('cond', CondHelper);
    Handlebars.registerHelper('repeat', RepeatHelper);
});

Hooks.once('ready', async () => {
    // Verifica se algums módulos necessários estão ativos.
    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM)
        ui.notifications.error("LD&D 5e necessita do módulo 'libWrapper'. Favor instalá-lo e ativá-lo.");

    if (game.settings.get("ldnd5e", "massiveCombatRules")) {
        await loadAffinities();
    }
});

Hooks.on("renderActorDirectory", async (app, html, data) => {
    const directory = html.querySelectorAll('.directory-item');

    for (let item of directory) {
        const entryId = item.dataset.entryId;
        const entry = app.options.collection.get(entryId);

        // Ignora a entrada se ela não existir.
        if (!entry) continue;

        if ([typeCompany, typeUnit].includes(entry.type) && entry.getFlag('ldnd5e', 'isMember')) {
            item.classList.add('member');
        }
    }
});

Hooks.on("renderDialogV2", (app, html, data, options) => {
    const select = html.querySelector('.dialog-content select[name="type"]');
    if (select) {
        if (!game.settings.get("ldnd5e", "massiveCombatRules")) {
            for (let option of select.options) {
                if (option.value.includes('ldnd5e')) option.remove();
            }
        }
    }
});

Hooks.on('renderActorSheetV2', async (app, html, data) => {
    const actor = app.actor;

    if (!CONFIG.ADControl && actor.type == "character") {
        actor.configArmorData();

        const isActorL5e = actor.getFlag("ldnd5e", "L5eConfigured");
        if (isActorL5e != undefined && !isActorL5e) await actor.fullAsyncConfigL5e();
    }

    data.effects = ActiveEffectL5e.prepareActiveEffectCategories(data);

    // Esconde os controles dos Active Effects.    
    hideEffects(actor, html);
});

Hooks.on('renderItemSheet5e', async (app, html, data) => {
    if (game.settings.get('ldnd5e', 'weaponsSpecialEffects')) {
        const item = data.item;

        if (["weapon"].includes(item.type)) {
            const bleedFlag = item.getFlag('ldnd5e', 'bleed');
            const stunFlag = item.getFlag('ldnd5e', 'stun');
            const specialFlag = item.getFlag('ldnd5e', 'special');

            if (bleedFlag == undefined || bleedFlag == null) await item.setFlag('ldnd5e', 'bleed', 0);
            if (stunFlag == undefined || stunFlag == null) await item.setFlag('ldnd5e', 'stun', 0);
            if (specialFlag == undefined || specialFlag == null) await item.setFlag('ldnd5e', 'special', 0);
        }

        if (["weapon"].includes(item.type)) {
            ecs.addWeaponSpecialEffects(data, html, app);
        }
    }
});

Hooks.on('getSceneControlButtons', (controls) => {
    const tokens = controls.tokens;

    if (!tokens) return;

    // Add AC Control only for GM.
    if (game.user.isGM) {
        gmControl.onChange = renderACControl;
        tokens.tools.ac = gmControl;
    }

    // Add Battle Control for all players.
    tokens.tools.battle = battleControl;
    battleControl.onChange = renderBattleControl;
});

Hooks.on('combatTurn', ars.onNewCombatTurn);
Hooks.on('combatRound', ars.onNewCombatTurn);

Hooks.on('combatStart', async (combat, updateData) => {
    if (!game.settings.get('ldnd5e', 'massiveCombatRules')) return;

    const world = game.settings.get('ldnd5e', 'battle');

    // Ignora se um combate massivo não estiver sido iniciado.
    if (world.stage.value === battleData.stages.setup.value) return;

    // Verifica se o combate já está iniciado. Ignora se o combate estiver iniciado.
    if (world.stage.value === battleData.stages.started.value || world.stage.value === battleData.stages.endgame.value) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("ldnd5e.messages.startBattleTitle") },
        content: `<p>${game.i18n.localize("ldnd5e.messages.startBattle")}</p>`
    });

    if (confirmed) {
        

        world.stage = battleData.stages.started;

        let battleMaxRound = 0;
        let sideMaxStamina = 0;
        for (let data of world.sides.top) {
            const company = await fromUuid(data.uuid);
            sideMaxStamina += company.system.attributes.stamina.max;
        }

        battleMaxRound = sideMaxStamina;
        sideMaxStamina = 0;

        for (let data of world.sides.bottom) {
            const company = await fromUuid(data.uuid);
            sideMaxStamina += company.system.attributes.stamina.max;
        }

        battleMaxRound = Math.max(battleMaxRound, sideMaxStamina);
        world.turns.max = battleMaxRound;

        world.turns.current = world.turns.max;
        world.turns.elapsed = 0;

        await game.settings.set('ldnd5e', 'battle', world);
        if (world.application instanceof BattleApp) world.application.render({ force: true });
    }
});
Hooks.on('combatRound', async (combat, updateData, updateOptions) => {
    if (!game.settings.get('ldnd5e', 'massiveCombatRules')) return;

    const world = game.settings.get('ldnd5e', 'battle');

    // Verifica se o combate já está iniciado ou em sua fase de encerramento.
    if (world.stage.value === battleData.stages.started.value || world.stage.value === battleData.stages.endgame.value) {

        const scoreboard = world.scoreboard;

        // Bottom lost the round.
        if (scoreboard.bottom.impetus < scoreboard.top.impetus) {
            const side = world.sides.bottom;

            for (let sideData of side) {
                const company = await fromUuid(sideData.uuid);
                company.system.attributes.hp.value -= scoreboard.top.attack;

                await company.update({ ['system.attributes.hp.value']: company.system.attributes.hp.value });
            }
        }
        // Top lost the round.
        else if (scoreboard.top.impetus < scoreboard.bottom.impetus) {
            const side = world.sides.top;

            for (let sideData of side) {
                const company = await fromUuid(sideData.uuid);
                company.system.attributes.hp.value -= scoreboard.bottom.attack;

                await company.update({ ['system.attributes.hp.value']: company.system.attributes.hp.value });
            }
        }

        scoreboard.top.impetus = 0;
        scoreboard.bottom.impetus = 0;
        scoreboard.top.attack = 0;
        scoreboard.bottom.attack = 0;

        const lastRound = world.turns.current;
        world.turns.current += (updateOptions.direction * -1);
        world.turns.current = Math.clamp(world.turns.current, 0, world.turns.max);

        if (world.turns.current == 0) world.stage = battleData.stages.endgame;
        else if (world.turns.current > 0 && lastRound == 0) {
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: game.i18n.localize("ldnd5e.messages.restartBattleTitle") },
                content: `<p>${game.i18n.localize("ldnd5e.messages.restartBattle")}</p>`
            });

            if (confirmed) world.stage = battleData.stages.started;
            else world.turns.current = lastRound;
        }
        else if (world.turns.current == world.turns.max && lastRound == world.turns.max) {
            world.turns.current = 0;
            world.turns.elapsed = 0;
            world.turns.max = 0;
            world.turns.pct = 0;
            world.turns.max = 0;

            world.stage = battleData.stages.prep;
        }

        await game.settings.set('ldnd5e', 'battle', world);

        if (world.application instanceof BattleApp) world.application.render({ force: true });
    }
});

/** ---------------------------------------------------- */
/** Funções do Sistema D&D                               */
/** ---------------------------------------------------- */

// ACTORS ------------------------------------------------//
Hooks.on('preCreateActor', async (document, data, options, userId) => {
    if ([typeCompany, typeUnit].includes(document.type) && data.isMember) {
        await document.setFlag('ldnd5e', 'isMember', true);
    }
});
Hooks.on('createActor', async (document, options, userId) => {
    patchActorCreate(document);
});
Hooks.on('updateActor', async (document, data, options, userId) => {
    if (document.type == "ldnd5e.company") {
        const companyData = document.system;
        const armyData = companyData.info.army;

        if (armyData) {
            Object.values(armyData.apps).forEach(app => {
                app.render(true);
            })
        }
    } else if (document.type == "ldnd5e.unit") {
        const unitData = document.system;
        const companyData = unitData.info.company;

        if (companyData) {
            Object.values(companyData.apps).forEach(app => {
                app.render(true);
            })
        }
    }
});
Hooks.on('dnd5e.restCompleted', (actor, result, config) => {
    patchLongRest(actor, result, config);
});
// ------------------------------------------------------//

// ITENS ------------------------------------------------//
Hooks.on('createItem', async (document, data, options, userId) => {
    patchItemCreate(document.actor, document);

    if (document.type === typeTatic && document.img === "modules/ldnd5e/ui/icons/tatics-dark.svg")
        document.update({ 'img': "modules/ldnd5e/ui/icons/tatics.svg" });
    else if (document.type === typeAsset && document.img === "modules/ldnd5e/ui/icons/assets-dark.svg")
        document.update({ 'img': "modules/ldnd5e/ui/icons/assets.svg" });
    else if (document.type === typeEvent && document.img === "modules/ldnd5e/ui/icons/events-dark.svg")
        document.update({ 'img': "modules/ldnd5e/ui/icons/events.svg" });
});
Hooks.on('preUpdateItem', async (document, change, options, userId) => {
    patchItemPreUpdate(document.actor, document, change);
});
Hooks.on('preDeleteItem', async (document, options, userId) => {
    patchItemPreDelete(document.actor, document);
});
// ------------------------------------------------------//

// ACTIVE EFFECTS ---------------------------------------//
Hooks.on('preDeleteActiveEffect', async (document, options, userId) => {
    const actor = document.parent;

    const armorEffect = actor.getFlag("ldnd5e", "armorEffect");
    const shieldEffect = actor.getFlag("ldnd5e", "shieldEffect");

    if (armorEffect?.effectID === document.id || shieldEffect?.effectID === document.id) {
        return false; // Cancela a exclusão do efeito de armadura ou escudo.
    }

});
// ------------------------------------------------------//

// ROLLS ------------------------------------------------//
Hooks.on('dnd5e.preRollAttack', (rolls, rollData) => {
    patchAttackRollRoutines(rolls, rollData);
});
Hooks.on('dnd5e.preRollAbilityCheck', (rolls, rollData) => {
    patchExtraRollRoutines(rolls, rollData);
});
Hooks.on('dnd5e.preRollSavingThrow', (rolls, rollData) => {
    patchExtraRollRoutines(rolls, rollData);
});
Hooks.on('dnd5e.preRollSkill', (rolls, rollData) => {
    patchExtraRollRoutines(rolls, rollData);
});
Hooks.on('dnd5e.preRollInitiative', (actor, roll) => {
    patchIniciativeRollRoutines(actor, roll);
});

Hooks.on('dnd5e.preRollDamageV2', (config, dialog, message) => {
    const button = config.event.currentTarget;
    item.rolledVersatile = (button.dataset.action == 'twoHanded');
});
Hooks.on('dnd5e.buildDamageRollConfig', (rolls, config, dialog, message) => {
    const i = 0;
});
Hooks.on('dnd5e.rollDamage', (item, rollData) => {
    //await ecs.patchRollDamage(item, rollData);
});
// ------------------------------------------------------//

// CHAT MESSAGE------------------------------------------//
Hooks.on('renderChatMessage', async (message, html, messageData) => {
    const itemFlag = message.getFlag("dnd5e", "item");
    if (itemFlag) {
        const item = await fromUuid(itemFlag?.uuid);
        if (!item) return;
        await ecs.patchChatUseMessage(item, html);
    }

    const rollFlag = message.getFlag("dnd5e", "roll");
    if (rollFlag?.type == 'damage') {
        await ecs.patchChatDmgMessage(message, html, messageData);
    }
});
// ------------------------------------------------------//

/** ---------------------------------------------------- */
/** Funções Internas                                     */
/** ---------------------------------------------------- */

async function loadAffinities() {
    let affinities = game.settings.settings.get('ldnd5e.affinity').default;
    // Prepara o mapeamento das classes registradas do mundo.
    const classes = new Map();

    const localItems = Object.values(game.items).filter(i => i.type === "class");
    const packs = game.packs.filter(p => p.documentName === "Item");

    const totalItems = localItems.length + packs.length;
    let n = 0;
    let pct = 0;

    const progress = ui.notifications.info(game.i18n.format(i18nStrings.messages.loadingAffinities, { n, totalItems }), { progress: true });

    // Classes do mundo.
    for (const item of localItems) {
        if (["class"].includes(item.type)) {
            classes.set(item.identifier, item);
        }
        n++;
        pct = (n / totalItems);
        progress.update({ pct, message: game.i18n.format(i18nStrings.messages.loadingAffinities, { n, totalItems }) });
    }

    // Classes em Compêndios.
    for (const pack of packs) {
        const index = pack.index.filter(i => ["class"].includes(i.type));
        for (const i of index) {
            const doc = await pack.getDocument(i._id);
            // Evita duplicatas com base no nome.
            if (!classes.has(doc.identifier)) {
                classes.set(doc.identifier, doc);
            }
        }

        n++;
        pct = (n / totalItems);
        progress.update({ pct, message: game.i18n.format(i18nStrings.messages.loadingAffinities, { n, totalItems }) });
    }

    Array.from(classes.values()).forEach(c => {
        affinities[c.identifier] = {
            uuid: c.uuid,
            identifier: c.identifier,
            name: c.name,
            img: c.img,
            category: '',
            abilities: Object.entries(dnd5e.config.abilities).map(([key, abl]) => {
                return {
                    key,
                    label: abl.label,
                    value: false
                };
            })
        };
    });
    await game.settings.set("ldnd5e", "affinity", affinities);
}

function registerRPGAwesome() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "modules/ldnd5e/css/rpg-awesome.min.css";
    document.head.appendChild(link);
}

async function renderACControl() {
    // Cria um instância do Controle de Dano Absorvido
    const app = isV13 ? new ADControlV2() : new ADControl();

    return await app.render({ force: true });
}

async function renderBattleControl() {
    const form = new BattleApp();

    return await form.render(true);
}

function patchExtraRollRoutines(rolls, rollData) {
    const actor = rolls.subject;
    const exh = actor.system.attributes.exhaustion;
    const roll = rolls.rolls[0];

    // Use Exhaustion One D&D Rule
    if (game.settings.get('ldnd5e', 'oneDNDExhaustionRule')) {
        // New Rule: '-1' in D20 Rolls for each Exhaustion Level.
        if (exh > 0) {
            if (roll.parts) roll.parts.push(`${(-1 * exh)}`);
            else roll.parts = [`${(-1 * exh)}`];
        }
    }
}

function patchAttackRollRoutines(rolls, rollData) {
    const actor = rolls.subject.actor;
    const exh = actor.system.attributes.exhaustion;
    const activity = rolls.subject;

    // Use Exhaustion One D&D Rule
    if (game.settings.get('ldnd5e', 'oneDNDExhaustionRule')) {
        // New Rule: '-1' in D20 Rolls for each Exhaustion Level.
        if (exh > 0) {
            activity.attack.bonus = `${(-1 * exh)}`;
        }
    }
}

function patchIniciativeRollRoutines(actor, roll) {
    const exh = actor.system.attributes.exhaustion;
    // Use Exhaustion One D&D Rule
    if (game.settings.get('ldnd5e', 'oneDNDExhaustionRule')) {
        // New Rule: '-1' in D20 Rolls for each Exhaustion Level.
        if (exh > 0) {
            roll.parts.push(`${(-1 * exh)}`);
        }
    }
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
    const effects = html.querySelectorAll('li.effect');
    for (var effect of effects) {
        if (effect.dataset.effectId === armorFlag?.effectID || effect.dataset.effectId === shieldFlag?.effectID) {
            effect.classList.add("fixed-effect");
            effect.draggable = false;
            const control = effect.getElementsByClassName("effect-controls");
            const btns = control[0].getElementsByClassName("effect-control");
            Array.from(btns).forEach((value) => { value.hidden = true; });
        }
    }
}

/** ---------------------------------------------------- */
/** Funções de Sheets                                    */
/** ---------------------------------------------------- */
async function patchActorCreate(actor) {
    const visibleFlag = actor.getFlag("ldnd5e", "dasEnabled");
    if (visibleFlag == undefined) {
        await actor.setFlag("ldnd5e", "dasEnabled", true);
    }
}
async function patchLongRest(actor, result, config) {
    actor._restFatigue(result, config);
}
async function patchItemCreate(actor, item) {

    // Atualiza os dados do novo Item antes de enviar para ser processado.
    if (item.type === "equipment" && CONFIG.DND5E.armorTypes[item.system.type.value]) {

        // Se Item não está devidamente configurado, configure-o antes de enviar para processamento.
        if (item.subtype == undefined) {
            // Itens sem Actors, estão sempre desequipados.
            item.equipped = (item.actor && (item.actor.system.attributes.ac.equippedArmor?.id === item.id ||
                item.actor.system.attributes.ac.equippedShield?.id === item.id)) || false;

            item.armorType = item.system.type.value;
            item.destroyed = item.system.armor.destroyed || false;
            item.subtype = (item.armorType === das.TIPO_ARMOR.SHIELD ? "shield" : "armor");
            item.unarmored = false;
        }

        await das.computeEquipArmorShield(actor, item, das.ACTION_TYPE.NEW);
    }
}
async function patchItemPreUpdate(actor, item, change) {

    // Apenas itens do tipo 'equipment' válidos devem ser processados.
    if (item.type === "equipment" && CONFIG.DND5E.armorTypes[item.system.type.value]) {
        // Se Item não está devidamente configurado, configure-o antes de enviar para processamento.
        if (item.subtype == undefined) {
            // Itens sem Actors, estão sempre desequipados.
            item.equipped = (item.actor && (item.actor.system.attributes.ac.equippedArmor?.id === item.id ||
                item.actor.system.attributes.ac.equippedShield?.id === item.id)) || false;

            item.armorType = item.system.type.value;
            item.destroyed = item.system.armor.destroyed || false;
            item.subtype = (item.armorType === das.TIPO_ARMOR.SHIELD ? "shield" : "armor");
            item.unarmored = false;
        }

        const isDesequip = ((change.equipped ?? false) && change.equipped == false);

        const ACPenalty = change.flags?.ldnd5e?.armorSchema?.ACPenalty;
        const wasDamaged = (ACPenalty !== undefined && ACPenalty !== "+0");

        if (["armor", "shield"].includes(item?.subtype)) {
            if (isDesequip || wasDamaged)
                await das.computeEquipArmorShield(actor, item, (isDesequip ? das.ACTION_TYPE.DESEQUIP : das.ACTION_TYPE.UPDATE));
        }
    }
}

async function patchItemPreDelete(actor, item) {
    if (["armor", "shield"].includes(item?.subtype)) {
        await das.computeEquipArmorShield(actor, item, das.ACTION_TYPE.DELETE);
    }
}

/** ---------------------------------------------------- */
/** Funções de Wrapper                                   */
/** ---------------------------------------------------- */
function patchRollDamage() {
    libWrapper.register('ldnd5e', 'CONFIG.Dice.DamageRoll.prototype.configureDamage', async function (wrapper, config, ...rest) {
        if (this.isCritical && game.settings.get('ldnd5e', 'criticalDamageModifiers')) {
            let flatBonus = 0;

            // Add powerful critical bonus
            if (this.options.powerfulCritical && (flatBonus > 0)) {
                this.terms.push(new OperatorTerm({ operator: "+" }));
                this.terms.push(new NumericTerm({ number: flatBonus }, { flavor: game.i18n.localize("DND5E.PowerfulCritical") }));
            }

            // Add extra critical damage term
            if (this.isCritical && this.options.criticalBonusDamage) {
                const extra = new Roll(this.options.criticalBonusDamage, this.data);
                if (!(extra.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({ operator: "+" }));
                this.terms.push(...extra.terms);
            }

            // Re-compile the underlying formula
            this._formula = this.constructor.getFormula(this.terms);

            // Mark configuration as complete
            this.options.configured = true;
        } else await wrapper(config, ...rest);
    });

    libWrapper.register('ldnd5e', 'CONFIG.Dice.DamageRoll.prototype.evaluate', async function (wrapper, config, ...rest) {
        if (game.settings.get('ldnd5e', 'criticalDamageModifiers') && this.isCritical) {
            let criticalFormula = "";
            let criticalTerms = [];
            for (let term of this.terms) {
                if (term instanceof DiceTerm) {
                    criticalFormula += `((${term.formula})*2)`;
                    criticalTerms.push(term);
                    criticalTerms.push(new OperatorTerm({ operator: "*" }));
                    criticalTerms.push(new NumericTerm({ number: 2 }));
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

    libWrapper.register("ldnd5e", "Combat.prototype.endCombat", async function (wrapped, ...args) {
        const result = await wrapped(...args);
        const world = game.settings.get('ldnd5e', 'battle');

        // Altera os turnos da batalha apenas se o combate estiver iniciado.
        if (world.stage.value === battleData.stages.started.value || world.stage.value === battleData.stages.endgame.value) {

            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: game.i18n.localize("ldnd5e.messages.endBattleTitle") },
                content: `<p>${game.i18n.localize("ldnd5e.messages.endBattle")}</p>`
            });

            if (confirmed) {
                world.turns.current = 0;
                world.turns.elapsed = 0;
                world.turns.max = 0;
                world.turns.pct = 0;
                world.turns.max = 0;

                world.stage = battleData.stages.prep;

                await game.settings.set('ldnd5e', 'battle', world);
                if (world.application instanceof BattleApp) world.application.render({ force: true });
            }
        }

        return result;
    }, "WRAPPER");
}

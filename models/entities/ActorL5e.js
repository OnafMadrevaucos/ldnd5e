import { documents } from "../../../../systems/dnd5e/dnd5e.mjs";
import * as ars from "../../scripts/ARSystem.js";
import * as das from "../../scripts/DASystem.js";
import { constants, UnarmoredClasses, i18nStrings } from "../../scripts/constants.js";
import FatigueDialog from "../dialogs/FatigueDialog.js";

const ACTIVE_EFFECT_MODES = CONST.ACTIVE_EFFECT_MODES;
const ADD = ACTIVE_EFFECT_MODES.ADD;

export default class ActorL5e extends documents.Actor5e {

    get isUnarmored() {
        const armor = this.items.reduce((arr, item) => {
            if (item.type === "equipment" && CONFIG.DND5E.armorTypes[item.system.armor?.type]) {
                arr.push(item);
            }
            return arr;
        }, []);

        return (armor.length == 0 && !["default"].includes(this.system.attributes.ac.calc));
    }

    get isFatigued() {
        const unarmoredDef = this.getFlag("ldnd5e", "unarmoredDef");
        return unarmoredDef?.RealDL > 0 ?? false;
    }

    /** @override */
    async _onCreate(data, options, user) {
        super._onCreate(data, options, user);

        if (["character"].includes(data.type)) await this.configL5e();
    }

    /** @override */
    async prepareData() {
        super.prepareData();
    }

    /** @override */
    async prepareDerivedData() {
        super.prepareDerivedData();

        const actorData = this;
        const data = actorData.system;

        if (!(["group"].includes(this.type) || this.type.startsWith("ldnd5e"))) {
            data.profMod = data.attributes.prof > 0 ? `+${data.attributes.prof}` : data.attributes.prof.toString();
            data.abilities.con.strMod = data.abilities.con.mod > 0 ? `+${data.abilities.con.mod}` : data.abilities.con.mod.toString();

            //this._prepareARMods(data);

            if (["character"].includes(this.type)) {
                data.attributes.ac.lan = das.prepareLAN(data);
                data.attributes.ac.ldo = das.prepareLDO(data);

                if (CONFIG.adControl && !CONFIG.isV13) {
                    await CONFIG.adControl.render({ force: true });
                }

                const dasEnabled = (this.getFlag("ldnd5e", "dasEnabled") ?? true);
                data.dasEnabled = dasEnabled;
            }
        }
    }

    async _restFatigue(restResult, config = {}) {
        if (restResult && restResult.longRest) {
            const actorData = this.system;
            const classes = this.classes;

            if (this.isUnarmored && this.isFatigued) {
                const item = actorData.attributes.ac.equippedArmor;
                const rollResult = await FatigueDialog.fatigueDialog({ owner: this, item: item });

                // Fatigue roll sucessfull.
                if (rollResult) {

                    var abl = null;
                    var mod = 0; // Clases não treinadas recuperam no máximo 1 ponto de fadiga por descanso longo.
                    if (UnarmoredClasses.barbarian.name in classes) {
                        abl = this.system.abilities[UnarmoredClasses.barbarian.ability];
                        mod = abl.mod;
                    }
                    if (UnarmoredClasses.monk.name in classes) {
                        abl = this.system.abilities[UnarmoredClasses.monk.ability];
                        mod = abl.mod;
                    }
                    const amountRecovered = Math.max(1, Math.floor(mod / 2));

                    const result = das.computaREST(item, this, amountRecovered);
                    const ok = await das.prepareActiveEffects(item, this, result, {
                        unarmored: true,
                        fatigueLost: true,
                        amountRecovered: amountRecovered
                    });

                    if (ok) await CONFIG.adControl.render({ force: true });
                }
            }
        }
    }

    /**
   * Spawn a dialog for creating a new Item.
   * @param {object} [data]  Data to pre-populate the Item with.
   * @param {object} [context]
   * @param {Actor5e} [context.parent]       A parent for the Item.
   * @param {string|null} [context.pack]     A compendium pack the Item should be placed in.
   * @param {string[]|null} [context.types]  A list of types to restrict the choices to, or null for no restriction.
   * @returns {Promise<Item5e|null>}
   
    static async createDialog(data={}, { parent=null, pack=null, types=null, ...options }={}) {
        types ??= game.documentTypes[this.documentName].filter(t => !t.startsWith("ldnd5e"));

        return super.createDialog(data, { parent, pack, types, ...options });
    }
    */


    //------------------------------------------------------
    //  Funções Novas 
    // ----------------------------------------------------- 

    configArmorData() {
        const armor = this.items.reduce((arr, item) => {
            if (item.type === "equipment" && CONFIG.DND5E.armorTypes[item.system.type.value]) {

                item.equipped = (item.actor.system.attributes.ac.equippedArmor?.id === item.id ||
                    item.actor.system.attributes.ac.equippedShield?.id === item.id);

                item.armorType = item.system.type.value;
                item.destroyed = item.system.armor.destroyed;
                item.subtype = (item.armorType === das.TIPO_ARMOR.SHIELD ? "shield" : "armor");
                item.unarmored = false;

                arr.push(item);
            }
            return arr;
        }, []);

        // Same as 'isUnarmored'
        if (armor.length == 0 && !["default"].includes(this.system.attributes.ac.calc)) {
            const unarmoredDef = this.getFlag("ldnd5e", "unarmoredDef");
            const unarmored = {
                id: null,
                name: game.i18n.localize(i18nStrings.noArmorName),
                img: constants.images.noArmorDefault,
                actor: this,
                equipped: true,
                subtype: "armor",
                unarmored: true,
                system: {
                    type: { value: das.TIPO_ARMOR.UNARMORED },
                    armor: {}
                }
            }

            if (!unarmoredDef) {
                // Armor Damage Level
                unarmored.system.armor.DL = {
                    bldg: 0,
                    pierc: 0,
                    slsh: 0
                }

                unarmored.system.armor.RealDL = 0;

                // Armor Absorved Damage.
                unarmored.system.armor.AD = {
                    bldg: 0,
                    pierc: 0,
                    slsh: 0
                }

                // Armor Half Absorved Damage.
                unarmored.system.armor.HalfAD = {
                    bldg: false,
                    pierc: false,
                    slsh: false
                }

                unarmored.system.armor.ACPenalty = "0";
            }
            else {
                // Load pre-existing unarmored info.
                unarmored.system.armor = unarmoredDef;
            }

            armor.push(unarmored);
            this.system.attributes.ac.equippedArmor = unarmored;
        }

        return armor;
    }

    async configL5e() {
        var hasError = false;

        const armorFlag = this.getFlag("ldnd5e", "armorEffect");
        const shieldFlag = this.getFlag("ldnd5e", "shieldEffect");

        if (!armorFlag && !shieldFlag) {

            // Active Effect padrão usado para controlar os efeitos de avaria das Armaduras.
            const armorEffect = {
                _id: randomID(),
                name: game.i18n.localize(i18nStrings.activeEffectLabel),
                icon: constants.images.armorEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: null, value: "+0" }],
                duration: {}
            };

            // Active Effect padrão usado para controlar os efeitos de avaria dos Escudos.
            const shieldEffect = {
                _id: randomID(),
                name: game.i18n.localize(i18nStrings.activeEffectShieldLabel),
                icon: constants.images.shieldEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: null, value: "+0" }],
                duration: {}
            };

            const createEffectsPromise = this.createEmbeddedDocuments("ActiveEffect", [armorEffect, shieldEffect]);

            createEffectsPromise.then((createdEffects) => {
                // Cria flgas para armazenar e gerênciar os ids tanto dos Active Effect quanto das Armaduras/Escudos.
                this.setFlag("ldnd5e", "armorEffect", { effectID: createdEffects[0]._id, armorID: "none" });
                this.setFlag("ldnd5e", "shieldEffect", { effectID: createdEffects[1]._id, shieldID: "none" });
            });

            await this.setFlag("ldnd5e", "L5eConfigured", true);

            this.configArmorData();
            hasError = true;
        }
        else if (!armorFlag) {

            // Active Effect padrão usado para controlar os efeitos de avaria das Armaduras.
            const armorEffect = {
                _id: randomID(),
                name: game.i18n.localize(i18nStrings.activeEffectLabel),
                icon: constants.images.armorEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 50, value: "0" }],
                duration: {}
            };

            const createEffectsPromise = this.createEmbeddedDocuments("ActiveEffect", [armorEffect]);

            createEffectsPromise.then((createdEffects) => {
                // Cria flgas para armazenar e gerênciar os ids tanto dos Active Effect quanto das Armaduras.
                this.setFlag("ldnd5e", "armorEffect", { effectID: createdEffects[0]._id, armorID: "none" });
            });

            await this.setFlag("ldnd5e", "L5eConfigured", true);

            this.configArmorData();
            hasError = true;
        }
        else if (!shieldFlag) {
            // Active Effect padrão usado para controlar os efeitos de avaria dos Escudos.
            const shieldEffect = {
                _id: randomID(),
                name: game.i18n.localize(i18nStrings.activeEffectShieldLabel),
                icon: constants.images.shieldEffectDefault,
                origin: this.uuid,
                changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 51, value: "0" }],
                duration: {}
            };

            const createEffectsPromise = this.createEmbeddedDocuments("ActiveEffect", [shieldEffect]);

            createEffectsPromise.then((createdEffects) => {
                // Cria flgas para armazenar e gerênciar os ids tanto dos Active Effect quanto dos Escudos.
                this.setFlag("ldnd5e", "shieldEffect", { effectID: createdEffects[1]._id, shieldID: "none" });
            });

            await this.setFlag("ldnd5e", "L5eConfigured", true);

            this.configArmorData();
            hasError = true;
        }

        return hasError;
    }
    async fullAsyncConfigL5e() {
        var hasError = false;

        const armorItem = this.system.attributes.ac.equippedArmor;
        const shieldItem = this.system.attributes.ac.equippedShield;

        const armorFlag = this.getFlag("ldnd5e", "armorEffect");
        const shieldFlag = this.getFlag("ldnd5e", "shieldEffect");

        const armorEffect = this.effects.get(armorFlag?.effectID);
        const shieldEffect = this.effects.get(shieldFlag?.effectID);

        if (!armorEffect || !shieldEffect) {
            const armorEffectLabel = game.i18n.localize(i18nStrings.activeEffectLabel);
            const shieldEffectLabel = game.i18n.localize(i18nStrings.activeEffectShieldLabel);

            var armorEffectFound = (armorEffect != null);
            var shieldEffectFound = (shieldEffect != null);
            for (var effect of this.effects) {
                if (!armorEffectFound && effect.name === armorEffectLabel) {
                    armorEffectFound = true;
                    await this.setFlag("ldnd5e", "armorEffect", { effectID: effect._id, armorID: armorItem._id });
                    await this.updateArmorDamageEffects({ _id: effect._id, name: effect.name, ...effect }, armorItem.system.armor.ACPenalty);
                } else if (!shieldEffectFound && effect.name === shieldEffectLabel) {
                    shieldEffectFound = true;
                    await this.setFlag("ldnd5e", "shieldEffect", { effectID: effect._id, shieldID: shieldItem._id });
                    await this.updateArmorDamageEffects({ _id: effect._id, name: effect.name, ...effect }, shieldItem.system.armor.ACPenalty);
                }
            }

            if (!armorFlag || !armorEffectFound) {
                ui.notifications.warn(game.i18n.format(i18nStrings.messages.noArmorEffect, { actor: this.name }));
                // Active Effect padrão usado para controlar os efeitos de avaria das Armaduras.
                const armorEffect = {
                    _id: armorFlag.effectID ?? randomID(),
                    label: game.i18n.localize(i18nStrings.activeEffectLabel),
                    icon: constants.images.armorEffectDefault,
                    origin: this.uuid,
                    changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 50, value: armorItem.system.armor.ACPenalty ?? "0" }],
                    duration: {}
                };

                // Cria um Active Effect para armazenar os efeitos das Armaduras.
                const createdArmorEffect = await this.createEmbeddedDocuments("ActiveEffect", [armorEffect]);
                await this.setFlag("ldnd5e", "armorEffect", { effectID: createdArmorEffect[0]._id, armorID: "none" });
            }

            if (!shieldFlag || !shieldEffectFound) {
                ui.notifications.warn(game.i18n.format(i18nStrings.messages.noShieldEffect, { actor: this.name }));
                // Active Effect padrão usado para controlar os efeitos de avaria dos Escudos.
                const shieldEffect = {
                    _id: shieldFlag.effectID ?? randomID(),
                    label: game.i18n.localize(i18nStrings.activeEffectShieldLabel),
                    icon: constants.images.shieldEffectDefault,
                    origin: this.uuid,
                    changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: 51, value: shieldItem?.system.armor.ACPenalty ?? "0" }],
                    duration: {}
                };

                // Cria um Active Effect para armazenar os efeitos dos Escudos.
                const createdShieldEffect = await this.createEmbeddedDocuments("ActiveEffect", [shieldEffect]);
                await this.setFlag("ldnd5e", "shieldEffect", { effectID: createdShieldEffect[0]._id, shieldID: "none" });
            }

            await this.setFlag("ldnd5e", "L5eConfigured", true);

            this.configArmorData();
            hasError = true;
        }

        const dasEnabled = this.getFlag("ldnd5e", "dasEnabled");
        if (dasEnabled == undefined) {
            await this.unsetFlag("ldnd5e", "isVisible");
            await this.setFlag("ldnd5e", "dasEnabled", true);
            hasError = true;
        }

        return hasError;
    }

    async updateArmorDamageEffects(data, value) {

        // Active Effect padrão que será atualizado.
        const newEffect = {
            _id: data._id,
            name: data.name,
            img: data.img,
            origin: data.origin,
            changes: [{ key: "system.attributes.ac.bonus", mode: ADD, priority: null, value: value }],
            duration: {}
        };
        await this.updateEmbeddedDocuments("ActiveEffect", [newEffect]);
    }
}
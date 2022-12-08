import { constants, NDs, i18nStrings } from "../scripts/constants.js";

export default class companyControl extends Application{

    constructor( owner, options = {} ) {
        super(options);

        this.data = {};
        this.data.owner = owner;
    }

    /**@override */
    async getData() {           
        this.data.units = this._prepareUnits();
        // Retorna data para a tela.
        return this.data;
    }

    static get defaultOptions()
    {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName],
         template: constants.templates.cControlTemplate,
         width: 900,
         height: 650,
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
    }

    _prepareUnits(){   
        const owner = this.data.owner;

        const lightUnitID = owner.getFlag("ldnd5e", "lightUnitID");
        const heavyUnitID = owner.getFlag("ldnd5e", "heavyUnitID");
        const specialUnitID = owner.getFlag("ldnd5e", "specialUnitID");   
        
        const lightUnit = game.actors.get(lightUnitID);
        const heavyUnit = game.actors.get(heavyUnitID);
        const specialUnit = game.actors.get(specialUnitID);
        
        const units = {
            light: lightUnit ?? null,
            heavy: heavyUnit ?? null,
            special: specialUnit ?? null
        }

        return units;
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

        const activeTab = document.querySelectorAll('.unit-list.active');

        switch(activeTab[0]?.dataset.tab)
        {
            case "light":{
                owner.setFlag("ldnd5e", "lightUnitID", actor.id);
            }
            break;
            case "heavy":{
                owner.setFlag("ldnd5e", "heavyUnitID", actor.id);
            }
            break;
            case "special":{
                owner.setFlag("ldnd5e", "specialUnitID", actor.id);
            }
            break;
            default: return;
        }
    }
}
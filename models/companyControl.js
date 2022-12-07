import { constants, NDs, i18nStrings } from "../scripts/constants.js";

export default class companyControl extends Application{

    constructor( actor, options = {} ) {
        super(options);

        this._configureDragDrops();

        this.data = {};
        this.data.actor = actor;
    }

    /**@override */
    async getData() {   

        this.data.units = this._prepareUnits(this.data.actor);
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
         tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'light-list' }]
      });
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
    }

    _configureDragDrops()
    {
        const dragDrop = new DragDrop({
            dragSelector: null,
            dropSelector: ".light-list",
            permissions: { dragstart: false, drop: this._canDragDrop.bind(this) },
            callbacks: { dragstart: null, drop: this._onDropUnit.bind(this) }
        });
        
        const lightList = document.find('.light-list');

        dragDrop.bind(lightList[0]);
    }

    _prepareUnits(actor){        
        const lightUnitID = actor.getFlag("ldnd5e", "lightUnitID");
        const heavyUnitID = actor.getFlag("ldnd5e", "heavyUnitID");
        const specialUnitID = actor.getFlag("ldnd5e", "specialUnitID");   
        
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

    _onDropUnit(event) {
        super._onDrop(event);

        const i = 0;
    }
}
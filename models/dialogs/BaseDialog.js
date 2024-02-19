export default class BaseDialog extends Dialog {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {            
            classes: [(CONFIG.IsDnD2 ? "dnd5e2" : "dnd5e"), "dialog"]
        });
    }

    /** @inheritDoc */
    async _renderOuter() {
        const html = await super._renderOuter();
        const header = html[0].querySelector(".window-header");
        header.querySelectorAll(".header-button").forEach(btn => {
            const label = btn.querySelector(":scope > i").nextSibling;
            btn.dataset.tooltip = label.textContent;
            btn.setAttribute("aria-label", label.textContent);
            label.remove();
            });
        return html;
    }
}
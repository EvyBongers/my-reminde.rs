import {html, LitElement, TemplateResult} from "lit";
import {customElement} from "lit/decorators.js";
import {routeTarget} from "../helpers/Decorators";

@customElement("slotted-content")
@routeTarget
export class SlottedContent extends LitElement {
  override render(): TemplateResult {
    return html`
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "slotted-content": SlottedContent;
  }
}

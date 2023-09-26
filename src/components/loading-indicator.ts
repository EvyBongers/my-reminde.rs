import {css, html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import "@material/mwc-circular-progress";

@customElement("loading-indicator")
export class LoadingIndicator extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      inset: 0;

      background-color: rgba(0, 0, 0, 0.16);
      z-index: 2;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  override render() {
    return html`<mwc-circular-progress indeterminate></mwc-circular-progress>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "loading-indicator": LoadingIndicator;
  }
}

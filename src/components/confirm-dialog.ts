import {customElement, property} from "lit/decorators.js";
import {html, LitElement, PropertyValues} from "lit";
import "@material/mwc-dialog";
import "@material/mwc-button";

@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {
  @property()
  cancelLabel: string;

  @property()
  confirmLabel: string;

  private _confirm: Event = new Event("confirm");
  private _cancel: Event = new Event("cancel");
  private _closed: Event = new Event("closed");

  override render() {
    return html`
      <mwc-dialog @closed="${()=>this.dispatchEvent(this._closed)}">
        <div><slot></slot></div>
        <mwc-button slot="primaryAction" dialogAction="ok" @click="${()=>this.dispatchEvent(this._confirm)}">${this.confirmLabel}</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close" @click="${()=>this.dispatchEvent(this._cancel)}">${this.cancelLabel}</mwc-button>
      </mwc-dialog>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", (ev) => { ev.stopPropagation(); })
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.shadowRoot.querySelector("mwc-dialog").show();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-dialog": ConfirmDialog;
  }
}

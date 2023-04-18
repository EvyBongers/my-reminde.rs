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
  private _opening: Event = new Event("opening");

  override render() {
    return html`
      <mwc-dialog @closed="${()=>this.dispatchEvent(this._closed)}" @opening="${()=>this.dispatchEvent(this._opening)}">
        <div><slot></slot></div>
        <mwc-button slot="primaryAction" dialogAction="ok" @click="${()=>this.dispatchEvent(this._confirm)}">${this.confirmLabel}</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close" @click="${()=>this.dispatchEvent(this._cancel)}">${this.cancelLabel}</mwc-button>
      </mwc-dialog>
    `;
  }

  show() {
    return this.shadowRoot.querySelector("mwc-dialog").show();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-dialog": ConfirmDialog;
  }
}

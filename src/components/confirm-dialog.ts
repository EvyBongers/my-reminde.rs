import {customElement, property, query} from "lit/decorators.js";
import {html, LitElement} from "lit";
import "@material/mwc-dialog";
import "@material/mwc-button";
import {Dialog} from "@material/mwc-dialog";

@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {
  @property({type: Boolean, reflect: true})
  open: boolean;

  @property()
  cancelLabel: string;

  @property()
  confirmLabel: string;

  @query("mwc-dialog")
  dialog: Dialog;

  private _confirm: Event = new Event("confirm");
  private _cancel: Event = new Event("cancel");
  private _closed: Event = new Event("closed");
  private _opening: Event = new Event("opening");

  constructor() {
    super();
    this.updateComplete.then(() => {
      this.dialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.dialog.addEventListener("opening", () => this.dispatchEvent(this._opening));
      this.dialog.addEventListener("closed", () => this.dispatchEvent(this._closed));
      this.dialog.addEventListener("closing", (ev: CustomEvent) => this.dialogClosing.call(this, ev));
    });
  }

  override render() {
    return html`
      <mwc-dialog ?open="${this.open}">
        <div><slot></slot></div>
        <mwc-button slot="primaryAction" dialogAction="confirm">${this.confirmLabel}</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">${this.cancelLabel}</mwc-button>
      </mwc-dialog>
    `;
  }

  show() {
    this.dialog.show();
  }

  dialogClosing(ev: CustomEvent) {
    switch (ev.detail.action) {
      case "confirm":
        this.dispatchEvent(this._confirm);
        break;
      case "cancel":
        this.dispatchEvent(this._cancel);
        break;
      case "close":
        // default action
        break;
      default:
        console.log(`Unknown action: ${ev.detail.action}`)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-dialog": ConfirmDialog;
  }
}

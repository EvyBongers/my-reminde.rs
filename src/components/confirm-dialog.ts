import {html, LitElement} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {when} from "lit/directives/when.js";
import {MdDialog} from "@material/web/dialog/dialog";
import "@material/web/dialog/dialog";
import "@material/web/button/filled-button";
import "@material/web/button/text-button";

@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {
  @property({type: Boolean, reflect: true})
  open: boolean;

  @property()
  title: string;

  @property()
  cancelLabel: string;

  @property()
  confirmLabel: string;

  @query("md-dialog")
  dialog: MdDialog;

  private _confirm: Event = new Event("confirm");
  private _cancel: Event = new Event("cancel");
  private _closed: Event = new Event("closed");
  private _opening: Event = new Event("opening");

  constructor() {
    super();
    this.updateComplete.then(() => {
      this.dialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.dialog.addEventListener("open", () => this.dispatchEvent(this._opening));
      this.dialog.addEventListener("closed", () => this.dispatchEvent(this._closed));
      this.dialog.addEventListener("close", (ev: CustomEvent) => this.dialogClosing.call(this, this.dialog.returnValue));
    });
  }

  override render() {
    return html`
      <md-dialog ?open="${this.open}">
        ${when(this.title, () => html`<div slot="headline">${this.title}</div>`)}
        <form slot="content" id="confirmDialog" method="dialog">
          <slot></slot>
        </form>
        <div slot="actions">
          <md-text-button form="confirmDialog" value="cancel">${this.cancelLabel}</md-text-button>
          <md-filled-button form="confirmDialog" value="confirm">${this.confirmLabel}</md-filled-button>
        </div>
      </md-dialog>
    `;
  }

  show() {
    this.dialog.show();
  }

  dialogClosing(returnValue: any) {
    switch (returnValue) {
      case "confirm":
        this.dispatchEvent(this._confirm);
        break;
      case "cancel":
      case "":
        this.dispatchEvent(this._cancel);
        break;
      default:
        console.log(`Unknown return value: '${returnValue}'`)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-dialog": ConfirmDialog;
  }
}

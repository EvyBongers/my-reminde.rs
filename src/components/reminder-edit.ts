import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {choose} from "lit/directives/choose.js";
import {customElement, property, query, queryAsync, state} from "lit/decorators.js";
import "@material/mwc-checkbox";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import "@material/mwc-ripple";
import "@material/mwc-select";
import {addDocByRef, setDocByRef} from "../db";
import {calculateNextSend} from "../helpers/Scheduling";
import {ReminderDocument} from "../../firebase/functions/src";
import {toastWrapper} from "../helpers/Decorators";
import {Dialog} from "@material/mwc-dialog";
import {TextField} from "@material/mwc-textfield";

@customElement("reminder-edit")
export class ReminderEdit extends LitElement {
  private _save: Event = new Event("save");
  private _cancel: Event = new Event("cancel");
  private _closed: Event = new Event("closed");
  private _opening: Event = new Event("opening");

  private calculatedNextSend : Date;

  @property({type: Boolean, reflect: true})
  open: boolean;

  @property()
  item: ReminderDocument;

  @property()
  documentRef: any;

  @property()
  collectionRef: any;

  @query("mwc-dialog")
  private dialog: Dialog;

  @queryAsync("mwc-textfield[name='schedule']")
  private textFieldSchedule: Promise<TextField>;

  @state()
  private hasLink: boolean;

  static override styles = css`
    :host {
      --mdc-dialog-min-width: 300px;
      position: absolute;
    }

    mwc-textfield, mwc-select {
      display: block;
    }
  `;

  constructor() {
    super();

    this.hasLink = this.item?.link != undefined;
    this.calculatedNextSend = calculateNextSend(this.item);

    this.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
    this.updateComplete.then(() => {
      this.dialog.addEventListener("opening", () => this.dispatchEvent(this._opening));
      this.dialog.addEventListener("closed",  () => this.dispatchEvent(this._closed));
      this.dialog.addEventListener("closing", (ev: CustomEvent) => this.dialogClosing.call(this, ev));
    });
  }

  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);

    this.textFieldSchedule.then((textField: TextField | null) => {
      if (!textField) return;

      textField.checkValidity = () => {
        try {
          this.calculatedNextSend = calculateNextSend(this.item);
          return true;
        } catch (e) {
          textField.setCustomValidity(e.message);
          return false;
        }
      }
    });
  }

  override render() {
    return html`
      <mwc-dialog id="editing" heading="${this.documentRef ? `Editing notification: ${this.item?.title}` : "New notification"}"
                  escapeKeyAction="cancel" scrimClickAction="cancel" ?open="${this.open}">
        <div>
          <mwc-textfield type="text" label="Title" icon="title" required
                         @input="${(_: Event) => this.item.title = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.title ?? ""}"></mwc-textfield>
          <br>
          <mwc-textfield type="text" label="Body" icon="notes" name="body" required
                         @input="${(_: Event) => this.item.body = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.body ?? ""}"></mwc-textfield>
          <br>
          <mwc-formfield label="Add link?">
            <mwc-checkbox ?checked="${this.hasLink}"
                          @change="${(_: Event) => this.hasLink = (_.currentTarget as HTMLInputElement).checked}"></mwc-checkbox>
          </mwc-formfield>
          <br>
          ${this.hasLink === true ? html`
            <mwc-textfield type="text" label="Link" icon="link" name="link" ?required="${this.hasLink}"
                           @input="${(_: Event) => this.item.link = (_.currentTarget as HTMLInputElement).value}"
                           .value="${this.item?.link ?? ""}"></mwc-textfield>
            <br>` : nothing}
          <mwc-select name="type" label="Schedule type" icon="event" required
                      @selected="${(_: Event) => {
                        this.item.type = (_.currentTarget as HTMLSelectElement).value;
                        this.requestUpdate(this.item.type, "");
                      }}"
                      .value="${this.item?.type ?? ""}">
            <mwc-list-item graphic="icon" value="cron">Cron schedule</mwc-list-item>
          </mwc-select>
          <br>
          ${choose(this.item?.type, [
                ['cron', () => html`
                  <mwc-textfield type="text" label="Schedule" name="schedule" required
                                 .helper="${this.calculatedNextSend?.toLocaleString()}"
                                 @input="${(e: Event) => {
                                   let field = e.target as TextField;
                                   this.item.cronExpression = field.value;
                                   field.reportValidity();
                                   this.requestUpdate("calculatedNextSend");
                                 }}"
                                 .value="${this.item?.cronExpression ?? ""}"></mwc-textfield>
                `],
              ],
              () => html``)}
        </div>
        <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  dialogClosing(ev: CustomEvent) {
    this.open = false;
    switch (ev.detail.action) {
      case "save":
        this.save();
        this.dispatchEvent(this._save);
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

  show() {
    this.open = true;
  }

  @toastWrapper({
    successMessage: "Reminder saved",
    progressMessage: "Saving...",
    failedMessage: "Failed to save reminder: {{e}}",
  })
  async save() {
    if (this.documentRef) {
      setDocByRef(this.documentRef, this.item, {merge: true});
    } else {
      this.item.enabled = true;
      addDocByRef(this.collectionRef, this.item);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-edit": ReminderEdit;
  }
}

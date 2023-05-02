import {DocumentReference} from "firebase/firestore";
import {css, html, LitElement, PropertyValues} from "lit";
import {choose} from "lit/directives/choose.js";
import {keyed} from 'lit/directives/keyed.js';
import {when} from "lit/directives/when.js";
import {customElement, property, query, state} from "lit/decorators.js";
import {Dialog} from "@material/mwc-dialog";
import {TextField} from "@material/mwc-textfield";
import {Select} from "@material/mwc-select";
import "@material/mwc-checkbox";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import "@material/mwc-ripple";
import "@material/mwc-select";
import {addDocByRef, setDocByRef} from "../db";
import {calculateNextSend} from "../helpers/Scheduling";
import {toastWrapper} from "../helpers/Decorators";
import {ReminderDocument} from "../../firebase/functions/src";

@customElement("reminder-edit")
export class ReminderEdit extends LitElement {
  private calculatedNextSend: Date;

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

  @query("mwc-select[name='type']")
  private selectSchedule: Select;

  @query("mwc-textfield[name='schedule']")
  private textFieldSchedule: TextField;

  @query("mwc-select, mwc-textfield")
  private formFields: (Select | TextField)[];

  @state()
  private hasLink: boolean;

  static override styles = css`
    :host {
      --mdc-dialog-min-width: 300px;
      position: absolute;
    }

    mwc-dialog > main {
      margin-bottom: -1em;
    }

    mwc-dialog > main > mwc-select,
    mwc-dialog > main > mwc-textfield {
      margin-bottom: 1em;
    }

    mwc-textfield, mwc-select {
      display: block;
    }
  `;

  constructor() {
    super();

    this.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
    this.updateComplete.then(() => {
      this.dialog.addEventListener("opening", (ev: CustomEvent) => this.dispatchEvent(new CustomEvent(ev.type)));
      this.dialog.addEventListener("closed", (ev: CustomEvent) => this.dispatchEvent(new CustomEvent(ev.type, {detail: {action: ev.detail.action}})));
      this.dialog.addEventListener("closing", (ev: CustomEvent) => this.dialogClosing.call(this, ev));

      this.selectSchedule.addEventListener("opening", (ev: Event) => ev.stopPropagation());
      this.selectSchedule.addEventListener("opened", (ev: Event) => ev.stopPropagation());
      this.selectSchedule.addEventListener("closing", (ev: Event) => ev.stopPropagation());
      this.selectSchedule.addEventListener("closed", (ev: Event) => ev.stopPropagation());
      this.selectSchedule.addEventListener("selected", () => {
        let oldItem = {...this.item} as ReminderDocument;
        this.item.type = this.selectSchedule.value;
        this.requestUpdate("item", oldItem);
      });
    });
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    if(changedProperties.has("item")) {
      this.item ||= {} as ReminderDocument;
      this.hasLink = this.item?.link != undefined;
      this.calculatedNextSend = calculateNextSend(this.item);
    }

    this.updateComplete.then(() => {
      if (this.textFieldSchedule) {
        this.textFieldSchedule.validityTransform = this.transformCronValidity.bind(this);
      }
    });
  }

  transformCronValidity(newValue: string): Partial<ValidityState> {
    this.item.cronExpression = newValue;

    if (!/^([^ ]+ ?){5,7}$/.test(newValue)) {
      this.textFieldSchedule.setCustomValidity("Invalid expression");
      return {
        valid: false,
        customError: true,
        badInput: true,
      };
    }

    try {
      let oldCalculdatedNextSend = this.calculatedNextSend;
      this.calculatedNextSend = calculateNextSend(this.item);
      this.requestUpdate("calculatedNextSend", oldCalculdatedNextSend);
      return {
        valid: true,
      };
    } catch (e) {
      this.textFieldSchedule.setCustomValidity(e.message);
      return {
        valid: false,
        customError: true,
        badInput: true,
      };
    }
  }

  override render() {
    const title = this.item?.title
    let editHeading = `Editing reminder: ${title}`;
    return html`
      <mwc-dialog heading="${keyed(this.open, this.documentRef ? editHeading : "New reminder")}" ?open="${this.open}"
                  escapeKeyAction="cancel" scrimClickAction="cancel">
        <main>
          <mwc-textfield type="text" label="Title" icon="title" required
                         @input="${(_: Event) => this.item.title = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.title ?? ""}"></mwc-textfield>
          <mwc-textfield type="text" label="Body" icon="notes" name="body" required
                         @input="${(_: Event) => this.item.body = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.body ?? ""}"></mwc-textfield>
          <mwc-formfield label="Add link?">
            <mwc-checkbox ?checked="${this.hasLink}"
                          @change="${(_: Event) => this.hasLink = (_.currentTarget as HTMLInputElement).checked}"></mwc-checkbox>
          </mwc-formfield>
          ${when(this.hasLink, () => html`
            <mwc-textfield type="url" label="Link" icon="link" name="link" ?required="${this.hasLink}"
                           @input="${(_: Event) => this.item.link = (_.currentTarget as HTMLInputElement).value}"
                           .value="${this.item?.link ?? ""}"></mwc-textfield>`
          )}
          <mwc-select name="type" label="Schedule type" icon="event" required .value="${this.item?.type ?? ""}">
            <mwc-list-item graphic="icon" value="cron">Cron schedule</mwc-list-item>
          </mwc-select>
          ${choose(this.item?.type, [
            ['cron', () => html`
              <mwc-textfield type="text" label="Schedule" name="schedule" required helperPersistent autoValidate
                             .helper="${this.calculatedNextSend?.toLocaleString()}"
                             .value="${this.item?.cronExpression ?? "? ? ? ? ?"}"></mwc-textfield>
            `],
          ])}
        </main>
        <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  dialogClosing(ev: CustomEvent) {
    switch (ev.detail.action) {
      case "save":
        this.save().then((ref: DocumentReference) => {
          if(!ref) return
          this.dispatchEvent(new CustomEvent("saved"));
        });
        break;
      case "cancel":
        this.dispatchEvent(new CustomEvent("cancel"));
        break;
      case "close":
        // default action
        break;
      default:
        console.log(`Unknown action: ${ev.detail.action}`)
    }
    this.open = false;
  }

  clear() {
    this.item = {} as ReminderDocument;
    this.hasLink = false;
  }

  show() {
    this.open = true;
  }

  @toastWrapper({
    successMessage: "Reminder saved",
    progressMessage: "Saving...",
    failedMessage: "Failed to save reminder: {{e}}",
  })
  async save(): Promise<DocumentReference> {
    this.dialog.close();
    this.item.cronExpression = this.item.cronExpression.trim();
    if (this.documentRef) {
      await setDocByRef(this.documentRef, this.item, {merge: true});
      return this.documentRef;
    } else {
      this.item.enabled = true;
      return await addDocByRef(this.collectionRef, this.item);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-edit": ReminderEdit;
  }
}

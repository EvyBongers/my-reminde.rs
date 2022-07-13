import {html} from "lit";
import {choose} from "lit/directives/choose.js";
import {customElement, property} from "lit/decorators.js";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import "@material/mwc-ripple";
import "@material/mwc-select";
import {parseExpression} from "cron-parser-all";
import {addDocByRef, setDocByRef} from "../db";
import {NotificationPreferenceItem} from "./notification-preference-item";
import "./notification-preference-item";

@customElement("notification-preference-item-edit")
export class NotificationPreferenceItemEdit extends NotificationPreferenceItem {

  @property()
  documentRef: any;

  @property()
  collectionRef: any;

  updated() {
    this.addEventListener("click", (e: Event) => {
      e.stopPropagation();
    });
  }

  override render() {
    let originalTitle = this.item?.title;
    return html`
      <mwc-dialog id="editing"
                  heading="${this.documentRef ? `Editing notification: ${originalTitle}` : "New notification"}"
                  escapeKeyAction="${this.cancel}"
                  scrimClickAction="${this.cancel}" open>
        <div>
          <mwc-textfield type="text" label="Title" required
                         @input="${(_: Event) => this.item.title = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.title ?? ""}"></mwc-textfield>
          <br>
          <mwc-textfield type="text" label="Body" name="body" required
                         @input="${(_: Event) => this.item.body = (_.currentTarget as HTMLInputElement).value}"
                         .value="${this.item?.body ?? ""}"></mwc-textfield>
          <br>
          <mwc-select name="type" icon="event" required
                      @selected="${(_: Event) => this.item.type = (_.currentTarget as HTMLSelectElement).value}"
                      .value="${this.item?.type ?? ""}">
            <mwc-list-item graphic="icon" value="cron">Cron schedule</mwc-list-item>
          </mwc-select>
          <br>
          ${choose(this.item?.type, [
                  ['cron', () => html`
                    <mwc-textfield type="text" label="Schedule" name="schedule" required
                                   @input="${(_: Event) => {
                                     this.item.cronExpression = (_.currentTarget as HTMLInputElement).value;
                                     this.requestUpdate("item");
                                   }}"
                                   .value="${this.item?.cronExpression ?? ""}"></mwc-textfield>
                    ${this.renderNextOccurrence(this.item)}
                  `],
                  // ['about', () => html`<h1>About</h1>`],
                ],
                () => html``)}
        </div>
        <mwc-button slot="primaryAction" @click="${this.save}" dialogAction="close">Save</mwc-button>
        <mwc-button slot="secondaryAction" @click="${this.cancel}" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private renderNextOccurrence(item: any) {
    try {
      console.log(`Calculating next occurrence for ${item.cronExpression}`);
      let cron = parseExpression(item.cronExpression);
      return html`
        <span>Next: ${cron.next().toString()}</span>
      `;
    } catch {
      return "";
    }
  }

  save(e: Event) {
    if (this.documentRef) {
      setDocByRef(this.documentRef, this.item, {merge: true});
    } else {
      addDocByRef(this.collectionRef, this.item);
    }
    // TODO(ebongers): Remove this component from DOM
  }

  cancel(e: Event) {
    // TODO(ebongers): how to cancel? Remove this component from DOM
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item-edit": NotificationPreferenceItemEdit;
  }
}

import {html} from "lit";
import {customElement, property, query, queryAll} from "lit/decorators.js";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {parseExpression} from "cron-parser-all";
import {setDocByRef} from "../db";
import {NotificationPreferenceItem} from "./notification-preference-item";
import "./notification-preference-item";
import {AccountScheduledNotificationDocument} from "../../firebase/functions/src";

@customElement("notification-preference-item-edit")
export class NotificationPreferenceItemEdit extends NotificationPreferenceItem {

  @property({type: Boolean})
  create: boolean;

  @property()
  documentRef: any;

  updated() {
    this.addEventListener("click", (e: Event) => {
      e.stopPropagation();
    });
  }

  override render() {
    let originalTitle = this.item?.title;
    return html`
      <mwc-dialog id="editing" heading="${originalTitle?`Editing notification: ${originalTitle}`:"New notification"}" escapeKeyAction="${this.cancel}"
                  scrimClickAction="${this.cancel}" open>
        <div>
          <mwc-textfield .value="${this.item?.title ?? ""}" label="Title" required
                         @input="${(_: Event) => this.item.title = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.item?.body ?? ""}" label="Body"
                         @input="${(_: Event) => this.item.body = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.item?.cronExpression ?? ""}" label="Schedule" required
                         @input="${(_: Event) => {
                           this.item.cronExpression = (_.currentTarget as HTMLInputElement).value;
                           this.requestUpdate("item");
                         }}"
                         type="text"></mwc-textfield>
          ${this.renderNextOccurrence(this.item)}
        </div>
        <mwc-button slot="primaryAction" @click="${this.save}" dialogAction="close">Save</mwc-button>
        <mwc-button slot="secondaryAction" @click="${this.cancel}" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private renderNextOccurrence(item: any) {
    // debugger;
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
    setDocByRef(this.documentRef, this.item, {merge: true});
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

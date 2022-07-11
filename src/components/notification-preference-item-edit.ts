import {css, html, LitElement} from "lit";
import {customElement, property, query, queryAll} from "lit/decorators.js";
import {Dialog} from "@material/mwc-dialog";
import {IconButton} from "@material/mwc-icon-button";
import {IconButtonToggle} from "@material/mwc-icon-button-toggle";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {parseExpression} from "cron-parser-all";
import {setDocByRef} from "../db";

@customElement("notification-preference-item")
export class NotificationPreferenceItemEdit extends NotificationPreferenceItem {

  @property()
  item: any;
  @property()
  editingItem: any;

  updated() {
    this.addEventListener('click', (e: Event) => {
      e.stopPropagation();
    });
  }

  override render() {
    return html`
      <mwc-dialog id="editing" heading="${this.item?html`Editing notification: ${this.item.title}`:"New notification"}" escapeKeyAction="${this.cancel}"
                  scrimClickAction="${this.cancel}" ?open="${!this.item}">
        <div>
          <mwc-textfield .value="${this.editingItem?.title ?? ""}" label="Title" required
                         @input="${(_: Event) => this.editingItem.title = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.editingItem?.body ?? ""}" label="Body"
                         @input="${(_: Event) => this.editingItem.body = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.editingItem?.cronExpression ?? ""}" label="Schedule" required
                         @input="${(_: Event) => {
                           this.editingItem.cronExpression = (_.currentTarget as HTMLInputElement).value;
                           this.requestUpdate('editingItem');
                         }}"
                         type="text"></mwc-textfield>
          ${this.item?this.renderNextOccurrence(this.editingItem):null}
        </div>
        <mwc-button slot="primaryAction" @click="${this.save}" dialogAction="close">Save</mwc-button>
        <mwc-button slot="secondaryAction" @click="${this.cancel}" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private renderNextOccurrence(item: any) {
    console.log(`Calculating next occurrence for ${item.cronExpression}`);
    // debugger;
    try {
      let cron = parseExpression(item.cronExpression);
      return html`
        <span>Next: ${cron.next().toString()}</span>
      `;
    } catch {
      return "";
    }
  }

  save(e: Event) {
    setDocByRef(this.item._ref, this.editingItem, {merge: true});
    // TODO(ebongers): Remove this component from DOM
  }

  cancel(e: Event) {
    // TODO(ebongers): how to cancel? Remove this component from DOM
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

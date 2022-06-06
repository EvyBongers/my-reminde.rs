import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import './notification-preference-item'

@customElement("notification-preferences")
export class NotificationPreferences extends BunnyElement {

  @property()
  scheduledNotifications: DataCollectionSupplier<{ test: number }>;

  @property({type: String})
  accountId: string;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  override render() {
    return html`
      <div>
        ${renderItems(this.scheduledNotifications, item => html`
          <notification-preference-item .item="${item}"></notification-preference-item>
        `)}
      </div>
    `;
  }

  @observe('accountId')
  accountChanged(accountId: string) {
    this.scheduledNotifications = loadCollection<{ test: number }>(`accounts/${this.accountId}/scheduledNotifications`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preferences": NotificationPreferences;
  }
}

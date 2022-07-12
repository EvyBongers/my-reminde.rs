import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import "./notification-preference-item";
import "./notification-preference-item-edit";

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

    .notifications-container {
      border: 1px solid #d3d3d3;
      display: flex;
      flex-direction: column;
    }

    notification-preference-item:after {
      border-bottom: 1px solid #d3d3d3;
      content: "";
      display: block;
      margin: 0 1em;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    notification-preference-item:last-child:after {
      display: none;
    }
  `;

  override render() {
    return html`
      <h3>Scheduled notifications</h3>
      <div class="notifications-container">
        ${renderItems(this.scheduledNotifications, (item, index) => html`
        <notification-preference-item .item="${item}"></notification-preference-item>
      `, "Loading notifications...")}
      </div>
    `;
  }

  @observe("accountId")
  accountChanged(accountId: string) {
    this.scheduledNotifications = loadCollection<{ test: number }>(`accounts/${this.accountId}/scheduledNotifications`);
  }

  public add() {
    let notification = document.createElement("notification-preference-item-edit");
    notification.setAttribute("create", "true");
    this.shadowRoot.append(notification);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preferences": NotificationPreferences;
  }
}

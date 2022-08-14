import {css, html} from "lit";
import {customElement, property, queryAll} from "lit/decorators.js";
import {DataCollectionSupplier, getCollectionByPath, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import "./notification-preference-item";
import "./notification-preference-item-edit";
import {query} from "lit/decorators";
import {NotificationPreferenceItem} from "./notification-preference-item";

export interface ScheduledNotificationDocument {
  title: string;
  body: string;
  nextSend: any;
  lastSent: any;
  type: string;
  cronExpression?: string;

  [key: string]: any
}

@customElement("notification-preferences")
export class NotificationPreferences extends BunnyElement {
  @property()
  scheduledNotifications: DataCollectionSupplier<ScheduledNotificationDocument>;

  @queryAll('notification-preference-item')
  notifications: NodeListOf<NotificationPreferenceItem>;

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

    mwc-fab {
      --mdc-icon-size: 36px;
      position: fixed;
      right: 50px;
      bottom: 50px;
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

      <mwc-fab icon="add" @click="${this.addNotification}"></mwc-fab>
    `;
  }

  @observe("accountId")
  accountChanged(accountId: string) {
    this.scheduledNotifications = loadCollection<ScheduledNotificationDocument>(`accounts/${this.accountId}/scheduledNotifications`);
  }

  public async addNotification(e: Event) {
    let notification = document.createElement("notification-preference-item-edit");
    notification.collectionRef = await getCollectionByPath(`accounts/${this.accountId}/scheduledNotifications`);
    this.shadowRoot.append(notification);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preferences": NotificationPreferences;
  }
}

import {css, html} from "lit";
import {customElement, property, queryAll} from "lit/decorators.js";
import {DataCollectionSupplier, getCollectionByPath, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import "./reminder-item";
import "./reminder-edit";
import {query} from "lit/decorators";
import {ReminderItem} from "./reminder-item";
import {ReminderDocument} from "../../firebase/functions/src/index"

@customElement("reminder-list")
export class ReminderList extends BunnyElement {
  @property()
  scheduledNotifications: DataCollectionSupplier<ReminderDocument>;

  @queryAll('reminder-item')
  notifications: NodeListOf<ReminderItem>;

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

    reminder-item:after {
      border-bottom: 1px solid #d3d3d3;
      content: "";
      display: block;
      margin: 0 1em;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    reminder-item:last-child:after {
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
        <reminder-item .item="${item}"></reminder-item>
      `, "Loading notifications...")}
      </div>

      <mwc-fab icon="add" @click="${this.addNotification}"></mwc-fab>
    `;
  }

  @observe("accountId")
  accountChanged(accountId: string) {
    this.scheduledNotifications = loadCollection<ReminderDocument>(`accounts/${this.accountId}/scheduledNotifications`);
  }

  public async addNotification(e: Event) {
    let notification = document.createElement("reminder-edit");
    notification.collectionRef = await getCollectionByPath(`accounts/${this.accountId}/scheduledNotifications`);
    this.shadowRoot.append(notification);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-list": ReminderList;
  }
}

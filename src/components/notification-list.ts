import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {QueryDocumentSnapshot} from "firebase/firestore";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, ChangedProperty, observe} from "./bunny-element";
import {NotificationDocument} from "../../firebase/functions/src"
import {NotificationItem} from "./notification-item";
import "./loading-indicator";
import "./notification-item";

@customElement("notification-list")
export class NotificationList extends BunnyElement {
  @property()
  notifications: DataCollectionSupplier<NotificationDocument>;

  @property({type: String})
  accountId: string;

  @property({type: String})
  selectedId: string;

  static override styles = css`
    :host {
      display: block;
    }

    .notifications-container {
      display: flex;
      flex-direction: column;
    }

    .notifications-container:has(notification-item) {
      border: 1px solid #d3d3d3;
    }

    notification-item:after {
      border-bottom: 1px solid #d3d3d3;
      content: "";
      display: block;
      margin: 0 1em;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    notification-item:last-child:after {
      display: none;
    }

    mwc-fab {
      --mdc-icon-size: 36px;
      position: fixed;
      right: 20px;
      bottom: calc(var(--mdc-tab-height, 0) + 20px);
    }
  `;

  override render() {
    return html`
      <h2>Notification history</h2>
      <div class="notifications-container">
        ${renderItems(this.notifications, item => html`
          <notification-item id="${item._ref.id}" .item="${item}" ?open="${item._ref.id === this.selectedId}"></notification-item>
        `, {loading: html`<loading-indicator></loading-indicator>`, placeHolder: html`<span>No open notifications</span>`})}
      </div>
    `;
  }

  @observe("selectedId")
  selectedItemChanged(notificationId: ChangedProperty) {
    if (notificationId.after === null) {
      this.shadowRoot.querySelectorAll("notification-item[open]").forEach((notificationItem: NotificationItem) => {
        notificationItem.removeAttribute("open");
      });
    } else {
      this.shadowRoot.getElementById(notificationId.before)?.toggleAttribute("open", false);
      this.shadowRoot.getElementById(notificationId.after)?.toggleAttribute("open", true);
    }
  }

  @observe("accountId")
  accountChanged(accountId: ChangedProperty<string>) {
    this.notifications = loadCollection<NotificationDocument>(`accounts/${accountId.after}/notifications`, (a: QueryDocumentSnapshot<NotificationDocument>, b: QueryDocumentSnapshot<NotificationDocument>) => {
      return b.data().sent.toMillis() - a.data().sent.toMillis();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-list": NotificationList;
  }
}

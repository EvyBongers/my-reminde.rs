import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import "@material/mwc-circular-progress";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import {NotificationDocument} from "../../firebase/functions/src"
import "./notification-item";

@customElement("notification-list")
export class NotificationList extends BunnyElement {
  @property()
  notifications: DataCollectionSupplier<NotificationDocument>;

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

    .notifications-container mwc-circular-progress {
      margin: 0 auto;
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
      <div class="notifications-container">
        ${renderItems(this.notifications, item => html`
          <notification-item .item="${item}"></notification-item>
        `, html`
          <mwc-circular-progress indeterminate></mwc-circular-progress>`)}
      </div>
    `;
  }

  @observe("accountId")
  accountChanged(accountId: string) {
    this.notifications = loadCollection<NotificationDocument>(`accounts/${accountId}/notifications`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-list": NotificationList;
  }
}

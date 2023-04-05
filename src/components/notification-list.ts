import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {QueryDocumentSnapshot} from "firebase/firestore";
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

  @property({type: String})
  selectedId: string;

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
      <h2>Notification history</h2>
      <div class="notifications-container">
        ${renderItems(this.notifications, item => html`
          <notification-item @NavigationEvent="${this.route}" .item="${item}"
                             ?open="${item._ref.id === this.selectedId}"></notification-item>
        `, html`
          <mwc-circular-progress indeterminate></mwc-circular-progress>`)}
      </div>
    `;
  }

  private route(e: CustomEvent) {
    e.stopPropagation();
    let navigationEvent = new CustomEvent("NavigationEvent", {
      detail: ["", "notifications", e.detail].filter(_ => typeof _ === "string").join("/"),
      bubbles: true,
      cancelable: false,
      composed: true
    })
    this.dispatchEvent(navigationEvent);
  }

  @observe("accountId")
  accountChanged(accountId: string) {
    this.notifications = loadCollection<NotificationDocument>(`accounts/${accountId}/notifications`, (a: QueryDocumentSnapshot<NotificationDocument>, b: QueryDocumentSnapshot<NotificationDocument>) => {
      return b.data().sent.toMillis() - a.data().sent.toMillis();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-list": NotificationList;
  }
}

import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, observe} from "./bunny-element";
import '@material/mwc-list';
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
    mwc-list {
      border: 1px solid #d3d3d3;
      --mdc-list-vertical-padding: 0;
    }
  `;

  override render() {
    return html`
      <section>
        <h3>Scheduled notifications</h3>
        <mwc-list>
        ${renderItems(this.scheduledNotifications, (item, index) => html`
          ${index>0?html`<li divider padded role="separator"></li>`:""}
          <notification-preference-item .item="${item}"></notification-preference-item>
        `, "Loading notifications...")}
        </mwc-list>
      </section>
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

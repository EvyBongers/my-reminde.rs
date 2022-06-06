import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {query, where, getDocs} from "firebase/firestore";
import {DataCollectionSupplier, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import './notification-preference-item'

@customElement("notification-preferences")
export class NotificationPreferences extends LitElement {

  @property()
  scheduledNotifications: DataCollectionSupplier<{ test: number }>;

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

  connectedCallback() {
    super.connectedCallback();

    this.scheduledNotifications = this.loadCollection<{ test: number }>('accounts/QILOd8sLS6Z1Vtr7xuTJCeo4Si19/scheduledNotifications');
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preferences": NotificationPreferences;
  }
}

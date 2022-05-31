import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {asyncReplace} from 'lit/directives/async-replace.js';
import {collection, onSnapshot, query, where, getDocs} from "firebase/firestore";
import {db} from "../db";

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  override render() {
    return html`
      <div>
        aaaa a cupcake(${this.item._ref.id}): ${this.item.title} - ${this.item.body} - ${this.item.type}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

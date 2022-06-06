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
    article {
      border-left: 4pt solid bisque;
      padding-left: 0.75em;
      padding-top: 0.25em;
      padding-bottom: 0.25em;
      margin-top: 0.3em;
      margin-bottom: 0.3em;
    }
    article > h4 {
      margin: 0;
    }
  `;

  override render() {
    return html`
      <article data-id="${this.item._ref.id}">
        <h4>${this.item.title}</h4>
        <p>${this.item.body}</p>
        ${this.item.type? html`
        <footer>
          ${this.item.type}
          ${this.item.type=="cron"? html`
            (<code>${this.item.cronExpression}</code>)
          `:""}
        </footer>
        `:""}
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

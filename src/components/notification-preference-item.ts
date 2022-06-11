import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import '@material/mwc-list';

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
      <mwc-list-item data-id="${this.item._ref.id}" twoline>
        <span>${this.item.title}</span>
        <span slot="secondary">${this.item.type == "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}</span>
      </mwc-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

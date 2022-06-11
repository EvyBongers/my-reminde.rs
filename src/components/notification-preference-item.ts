import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import '@material/mwc-list';

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;

  @property({type: Boolean})
  protected collapsed: boolean;

  static override styles = css`
    :host {
      display: block;
    }

    mwc-list-item {
      height: auto;
      min-height: 48px;
      align-items: flex-start;
    }

    mwc-list-item mwc-icon, mwc-list-item details {
      margin: 12px 0;
    }

    details > summary:first-of-type {
      display: initial;
    }
  `;

  constructor() {
    super();
    this.collapsed = true;
  }

  override render() {
    return html`
      <mwc-list-item data-id="${this.item._ref.id}" hasMeta graphic="control">
        <details ?open="${!this.collapsed}">
          <summary>${this.item.title}</summary>
          <p>
            ${this.item.body}
          </p>
          <footer>${this.item.type == "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}
          </footer>
        </details>
        <mwc-icon slot="graphic" @click="${() => this.collapsed = !this.collapsed}">
          ${this.collapsed ? "expand_more" : "expand_less"}
        </mwc-icon>
      </mwc-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

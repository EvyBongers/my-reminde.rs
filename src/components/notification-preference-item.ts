import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import '@material/mwc-icon';
import '@material/mwc-ripple';

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;

  @property({type: Boolean})
  protected collapsed: boolean;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding: 0 16px;
      position: relative;
    }

    div.notification {
      margin-top: 12px;
    }

    div.notification h4 {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    div.notification p {
      margin-block-start: 0.5em;
      margin-block-end: 0.5em;
    }

    div.notification footer {
      margin-bottom: 12px;
    }

    div.notification[collapsed] p {
      display: none;

    }

    div.notification[collapsed] footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    mwc-icon {
      margin: 12px 0 12px auto;
    }
  `;

  constructor() {
    super();
    this.collapsed = true;
    this.addEventListener('click', _ => this.collapsed = !this.collapsed);
  }

  override render() {
    return html`
      <mwc-ripple></mwc-ripple>
      <div class="notification" data-id="${this.item._ref.id}" ?collapsed="${this.collapsed}">
        <h4>${this.item.title}</h4>
        <p>${this.item.body}</p>
        <footer>
          Schedule: ${this.item.type == "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}
        </footer>
      </div>
      <mwc-icon>${this.collapsed ? "expand_more" : "expand_less"}</mwc-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

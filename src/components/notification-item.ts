import {css, html, nothing, LitElement, render} from "lit";
import {customElement, property} from "lit/decorators.js";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {NotificationDocument} from "../../firebase/functions/src";
import {deleteDocByRef} from "../db";
import {Rippling} from "../mixins/Rippling";
import "./menu-button";

@customElement("notification-item")
export class NotificationItem extends Rippling(LitElement) {
  @property()
  item: NotificationDocument;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      position: relative;
    }

    mwc-icon {
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
      padding: calc((var(--mdc-icon-button-size, 48px) - var(--mdc-icon-size, 24px)) / 2);
    }

    .notification {
      margin-left: 12px;
      margin-right: 12px;
      margin-top: 12px;
      min-width: 0;
    }

    .notification header h4 {
      margin-block-start: 0;
      margin-block-end: 0;
      margin-right: calc(var(--mdc-icon-size, 24px) * 2 /* Number of action buttons */ );
    }

    .notification header:has(~ main) h4 {
      line-height: 24px;
      padding-bottom: 12px;
    }

    .notification p {
      margin-block-start: 0.5em;
      margin-block-end: 0.5em;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notification footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    .notification aside {
      position: absolute;
      top: 0;
      right: 0;
    }
  `;

  async firstUpdated() {
    await this.updateComplete;
    await super.firstUpdated();

    this.addEventListener('click', _ => {
      const notificationItem = this;
      const shadowRoot = this.shadowRoot;
      const dialog = document.createElement("mwc-dialog");
      dialog.heading = this.item.title;
      this.shadowRoot.append(dialog);
      render(html`
        <div>
          <p>${this.item.body}</p>
          ${this.item?.link ? html`
          <p>
            <a href="${this.item.link}">${this.item.link}</a>
          </p>`:nothing}
          <p>Sent ${this.item.sent.toDate().toLocaleString()}</p>
        </div>
        <mwc-button slot="primaryAction" dialogAction="delete">Delete</mwc-button>
      `,
      dialog);
      dialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      dialog.addEventListener("closing", (ev: CustomEvent) => {
        switch (ev.detail.action) {
          case "delete":
            notificationItem.delete(ev);
            break;
          case "close":
            // default action
            break;
          default:
            console.log(`Unknown action: ${ev.detail.action}`)
        }
      });
      dialog.addEventListener("closed", (ev: CustomEvent) => {
        shadowRoot.removeChild(dialog);
      });
      dialog.show();
    });
  }

  override render() {
    return html`
      <div class="notification">
        <header>
          <h4 id="title">${this.item?.title}</h4>
        </header>
        <footer>
          Sent: ${( this.item?.sent.toDate().toLocaleString())}
        </footer>
      </div>
    `;
  }

  async delete(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur();
    await deleteDocByRef(this.item._ref);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-item": NotificationItem;
  }
}

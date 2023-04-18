import {css, html, nothing, LitElement} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {Dialog} from "@material/mwc-dialog";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {NotificationDocument} from "../../firebase/functions/src";
import {deleteDocByRef} from "../db";
import {Rippling} from "../mixins/Rippling";
import "./menu-button";
import {RouteEvent} from "../jdi-app";

@customElement("notification-item")
export class NotificationItem extends Rippling(LitElement) {
  @property()
  item: NotificationDocument;

  @property({type: Boolean, reflect: true})
  open: boolean;

  @query('mwc-dialog')
  dialog: Dialog;

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
      margin-right: calc(var(--mdc-icon-size, 24px) * 2 /* Number of action buttons */);
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

  constructor() {
    super();

    this.shouldRipple = !this.open;
    this.addEventListener('click', () => this.dialog.show());
    this.updateComplete.then(() => {
      this.dialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.dialog.addEventListener("opening", (ev: CustomEvent) => this.dialogStateChanged.call(this, ev));
      this.dialog.addEventListener("closing", (ev: CustomEvent) => this.dialogClosing.call(this, ev));
      this.dialog.addEventListener("closed", (ev: CustomEvent) => this.dialogStateChanged.call(this, ev));
    });
  }

  override render() {
    return html`
      <div class="notification">
        <header>
          <h4 id="title">${this.item?.title}</h4>
        </header>
        <footer>
          Sent: ${(this.item?.sent.toDate().toLocaleString())}
        </footer>
      </div>
      <mwc-dialog heading="${this.item.title}" ?open="${this.open}">
        <div>
          <p>${this.item.body}</p>
          ${this.item?.link ? html`
            <p>
              <a href="${this.item.link}">${this.item.link}</a>
            </p>` : nothing}
          <p>Sent ${this.item.sent.toDate().toLocaleString()}</p>
        </div>
        <mwc-button slot="primaryAction" dialogAction="delete">Delete</mwc-button>
      </mwc-dialog>
    `;
  }

  dialogClosing(ev: CustomEvent) {
    switch (ev.detail.action) {
      case "delete":
        this.delete();
        break;
      case "close":
        // default action
        break;
      default:
        console.log(`Unknown action: ${ev.detail.action}`)
    }
  }

  dialogStateChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.open = (ev.type === "opening");
    this.shouldRipple = (ev.type === "closed");

    let url = this.open ? `/notifications/${this.item._ref.id}` : "/notifications";
    let routeEvent = new RouteEvent("route", {
      detail: {url: url,},
    })
    window.dispatchEvent(routeEvent);
  }

  async delete() {
    await deleteDocByRef(this.item._ref);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-item": NotificationItem;
  }
}

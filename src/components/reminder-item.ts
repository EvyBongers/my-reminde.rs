import {css, html, LitElement} from "lit";
import {customElement, property, query, queryAsync} from "lit/decorators.js";
import {IconButton} from "@material/mwc-icon-button";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {deleteDocByRef, setDocByRef} from "../db";
import {calculateNextSend} from "../helpers/Scheduling";
import {RippleHandlers} from "@material/mwc-ripple/ripple-handlers";
import {Ripple} from "@material/mwc-ripple";
import {Menu} from "@material/mwc-menu";
import {ReminderDocument} from "../../firebase/functions/src";
import "./menu-button";

@customElement("reminder-item")
export class ReminderItem extends LitElement {
  @property()
  item: ReminderDocument;

  @property({type: Boolean})
  protected expanded: boolean = false;

  @query("mwc-icon-button")
  private menuButton: IconButton;

  @query("mwc-menu")
  private menu: Menu;

  @queryAsync('mwc-ripple')
  private ripple!: Promise<Ripple | null>;

  protected rippleHandlers: RippleHandlers = new RippleHandlers(() => this.ripple);

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

    .actions, .state {
      display: flex;
    }

    .notification {
      margin-right: auto;
      margin-top: 12px;
    }

    .notification h4 {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    .notification p {
      margin-block-start: 0.5em;
      margin-block-end: 0.5em;
    }

    .notification footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }
  `;

  async firstUpdated() {
    // Give the browser a chance to paint
    await new Promise((r) => setTimeout(r, 0));

    this.addEventListener("focusin", this.rippleHandlers.startFocus);
    this.addEventListener("mouseenter", this.rippleHandlers.startHover);
    this.addEventListener("mousedown", this.rippleHandlers.startPress);
    this.addEventListener("mouseup", this.rippleHandlers.endPress);
    this.addEventListener("mouseleave", this.rippleHandlers.endHover);
    this.addEventListener("focusout", this.rippleHandlers.endFocus);

    this.addEventListener("touchstart", this.rippleHandlers.startPress);
    this.addEventListener("touchend", this.rippleHandlers.endPress);
    this.addEventListener("touchend", this.rippleHandlers.endHover);
    this.addEventListener("touchend", this.rippleHandlers.endFocus);
    this.addEventListener("touchcancel", this.rippleHandlers.endPress);
    this.addEventListener("touchcancel", this.rippleHandlers.endHover);
    this.addEventListener("touchcancel", this.rippleHandlers.endFocus);

    this.addEventListener('click', _ => {
      this.expanded = !this.expanded;
    });
  }

  private renderRipple() {
    return html`
      <mwc-ripple></mwc-ripple>
    `;
  }

  private renderState() {
    return html`
      <div class="state">
        <mwc-icon>${this.item.enabled ? "notifications_active" : "notifications_off"}</mwc-icon>
      </div>
    `;
  }

  private renderContent() {
    return html`
      <div class="notification">
        <header>
          <h4 id="title">${this.item.title}</h4>
        </header>
        ${!this.expanded ? html`` : html`
          <main>
            <p id="body">${this.item.body}</p>
            <p id="schedule">Cron schedule: <code>${this.item.cronExpression}</code></p>
          </main>
        `}
        <footer>
          ${!this.item.enabled ? html`(disabled)` : html`
            Next: ${calculateNextSend(this.item).toLocaleString()}
          `}
        </footer>
      </div>
    `;
  }

  private renderActions() {
    return html`
      <div class="actions">
        <mwc-icon>${this.expanded ? "expand_less" : "expand_more"}</mwc-icon>
        <menu-button>
          <mwc-list-item graphic="icon" @click="${this.toggleActive}">
            <mwc-icon slot="graphic">${this.item.enabled ? "notifications_off" : "notifications_active"}</mwc-icon>
            <span>${this.item.enabled ? "Disable" : "Enable"}</span>
          </mwc-list-item>
          <mwc-list-item graphic="icon" @click="${this.edit}">
            <mwc-icon slot="graphic">edit</mwc-icon>
            <span>Edit</span>
          </mwc-list-item>
          <mwc-list-item graphic="icon" @click="${this.delete}">
            <mwc-icon slot="graphic">delete</mwc-icon>
            <span>Delete</span>
          </mwc-list-item>
        </menu-button>
      </div>
    `;
  }

  override render() {
    return html`
      ${this.renderRipple()}
      ${this.renderState()}
      ${this.renderContent()}
      ${this.renderActions()}
    `;
  }

  async delete(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()

    let dialog = document.createElement("confirm-dialog");
    dialog.append("Delete reminder?");
    dialog.setAttribute("confirmLabel", "Delete");
    dialog.setAttribute("cancelLabel", "Cancel");
    dialog.addEventListener("confirm", _ => { deleteDocByRef(this.item._ref); });
    dialog.addEventListener("closed", _ => { this.renderRoot.removeChild(dialog); });
    this.shadowRoot.append(dialog);
  }

  edit(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()
    let notification = document.createElement("reminder-edit");
    notification.item = structuredClone(this.item);
    notification.documentRef = this.item._ref;
    notification.addEventListener("closed", (ev: CustomEvent) => {
      console.log(`Notification edit result: ${ev.detail}`);
      this.shadowRoot.removeChild(notification);
    });

    this.shadowRoot.append(notification);
  }

  toggleActive(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur();
    this.item.enabled = !this.item.enabled;
    this.item.nextSend = null;
    setDocByRef(this.item._ref, this.item, {merge: true});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-item": ReminderItem;
  }
}

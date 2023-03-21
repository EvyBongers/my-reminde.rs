import {css, html, nothing, LitElement} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {when} from "lit/directives/when.js";
import {IconButton} from "@material/mwc-icon-button";
import {Menu} from "@material/mwc-menu";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {ReminderDocument} from "../../firebase/functions/src";
import {deleteDocByRef, setDocByRef} from "../db";
import {Rippling} from "../mixins/Rippling";
import "./menu-button";

@customElement("reminder-item")
export class ReminderItem extends Rippling(LitElement) {
  @property()
  item: ReminderDocument;

  @property({type: Boolean})
  protected editing: boolean = false;

  @property({type: Boolean})
  protected expanded: boolean = false;

  @query("mwc-icon-button")
  private menuButton: IconButton;

  @query("mwc-menu")
  private menu: Menu;

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
      display: flex;
      flex-direction: row;
      position: absolute;
      top: 0;
      right: 0;
    }
  `;

  async firstUpdated() {
    await this.updateComplete;
    await super.firstUpdated();

    this.addEventListener('click', _ => {
      this.expanded = !this.expanded;
    });
    if (this.editing) {
      this.openEditDialog();
    }
  }

  private renderState() {
    return html`
      <div class="state">
        <mwc-icon>${this.item.enabled ? "alarm" : "alarm_off"}</mwc-icon>
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
            ${this.item ? html`<p id="link"><a @click="${this.openReminderLink}" href="${this.item.link}">${this.item.link}</a></p>` : nothing}
            <p id="schedule">Cron schedule: <code>${this.item.cronExpression}</code></p>
          </main>
        `}
        <footer>
          ${!this.item.enabled ? html`(disabled)` : html`
            ${when(this.item.nextSend !== undefined && typeof this.item.nextSend.toDate === "function",
            () => html`Next: ${this.item.nextSend?.toDate().toLocaleString()}`,
            () => html`Scheduling...`)}
          `}
        </footer>
        <aside>
          ${this.renderActions()}
        </aside>
      </div>
    `;
  }

  private renderActions() {
    return html`
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
    `;
  }

  override render() {
    return html`
      ${this.renderState()}
      ${this.renderContent()}
    `;
  }

  async delete(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()

    let dialog = document.createElement("confirm-dialog");
    dialog.append("Delete reminder?");
    dialog.setAttribute("confirmLabel", "Delete");
    dialog.setAttribute("cancelLabel", "Cancel");
    dialog.addEventListener("confirm", _ => {
      deleteDocByRef(this.item._ref);
    });
    dialog.addEventListener("closed", _ => {
      this.renderRoot.removeChild(dialog);
    });
    this.shadowRoot.append(dialog);
  }

  edit(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()
    this.openEditDialog();
    let navigationEvent = new CustomEvent("NavigationEvent", {
      detail: `${this.item._ref.id}/edit`,
      cancelable: false,
      composed: true
    });
    this.dispatchEvent(navigationEvent);
  }

  openEditDialog() {
    let dialog = document.createElement("reminder-edit");
    dialog.item = structuredClone(this.item);
    dialog.documentRef = this.item._ref;
    dialog.addEventListener("closed", (ev: CustomEvent) => {
      console.log(`Notification edit result: ${ev.detail}`);
      this.shouldRipple = true;
      this.shadowRoot.removeChild(dialog);
      let navigationEvent = new CustomEvent("NavigationEvent", {
        detail: null,
        cancelable: false,
        composed: true
      });
      this.dispatchEvent(navigationEvent);
    });

    this.shadowRoot.append(dialog);
    this.shouldRipple = false;
  }

  openReminderLink(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    window.open((e.target as HTMLAnchorElement).href);
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

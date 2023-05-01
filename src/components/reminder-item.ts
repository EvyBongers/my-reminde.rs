import {css, html, nothing, LitElement, HTMLTemplateResult, PropertyValues} from "lit";
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
import {RouteEvent} from "../jdi-app";
import {deleteDocByRef, setDocByRef} from "../db";
import {Rippling} from "../mixins/Rippling";
import "./menu-button";
import {Dialog} from "@material/mwc-dialog";
import {ConfirmDialog} from "./confirm-dialog";
import {ReminderEdit} from "./reminder-edit";

@customElement("reminder-item")
export class ReminderItem extends Rippling(LitElement) {
  @property()
  item: ReminderDocument;

  @property({type: Boolean, reflect: true, attribute: "delete"})
  protected deleting: boolean = false;

  @property({type: Boolean, reflect: true, attribute: "edit"})
  protected editing: boolean = false;

  @property({type: Boolean})
  protected expanded: boolean = false;

  @query("mwc-icon-button")
  private menuButton: IconButton;

  @query("mwc-menu")
  private menu: Menu;

  @query('confirm-dialog')
  deleteDialog: ConfirmDialog;

  @query('reminder-edit')
  editDialog: ReminderEdit;

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
      display: flex;
      flex-direction: row;
      position: absolute;
      top: 0;
      right: 0;
    }
  `;

  constructor() {
    super();
    this.addEventListener('click', () => {
      this.expanded = !this.expanded;
    });
    this.updateComplete.then(() => {
      this.shouldRipple = !(this.deleting || this.editing);
      this.editDialog.item = structuredClone(this.item);

      this.deleteDialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.deleteDialog.addEventListener("opening", (ev: CustomEvent) => this.deleteDialogStateChanged.call(this, ev));
      this.deleteDialog.addEventListener("closed", (ev: CustomEvent) => this.deleteDialogStateChanged.call(this, ev));
      this.deleteDialog.addEventListener("confirm", () => deleteDocByRef(this.item._ref));

      this.editDialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.editDialog.addEventListener("opening", (ev: CustomEvent) => this.editDialogStateChanged.call(this, ev));
      this.editDialog.addEventListener("closed", (ev: CustomEvent) => this.editDialogStateChanged.call(this, ev));
    });
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
            ${this.item ? html`<p id="link"><a @click="${this.openReminderLink}"
                                               href="${this.item.link}">${this.item.link}</a></p>` : nothing}
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

  private renderDialogs(): HTMLTemplateResult {
    return html`
      <reminder-edit .documentRef="${this.item._ref}" ?open="${this.editing}"></reminder-edit>
      <confirm-dialog confirmLabel="Delete" cancelLabel="Cancel" ?open="${this.deleting}">Delete reminder?</confirm-dialog>
    `;
  }

  override render() {
    return html`
      ${this.renderState()}
      ${this.renderContent()}
      ${this.renderDialogs()}
    `;
  }

  delete(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur();

    this.deleteDialog.show();
  }

  deleteDialogStateChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.deleting = (ev.type === "opening");
    this.shouldRipple = (ev.type === "closed");

    let url = this.deleting ? `/reminders/${this.item._ref.id}/delete` : "/reminders";
    if (window.location.pathname !== url) {
      let routeEvent = new RouteEvent("route", {detail: {url: url,}})
      window.dispatchEvent(routeEvent);
    }
  }

  edit(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur();

    this.editDialog.item = structuredClone(this.item);
    this.editDialog.show();
  }

  editDialogStateChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.editing = (ev.type === "opening");
    this.shouldRipple = (ev.type === "closed");

    let url = this.editing ? `/reminders/${this.item._ref.id}/edit` : "/reminders";
    if (window.location.pathname !== url) {
      let routeEvent = new RouteEvent("route", {detail: {url: url,}})
      window.dispatchEvent(routeEvent);
    }
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

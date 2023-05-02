import {css, html} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import "@material/mwc-circular-progress";
import {DataCollectionSupplier, getCollectionByPath, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, ChangedProperty, observe} from "./bunny-element";
import {ReminderDocument} from "../../firebase/functions/src"
import "./reminder-item";
import "./reminder-edit";
import {ReminderItem} from "./reminder-item";
import {ReminderEdit} from "./reminder-edit";
import {RouteEvent} from "../jdi-app";

@customElement("reminder-list")
export class ReminderList extends BunnyElement {
  @property()
  reminders: DataCollectionSupplier<ReminderDocument>;

  @property({type: String})
  accountId: string;

  @property({type: String})
  selectedId: string;

  @property({type: String})
  action: string;

  @query("reminder-edit")
  newReminderDialog: ReminderEdit;

  static override styles = css`
    :host {
      display: block;
    }

    .reminders-container {
      border: 1px solid #d3d3d3;
      display: flex;
      flex-direction: column;
    }

    .reminders-container mwc-circular-progress {
      margin: 0 auto;
    }

    reminder-item:after {
      border-bottom: 1px solid #d3d3d3;
      content: "";
      display: block;
      margin: 0 1em;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    reminder-item:last-child:after {
      display: none;
    }

    mwc-fab {
      --mdc-icon-size: 36px;
      position: fixed;
      right: 20px;
      bottom: calc(var(--mdc-tab-height, 0) + 20px);
    }
  `;

  constructor() {
    super();
    this.updateComplete.then(() => {
      this.newReminderDialog.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
      this.newReminderDialog.addEventListener("opening", (ev: CustomEvent) => this.newReminderDialogStateChanged.call(this, ev));
      this.newReminderDialog.addEventListener("closed", (ev: CustomEvent) =>  this.newReminderDialogStateChanged.call(this, ev));
    });
  }

  override render() {
    return html`
      <h2>Reminders</h2>
      <div class="reminders-container">
        ${renderItems(this.reminders, item => html`
          <reminder-item id="${item._ref.id}" .item="${item}"
                         ?delete="${item._ref.id === this.selectedId && this.action === "delete"}"
                         ?edit="${item._ref.id === this.selectedId && this.action === "edit"}"></reminder-item>
        `, html`
          <mwc-circular-progress indeterminate></mwc-circular-progress>`)}
      </div>

      <mwc-fab icon="alarm_add" @click="${this.addNotification}"></mwc-fab>
      <reminder-edit .open="${this.selectedId === "_" && this.action === "create"}"></reminder-edit>
    `;
  }

  @observe("selectedId", "action")
  selectedItemChanged(reminderId: ChangedProperty<string>, action: ChangedProperty<string>) {
    if (!action.after) {
      this.shadowRoot.querySelectorAll(`reminder-item[${action.before}]`).forEach((reminderItem: ReminderItem) => {
        reminderItem.removeAttribute(action.before);
      });
    } else {
      this.shadowRoot.getElementById(reminderId.before)?.toggleAttribute(action.before, false);
      this.shadowRoot.getElementById(reminderId.after)?.toggleAttribute(action.after, true);
    }
  }

  @observe("accountId")
  async accountChanged(accountId: ChangedProperty<string>) {
    this.reminders = loadCollection<ReminderDocument>(`accounts/${accountId.after}/reminders`);
    if (this.newReminderDialog) {
      this.newReminderDialog.collectionRef = await getCollectionByPath(`accounts/${this.accountId}/reminders`);
    }
  }

  newReminderDialogStateChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.action = (ev.type === "opening") ? "create" : undefined;
    this.selectedId = (ev.type === "opening") ? "_" : undefined;
    if (ev.type === "opening") {
      this.newReminderDialog.clear();
    }

    let url = ["/reminders", this.selectedId, this.action].filter(value => value != undefined).join("/");
    if (window.location.pathname !== url) {
      let routeEvent = new RouteEvent("route", {detail: {url: url,}})
      window.dispatchEvent(routeEvent);
    }
  }

  public async addNotification(_: Event) {
    this.newReminderDialog.show();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-list": ReminderList;
  }
}

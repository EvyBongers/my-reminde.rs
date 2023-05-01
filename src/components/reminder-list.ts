import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import "@material/mwc-circular-progress";
import {DataCollectionSupplier, getCollectionByPath, loadCollection} from "../db";
import {renderItems} from "../helpers/Rendering";
import {BunnyElement, ChangedProperty, observe} from "./bunny-element";
import {ReminderDocument} from "../../firebase/functions/src"
import "./reminder-item";
import "./reminder-edit";
import {ReminderItem} from "./reminder-item";

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
  accountChanged(accountId: ChangedProperty<string>) {
    this.reminders = loadCollection<ReminderDocument>(`accounts/${accountId.after}/reminders`);
  }

  public async addNotification(_: Event) {
    let notification = document.createElement("reminder-edit");
    notification.collectionRef = await getCollectionByPath(`accounts/${this.accountId}/reminders`);
    notification.addEventListener("closed", (ev: CustomEvent) => {
      this.shadowRoot.removeChild(notification);
    });

    this.shadowRoot.append(notification);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reminder-list": ReminderList;
  }
}

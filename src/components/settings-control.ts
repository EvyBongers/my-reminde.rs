import {customElement, property} from "lit/decorators.js";
import {css, html, LitElement, render} from "lit";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "../messaging";
import {loadCollection} from "../db";
import {ReminderDocument} from "../../firebase/functions/src";
import {SingleSelectedEvent} from "@material/mwc-list";
import {showMessage} from "../helpers/Snacks";
import {doSendNotifications} from "../functions";

@customElement("settings-control")
export class SettingsControl extends LitElement {
  @property()
  accountId: string;

  @property()
  pushNotificationsEnabled: boolean;

  static override styles = css`
    mwc-formfield {
      display: flex;
      height: 48px;
    }

    mwc-formfield mwc-switch {
      z-index: -1;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
  }

  override render() {
    return html`
      <h2>Settings</h2>
      <mwc-formfield label="Notifications enabled" alignEnd spaceBetween @click="${this.togglePush}">
        <mwc-switch ?selected="${this.pushNotificationsEnabled}"></mwc-switch>
      </mwc-formfield>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
    `;
  }

  private async loadPushNotificationsState() {
    this.pushNotificationsEnabled = await isPushNotificationsEnabled();
    localStorage["pushNotificationsEnabled"] = this.pushNotificationsEnabled;
  }

  private async sendNotification(_: Event) {
    let reminders = (await loadCollection<ReminderDocument>(`accounts/${this.accountId}/reminders`).next()).value;
    try {
      let reminderDocuments = reminders as ReminderDocument[];
      let selectedReminder: ReminderDocument;

      let dialog = document.createElement("confirm-dialog");
      dialog.setAttribute("confirmLabel", "Send");
      dialog.setAttribute("cancelLabel", "Cancel");
      dialog.toggleAttribute("open", true);
      render(html`
        <span>Reminder to send:</span>
        <br>
        <mwc-list @selected="${(e: SingleSelectedEvent) => {
        selectedReminder = reminderDocuments[e.detail.index]
      }}">
          ${reminderDocuments.map(_ => html`
            <mwc-radio-list-item .data-document-ref="${_._ref}">${_.title}</mwc-radio-list-item>`)}
        </mwc-list>
      `, dialog);
      dialog.addEventListener("confirm", _ => {
        showMessage(`Sending notification ${selectedReminder.title}`, {timeoutMs: 7500});
        doSendNotifications(selectedReminder._ref.path);
      });
      dialog.addEventListener("closed", _ => {
        this.renderRoot.removeChild(dialog);
      });
      this.shadowRoot.append(dialog);
    } catch (e) {
      showMessage(`Failed to fetch notifications: ${e}`, {timeoutMs: 10000});
    }
  }

  private async togglePush(e: Event) {
    if (e.target === e.currentTarget) {
      if (this.pushNotificationsEnabled) {
        await disablePushNotifications();
      } else {
        await enablePushNotifications();
      }
    }

    await this.loadPushNotificationsState();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-control": SettingsControl;
  }
}

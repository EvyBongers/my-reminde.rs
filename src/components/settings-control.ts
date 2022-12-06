import {css, html, LitElement, render} from "lit";
import {customElement, property} from "lit/decorators.js";
import {SingleSelectedEvent} from "@material/mwc-list";
import "@material/mwc-formfield";
import "@material/mwc-switch";
import {ReminderDocument} from "../../firebase/functions/src";
import {showMessage} from "../helpers/Snacks";
import {loadCollection} from "../db";
import {doSendNotifications} from "../functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled, updateDevice} from "../messaging";
import {getDeviceId, getDeviceName, setDeviceName} from "../helpers/Device";
import {BunnyElement, observe} from "./bunny-element";

@customElement("settings-control")
export class SettingsControl extends BunnyElement {
  _deviceName: string = getDeviceName();

  @property()
  accountId: string;

  @property()
  pushNotificationsEnabled: boolean;

  @property()
  get deviceName(): string {
    return this._deviceName;
  }

  set deviceName(name: string) {
    let oldName = this._deviceName;
    this._deviceName = name ?? navigator.userAgent;
    this.requestUpdate('deviceName', oldName);
  }

  static override styles = css`
    .settings-container {
      display: flex;
      flex-direction: column;
    }

    mwc-formfield {
      height: 56px;
      display: flex;
      width: 100%;
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
      <div class="settings-container">
        <mwc-formfield label="Notifications enabled" alignEnd spaceBetween @click="${this.togglePush}">
          <mwc-switch ?selected="${this.pushNotificationsEnabled}"></mwc-switch>
        </mwc-formfield>
        <mwc-formfield label="Device name" alignEnd spaceBetween>
          <mwc-textfield type="text" name="device" .value="${this.deviceName}" placeholder="${navigator.userAgent}"
                         @input="${(_: Event) => this.deviceName = (_.currentTarget as HTMLInputElement).value}">
          </mwc-textfield>
        </mwc-formfield>
        <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
      </div>
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

  @observe("deviceName")
  async updateDeviceName(deviceName: string) {
    setDeviceName(deviceName);
    if (this.pushNotificationsEnabled) {
      await updateDevice(getDeviceId(), {
        name: deviceName,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-control": SettingsControl;
  }
}

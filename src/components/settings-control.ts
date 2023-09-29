import {css, html, LitElement, render} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {SingleSelectedEvent} from "@material/mwc-list";
import "@material/mwc-formfield";
import "@material/mwc-icon-button";
import "@material/mwc-select";
import "@material/mwc-switch";
import {ReminderDocument} from "../../firebase/functions/src";
import {showMessage} from "../helpers/Snacks";
import {loadCollection} from "../db";
import {doSendNotifications} from "../functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled, updateDevice} from "../messaging";
import {getDeviceId, getDeviceName, setDeviceName} from "../helpers/Device";
import {updateAccount} from "../auth";
import {BunnyElement, observe} from "./bunny-element";
import {ConfirmDialog} from "./confirm-dialog";
import {choose} from "lit/directives/choose.js";

@customElement("settings-control")
export class SettingsControl extends BunnyElement {
  _deviceName: string = getDeviceName();
  timezone: string;

  settingEditing: string;

  @property()
  accountId: string;

  @property()
  pushNotificationsEnabled: boolean;

  @query("confirm-dialog")
  settingsDialog: ConfirmDialog;

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

    confirm-dialog > * {
      width: 100%;
    }

    mwc-formfield {
      height: 56px;
      display: flex;
      width: 100%;
    }

    mwc-formfield div {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
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
          <div>
            <span>${this.deviceName}</span>
            <mwc-icon-button icon="navigate_next" @click="${this.promptSetting}" data-setting-name="deviceName"></mwc-icon-button>
          </div>
        </mwc-formfield>
        <mwc-formfield label="Notifications timezone" alignEnd spaceBetween>
          <mwc-select name="timezone" .value="${this.timezone}"
                      @changed="${(_: Event) => this.timezone = (_.currentTarget as HTMLSelectElement).value}">
            <mwc-list-item>Europe/Amsterdam</mwc-list-item>
          </mwc-select>
        </mwc-formfield>
        <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
      </div>

      <confirm-dialog confirmLabel="Save" cancelLabel="Cancel">
        ${choose(this.settingEditing, [
          ["deviceName", () => html`
            <mwc-textfield label="Device name" type="text" name="device" .value="${this.deviceName}" placeholder="${navigator.userAgent}" @input="${(_: Event) => this.deviceName = (_.currentTarget as HTMLInputElement).value}"></mwc-textfield>
          `],
          ], () => html`Unknown setting '${this.settingEditing}'`)}
      </confirm-dialog>
    `;
  }

  private promptSetting(ev: Event) {
    ev.stopPropagation();
    (ev.target as HTMLElement).blur();

    const eventDataset = (ev.currentTarget as HTMLElement | LitElement).dataset;
    this.settingEditing = eventDataset.settingName;
    console.log(this.settingEditing);
    this.requestUpdate("settingEditing", undefined);
    this.settingsDialog.show();
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

  @observe("timezone")
  async updateTimezone(timezone: string) {
    if (this.pushNotificationsEnabled) {
      await updateAccount({
        timezone: timezone,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-control": SettingsControl;
  }
}

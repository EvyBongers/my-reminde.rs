import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {choose} from 'lit/directives/choose.js';
import {auth} from "./auth";
import {doSendNotifications} from "./functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import {ReminderList} from "./components/reminder-list";
import {logout} from "./auth";
import {showMessage} from "./helpers/Snacks";
import "@material/mwc-button";
import "@material/mwc-fab";
import "@material/mwc-formfield";
import "@material/mwc-list";
import "@material/mwc-switch";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import "@material/mwc-top-app-bar-fixed";
import "./components/jdi-login";
import "./components/jdi-devices";
import "./components/reminder-list";
import "./components/confirm-dialog";

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: String;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @property()
  currentView: string;

  @query("reminder-list")
  private reminders: ReminderList;

  static override styles = css`
    :host {
      --mdc-typography-body2-font-size: 1rem;
      --mdc-tab-stacked-height: 72px;
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: var(--mdc-tab-stacked-height, 0);
      right: 0;
    }

    main {
      padding: 0 6pt;
      position: relative;
    }

    mwc-formfield {
      display: flex;
      height: 48px;
    }

    mwc-formfield mwc-switch {
      z-index: -1;
    }

    footer {
      --mdc-typography-button-text-transform: none;
      border-top: 1px solid #d3d3d3;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }

    mwc-tab {
      background-color: inherit;
    }
  `;

  renderDevices() {
    return html`
      <h3>Subscribed devices</h3>
      <jdi-devices .accountId="${this.userId}"></jdi-devices>
    `;
  }

  renderReminders() {
    return html`
      <h3>Reminders</h3>
      <reminder-list .accountId="${this.userId}"></reminder-list>
    `;
  }

  renderSettings() {
    return html`
      <h3>Settings</h3>
      <mwc-formfield label="Notifications enabled" alignEnd spaceBetween @click="${this.togglePush}">
        <mwc-switch ?selected="${this.pushNotificationsEnabled}"></mwc-switch>
      </mwc-formfield>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
      <mwc-button outlined icon="logout" label="Logout" @click="${this.confirmLogout}" stacked></mwc-button>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  renderNav(){
    return html`
      <mwc-tab-bar>
        <mwc-tab icon="notifications" label="Reminders" data-view="reminders" @click="${this.switchTo}" stacked></mwc-tab>
        <mwc-tab icon="settings" label="Settings" data-view="settings" @click="${this.switchTo}" stacked></mwc-tab>
        <mwc-tab icon="devices" label="Devices" data-view="devices" @click="${this.switchTo}" stacked></mwc-tab>
      </mwc-tab-bar>
    `;
  }

  renderAppContent() {
    if (!this.userId) return this.renderLoggedOut();

    try {
      return html`
        ${choose(this.currentView, [
              ['reminders', () => html`${this.renderReminders()}`],
              ['settings', () => html`${this.renderSettings()}`],
              ['devices', () => html`${this.renderDevices()}`],
            ],
            () => html`${this.renderReminders()}`)}
      `;
    }
    catch (e) {
      return html`
        Failed to render view ${this.currentView}: ${e}
      `;
    }
  }

  override render() {
    return html`
      <mwc-top-app-bar-fixed>
        <div slot="title">${this.user?.displayName ? `${this.user.displayName}'s reminders` : "My reminders"}</div>
        <mwc-icon-button icon="${this.pushNotificationsEnabled ? "notifications_active" : "notifications_none"}"
                         slot="actionItems" @click="${this.togglePush}"></mwc-icon-button>
        <main>${this.renderAppContent()}</main>
        <footer>${this.renderNav()}</footer>
      </mwc-top-app-bar-fixed>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    onAuthStateChanged(auth, (user) => {
      this.user = user;

      if (user) {
        this.userId = user.uid;
        localStorage["loggedInUserId"] = user.uid;
      } else {
        this.userId = undefined;
        delete localStorage["loggedInUserId"];
      }
    });

    this.userId = localStorage["loggedInUserId"];
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
  }

  private confirmLogout(e: Event) {
    let dialog = document.createElement("confirm-dialog");
    dialog.append("Are you sure you want to log out?");
    dialog.setAttribute("confirmLabel", "Yes");
    dialog.setAttribute("cancelLabel","No");
    dialog.addEventListener("confirm", logout);
    dialog.addEventListener("closed", _ => { this.renderRoot.removeChild(dialog); });
    this.shadowRoot.append(dialog);
  }

  private switchTo(e: Event) {
    this.currentView = (e.currentTarget as HTMLElement).dataset.view;
  }

  private async loadPushNotificationsState() {
    this.pushNotificationsEnabled = await isPushNotificationsEnabled();
    localStorage["pushNotificationsEnabled"] = this.pushNotificationsEnabled;
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

  private async sendNotification(_: Event) {
    // TODO: select notification to schedule
    let scheduledNotifications = [...this.reminders.notifications.values()].map(_ => _.item);
    let selectedNotification = [...scheduledNotifications.values()][Math.floor(Math.random() * scheduledNotifications.length)];

    showMessage(`Sending notification ${selectedNotification.title}`, {timeoutMs: 7500});
    await doSendNotifications(selectedNotification._ref.path.toString());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

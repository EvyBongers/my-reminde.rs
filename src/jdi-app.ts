import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {auth} from "./auth";
import {doSendNotifications} from "./functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import "@material/mwc-button";
import "@material/mwc-fab";
import './components/jdi-login';
import './components/jdi-logout';
import './components/jdi-devices';
import './components/reminder-list';
import {ReminderList} from "./components/reminder-list";
import {showMessage} from "./helpers/Snacks";

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: String;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @query("reminder-list")
  private reminders: ReminderList;

  static override styles = css`
    :host {
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      padding: 0 6pt;
    }
  `;

  renderLoggedIn() {
    return html`
      <h1>Hurray!</h1>
      <mwc-button outlined icon="${this.pushNotificationsEnabled ? "notifications_off" : "notifications_active"}"
                  @click="${this.togglePush}">
        ${this.pushNotificationsEnabled ? "Disable" : "Enable"} notifications
      </mwc-button>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a message</mwc-button>
      <br>
      <jdi-logout></jdi-logout>
      <br>
      <jdi-devices .accountId="${this.userId}"></jdi-devices>

      <reminder-list .accountId="${this.userId}"></reminder-list>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  override render() {
    return html`
      ${this.userId ? this.renderLoggedIn() : this.renderLoggedOut()}
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

  private async loadPushNotificationsState() {
    this.pushNotificationsEnabled = await isPushNotificationsEnabled();
    localStorage["pushNotificationsEnabled"] = this.pushNotificationsEnabled;
  }

  private async togglePush(_: Event) {
    if (this.pushNotificationsEnabled) {
      await disablePushNotifications();
    } else {
      await enablePushNotifications();
    }

    this.loadPushNotificationsState();
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

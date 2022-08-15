import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {auth} from "./auth";
import {doSendNotifications} from "./functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import "@material/mwc-button";
import "@material/mwc-fab";
import './components/jdi-login';
import './components/jdi-logout';
import './components/jdi-devices';
import './components/notification-preferences';
import {query} from "lit/decorators.js";
import {NotificationPreferences} from "./components/notification-preferences";
import {showMessage} from "./helpers/Snacks";

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: String;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @query('notification-preferences')
  private notificationPreferences: NotificationPreferences;

  static override styles = css`
    :host {
      display: block;
      font-family: "Roboto";
    }
  `;

  renderLoggedIn() {
    return html`
      <h1>Hurray!</h1>
      <mwc-button outlined icon="${this.pushNotificationsEnabled ? "notifications_off" : "notifications_active"}" @click="${this.togglePush}">
        ${this.pushNotificationsEnabled ? "Disable" : "Enable"} notifications
      </mwc-button>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a message</mwc-button>
      <br>
      <jdi-logout></jdi-logout>
      <br>
      <jdi-devices .accountId="${this.userId}"></jdi-devices>

      <notification-preferences .accountId="${this.userId}"></notification-preferences>
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

  private async togglePush(e: Event) {
    if (await this.pushNotificationsEnabled) {
      await disablePushNotifications();
    } else {
      await enablePushNotifications();
    }

    this.loadPushNotificationsState();
  }

  private async sendNotification(e: Event) {
    // TODO(ebongers): select notification to schedule
    let scheduledNotifications = [...this.notificationPreferences.notifications.values()].map(_=>_.item);
    let selectedNotification = [...scheduledNotifications.values()][Math.floor(Math.random()*scheduledNotifications.length)];

    showMessage(`Sending notification ${selectedNotification.title}`, {timeoutMs: 7500});
    await doSendNotifications(selectedNotification._ref._key.path.toString());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

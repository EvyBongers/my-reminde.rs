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

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: String;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  static override styles = css`
    :host {
      display: block;
      font-family: "Roboto";
    }

    mwc-fab {
      --mdc-icon-size: 36px;
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

      <mwc-fab icon="add" @click="${this.addNotification}"></mwc-fab>
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
    await doSendNotifications({
      title: 'cakes',
      body: 'your a cute cupcake',
    });
  }

  private async addNotification(e: Event) {
    // TODO(ebongers): implement adding a notification
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

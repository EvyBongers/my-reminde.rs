import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import './components/jdi-login';
import './components/jdi-logout';
import './components/jdi-devices';
import {auth} from "./auth";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import {doSendNotifications} from "./functions";

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
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

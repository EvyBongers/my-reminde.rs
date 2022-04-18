import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import './components/jdi-login';
import './components/jdi-logout';
import {onAuthStateChanged, User} from "firebase/auth";
import {auth} from "./auth";
import {disablePushNotifications, enablePushNotifications, isPushNotifications} from "./messaging";
import {doSendNotifications} from "./functions";

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  user: User;

  @property()
  pushNoitifications: Promise<boolean>;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  renderLoggedIn() {
    return html`
      <h1>Hurray!</h1>
      <mwc-button outlined icon="notifications" @click="${this.togglePush}">Toggle notifications</mwc-button>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a message</mwc-button>
      <br>
      <jdi-logout></jdi-logout>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  override render() {
    return html`
      ${this.user ? this.renderLoggedIn() : this.renderLoggedOut()}
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });

    this.loadPushNotificationsState();
  }

  private loadPushNotificationsState() {
    this.pushNoitifications = isPushNotifications();
  }

  private async togglePush(e: Event) {
    if (await this.pushNoitifications) {
      debugger
      await disablePushNotifications();

    } else {
      debugger
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

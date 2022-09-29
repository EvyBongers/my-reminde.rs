import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {choose} from 'lit/directives/choose.js';
import {auth} from "./auth";
import {doSendNotifications} from "./functions";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import {Drawer} from "@material/mwc-drawer";
import {ReminderList} from "./components/reminder-list";
import {logout} from "./auth";
import {showMessage} from "./helpers/Snacks";
import "@material/mwc-button";
import "@material/mwc-drawer";
import "@material/mwc-fab";
import "@material/mwc-top-app-bar-fixed";
import "./components/jdi-login";
import "./components/jdi-devices";
import "./components/reminder-list";

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

  @property()
  drawerType: string;

  @query("reminder-list")
  private reminders: ReminderList;

  @query("mwc-drawer")
  private navDrawer: Drawer;

  static override styles = css`
    @media (min-width: 600px) {
      mwc-icon-button[slot="navigationIcon"] {
        display: none;
      }

      mwc-drawer mwc-top-app-bar-fixed {
        /* Default width of drawer is 256px. See CSS Custom Properties below */
        --mdc-top-app-bar-width: calc(100% - var(--mdc-drawer-width, 256px));
      }
    }

    :host {
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
    }

    main {
      padding: 0 6pt;
    }

    nav {
      display: flex;
      flex-direction: column;
    }
  `;

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.drawerType = window.outerWidth < 600 ? "modal":"";
    this.navDrawer.open = this.drawerType == "";
    window.addEventListener("resize", (e) => {
      this.drawerType = window.outerWidth < 600 ? "modal":"";
    });
    this.navDrawer.addEventListener("MDCTopAppBar:nav", _ => {
      this.navDrawer.open = !this.navDrawer.open;
    });
  }

  renderDevices() {
    return html`
      <jdi-devices .accountId="${this.userId}"></jdi-devices>
    `;
  }

  renderReminders() {
    return html`
      <reminder-list .accountId="${this.userId}"></reminder-list>
      <br>
      <mwc-button outlined icon="${this.pushNotificationsEnabled ? "notifications_off" : "notifications_active"}"
                  @click="${this.togglePush}">
        ${this.pushNotificationsEnabled ? "Disable" : "Enable"} notifications
      </mwc-button>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  renderAppContent() {
    if (!this.userId) return this.renderLoggedOut();

    try {
      return html`
        ${choose(this.currentView, [
              ['reminders', () => html`${this.renderReminders()}`],
              ['devices', () => html`${this.renderDevices()}`],
            ],
            () => html`${this.renderReminders()}`)}
        <br>
        <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
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
      <mwc-drawer hasHeader type="${this.drawerType}">
        <span slot="title">Reminde.rs</span>
        <!--
        <span slot="subtitle">subtitle</span>
        -->
        <nav>
          <mwc-button data-view="reminders" @click="${this.switchTo}">Reminders</mwc-button>
          <mwc-button data-view="devices" @click="${this.switchTo}">Devices</mwc-button>
          <mwc-button raised icon="logout" @click="${logout}">Logout</mwc-button>
        </nav>
        <mwc-top-app-bar-fixed slot="appContent">
          <mwc-icon-button icon="menu" slot="navigationIcon"></mwc-icon-button>
          <div slot="title">${this.user?.displayName ? `${this.user.displayName}'s reminders` : "My reminders"}</div>
          <mwc-icon-button icon="${this.pushNotificationsEnabled ? "notifications_active" : "notifications"}"
                           slot="actionItems" @click="${this.togglePush}"></mwc-icon-button>
          <!--
          <mwc-icon-button icon="install_mobile" slot="actionItems"></mwc-icon-button>
          -->
          <main>${this.renderAppContent()}</main>
        </mwc-top-app-bar-fixed>
      </mwc-drawer>
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

  private switchTo(e: Event) {
    this.currentView = (e.currentTarget as HTMLElement).dataset.view;
    this.navDrawer.open = this.drawerType == "";
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

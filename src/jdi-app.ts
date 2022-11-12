import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, nothing, render} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {choose} from 'lit/directives/choose.js';
import {when} from 'lit/directives/when.js';
import {auth, logout} from "./auth";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import {ReminderList} from "./components/reminder-list";
import {showMessage} from "./helpers/Snacks";
import "@material/mwc-button";
import "@material/mwc-fab";
import "@material/mwc-formfield";
import "@material/mwc-list/mwc-radio-list-item";
import "@material/mwc-switch";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import "@material/mwc-top-app-bar-fixed";
import "./components/jdi-login";
import "./components/jdi-devices";
import "./components/notification-list";
import "./components/reminder-list";
import "./components/confirm-dialog";
import {loadCollection} from "./db";
import {ReminderDocument} from "../firebase/functions/src";
import {SingleSelectedEvent} from "@material/mwc-list";
import {doSendNotifications} from "./functions";

type routeData = {
  view: string
  data?: {[key: string]: string}
};

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: String;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @property()
  currentRoute: routeData;

  @query("reminder-list")
  private reminders: ReminderList;

  static override styles = css`
    :host {
      --base-background-color: #ffffff;
      --mdc-tab-height: 48px;
      --mdc-theme-primary: #6200ee;
      --mdc-typography-body2-font-size: 1rem;

      background-color: var(--base-background-color);
    }

    mwc-top-app-bar-fixed {
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
    }

    h2 {
      text-transform: capitalize;
    }

    main {
      padding: 6pt 6pt calc(var(--mdc-tab-height, 0) + 6pt);
    }

    mwc-formfield {
      display: flex;
      height: 48px;
    }

    mwc-formfield mwc-switch {
      z-index: -1;
    }

    nav {
      --mdc-typography-button-text-transform: none;
      background-color: var(--base-background-color);
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

  private static routes: { [pattern: string]: routeData } = {
    "/reminders/:id": {view: "reminders"},
    "/settings": {view: "settings"},
    "/devices": {view: "devices"},
    "/notifications/:id": {view: "notifications"},
  }

  renderDevices() {
    return html`
      <h2>Subscribed devices</h2>
      <jdi-devices .accountId="${this.userId}"></jdi-devices>
    `;
  }

  renderReminders(args?: {[key: string]: string}) {
    return html`
      <h2>Reminders</h2>
      <reminder-list .accountId="${this.userId}" .selectedId="${args?.id}"></reminder-list>
    `;
  }

  renderSettings() {
    return html`
      <h2>Settings</h2>
      <mwc-formfield label="Notifications enabled" alignEnd spaceBetween @click="${this.togglePush}">
        <mwc-switch ?selected="${this.pushNotificationsEnabled}"></mwc-switch>
      </mwc-formfield>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
    `;
  }

  renderNotifications(args?: {[key: string]: string}) {
    return html`
      <h2>Notification history</h2>
      <notification-list .accountId="${this.userId}" .selectedId="${args?.id}"></notification-list>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  renderNav() {
    return html`
      <nav>
        <mwc-tab-bar>
          <mwc-tab icon="alarm" data-uri="/reminders" @click="${this.route}"></mwc-tab>
          <mwc-tab icon="settings" data-uri="/settings" @click="${this.route}"></mwc-tab>
          <mwc-tab icon="devices" data-uri="/devices" @click="${this.route}"></mwc-tab>
          <mwc-tab icon="notifications" data-uri="/notifications" @click="${this.route}"></mwc-tab>
        </mwc-tab-bar>
      </nav>
    `;
  }

  renderAppBarButtons() {
    return html`
      <mwc-icon-button icon="${this.pushNotificationsEnabled ? "notifications_active" : "notifications_none"}"
                       slot="actionItems" @click="${this.togglePush}"></mwc-icon-button>
      <mwc-icon-button icon="logout" slot="actionItems" @click="${this.confirmLogout}" stacked></mwc-icon-button>
    `;
  }

  renderAppContent() {
    try {
      return html`
        ${choose(this.currentRoute.view, [
              ['reminders', () => html`${this.renderReminders(this.currentRoute.data)}`],
              ['settings', () => html`${this.renderSettings()}`],
              ['devices', () => html`${this.renderDevices()}`],
              ['notifications', () => html`${this.renderNotifications(this.currentRoute.data)}`],
            ],
            () => html`${this.renderReminders()}`)}
      `;
    } catch (e) {
      return html`
        Failed to render view: ${e}
      `;
    }
  }

  override render() {
    return html`
      <mwc-top-app-bar-fixed>
        <div slot="title">${this.user?.displayName ? `${this.user.displayName}'s reminders` : "My reminders"}</div>
        ${when(this.userId, () => html`${this.renderAppBarButtons()}`, () => nothing)};

        <main>
          ${when(this.userId, () => html`${this.renderAppContent()}`, () => html`${this.renderLoggedOut()}`)}
        </main>
        ${when(this.userId, () => html`${this.renderNav()}`, () => nothing)}
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

    this.setView();
    this.userId = localStorage["loggedInUserId"];
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
  }

  private confirmLogout(_: Event) {
    let dialog = document.createElement("confirm-dialog");
    dialog.append("Are you sure you want to log out?");
    dialog.setAttribute("confirmLabel", "Yes");
    dialog.setAttribute("cancelLabel", "No");
    dialog.addEventListener("confirm", logout);
    dialog.addEventListener("closed", _ => {
      this.renderRoot.removeChild(dialog);
    });
    this.shadowRoot.append(dialog);
  }

  private setView(pathname?: string) {
    pathname ??= (new URL(document.location.href)).pathname;

    let routeData = ((uri: string) => {
      for (const pattern in JDIApp.routes) {
        let matchResult = new RegExp(`^${pattern.replace("/:id", "(?:(?:/)(?<id>\\w+))?")}$`).exec(uri);
        if (matchResult !== null) {
          return {
            ...JDIApp.routes[pattern],
            data: matchResult.groups,
          };
        }
      }
    })(pathname);
    console.log("Route data:", routeData ?? "<nullish>");
    this.currentRoute = routeData;
  }

  private route(e: Event) {
    const uri = (e.currentTarget as HTMLElement).dataset.uri;

    window.history.pushState({}, null, uri);
    this.setView(uri);
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
    let reminders = (await loadCollection<ReminderDocument>(`accounts/${this.userId}/scheduledNotifications`).next()).value;
    try {
      let reminderDocuments = reminders as ReminderDocument[];
      let selectedReminder: ReminderDocument;

      let dialog = document.createElement("confirm-dialog");
      dialog.setAttribute("confirmLabel", "Send");
      dialog.setAttribute("cancelLabel", "Cancel");
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
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

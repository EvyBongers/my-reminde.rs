import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, nothing, render, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {when} from 'lit/directives/when.js';
import {auth, logout} from "./auth";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
import {showMessage} from "./helpers/Snacks";
import "@material/mwc-button";
import "@material/mwc-fab";
import "@material/mwc-formfield";
import "@material/mwc-list/mwc-radio-list-item";
import "@material/mwc-switch";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import "@material/mwc-top-app-bar-fixed";
import "./components/confirm-dialog";
import "./components/jdi-devices";
import "./components/jdi-login";
import "./components/nav-bar";
import "./components/notification-list";
import "./components/reminder-list";
import {loadCollection} from "./db";
import {ReminderDocument} from "../firebase/functions/src";
import {SingleSelectedEvent} from "@material/mwc-list";
import {doSendNotifications} from "./functions";
import {NavItem} from "./components/nav-bar";

type RenderFn = (params?: { [key: string]: string }) => TemplateResult;
type routeData = {
  view: string
  renderFn: RenderFn
  data?: { [key: string]: string }
};

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  userId: string;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @property()
  currentRoute: routeData | undefined;

  private defaultPath: string = "/reminders";

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

  private routes: { [pattern: string]: routeData } = {
    "/reminders/:id/:action": {view: "reminders", renderFn: this.renderReminders},
    "/settings": {view: "settings", renderFn: this.renderSettings},
    "/devices": {view: "devices", renderFn: this.renderDevices},
    "/notifications/:id": {view: "notifications", renderFn: this.renderNotifications},
  }

  private navButtons: NavItem[] = [
    {icon: "alarm", uri: "/reminders"},
    {icon: "settings", uri: "/settings"},
    {icon: "devices", uri: "/devices"},
    {icon: "notifications", uri: "/notifications"},
  ]

  constructor() {
    super();
    if (window.location.pathname === "/") {
      window.history.replaceState(window.history.state?.data, null, this.defaultPath);
    }
  }

  renderDevices(args?: { [key: string]: string }): TemplateResult {
    return html`
      <h2>Subscribed devices</h2>
      <jdi-devices .accountId="${args?.userId}"></jdi-devices>
    `;
  }

  renderReminders(args?: { [key: string]: string }) {
    // TODO: replace reminder-list with generic collection-list
    return html`
      <h2>Reminders</h2>
      <reminder-list .collection="notifications" .accountId="${args?.userId}"
                     .selectedId="${args?.id}" .action="${args?.action}"
                     @NavigationEvent="${this.route}"></reminder-list>
    `;
  }

  renderSettings(): TemplateResult {
    return html`
      <h2>Settings</h2>
      <mwc-formfield label="Notifications enabled" alignEnd spaceBetween @click="${this.togglePush}">
        <mwc-switch ?selected="${this.pushNotificationsEnabled}"></mwc-switch>
      </mwc-formfield>
      <br>
      <mwc-button outlined icon="send" @click="${this.sendNotification}">Send a test notification</mwc-button>
    `;
  }

  renderNotifications(args?: { [key: string]: string }): TemplateResult {
    // TODO: replace notification-list with generic collection-list
    return html`
      <h2>Notification history</h2>
      <notification-list .collection="notifications" .accountId="${args?.userId}"
                         .selectedId="${args?.id}" @NavigationEvent="${this.route}"></notification-list>
    `;
  }

  renderLoggedOut(): TemplateResult {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  renderNav(): TemplateResult {
    let activeIndex = 0;
    this.navButtons.forEach((navItem, idx) => {
      if (document.location.pathname.startsWith(navItem.uri)) {
        activeIndex = idx;
      }
    });
    return html`
      <nav>
        <nav-bar .activeIndex="${activeIndex}" .navButtons="${this.navButtons}"
                 @NavigationEvent="${this.route}"></nav-bar>
      </nav>
    `;
  }

  renderAppBarButtons(): TemplateResult {
    return html`
      <mwc-icon-button icon="${this.pushNotificationsEnabled ? "notifications_active" : "notifications_none"}"
                       slot="actionItems" @click="${this.togglePush}"></mwc-icon-button>
      <mwc-icon-button icon="logout" slot="actionItems" @click="${this.confirmLogout}" stacked></mwc-icon-button>
    `;
  }

  renderAppContent(): TemplateResult {
    try {
      return html`
        ${when(this.currentRoute !== undefined,
            () => html`${this.currentRoute.renderFn.call(this, this.currentRoute.data)}`,
            () => html`<h1>Oops!</h1><p>No idea how we ended up here, but I don't know what to show.</p>`)}
      `;
    } catch (e) {
      return html`
        Failed to render view: ${e}
      `;
    }
  }

  override render(): TemplateResult {
    return html`
      <mwc-top-app-bar-fixed>
        <div slot="title">${this.user?.displayName ? `${this.user.displayName}'s reminders` : "My reminders"}</div>
        ${when(this.userId, () => html`${this.renderAppBarButtons()}`, () => nothing)}

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
      if (!user) {
        this.userId = undefined;
        delete localStorage["loggedInUserId"];
        window.history.pushState({}, null, "/login");
        this.setCurrentRoute("/login");
      } else if (this.userId !== user.uid) {
        this.userId = user.uid;
        localStorage["loggedInUserId"] = user.uid;
        window.history.pushState({}, null, this.defaultPath);
        this.setCurrentRoute(this.defaultPath);
      }
    });

    this.userId = localStorage["loggedInUserId"];
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.setCurrentRoute(window.location.pathname);
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

  private setCurrentRoute(pathname: string) {
    let routeData = Object.entries(this.routes).map(([pattern, data]) => {
      // TODO: write proper regex for substituting placeholders
      let matchResult = new RegExp(`^${pattern.replace("/:id", "(?:/(?<id>\\w+))?").replace("/:action", "(?:/(?<action>\\w+))?")}$`).exec(pathname);
      if (matchResult !== null) {
        return {
          ...this.routes[pattern],
          data: {
            ...matchResult.groups,
            "userId": this.userId,
          },
        };
      }
    }, this).find(_ => _ !== undefined);

    this.currentRoute = routeData;
  }

  private route(e: CustomEvent) {
    window.history.pushState({}, null, e.detail);
    this.setCurrentRoute(e.detail);
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
    let reminders = (await loadCollection<ReminderDocument>(`accounts/${this.userId}/reminders`).next()).value;
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

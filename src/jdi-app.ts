import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {guard} from 'lit/directives/guard.js';
import {when} from 'lit/directives/when.js';
import {auth, logout} from "./auth";
import {disablePushNotifications, enablePushNotifications, isPushNotificationsEnabled} from "./messaging";
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
import "./components/settings-control";
import {NavItem} from "./components/nav-bar";
import {navigate} from "./helpers/Rendering";

export type Route = {
  route: string
  data?: { [key: string]: string }
};
export type RouteOptions = {
  inPlace?: boolean
}
export type RouteEventDetail = {
  url: URL | string,
  options?: RouteOptions,
};
export class RouteEvent extends CustomEvent<RouteEventDetail>{}

@customElement("jdi-app")
export class JDIApp extends LitElement {
  _state: Route
  _user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @state()
  get data(): { [key: string]: string } {
    return history.state?.data;
  }

  set data(data: { [key: string]: string }) {
    // TODO: Figure out how to update properties on child elements or why this doesn't work
    //   -> asyncReplace?
    this.requestUpdate("data", this._state.data);
    this._state.data = data;
  }

  @state()
  get route(): string {
    return history.state?.route;
  }

  set route(route: string) {
    if (this._state.route === route) {
      return;
    }

    this.requestUpdate("data", this._state.route);
    this._state.route = route;
  }

  @property()
  get user(): User {
    return this._user;
  }

  set user(user: User) {
    let storedUid = this.userId;
    let storedUser = this._user;

    this._user = user;
    if (!user) {
      delete localStorage["loggedInUserId"];
    } else {
      localStorage["loggedInUserId"] = user.uid;
    }

    this.requestUpdate("user", storedUser);
    this.requestUpdate("userId", storedUid);
  }

  @property()
  get userId(): string {
    return localStorage["loggedInUserId"];
  }

  private defaultPath: string = "/reminders";

  static override styles = css`
    :host {
      --base-background-color: #ffffff;
      --mdc-tab-height: 48px;
      --mdc-theme-primary: #6200ee;

      --mdc-typography-font-family: 'Lexend', sans-serif;
      --mdc-typography-body2-font-size: 0.9rem;
      --mdc-typography-headline6-font-size: 1.5rem;

      background-color: var(--base-background-color);
      font-family: var(--mdc-typography-font-family);
      font-size: var(--mdc-typography-body2-font-size);
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

    [route] {
      display: none;
    }

    [route][active] {
      display: initial;
    }
  `;

  private routes: { [pattern: string]: Route } = {
    "/reminders/:reminderId/:reminderAction": {route: "reminders"},
    "/settings": {route: "settings"},
    "/devices": {route: "devices"},
    "/notifications/:notificationId": {route: "notifications"},
    "/login": {route: "login"},
  }

  private navButtons: NavItem[] = [
    {icon: "alarm", uri: "/reminders"},
    {icon: "settings", uri: "/settings"},
    {icon: "devices", uri: "/devices"},
    {icon: "notifications", uri: "/notifications"},
  ]

  constructor() {
    super();

    this._state = {route: undefined};
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
  }

  renderNav(): TemplateResult {
    let activeIndex = this.navButtons.reduce<number>((idx: number, currentValue: NavItem, currentIndex: number): number => {
      return document.location.pathname.startsWith(currentValue.uri) && idx === -1 ? currentIndex : idx;
    }, -1);
    return html`
      <nav>
        <nav-bar .activeIndex="${activeIndex}" .navButtons="${this.navButtons}"></nav-bar>
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

  override render(): TemplateResult {
    return html`
      <mwc-top-app-bar-fixed>
        <div slot="title">${this.user?.displayName ? `${this.user.displayName}'s reminders` : "My reminders"}</div>
        ${when(this.userId, () => html`${this.renderAppBarButtons()}`)}

        <main>
          ${guard([this.route], () => navigate(this.route, [
            ["login", html`<jdi-login></jdi-login>`],
            ["reminders", html`<reminder-list .collection="notifications" .accountId="${this.userId}" .selectedId="${this.data?.reminderId}" .action="${this.data?.reminderAction}"></reminder-list>`],
            ["settings", html`<settings-control .accountId="${this.userId}"></settings-control>`],
            ["notifications", html`<notification-list .collection="notifications" .accountId="${this.userId}" .selectedId="${this.data?.notificationId}"></notification-list>`],
            ["devices", html`<jdi-devices .accountId="${this.userId}"></jdi-devices>`],
            ], html`
            <h1>Oops!</h1>
            <p>No idea how we ended up here, but I don't know what to show.</p>
            `
          ))}
        </main>
        ${when(this.userId, () => html`${this.renderNav()}`)}
      </mwc-top-app-bar-fixed>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    let redirPath = this.userId ? this.defaultPath : "/login";
    const appPath = (window.location.pathname === "/") ? redirPath : window.location.pathname;
    this.routing(appPath, {inPlace: true});

    onAuthStateChanged(auth, (user) => {
      let shouldReroute = this.userId !== user?.uid;
      this.user = user;

      if (!shouldReroute) return
      this.routing(user?.uid ? this.defaultPath : "/login", {inPlace: true});
    });
    window.addEventListener('route', (ev: RouteEvent) => {
      this.routing.call(this, ev.detail.url, ev.detail.options);
    })
    window.addEventListener("popstate", (ev: PopStateEvent) => {
      if (ev.state) {
        this.route = ev.state.route;
        this.data = ev.state.data;
      } else {
        let routeEvent = new RouteEvent("route", {
          detail: {
            url: document.location.pathname,
            options: {inPlace: true},
          }
        });
        window.dispatchEvent(routeEvent);
      }
    });
  }

  private confirmLogout(_: Event) {
    let dialog = document.createElement("confirm-dialog");
    dialog.append("Are you sure you want to log out?");
    dialog.setAttribute("confirmLabel", "Yes");
    dialog.setAttribute("cancelLabel", "No");
    dialog.toggleAttribute("open", true);
    dialog.addEventListener("confirm", logout);
    dialog.addEventListener("closed", _ => {
      this.renderRoot.removeChild(dialog);
    });
    this.shadowRoot.append(dialog);
  }

  private routing(url: string, options?: RouteOptions) {
    let route = Object.entries(this.routes).reduce((direction: Route, [pattern, route]: [string, Route]) => {
      const patternRegex = pattern.replaceAll(/\/:(\w+)/g, "(?:/(?<$1>\\w+))?");
      let matchResult = new RegExp(`^${patternRegex}$`).exec(url);
      if (matchResult !== null) {
        return {
          ...route,

          data: {
            ...route.data,
            ...matchResult.groups,
          }
        };
      }
      return direction;
    }, {route: "404"});

    window.history[options?.inPlace ? "replaceState" : "pushState"](route, "", url);
    this.route = route?.route;
    this.data = route?.data;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

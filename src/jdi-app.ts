import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, nothing, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
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
export class RouteEvent extends CustomEvent<RouteEventDetail>{};

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
    this._user = user;
    if (user === undefined) {
      delete localStorage["loggedInUserId"];
    } else {
      localStorage["loggedInUserId"] = user.uid;
    }
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
    "/reminders/:id/:action": {route: "reminders"},
    "/settings": {route: "settings"},
    "/devices": {route: "devices"},
    "/notifications/:id": {route: "notifications"},
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

    this._state = { route: undefined };
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
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
        ${when(this.userId, () => html`${this.renderAppBarButtons()}`, () => nothing)}

        <main>
          <jdi-login route="login" ?active="${this.route === "login"}"></jdi-login>
          <reminder-list route="reminders" ?active="${this.route === "reminders"}" .collection="notifications" .accountId="${this.userId}"
                         .selectedId="${this.data?.id}"
                         .action="${this.data?.action}"></reminder-list>
          <settings-control route="settings" ?active="${this.route === "settings"}" .accountId="${this.userId}"></settings-control>
          <notification-list route="notifications" ?active="${this.route === "notifications"}" .collection="notifications" .accountId="${this.userId}"
                             .selectedId="${this.data?.id}"></notification-list>
          <jdi-devices route="devices" ?active="${this.route === "devices"}" .accountId="${this.userId}"></jdi-devices>
          <div route="404" ?active="${this.route === "404"}">
            <h1>Oops!</h1>
            <p>No idea how we ended up here, but I don't know what to show.</p>
          </div>
        </main>
        ${when(this.userId, () => html`${this.renderNav()}`, () => nothing)}
      </mwc-top-app-bar-fixed>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    const appPath = (window.location.pathname === "/") ?this.defaultPath:window.location.pathname;
    this.routing(appPath, {inPlace: true});

    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (!user) {
        this.routing("/login", {inPlace: true});
      } else if (this.userId !== user.uid) {
        this.routing(this.defaultPath);
      }
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
            options: { inPlace: true },
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
    }, undefined);

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

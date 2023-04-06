import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, nothing, render, TemplateResult} from "lit";
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

export type RouteOptions = {
  inPlace?: boolean
}
type routeData = {
  pattern: string
  route: string
  data?: { [key: string]: string }
};
export type RouteEventDetails = {
  url: URL | string,
  options?: RouteOptions,
};
export class RouteEvent extends CustomEvent<RouteEventDetails>{};

@customElement("jdi-app")
export class JDIApp extends LitElement {
  @property()
  userId: string;

  @property()
  user: User;

  @property()
  pushNotificationsEnabled: boolean;

  @property()
  currentRoute: string | undefined;

  @state()
  currentRouteData: { [key: string]: string }

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

  private routes: routeData[] = [
    {pattern: "/reminders/:id/:action", route: "reminders"},
    {pattern: "/settings", route: "settings"},
    {pattern: "/devices", route: "devices"},
    {pattern: "/notifications/:id", route: "notifications"},
    {pattern: "/login", route: "login"},
    {pattern: "/404", route: undefined},
  ]

  private navButtons: NavItem[] = [
    {icon: "alarm", uri: "/reminders"},
    {icon: "settings", uri: "/settings"},
    {icon: "devices", uri: "/devices"},
    {icon: "notifications", uri: "/notifications"},
  ]

  constructor() {
    super();
    if (window.location.pathname === "/") {
      this.routing(this.defaultPath, {inPlace: true});
    }

    this.userId = localStorage["loggedInUserId"];
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
          <jdi-login route="login"></jdi-login>
          <reminder-list route="reminders" .collection="notifications" .accountId="${this.userId}"
                         .selectedId="${this.currentRouteData?.id}" .action="${this.currentRouteData?.action}"></reminder-list>
          <settings-control route="settings" .accountId="${this.userId}"></settings-control>
          <notification-list route="notifications" .collection="notifications" .accountId="${this.userId}"
                             .selectedId="${this.currentRouteData?.id}"></notification-list>
          <jdi-devices route="devices" .accountId="${this.userId}"></jdi-devices>
          <div route="404">
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

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this.userId = undefined;
        delete localStorage["loggedInUserId"];
        this.routing("/login", {inPlace: true});
      } else if (this.userId !== user.uid) {
        this.userId = user.uid;
        localStorage["loggedInUserId"] = user.uid;
        this.routing(this.defaultPath);
      }
    });
    window.addEventListener('route', (ev: RouteEvent) => {
      this.routing.call(this, ev.detail.url, ev.detail.options);
    })
  }

  async firstUpdated() {
    this.routing(window.location.pathname);
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
    let activeRoute = this.routes.map((route) => {
        const patternRegex = (route.pattern ?? "").replaceAll(/\/:(\w+)/g, "(?:/(?<$1>\\w+))?");
        let matchResult = new RegExp(`^${patternRegex}$`).exec(url);
        return (matchResult !== null) ? {route: route.route, data: {...route.data, ...matchResult.groups}} : undefined;
      }
    ).find(result => result !== undefined);

    window.history[options?.inPlace ? "replaceState" : "pushState"](activeRoute, "", url);

    this.currentRoute = activeRoute?.route || "404";
    this.currentRouteData = activeRoute?.data || {};

    let activeElements = this.shadowRoot.querySelectorAll("[route][active]");
    let togglingElements = this.shadowRoot.querySelectorAll(`[route='${this.currentRoute}']`);
    activeElements.forEach(el => el.toggleAttribute("active", false));
    togglingElements.forEach(el => el.toggleAttribute("active", true));
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

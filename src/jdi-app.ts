import {onAuthStateChanged, User} from "firebase/auth";
import {css, html, LitElement, nothing, render, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {map} from 'lit/directives/map.js';
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

type RenderFn = (params?: { [key: string]: string }) => TemplateResult;
type routeOptions = {
  inPlace?: boolean
}
type routeData = {
  pattern: string
  renderFn: RenderFn
  route: string
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
  `;

  private routes: routeData[] = [
    {pattern: "/reminders/:id/:action", route: "reminders", renderFn: this.renderReminders},
    {pattern: "/settings", route: "settings", renderFn: this.renderSettings},
    {pattern: "/devices", route: "devices", renderFn: this.renderDevices},
    {pattern: "/notifications/:id", route: "notifications", renderFn: this.renderNotifications},
    {pattern: "/login", route: "login", renderFn: this.renderLogin},
    {pattern: "/404", route: undefined, renderFn: this.render404},
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
      this.setCurrentRoute(this.defaultPath, {inPlace: true});
    }

    this.userId = localStorage["loggedInUserId"];
    this.pushNotificationsEnabled = localStorage["pushNotificationsEnabled"];
    this.loadPushNotificationsState();
  }

  renderDevices(): TemplateResult {
    return html`
      <jdi-devices .accountId="${this.userId}"></jdi-devices>
    `;
  }

  renderReminders() {
    // TODO: replace reminder-list with generic collection-list
    return html`
      <reminder-list .collection="notifications" .accountId="${this.userId}"
                     .selectedId="${this.currentRouteData?.id}" .action="${this.currentRouteData?.action}"
                     @NavigationEvent="${this.route}"></reminder-list>
    `;
  }

  renderSettings(): TemplateResult {
    return html`
      <settings-control></settings-control>
    `;
  }

  renderNotifications(): TemplateResult {
    return html`
      <notification-list .collection="notifications" .accountId="${this.userId}"
                         .selectedId="${this.currentRouteData?.id}"
                         @NavigationEvent="${this.route}"></notification-list>
    `;
  }

  renderLogin(): TemplateResult {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  render404(): TemplateResult {
    return html`
      <h1>Oops!</h1>
      <p>No idea how we ended up here, but I don't know what to show.</p>
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
        ${map(this.routes, (route: routeData) => html`
          ${when(route.route === this.currentRoute, () => html`${route.renderFn.call(this)}`)}
        `)}
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
          ${this.renderAppContent()}
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
        this.setCurrentRoute("/login");
      } else if (this.userId !== user.uid) {
        this.userId = user.uid;
        localStorage["loggedInUserId"] = user.uid;
        this.setCurrentRoute(this.defaultPath);
      }
    });
  }

  async firstUpdated() {
    this.setCurrentRoute(window.location.pathname);
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

  private setCurrentRoute(url: string, options?: routeOptions) {
    let activeRoute = this.routes.map((route) => {
        const patternRegex = (route.pattern ?? "").replaceAll(/\/:(\w+)/g, "(?:/(?<$1>\\w+))?");
        let matchResult = new RegExp(`^${patternRegex}$`).exec(url);
        return (matchResult !== null) ? {route: route.route, data: {...route.data, ...matchResult.groups}} : undefined;
      }
    ).find(result => result !== undefined);

    let stateFn = options?.inPlace ? history.replaceState : history.pushState;
    stateFn.call(history, activeRoute, "", url);

    this.currentRoute = activeRoute?.route;
    this.currentRouteData = activeRoute?.data;
  }

  private route(e: CustomEvent) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}

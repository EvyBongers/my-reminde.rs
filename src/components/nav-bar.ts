import {css, html, LitElement} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {map} from "lit/directives/map.js";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import {RouteEvent} from "../jdi-app";

export type NavItem = {
  icon: string
  uri: string
}

@customElement("nav-bar")
export class NavBar extends LitElement {

  @property()
  private navButtons: NavItem[];

  @property()
  private activeIndex: number;

  @state()
  private initialNavIndexSet: boolean = false;

  static override styles = css`
    :host {
      background-color: inherit;
    }
  `;

  override render() {
    return html`
      <mwc-tab-bar activeIndex="${this.activeIndex}" @MDCTabBar:activated="${this.navigate}">
        ${map(this.navButtons, (item: NavItem, _: number) => {
          return html`
            <mwc-tab icon="${item.icon}"></mwc-tab>`;
        })}
      </mwc-tab-bar>
    `;
  }

  private navigate(e: CustomEvent) {
    const uri = this.navButtons[e.detail.index].uri;
    if (window.location.pathname !== uri && !window.location.pathname.startsWith(`${uri}/`)) {
      let routeEvent = new RouteEvent("route", {detail: {url: uri}})
      window.dispatchEvent(routeEvent);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "nav-bar": NavBar;
  }
}

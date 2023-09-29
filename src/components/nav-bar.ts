import {css, html, LitElement} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {map} from "lit/directives/map.js";
import {MdTabs} from "@material/web/tabs/tabs";
import "@material/web/tabs/tabs";
import "@material/web/tabs/primary-tab";
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

  static override styles = css`
    :host {
      background-color: inherit;
    }
  `;

  override render() {
    return html`
      <md-tabs activeIndex="${this.activeIndex}" @change="${this.navigate}">
        ${map(this.navButtons, (item: NavItem, _: number) => {
          return html`
            <md-primary-tab icon-only><md-icon slot="icon">${item.icon}</md-icon></md-primary-tab>`;
        })}
      </md-tabs>
    `;
  }

  private navigate(ev: Event) {
    const uri = this.navButtons[(ev.target as MdTabs).activeTabIndex].uri;
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

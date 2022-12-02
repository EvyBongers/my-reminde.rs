import {css, html, LitElement} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {map} from "lit/directives/map.js";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";

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
    if (this.initialNavIndexSet === false) {
      this.initialNavIndexSet = true;
    } else {
      let navigationEvent = new CustomEvent("NavigationEvent", {
        detail: this.navButtons[e.detail.index].uri,
        bubbles: true,
        cancelable: false,
        composed: true
      })
      this.dispatchEvent(navigationEvent);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "nav-bar": NavBar;
  }
}

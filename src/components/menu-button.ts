import {css, html, LitElement} from "lit";
import {customElement, query} from "lit/decorators.js";
import {IconButton} from "@material/mwc-icon-button";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {Menu} from "@material/mwc-menu";

@customElement("menu-button")
export class MenuButton extends LitElement {
  @query("mwc-icon-button")
  private menuButton: IconButton;

  @query("mwc-menu")
  private menu: Menu;

  static override styles = css`
    :host {
      position: relative;
    }

    //mwc-icon {
    //  width: var(--mdc-icon-size, 24px);
    //  height: var(--mdc-icon-size, 24px);
    //  padding: calc((var(--mdc-icon-button-size, 48px) - var(--mdc-icon-size, 24px)) / 2);
    //}
  `;

  async firstUpdated() {
    await this.updateComplete;

    this.menu.anchor = this.menuButton;
    this.addEventListener("mousedown", e => e.stopPropagation());
    this.addEventListener("touchstart", e => e.stopPropagation());
    this.menuButton.addEventListener("click", e => this.showMenu(e));
  }

  override render() {
    return html`
      <mwc-icon-button raised icon="more_vert"></mwc-icon-button>
      <mwc-menu corner="TOP_RIGHT" menuCorner="START">
        <slot></slot>
      </mwc-menu>
    `;
  }

  showMenu(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()
    this.menu.show();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "menu-button": MenuButton;
  }
}

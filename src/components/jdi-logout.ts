import {html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import {logout} from "../auth";

@customElement("jdi-logout")
export class JDILogout extends LitElement {
  override render() {
    return html`
      <button @click=${logout} part="button">Logout</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-logout": JDILogout;
  }
}

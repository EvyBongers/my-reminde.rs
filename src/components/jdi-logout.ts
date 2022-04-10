import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { logout } from "../auth";
import '@material/mwc-button'

@customElement("jdi-logout")
export class JDILogout extends LitElement {
  override render() {
    return html`
      <mwc-button raised @click="${logout}">Logout</mwc-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-logout": JDILogout;
  }
}

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { logout } from "../auth";
import '@material/mwc-button'
import '@material/mwc-icon'

@customElement("jdi-logout")
export class JDILogout extends LitElement {
  override render() {
    return html`
      <mwc-button raised icon="logout" @click="${logout}">Logout</mwc-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-logout": JDILogout;
  }
}

import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {login} from "../auth";
import {toastWrapper} from "../helpers/Decorators";
import '@material/mwc-button';
import '@material/mwc-textfield';
import './jdi-form';
import '@material/mwc-icon'

@customElement("jdi-login")
export class JDILogin extends LitElement {
  @property()
  username: string = "";

  @property()
  password: string = "";

  static override styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
    mwc-textfield{
      margin-bottom: 15px;
      display: block;
    }
  `;

  override render() {
    return html`
      <jdi-form @submit="${this.login}">
        <h1>Login</h1>
        <mwc-textfield .value="${this.username}"
                       label="Username"
                       required
                       @input="${(_: Event) =>
                             this.username = (_.currentTarget as HTMLInputElement).value}"
                       type="text">
        </mwc-textfield>

        <mwc-textfield .value="${this.password}"
                       label="Password"
                       required
                       @input="${(_: Event) =>
                             this.password = (_.currentTarget as HTMLInputElement).value}"
                       type="password"></mwc-textfield>

        <mwc-button raised icon="login" @click="${this._login}">Login</mwc-button>
      </jdi-form>
    `;
  }

  private _login(e: Event) {
    e.preventDefault();
    this.login();
  }

  @toastWrapper({
    successMessage: "woo logged in",
    progressMessage: "logging in",
    failedMessage: "aaaa you suck",
  })
  private async login() {
    await login(this.username, this.password);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-login": JDILogin;
  }
}

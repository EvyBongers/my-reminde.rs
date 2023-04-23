import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {login} from "../auth";
import {routeTarget, toastWrapper} from "../helpers/Decorators";
import "@material/mwc-button";
import "@material/mwc-textfield";
import "@material/mwc-icon"
import "./jdi-form";

@customElement("jdi-login")
@routeTarget
export class JDILogin extends LitElement {
  @property()
  username: string = "";

  @property()
  password: string = "";

  static override styles = css`
    jdi-form {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }

    mwc-textfield {
      margin-bottom: 15px;
      display: block;
    }
  `;

  override render() {
    return html`
      <jdi-form @submit="${this._login}">
        <h1>Login</h1>
        <mwc-textfield type="email" name="username" label="Username" required
                       @input="${(_: Event) => this.username = (_.currentTarget as HTMLInputElement).value}"
                       .value="${this.username}">
        </mwc-textfield>

        <mwc-textfield type="password" name="password" label="Password" required
                       @input="${(_: Event) => this.password = (_.currentTarget as HTMLInputElement).value}"
                       .value="${this.password}"></mwc-textfield>

        <mwc-button raised icon="login" @click="${this._login}">Login</mwc-button>
      </jdi-form>
    `;
  }

  private _login(e: Event) {
    e.preventDefault();
    this.login();
  }

  @toastWrapper({
    progressMessage: "logging in",
    successMessage: "Logged in",
    failedMessage: "Login failed: {{e}}",
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

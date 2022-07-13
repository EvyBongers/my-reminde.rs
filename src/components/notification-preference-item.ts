import {css, html, LitElement} from "lit";
import {customElement, property, queryAll} from "lit/decorators.js";
import {IconButton} from "@material/mwc-icon-button";
import {IconButtonToggle} from "@material/mwc-icon-button-toggle";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {AccountScheduledNotificationDocument} from "../../firebase/functions/src/index"

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: Partial<AccountScheduledNotificationDocument> = {};

  @property({type: Boolean})
  protected collapsed: boolean = true;

  @queryAll("mwc-icon-button, mwc-icon-button-toggle")
  private editButtons!: NodeListOf<IconButton | IconButtonToggle>;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding: 0 16px;
      position: relative;
    }

    notification-preference-item-edit {
      position: absolute;
    }

    .buttons {
      margin: 12px 0 12px auto;
    }

    .notification {
      margin-top: 12px;
    }

    .notification h4 {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    .notification p {
      margin-block-start: 0.5em;
      margin-block-end: 0.5em;
    }

    .notification mwc-icon-button, .notification mwc-icon-button-toggle {
      --mdc-icon-button-size: 30px;
      --mdc-icon-size: 18px;
    }

    .notification footer {
      margin-bottom: 12px;
    }

    .notification aside {
      position: absolute;
      bottom: 0;
      right: 0;
      margin: 6px 12px;
    }

    .notification[collapsed] aside, .notification[collapsed] p {
      display: none;
    }

    .notification[collapsed] footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    #editing {
      --mdc-dialog-min-width: 300px;
    }

    #editing mwc-textfield, #editing mwc-select {
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', _ => {
      this.collapsed = !this.collapsed;
    });
  }

  private renderPreview() {
    return html`
      <h4 id="title">${this.item.title}</h4>
      <p id="body">${this.item.body}</p>
      <footer>
        Schedule: ${this.item.type === "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}
      </footer>
    `;
  }

  private renderButtons() {
    return html`
      <aside>
        <mwc-icon-button outlined icon="edit" @click="${this.edit}"></mwc-icon-button>
        <mwc-icon-button outlined icon="delete" @click="${this.delete}"></mwc-icon-button>
        <mwc-icon-button-toggle outlined onIcon="notifications_active" offIcon="notifications_off"
                                on></mwc-icon-button-toggle>
      </aside>
    `
  }

  override render() {
    return html`
      <div class="notification" ?collapsed="${this.collapsed}">
        ${this.renderPreview()}
        ${this.renderButtons()}
      </div>
      <div class="buttons">
        <mwc-icon>${this.collapsed ? "expand_more" : "expand_less"}</mwc-icon>
      </div>
    `
  }

  // TODO(ebongers): Implement option to mute/pause notifications

  delete(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()
    if (confirm("Delete this notification?")) {
      // TODO(ebongers): implement deleting notifications
      console.log("TODO(ebongers): implement deleting notifications")
    }
  }

  edit(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()
    let notification = document.createElement("notification-preference-item-edit");
    notification.item = structuredClone(this.item);
    notification.documentRef = this.item._ref;
    this.shadowRoot.append(notification);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

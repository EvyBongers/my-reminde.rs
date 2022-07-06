import {css, html, LitElement} from "lit";
import {customElement, property, queryAll, state} from "lit/decorators.js";
import '@material/mwc-icon';
import '@material/mwc-ripple';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import {IconButton} from "@material/mwc-icon-button";
import {IconButtonToggle} from "@material/mwc-icon-button-toggle";

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;

  @property({type: Boolean})
  protected collapsed: boolean = true;

  @state()
  protected editing: boolean = false;

  @queryAll('mwc-icon-button, mwc-icon-button-toggle')
  private editButtons: NodeListOf<IconButton | IconButtonToggle>;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding: 0 16px;
      position: relative;
    }

    :host > mwc-icon {
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

    [contenteditable='true'] {
      border-bottom: 1px solid black;
      cursor: text;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', _ => {
      if (!this.editing) this.collapsed = !this.collapsed;
    });
  }

  updated() {
    this.editButtons.forEach(btn=> {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        (e.target as HTMLElement).blur()
      })
    });
  }

  private renderEditing() {
    if (this.editing) {
      return html`<mwc-icon-button outlined icon="check_circle_outline" @click="${this.save}"></mwc-icon-button>`;
    } else {
      return html`<mwc-icon-button outlined icon="edit" @click="${this.edit}"></mwc-icon-button>`;
    }
  }

  override render() {
    return html`
      <mwc-ripple></mwc-ripple>
      <div class="notification" data-id="${this.item._ref.id}" ?collapsed="${this.collapsed}">
        <mwc-ripple></mwc-ripple>
        <h4 contenteditable="${this.editing}">${this.item.title}</h4>
        <p contenteditable="${this.editing}">${this.item.body}</p>
        <aside>
          ${this.renderEditing()}
          <mwc-icon-button outlined icon="delete" @click="${this.delete}"></mwc-icon-button>
          <mwc-icon-button-toggle outlined on onIcon="notifications_active" offIcon="notifications_off"></mwc-icon-button-toggle>
        </aside>
        <footer>
          Schedule: ${this.item.type == "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}
        </footer>
      </div>
      <mwc-icon>${this.collapsed ? "expand_more" : "expand_less"}</mwc-icon>
    `;
  }

  delete(e: Event) {
    if (confirm("Delete this notification?")) {
      console.log("TODO(ebongers): implement deleting notifications")
    }
  }

  edit(e: Event) {
    this.editing = true;
  }

  save(e: Event) {
    this.editing = false;
    console.log("TODO(ebongers): actually save changes to database");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}

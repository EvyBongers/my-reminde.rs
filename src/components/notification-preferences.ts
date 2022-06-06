import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {collection, onSnapshot, query, where, getDocs} from "firebase/firestore";
import {db} from "../db";
import {renderItems} from "../helpers/Rendering";
import './notification-preference-item'

type DataSupplier<T> = AsyncGenerator<T, void, any>;
type DataCollectionSupplier<T> = AsyncGenerator<T[], void, any>;

@customElement("notification-preferences")
export class NotificationPreferences extends LitElement {

  @property()
  scheduledNotifications: DataCollectionSupplier<{ test: number }>;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  override render() {
    return html`
      <div>
        ${renderItems(this.scheduledNotifications, item => html`
          <notification-preference-item .item="${item}"></notification-preference-item>
        `)}
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    this.scheduledNotifications = this.loadCollection<{ test: number }>('accounts/QILOd8sLS6Z1Vtr7xuTJCeo4Si19/scheduledNotifications');
  }

  async* loadCollection<T = any>(path: string): DataCollectionSupplier<T> {
    let lastCallback: (docs: any[]) => void;
    let nextItems = new Promise<T[]>((s) => {
      lastCallback = s;
    });

    onSnapshot(collection(db, path), (snapshot) => {
      lastCallback(snapshot.docs.map(_ => {
        let data = _.data();
        Object.defineProperty(data, '_ref', {value: _.ref});

        return data;
      }));

      nextItems = new Promise<T[]>((s) => {
        lastCallback = s;
      });
    });

    while (1) {
      let outputItems = await nextItems;
      yield outputItems;
    }
  }

  // async* loadDocument<T = any>(path: string): DataSupplier<T> {
  //   yield {test: 69} as any;
  //   await new Promise(_ => setTimeout(_, 1000))
  //   yield {test: 3} as any;
  //   await new Promise(_ => setTimeout(_, 1000))
  //   yield {test: 342} as any;
  //   await new Promise(_ => setTimeout(_, 1000))
  // }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preferences": NotificationPreferences;
  }
}

import {html, LitElement} from "lit";
import {RippleHandlers} from "@material/mwc-ripple/ripple-handlers";
import {Ripple} from "@material/mwc-ripple";
import {queryAsync} from "lit/decorators.js";

type Constructor<T> = new (...args: any[]) => T;

export const Rippling = <T extends Constructor<LitElement>>(superClass: T) => {
  class RippledElement extends superClass {
    @queryAsync("mwc-ripple")
    protected ripple!: Promise<Ripple | null>;

    protected shouldRipple: boolean;

    protected rippleHandlers = new RippleHandlers(() => {
      if (this.shouldRipple === false) {
        return new Promise<Ripple | null>(resolve => {
          resolve(null);
        })
      } else {
        return this.ripple;
      }
    });

    protected listeners: ({
      target: Element | Window;
      eventNames: string[];
      cb: EventListenerOrEventListenerObject;
    })[] =
      [
        {
          target: this,
          eventNames: ["mouseenter"],
          cb: this.rippleHandlers.startHover,
        },
        {
          target: this,
          eventNames: ["mouseleave"],
          cb: this.rippleHandlers.endHover,
        },
        {
          target: this,
          eventNames: ["focus"],
          cb: this.rippleHandlers.startFocus,
        },
        {
          target: this,
          eventNames: ["blur"],
          cb: this.rippleHandlers.endFocus,
        },
        {
          target: this,
          eventNames: ['mousedown', 'touchstart'],
          cb:
            (e: Event) => {
              const name = e.type;
              this.onDown(name === 'mousedown' ? 'mouseup' : 'touchend', e);
            },
        },
      ];

    protected onDown(upName: string, evt: Event) {
      const onUp = () => {
        window.removeEventListener(upName, onUp);
        this.rippleHandlers.endPress();
      };

      window.addEventListener(upName, onUp);
      this.rippleHandlers.startPress(evt);
    }

    override connectedCallback() {
      super.connectedCallback();

      for (const listener of this.listeners) {
        for (const eventName of listener.eventNames) {
          listener.target.addEventListener(
            eventName, listener.cb, {passive: true});
        }
      }
    }

    protected override async firstUpdated() {
      const rippleElement = this.ripple;

      if (!await rippleElement) {
        this.renderRoot.append(document.createElement("mwc-ripple"));
      }
    }

    override disconnectedCallback() {
      super.disconnectedCallback();

      for (const listener of this.listeners) {
        for (const eventName of listener.eventNames) {
          listener.target.removeEventListener(eventName, listener.cb);
        }
      }
    }
  }

  return RippledElement as Constructor<RippledElement> & T;
}


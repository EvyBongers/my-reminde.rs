import {LitElement, PropertyValues} from "lit";

type Observer = { callback: (...args: any[]) => any, properties: string[] };

export function observe(...keys: string[]): any {
  return (_proto: any, _propName: string, _descriptor: PropertyDescriptor) => {
    _proto.constructor.__observers.push({
      properties: keys,
      callback: _descriptor.value,
    });
  };
}

export class BunnyElement extends LitElement {
  static __observers: Observer[] = [];

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    let observers = ((this.constructor as any).__observers as Observer[]).filter(_ => _.properties.filter(_ => changedProperties.has(_)).length);
    for (let observer of observers) {
      let callbackArgs = observer.properties.map(_ => (this as any)[_]);
      observer.callback.apply(this, callbackArgs);
    }
  }

}

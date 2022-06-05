import {asyncReplace} from "lit/directives/async-replace.js";

export const renderItems = (items: AsyncGenerator<any[]>, render: (item: any) => any, loading?: any) => {
  if(!items) return loading;

  return asyncReplace((async function* () {
    for await(let subItems of items) {
      yield subItems.map(_ => render(_));
    }
  })());
};

export const renderItem = (items: AsyncGenerator<any>, render: (item: any) => any, loading?: any) => {
  if(!items) return loading;

  return asyncReplace((async function* () {
    for await(let item of items) {
      yield render(item);
    }
  })());
};

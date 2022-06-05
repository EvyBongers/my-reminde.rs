import {asyncReplace} from "lit/directives/async-replace.js";

export const renderItems = (items: AsyncGenerator<any[]>, render: (item: any) => any, loading?: any) => {
  return asyncReplace((async function* () {
    if (loading) yield loading;

    for await(let subItems of items) {
      yield subItems.map(_ => render(_));
    }
  })());
};

export const renderItem = (items: AsyncGenerator<any>, render: (item: any) => any, loading?: any) => {
  return asyncReplace((async function* () {
    if (loading) yield loading;

    for await(let item of items) {
      yield render(item);
    }
  })());
};

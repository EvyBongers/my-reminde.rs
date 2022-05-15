const LOCALSTORAGE_DEVICE_ID = '__deviceId';

export const getDeviceId = () => {
  localStorage[LOCALSTORAGE_DEVICE_ID]??= crypto.randomUUID().replace(/-/g, '_');
  // if (!localStorage[LOCALSTORAGE_DEVICE_ID]) {
  //   localStorage[LOCALSTORAGE_DEVICE_ID] = crypto.randomUUID();
  // }

  return localStorage[LOCALSTORAGE_DEVICE_ID];
}
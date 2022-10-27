const LOCALSTORAGE_DEVICE_ID = '__deviceId';
const LOCALSTORAGE_DEVICE_NAME = '__deviceName';

export const getDeviceId = () : string => {
  localStorage[LOCALSTORAGE_DEVICE_ID]??= crypto.randomUUID().replace(/-/g, '_');
  // if (!localStorage[LOCALSTORAGE_DEVICE_ID]) {
  //   localStorage[LOCALSTORAGE_DEVICE_ID] = crypto.randomUUID();
  // }

  return localStorage[LOCALSTORAGE_DEVICE_ID];
}

export const getDeviceName = () => {
  let proposedDeviceName = localStorage[LOCALSTORAGE_DEVICE_NAME] || navigator.userAgent;
  let deviceName = prompt('Device name?', proposedDeviceName);
  if(!deviceName) return null;

  localStorage[LOCALSTORAGE_DEVICE_NAME] = deviceName;
  return deviceName;
}

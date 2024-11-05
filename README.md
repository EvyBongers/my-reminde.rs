Reminders, but with flexibility

# ⚠️ This project has been abandoned ⚠️

Because this project lost traction and because I haven't used it in over a year, I'm sharing this code as-is to allow the community to pick up where I left off.

I have tried to make the instructions as complete as I can, but I never kept good notes on this and things may have changed, so YMMV.

# About

I had a need for reminders with a more fine-grained control, like getting reminders every so many hours between waking up and going to bed and none of the tools I tried seemed to offer that. Being a Linux user, I know of a tool that I would like to use, but that couldn't give me reminders on multiple devices with a single place to manage it. Thus this project was born.

My Reminde.rs is a tool that leverages web push and progressive web app technology to offer reminders with the flexibility of cron.

![reminders](https://github.com/EvyBongers/my-reminde.rs/blob/main/reminders.png?raw=true) ![reminder-edit](https://github.com/EvyBongers/my-reminde.rs/blob/main/reminder-edit.png?raw=true)

# Setup

1. Install `npm`, `pnpm` and `mkcert` using your prefered method
2. In the project directory, run `pnpm run setup`
3. Create a [Firebase](https://firebase.google.com/) project
4. Copy the firebase config into src/firebase.ts and src/serviceworker.js
5. Set up the emulators (auth, functions, firestore, hosting)

# Developing

In three separate terminals, run these commands:
* `pnpm run devserver` (access the app at https://localhost:8443/)
* `pnpm run emulator` (access the emulator ui at http://localhost:4000/)
* `pnpm run functions --watch`

# Deploying

Run `pnpm deploy`

# Known issues

* Material web components need to be replaced with up-to-date versions
* Hardcoded timezone/no timezone support
* No bulk actions for notification history
* Notification actions support is faulty
* No support for dark mode/device theme
* No account registration (this has to be done in firebase console)
* No support for SSO (login with google/apple/etc)
* The login form doesn't reset after login (read: if you log out right after logging in, your credentials in the form/browser cache)
* There may be a bug when first enabling notifications because of a missing 'devices' object in firestore

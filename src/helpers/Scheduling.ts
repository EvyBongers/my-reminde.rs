import {parseExpression} from "cron-parser-all";
import {ReminderDocument} from "../../firebase/functions/src";

export const calculateNextSend = (notification: ReminderDocument) => {
    if (notification === undefined) return

    switch (notification.type) {
        case "cron": {
            // TODO(ebongers): use preference in user profile
            let options = {tz: "Europe/Amsterdam"};
            let cron = parseExpression(notification.cronExpression as string, options);
            return cron.next().toDate();
        }
        default: {
            console.log(`Unknown notification type ${notification.type} on document ${notification.ref}`);
            return null;
        }
    }
};

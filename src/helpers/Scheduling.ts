import {parseExpression} from "cron-parser-all";

export const calculateNextSend = (notificationType: string, cronExpression?: string) => {
    switch (notificationType) {
        case "cron": {
            // TODO(ebongers): use preference in user profile
            let options = {tz: "Europe/Amsterdam"};
            let cron = parseExpression(cronExpression as string, options);
            return cron.next().toDate();
        }
        default: {
            return null;
        }
    }
};

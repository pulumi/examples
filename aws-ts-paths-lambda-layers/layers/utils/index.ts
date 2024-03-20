import * as dayjs from "dayjs";

export function sayHi(from: string) {
    return `Greetings from the utils layer and ${from}. Happy ${dayjs().format("dddd")}!`;
}

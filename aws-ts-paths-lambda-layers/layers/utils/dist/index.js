"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sayHi = void 0;
const dayjs = require("dayjs");
function sayHi(from) {
    return `Greetings from the utils layer and ${from}. Happy ${dayjs().format("dddd")}!`;
}
exports.sayHi = sayHi;
//# sourceMappingURL=index.js.map
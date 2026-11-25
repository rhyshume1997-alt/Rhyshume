#!/usr/bin/env node
// FEEL · spring.mjs: print a CSS linear() easing for a spring, and how long it needs.
//   node spring.mjs 0.4 0.2      → duration 0.4 s (how long it feels), bounce 0.2
import { springCss } from "../kit/web/js/spring.js";
const [d = "0.4", b = "0"] = process.argv.slice(2);
const { easing, ms } = springCss({ duration: +d, bounce: +b });
console.log(`transition-timing-function: ${easing};\ntransition-duration: ${ms}ms;`);

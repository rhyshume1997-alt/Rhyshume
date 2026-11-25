// Makes the line to put in OWNER_USERS. Run it on your own computer:  node scripts/hash-password.mjs michael
// It asks for the password on your screen. Nothing is sent anywhere. Never type a password into a chat.
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const name = (process.argv[2] || "").trim().toLowerCase();
if (!name || /[:;\s]/.test(name)) {
  console.error("Usage: node scripts/hash-password.mjs <name>   (letters only, no spaces, colons or semicolons)");
  process.exit(1);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => { if (s.includes("Password")) process.stdout.write(s); };
rl.question("Password for " + name + " (at least 12 characters): ", (pw) => {
  rl.close();
  console.log("");
  if (pw.length < 12) { console.error("Too short."); process.exit(1); }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, Buffer.from(salt, "hex"), 64).toString("hex");
  console.log("Add this to OWNER_USERS (separate people with ;):");
  console.log(`${name}:${salt}:${hash}`);
});

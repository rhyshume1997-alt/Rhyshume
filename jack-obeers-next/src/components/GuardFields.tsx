"use client";

import { useEffect, useState } from "react";

/**
 * The two hidden anti-spam fields every public form carries (see src/lib/antispam.ts).
 * A honeypot that real people never see, and the moment the form appeared, so the server can tell a form
 * typed by a person from one posted by a script. The server checks both with checkGuard().
 */
export function GuardFields() {
  const [t, setT] = useState("");
  useEffect(() => setT(String(Date.now())), []);
  return (
    <>
      <div className="vh" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="_t" value={t} />
    </>
  );
}

// <mascot-view> for TypeScript + React 19 (Next.js App Router included).
import "react";
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mascot-view": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string; state?: string; side?: "left" | "right"; poke?: "on" | "off"; shadow?: "on" | "off"; lazy?: boolean | ""; poses?: string;
      };
    }
  }
}

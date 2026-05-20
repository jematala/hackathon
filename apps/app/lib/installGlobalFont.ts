import { cloneElement, type ReactElement } from "react";
import { Platform, Text, TextInput } from "react-native";

const FONT_FAMILY = "Jersey10_400Regular";

type ForwardRefLike = {
  render?: (...args: unknown[]) => ReactElement;
};

function patchForwardRef(component: ForwardRefLike): void {
  const original = component.render;
  if (typeof original !== "function") return;
  component.render = function (...args: unknown[]) {
    const origin = original.apply(this, args);
    return cloneElement(origin as ReactElement<{ style?: unknown }>, {
      style: [
        (origin as ReactElement<{ style?: unknown }>).props.style,
        { fontFamily: FONT_FAMILY },
      ],
    });
  };
}

// On web, react-native-web doesn't always invoke Text.render the same way
// React Native does, so the forwardRef patch can miss elements. A global CSS
// rule guarantees every rendered node inherits Jersey 10 unless explicitly
// overridden by a more specific inline style.
function injectWebCss(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.querySelector("style[data-jersey10-global]")) return;
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-jersey10-global", "true");
  styleEl.textContent = `
    html, body, button, input, textarea, select, [class*="css-text"] {
      font-family: "${FONT_FAMILY}", monospace !important;
    }
  `;
  document.head.appendChild(styleEl);
}

// Idempotent — Fast Refresh re-runs this module; guard so we don't stack
// patches and create N levels of cloneElement wrapping.
type PatchFlag = { applied?: boolean };
const flag: PatchFlag = ((
  globalThis as unknown as { __jersey10Patched?: PatchFlag }
).__jersey10Patched ??= {});

if (!flag.applied) {
  patchForwardRef(Text as unknown as ForwardRefLike);
  patchForwardRef(TextInput as unknown as ForwardRefLike);
  injectWebCss();
  flag.applied = true;
}

export {};

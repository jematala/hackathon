import { Text, TextInput } from "react-native";

const FONT_FAMILY = "Jersey10_400Regular";

type ForwardRefLike = {
  render?: (...args: unknown[]) => unknown;
};

// react-native-web gives every <Text>/<TextInput> a base `font: 14px System`
// style, so any node without an explicit fontFamily renders in the OS font
// instead of Jersey 10. Inject our font as the *lowest-priority* entry of the
// style prop before the component compiles it: RN flattens style arrays
// last-wins, so anything that sets its own fontFamily — component styles, and
// crucially icon fonts (@expo/vector-icons) — still overrides it. Plain text
// falls back to Jersey. Works on web and native; icon-safe.
function patchForwardRef(component: ForwardRefLike): void {
  const original = component.render;
  if (typeof original !== "function") return;
  component.render = function (...args: unknown[]) {
    const props = args[0] as { style?: unknown } | undefined;
    args[0] = { ...props, style: [{ fontFamily: FONT_FAMILY }, props?.style] };
    return original.apply(this, args);
  };
}

// Idempotent — Fast Refresh re-runs this module; guard so we don't stack
// patches and prepend the font N times.
type PatchFlag = { applied?: boolean };
const flag: PatchFlag = ((
  globalThis as unknown as { __jersey10Patched?: PatchFlag }
).__jersey10Patched ??= {});

if (!flag.applied) {
  patchForwardRef(Text as unknown as ForwardRefLike);
  patchForwardRef(TextInput as unknown as ForwardRefLike);
  flag.applied = true;
}

export {};

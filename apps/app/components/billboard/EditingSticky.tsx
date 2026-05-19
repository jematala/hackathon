import { forwardRef, useImperativeHandle, useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { colors, paperForAuthor, pinForAuthor } from "@/lib/theme";

import { FlowerPin } from "./FlowerPin";

const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

export const STICKY_EDIT_SIZE = 132;
const PIN_SIZE = 20;
const PIN_OVERLAP = 7;
const STICKY_PADDING = 12;
const LINE_HEIGHT = 20;
const MAX_INPUT_HEIGHT = STICKY_EDIT_SIZE - STICKY_PADDING * 2;

export type EditingStickyHandle = {
  getState: () => { centerX: number; centerY: number; rotationDeg: number };
};

type EditingStickyProps = {
  authorId: string;
  body: string;
  onChangeBody: (next: string) => void;
  canvasWidth: number;
  canvasHeight: number;
  maxChars: number;
};

export const EditingSticky = forwardRef<EditingStickyHandle, EditingStickyProps>(
  function EditingSticky(
    { authorId, body, onChangeBody, canvasWidth, canvasHeight, maxChars },
    ref,
  ) {
    const paper = paperForAuthor(authorId);
    const pin = pinForAuthor(authorId);

    const [inputHeight, setInputHeight] = useState(LINE_HEIGHT);
    const onContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const next = e.nativeEvent.contentSize.height;
      if (Number.isFinite(next) && next > 0) {
        setInputHeight(Math.min(MAX_INPUT_HEIGHT, Math.max(LINE_HEIGHT, next)));
      }
    };

    const tx = useSharedValue(canvasWidth / 2 - STICKY_EDIT_SIZE / 2);
    const ty = useSharedValue(canvasHeight / 2 - STICKY_EDIT_SIZE / 2);
    const startTx = useSharedValue(0);
    const startTy = useSharedValue(0);

    useImperativeHandle(
      ref,
      () => ({
        getState: () => ({
          centerX: tx.value + STICKY_EDIT_SIZE / 2,
          centerY: ty.value + STICKY_EDIT_SIZE / 2,
          rotationDeg: 0,
        }),
      }),
      [tx, ty],
    );

    const pan = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .activeOffsetY([-4, 4])
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        "worklet";
        startTx.value = tx.value;
        startTy.value = ty.value;
      })
      .onUpdate((e) => {
        "worklet";
        tx.value = clampWorklet(startTx.value + e.translationX, 0, canvasWidth - STICKY_EDIT_SIZE);
        ty.value = clampWorklet(startTy.value + e.translationY, 0, canvasHeight - STICKY_EDIT_SIZE);
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: tx.value }, { translateY: ty.value }],
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.host,
            {
              width: STICKY_EDIT_SIZE,
              height: STICKY_EDIT_SIZE,
            },
            animatedStyle,
          ]}
        >
          <View style={[styles.sticky, { backgroundColor: paper.fill, borderColor: paper.edge }]}>
            <TextInput
              value={body}
              onChangeText={(t) => onChangeBody(t.slice(0, maxChars))}
              placeholder="Write something…"
              placeholderTextColor="rgba(62, 53, 40, 0.45)"
              multiline
              autoFocus
              underlineColorAndroid="transparent"
              selectionColor={colors.sageDark}
              onContentSizeChange={onContentSizeChange}
              style={[styles.input, { height: inputHeight }, WEB_NO_OUTLINE]}
            />
          </View>
          <View pointerEvents="none" style={styles.pin}>
            <FlowerPin fill={pin.fill} accent={pin.accent} size={PIN_SIZE} />
          </View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

function clampWorklet(value: number, min: number, max: number): number {
  "worklet";
  if (max <= min) return min;
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 9999,
  },
  sticky: {
    alignItems: "stretch",
    borderRadius: 2,
    flex: 1,
    justifyContent: "center",
    padding: STICKY_PADDING,
  },
  input: {
    color: colors.ink,
    fontFamily: "Jersey10_400Regular",
    fontSize: 18,
    lineHeight: LINE_HEIGHT,
    padding: 0,
    textAlign: "center",
    textAlignVertical: "center",
    width: "100%",
    borderWidth: 0,
  },
  pin: {
    left: "50%",
    marginLeft: -PIN_SIZE / 2,
    position: "absolute",
    top: -PIN_OVERLAP,
  },
});

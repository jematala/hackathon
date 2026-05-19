import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, pixelBorder, stickerPalette } from '@/app/theme';

type StickerPaletteProps = {
  selectedColor: string;
  onSelect: (color: string) => void;
};

export function StickerPalette({
  selectedColor,
  onSelect,
}: StickerPaletteProps) {
  return (
    <View style={styles.palette}>
      {stickerPalette.map((color) => (
        <View
          key={color}
          style={[
            styles.swatch,
            { backgroundColor: color },
            selectedColor === color && styles.selected,
          ]}
        >
          <Pressable onPress={() => onSelect(color)}>
            <View style={styles.hitArea}></View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  palette: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  swatch: {
    borderRadius: 0,
    height: 32,
    width: 32,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  selected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  hitArea: {
    height: '100%',
    width: '100%',
  },
});

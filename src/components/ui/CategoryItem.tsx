import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import type { MaterialCommunityIcons as IconType } from '@expo/vector-icons';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface CategoryItemData {
  id: string;
  name: string;
  icon: string;
  engelEligible?: boolean;
}

interface CategoryItemProps {
  item: CategoryItemData;
  selected?: boolean;
  onPress?: () => void;
  /** 显示摘要信息，如分类下的账单数量 */
  subtitle?: string;
  /** 显示右侧箭头 */
  showChevron?: boolean;
  /** 右侧额外信息 */
  trailing?: React.ReactNode;
}

/** 将常量 icon 名映射到 MaterialCommunityIcons */
function mapIcon(icon: string): IconName {
  const map: Record<string, string> = {
    'food': 'food',
    'car': 'car',
    'home': 'home',
    'shopping': 'shopping',
    'gamepad-variant': 'gamepad-variant',
    'hospital': 'hospital',
    'school': 'school',
    'account-group': 'account-group',
    'bank': 'bank',
    'dots-horizontal': 'dots-horizontal',
    'briefcase': 'briefcase',
    'chart-line': 'chart-line',
    'gift': 'gift',
    'help-circle': 'help-circle',
  };
  return (map[icon] ?? 'help-circle') as IconName;
}

/** 一级分类配色 */
function getCategoryColor(icon: string): string {
  const colorMap: Record<string, string> = {
    'food': '#FF6B6B',
    'car': '#74B9FF',
    'home': '#A29BFE',
    'shopping': '#FD79A8',
    'gamepad-variant': '#FDCB6E',
    'hospital': '#E17055',
    'school': '#00CEC9',
    'account-group': '#FF7675',
    'bank': '#636E72',
    'dots-horizontal': '#B2BEC3',
    'briefcase': '#00B894',
    'chart-line': '#6C5CE7',
    'gift': '#E056A0',
  };
  return colorMap[icon] ?? Colors.textMuted;
}

export default function CategoryItem({
  item,
  selected = false,
  onPress,
  subtitle,
  showChevron = false,
  trailing,
}: CategoryItemProps) {
  const iconName = mapIcon(item.icon);
  const iconColor = getCategoryColor(item.icon);

  const inner = (
    <View style={[styles.container, selected && styles.selected]}>
      {/* 图标 */}
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
      </View>

      {/* 文字 */}
      <View style={styles.textWrap}>
        <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
          {item.name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 右侧 */}
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : null}

      {showChevron ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
      ) : null}
    </View>
  );

  // 仅当有 onPress 时包裹 Pressable，否则用 View 避免吞掉父组件的手势事件
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          pressed && styles.pressed,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    minHeight: 48,
  },
  selected: {
    backgroundColor: Colors.primary + '12',
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  nameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  trailing: {
    marginLeft: Spacing.sm,
  },
});

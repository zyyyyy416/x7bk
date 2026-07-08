import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Portal, Modal, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import type { Book } from '@/types';

interface BookPickerProps {
  visible: boolean;
  books: Book[];
  activeBook: Book | null;
  showAllOption?: boolean;
  onSelect: (book: Book | null) => void;
  onClose: () => void;
}

export default function BookPicker({ visible, books, activeBook, showAllOption, onSelect, onClose }: BookPickerProps) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Surface style={styles.surface}>
          <Text style={styles.title}>选择账本</Text>
          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              showAllOption ? (
                <>
                  <Pressable
                    style={[styles.row, !activeBook && styles.rowActive]}
                    onPress={() => onSelect(null)}
                  >
                    <MaterialCommunityIcons name="chart-pie" size={22} color={!activeBook ? Colors.primary : Colors.textSecondary} />
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, !activeBook && styles.rowNameActive]}>全部账本</Text>
                      <Text style={styles.rowType}>汇总所有账本数据</Text>
                    </View>
                    {!activeBook && <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />}
                  </Pressable>
                  <Divider style={{ marginVertical: Spacing.xs }} />
                </>
              ) : null
            }
            renderItem={({ item }) => {
              const isActive = item.id === activeBook?.id;
              return (
                <Pressable
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => onSelect(item)}
                >
                  <MaterialCommunityIcons
                    name={item.type === 'personal' ? 'notebook' : 'account-group'}
                    size={22}
                    color={isActive ? Colors.primary : Colors.textSecondary}
                  />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, isActive && styles.rowNameActive]}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowType}>
                      {item.type === 'personal' ? '个人账本' : '共享账本'}
                    </Text>
                  </View>
                  {isActive && (
                    <MaterialCommunityIcons name="check" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  surface: { width: '100%', maxWidth: 360, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, padding: Spacing.lg },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  list: { maxHeight: 380 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, gap: Spacing.md },
  rowActive: { backgroundColor: Colors.primary + '12' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  rowNameActive: { color: Colors.primary, fontWeight: '700' },
  rowType: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});

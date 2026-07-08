import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, FAB, Dialog, Portal, TextInput, Button, Snackbar, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { useBooks, useCreateBook, useJoinBook } from '@/hooks/useBooks';
import type { BookType } from '@/types';

export default function BooksScreen() {
  const { data: books, isLoading } = useBooks();
  const createBook = useCreateBook();
  const joinBook = useJoinBook();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookType, setNewBookType] = useState<BookType>('shared');
  const [snackbar, setSnackbar] = useState('');
  const [joinVisible, setJoinVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = useCallback(async () => {
    const name = newBookName.trim();
    if (!name) {
      setSnackbar('请输入账本名称');
      return;
    }
    try {
      await createBook.mutateAsync({ name, type: newBookType });
      setNewBookName('');
      setNewBookType('shared');
      setDialogVisible(false);
      setSnackbar('账本创建成功');
    } catch (err: any) {
      setSnackbar(`创建失败: ${err?.message ?? '未知错误'}`);
    }
  }, [newBookName, newBookType, createBook]);

  const openDialog = useCallback(() => {
    setNewBookName('');
    setNewBookType('shared');
    setDialogVisible(true);
  }, []);

  const handleCreatePersonal = useCallback(async () => {
    try {
      await createBook.mutateAsync({ name: '日常账本', type: 'personal' });
      setDialogVisible(false);
      setSnackbar('日常账本已创建');
    } catch (err: any) {
      setSnackbar(`创建失败: ${err?.message ?? '未知错误'}`);
    }
  }, [createBook]);

  const bookList = books ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          我的账本
        </Text>
        <Button mode="outlined" icon="account-plus" onPress={() => { setInviteCode(''); setJoinVisible(true); }} compact>
          加入账本
        </Button>
      </View>

      <ScrollView style={styles.list}>
        {isLoading ? (
          <Text style={styles.loadingText}>加载中...</Text>
        ) : bookList.length > 0 ? (
          bookList.map((book: typeof bookList[0]) => (
            <Pressable
              key={book.id}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } } as any)}
            >
              <Card style={styles.card} mode="elevated">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <MaterialCommunityIcons
                      name={book.type === 'personal' ? 'notebook' : 'account-group'}
                      size={28}
                      color={Colors.primary}
                    />
                    <View style={styles.cardInfo}>
                      <Text variant="titleMedium" style={styles.bookName}>
                        {book.name}
                      </Text>
                      <Text style={styles.bookMeta}>
                        {book.type === 'personal' ? '个人账本' : '共享账本'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
                </Card.Content>
              </Card>
            </Pressable>
          ))
        ) : (
          // 无账本时显示引导
          <Card style={styles.emptyCard} mode="outlined">
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="notebook-plus-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>还没有账本</Text>
              <Text style={styles.emptyHint}>
                创建个人账本开始记账，或创建共享账本邀请亲友一起记账
              </Text>
              <View style={styles.emptyActions}>
                <Button
                  mode="contained"
                  onPress={handleCreatePersonal}
                  loading={createBook.isPending}
                  style={styles.createBtn}
                >
                  创建日常账本
                </Button>
                <Button
                  mode="outlined"
                  onPress={openDialog}
                  style={styles.createBtn}
                >
                  新建账本
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* 有账本时 FAB 新建 */}
      {bookList.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={openDialog}
          color="#FFFFFF"
        />
      )}

      {/* 创建账本弹窗 */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>新建账本</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={newBookType}
              onValueChange={(v) => setNewBookType(v as BookType)}
              buttons={[
                { value: 'personal', label: '个人', icon: 'notebook' },
                { value: 'shared', label: '共享', icon: 'account-group' },
              ]}
              style={styles.typeToggle}
            />
            {newBookType === 'shared' && (
              <Text style={styles.dialogHint}>
                共享账本可邀请家人、朋友共同记账，创建后您将作为管理员
              </Text>
            )}
            <TextInput
              label="账本名称"
              value={newBookName}
              onChangeText={setNewBookName}
              mode="outlined"
              placeholder={newBookType === 'shared' ? '如: 我们的家、旅行账本' : '如: 副业收支、投资理财'}
              style={styles.dialogInput}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>取消</Button>
            <Button onPress={handleCreate} loading={createBook.isPending}>
              创建
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* 加入账本弹窗 */}
        <Dialog visible={joinVisible} onDismiss={() => setJoinVisible(false)}>
          <Dialog.Title>加入账本</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>
              输入好友分享的邀请码，即可加入共享账本
            </Text>
            <TextInput
              label="邀请码"
              value={inviteCode}
              onChangeText={setInviteCode}
              mode="outlined"
              placeholder="粘贴邀请码"
              style={styles.dialogInput}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJoinVisible(false)}>取消</Button>
            <Button
              onPress={async () => {
                try {
                  await joinBook.mutateAsync(inviteCode.trim());
                  setInviteCode('');
                  setJoinVisible(false);
                  setSnackbar('已加入账本');
                } catch (err: any) {
                  setSnackbar(`加入失败: ${err?.message ?? '未知错误'}`);
                }
              }}
              loading={joinBook.isPending}
            >
              加入
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontWeight: '600',
    color: Colors.text,
  },
  list: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
  card: {
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardInfo: {
    gap: Spacing.xs,
  },
  bookName: {
    fontWeight: '600',
  },
  bookMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // 空状态
  emptyCard: {
    marginTop: Spacing.xl,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyHint: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  emptyActions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    width: '100%',
  },
  createBtn: {
    borderRadius: BorderRadius.md,
  },
  typeToggle: {
    marginBottom: Spacing.sm,
  },
  dialogHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  dialogInput: {
    backgroundColor: Colors.surface,
  },
  fab: {
    position: 'absolute',
    margin: Spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 16,
  },
  snackbar: {
    marginBottom: 60,
  },
});

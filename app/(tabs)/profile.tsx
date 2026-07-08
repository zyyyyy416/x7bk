import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, List, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from '@/services/auth.service';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await signOut();
    logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* 用户信息 */}
      <View style={styles.header}>
        <Avatar.Text
          size={64}
          label={user?.nickname?.charAt(0) ?? 'U'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.nickname}>
          {user?.nickname ?? '未登录'}
        </Text>
        <Text style={styles.phone}>
          {user?.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''}
        </Text>
      </View>

      {/* 设置列表 */}
      <Card style={styles.section} mode="elevated">
        <Card.Content style={styles.sectionContent}>
          <List.Item
            title="分类管理"
            description="自定义支出/收入分类"
            left={(props) => <List.Icon {...props} icon="shape" color={Colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/category-manage' as any)}
          />
          <List.Item
            title="预算设置"
            description="设置月度预算和预警（即将上线）"
            left={(props) => <List.Icon {...props} icon="target" color={Colors.warning} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card.Content>
      </Card>

      <Card style={styles.section} mode="elevated">
        <Card.Content style={styles.sectionContent}>
          <List.Item
            title="数据导出"
            description="导出为 CSV / Excel（即将上线）"
            left={(props) => <List.Icon {...props} icon="export" color={Colors.info} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <List.Item
            title="外观设置"
            description="深色模式 / 字体大小（即将上线）"
            left={(props) => <List.Icon {...props} icon="palette" color="#6C5CE7" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card.Content>
      </Card>

      <Card style={styles.section} mode="elevated">
        <Card.Content style={styles.sectionContent}>
          <List.Item
            title="关于小7记账"
            description="v1.0.0"
            left={(props) => <List.Icon {...props} icon="information" color={Colors.textMuted} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <List.Item
            title="退出登录"
            left={(props) => <List.Icon {...props} icon="logout" color={Colors.expense} />}
            onPress={handleLogout}
          />
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  avatar: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  nickname: {
    fontWeight: '600',
    color: Colors.text,
  },
  phone: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  sectionContent: {
    paddingVertical: 0,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

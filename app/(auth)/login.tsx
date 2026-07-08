import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Banner } from 'react-native-paper';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { signInWithEmail, signUpWithEmail } from '@/services/auth.service';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const doAuth = async (mode: 'signin' | 'signup') => {
    setError('');
    const e = email.trim();
    if (!e || !password) { setError('请输入邮箱和密码'); return; }
    if (mode === 'signup') {
      if (password !== confirmPwd) { setError('两次密码不一致'); return; }
      if (!nickname.trim()) { setError('请输入昵称'); return; }
      if (nickname.trim().length < 2) { setError('昵称至少2个字符'); return; }
    }
    if (password.length < 6) { setError('密码至少6位'); return; }

    setBusy(true);
    const r = mode === 'signup'
      ? await signUpWithEmail(e, password, nickname.trim())
      : await signInWithEmail(e, password);
    setBusy(false);

    if (r.success) {
      setUser(r.user);
      router.replace('/(tabs)');
    } else {
      setError(r.error);
    }
  };

  const handleQuickStart = async () => {
    setError('');
    setBusy(true);
    const r = await signInWithEmail('dev@x7bk.com', 'x7bk123456');
    setBusy(false);
    if (r.success) {
      setUser(r.user);
      router.replace('/(tabs)');
    } else {
      setError(`快速体验失败: ${r.error}`);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>小7记账</Text>
          <Text style={styles.subtitle}>极简记账，看清生活</Text>
        </View>

        {error ? (
          <Banner visible actions={[{ label: '关闭', onPress: () => setError('') }]} style={styles.errBanner}>
            <Text style={styles.errText}>{error}</Text>
          </Banner>
        ) : null}

        <View style={styles.form}>
          <TextInput label="邮箱" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" mode="outlined" style={styles.inp} left={<TextInput.Icon icon="email" />} disabled={busy} />
          <TextInput label="密码" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.inp} left={<TextInput.Icon icon="lock" />} disabled={busy} />
          {isRegister && <TextInput label="确认密码" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry mode="outlined" style={styles.inp} left={<TextInput.Icon icon="lock-check" />} disabled={busy} />}
          {isRegister && (
            <View style={styles.nickRow}>
              <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                <Text style={styles.avatarText}>
                  {nickname.trim() ? nickname.trim()[0] : '?'}
                </Text>
              </View>
              <TextInput
                label="昵称"
                value={nickname}
                onChangeText={(t) => setNickname(t.slice(0, 12))}
                mode="outlined"
                style={styles.nickInput}
                left={<TextInput.Icon icon="account" />}
                placeholder="给自己取个名字（2-12字）"
                disabled={busy}
                maxLength={12}
              />
            </View>
          )}

          <Button mode="contained" onPress={() => doAuth(isRegister ? 'signup' : 'signin')} loading={busy} style={styles.btn} contentStyle={styles.btnC}>
            {isRegister ? '注册' : '登录'}
          </Button>
          <Button mode="text" onPress={() => { setIsRegister(!isRegister); setError(''); }} textColor={Colors.textMuted} disabled={busy}>
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Button>

          <View style={styles.divRow}><View style={styles.divL} /><Text style={styles.divT}>或</Text><View style={styles.divL} /></View>

          <Button mode="outlined" onPress={handleQuickStart} loading={busy} style={styles.qbtn} textColor={Colors.primary}>
            快速体验
          </Button>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>🔧 首次部署指南</Text>
            <Text style={styles.helpText}>
              1. SQL Editor 执行 001_schema.sql{'\n'}
              2. Auth → Settings → 关闭 email confirmations{'\n'}
              3. Auth → Users → Add User 创建体验账号{'\n'}
              {'    '}Email: dev@x7bk.com / 密码: x7bk123456{'\n'}
              4. 如遇 401：重启 App 或重新登录
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  appName: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: Spacing.xs },
  form: { gap: Spacing.md },
  inp: { backgroundColor: Colors.surface },
  nickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: '700', color: '#FFFFFF' },
  nickInput: { flex: 1, backgroundColor: Colors.surface },
  btn: { borderRadius: BorderRadius.lg, marginTop: Spacing.sm },
  btnC: { height: 48 },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  divL: { flex: 1, height: 1, backgroundColor: Colors.border },
  divT: { fontSize: FontSize.sm, color: Colors.textMuted },
  qbtn: { borderRadius: BorderRadius.lg, borderColor: Colors.primary },
  errBanner: { backgroundColor: '#FFF3F3' },
  errText: { fontSize: FontSize.sm, color: Colors.expense, lineHeight: 20 },
  helpBox: { marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.md },
  helpTitle: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm },
  helpText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});

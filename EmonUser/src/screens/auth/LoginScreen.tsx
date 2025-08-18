import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { loginManager } from './managers/LoginManager';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    const error = loginManager.validate({ email, password });
    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setLoading(true);
    try {
      await loginManager.signIn(email.trim(), password);
      // Navigation will be handled by the auth state listener
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const error = loginManager.validateEmail(email);
    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert(
      'Reset Password',
      'A password reset link will be sent to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await loginManager.resetPassword(email);
              Alert.alert('Success', 'Password reset email sent!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const colorScheme = useColorScheme?.() as 'light' | 'dark' | null;
  const logoSource = (() => {
    try {
      if (colorScheme === 'dark') {
        // If you add a dark-specific logo, uncomment below and provide the asset
        // return require('../../assets/logo-dark.png');
        return require('../../assets/logo-wobg.png');
      }
      // If you add a light-specific logo, uncomment below and provide the asset
      // return require('../../assets/logo-light.png');
      return require('../../assets/logo-wobg.png');
    } catch {
      return require('../../assets/logo-wobg.png');
    }
  })();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={["#5B934E", "#1F6F43"]} style={styles.gradient}>
        <SafeAreaView>
        <View style={styles.headerSticky}>
          <View style={styles.headerBrand}>
            <View style={styles.logoCircle}>
              <Image
                source={logoSource}
                style={styles.logoImage}
                accessibilityLabel="EMON Logo"
                resizeMode="contain"
              />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.appName} accessibilityRole="header">EMON</Text>
              <Text style={styles.headerSubtitle}>Your Energy Monitoring Companion</Text>
            </View>
          </View>
        </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Track your energy consumption now!</Text>
            </View>
            <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => { if (isFormValid) handleLogin(); }}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={styles.toggleButton}
                onPress={() => setShowPassword((s) => !s)}
              >
                <Text style={styles.toggleButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              (loading || !isFormValid) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !isFormValid}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={[styles.loginButtonText, { marginLeft: 10 }]}>Signing in…</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerSticky: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerBrand: {
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    marginTop: 30,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logoImage: {
    marginTop: 5,
    width: 85,
    height: 85,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CBD5E1',
    marginVertical: 12,
    alignSelf: 'stretch',
    opacity: 1,
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  // Removed old greetingTitle in favor of professional header
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '600',
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 80,
  },
  toggleButton: {
    position: 'absolute',
    right: 8,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
  },
  toggleButtonText: {
    color: '#166534',
    fontWeight: '700',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#5B934E',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#5B934E',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#5B934E',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default LoginScreen;

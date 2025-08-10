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
} from 'react-native';
import { signUpManager } from './managers/SignUpManager';
import TimezonePicker from './components/TimezonePicker';

interface SignUpScreenProps {
  navigation: any;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredTimezone, setPreferredTimezone] = useState<string>(signUpManager.getDefaultTimezone());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    const error = signUpManager.validate({
      displayName,
      email,
      password,
      preferredTimezone,
    });
    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setLoading(true);
    try {
      await signUpManager.signUp({ displayName, email, password, preferredTimezone });
      Alert.alert('Success', 'Account created successfully! You can now log in.', [
        {
          text: 'OK',
        },
      ]);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Derived password helpers (non-blocking UI)
  const strength = signUpManager.assessPasswordStrength(password);
  const passwordGuidelines = signUpManager.getPasswordGuidelines();
  const strengthColors = ['#9CA3AF', '#DC2626', '#F59E0B', '#10B981', '#059669'];
  const currentStrengthColor = strengthColors[strength.score];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join EMON Energy Monitoring</Text>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            <TimezonePicker value={preferredTimezone} onChange={setPreferredTimezone} />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailRef}
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
                  onSubmitEditing={handleSignUp}
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

            {/* Password helper and strength indicator */}
            <View style={styles.passwordHelperSection}>
              <Text style={styles.passwordHelpText}>{passwordGuidelines}</Text>
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: i < strength.score ? currentStrengthColor : '#E5E7EB' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: currentStrengthColor }]}>{strength.label}</Text>
              </View>
            </View>

          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={[styles.signupButtonText, { marginLeft: 10 }]}>Creating account…</Text>
            </View>
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  body: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    marginHorizontal: 0,
    marginBottom: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
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
  passwordHelperSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  passwordHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  strengthSegment: {
    height: 6,
    flex: 1,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#5B934E',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  signupButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#5B934E',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUpScreen;

import React, { useRef, useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { signUpManager } from './managers/SignUpManager';
import TimezonePicker from './components/TimezonePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { height: screenHeight } = Dimensions.get('window');
const formMaxHeight = Math.min(screenHeight * 0.55, 480);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSticky: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 12,
  },
  logo: {
    width: 120,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
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
    width: '100%',
    alignSelf: 'stretch',
  },
  formScroll: {
    maxHeight: formMaxHeight,
  },
  formContent: {
    paddingBottom: 8,
  },
  
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 12,
    alignSelf: 'stretch',
    opacity: 1,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#F3F4F6',
    marginBottom: 6,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'transparent',
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
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    marginBottom: 16,
  },
  signupButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  agreementsSection: {
    marginTop: 12,
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
  },
  checkboxText: {
    color: '#374151',
    fontSize: 14,
  },
  linkText: {
    color: '#5B934E',
    fontSize: 14,
    fontWeight: '700',
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
    color: '#F3F4F6',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginLink: {
    color: '#FFFF0F',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

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
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Sync acceptance flags when returning from legal screens
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        try {
          const [p, t] = await Promise.all([
            AsyncStorage.getItem('accepted_privacy'),
            AsyncStorage.getItem('accepted_terms'),
          ]);
          if (!mounted) return;
          setAcceptPrivacy(p === 'true');
          setAcceptTerms(t === 'true');
        } catch {
          // ignore
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleSignUp = async () => {
    // Gate by acceptance checkboxes
    if (!acceptPrivacy || !acceptTerms) {
      Alert.alert('Required', 'Please accept the Privacy Policy and Terms of Service to continue.');
      return;
    }
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

  // Form completeness gating
  const allFilled = Boolean(displayName && email && password && preferredTimezone);
  const canCreate = allFilled && acceptPrivacy && acceptTerms && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={["#5B934E", "#1F6F43"]} style={styles.gradient}>
        <View style={styles.body}>
          <View style={styles.headerSticky}>
            <Text style={styles.greetingTitle} accessibilityRole="header">Create your account</Text>
            <Text style={styles.greetingSubtitle}>Sign up to track your energy consumption</Text>
            <View style={styles.separator} />
          </View>
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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

              {/* Agreements */}
              <View style={styles.agreementsSection}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcceptPrivacy((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxBox, acceptPrivacy && styles.checkboxBoxChecked]}
                  >
                    {acceptPrivacy && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxText}>I have read and accept the </Text>
                  <TouchableOpacity
                    onPress={() => {
                      try { navigation.navigate('PrivacyPolicy'); } catch (e) { Alert.alert('Info', 'Privacy Policy screen unavailable.'); }
                    }}
                  >
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcceptTerms((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxBox, acceptTerms && styles.checkboxBoxChecked]}
                  >
                    {acceptTerms && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxText}>I agree to the </Text>
                  <TouchableOpacity
                    onPress={() => {
                      try { navigation.navigate('TermsOfService'); } catch (e) { Alert.alert('Info', 'Terms of Service screen unavailable.'); }
                    }}
                  >
                    <Text style={styles.linkText}>Terms of Service</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
        {/* Sticky footer with CTA and login prompt */}
        <LinearGradient colors={["#5B934E", "#1F6F43"]} style={styles.footer}>
          <TouchableOpacity
            style={[styles.signupButton, (!canCreate) && styles.signupButtonDisabled]}
            onPress={handleSignUp}
            disabled={!canCreate}
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
            <TouchableOpacity onPress={() => {
              try {
                // Ensure we go to the Login screen explicitly instead of back to legal screens
                navigation.replace('Login');
              } catch {
                try { navigation.navigate('Login'); } catch {}
              }
            }}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </LinearGradient>
  </KeyboardAvoidingView>
);

};
export default SignUpScreen;

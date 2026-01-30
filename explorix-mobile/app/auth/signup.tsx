import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.post("/auth/register", {
        email,
        password,
        name: name || null,
        country_code: countryCode || null,
      });

      const token = res.data.access_token;
      await login(token);

      router.replace("/feed");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>
            Create your Explorix account
          </Text>

          <TextInput
            placeholder="Name (optional)"
            placeholderTextColor="#9E9E9E"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            style={styles.input}
          />

          <TextInput
            placeholder="Email"
            placeholderTextColor="#9E9E9E"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#9E9E9E"
            value={password}
            onChangeText={setPassword}
            autoCorrect={false}
            autoComplete="password"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            placeholder="Country code (optional)"
            placeholderTextColor="#9E9E9E"
            value={countryCode}
            onChangeText={setCountryCode}
            autoCapitalize="characters"
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.link}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 28,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111",
    marginBottom: 14,
    textAlignVertical: "center",
  },
  button: {
    height: 50,
    backgroundColor: "#1E88E5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "red",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  linkText: {
    marginTop: 18,
    fontSize: 14,
    textAlign: "center",
    color: "#555",
  },
  link: {
    color: "#1E88E5",
    fontWeight: "600",
  },
});

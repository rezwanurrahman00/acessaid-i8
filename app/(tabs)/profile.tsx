import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { speakIfEnabled } from "@/services/ttsService"; // 🗣 connect talking system

export default function ProfileTab() {
  const { user, signOut, updateUser } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedAge, setEditedAge] = useState(user?.age || "");
  const [editedHeight, setEditedHeight] = useState(user?.height || "");
  const [editedWeight, setEditedWeight] = useState(user?.weight || "");
  const [editedBloodGroup, setEditedBloodGroup] = useState(user?.bloodGroup || "");
  const [editedFoodAllergy, setEditedFoodAllergy] = useState(user?.foodAllergy || "");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // 🗣 Speak once when the profile loads
  useEffect(() => {
    speakIfEnabled("Profile loaded. You can edit or view your personal information.");
  }, []);

  const handleEditProfile = () => {
    setIsEditing(true);
    speakIfEnabled("Editing mode enabled");
    setEditedName(user?.name || "");
    setEditedAge(user?.age || "");
    setEditedHeight(user?.height || "");
    setEditedWeight(user?.weight || "");
    setEditedBloodGroup(user?.bloodGroup || "");
    setEditedFoodAllergy(user?.foodAllergy || "");
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      speakIfEnabled("Error, name cannot be empty");
      return;
    }

    try {
      await updateUser({
        name: editedName.trim(),
        age: editedAge.trim(),
        height: editedHeight.trim(),
        weight: editedWeight.trim(),
        bloodGroup: editedBloodGroup.trim(),
        foodAllergy: editedFoodAllergy.trim(),
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
      speakIfEnabled("Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
      speakIfEnabled("Failed to update profile");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    speakIfEnabled("Edit cancelled");
    setEditedName(user?.name || "");
    setEditedAge(user?.age || "");
    setEditedHeight(user?.height || "");
    setEditedWeight(user?.weight || "");
    setEditedBloodGroup(user?.bloodGroup || "");
    setEditedFoodAllergy(user?.foodAllergy || "");
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Permission to access photos is required!");
        speakIfEnabled("Permission required to access photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await updateUser({ profilePicture: result.assets[0].uri });
        Alert.alert("Success", "Profile picture updated!");
        speakIfEnabled("Profile picture updated");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile picture");
      speakIfEnabled("Failed to update profile picture");
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel", onPress: () => speakIfEnabled("Sign out cancelled") },
        {
          text: "Yes, Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              speakIfEnabled("Signed out successfully");
              router.replace("/auth");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out");
              speakIfEnabled("Failed to sign out");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!user) {
    speakIfEnabled("No user data found");
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>No user data found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedView style={[styles.header, { backgroundColor: colors.tint }]}>
          <ThemedText style={[styles.title, { color: "#FFFFFF" }]}>Profile</ThemedText>
          <ThemedText style={[styles.subtitle, { color: "#E8F4FD" }]}>
            Manage your personal information
          </ThemedText>
        </ThemedView>

        {/* Profile Picture */}
        <ThemedView style={styles.profileSection}>
          <TouchableOpacity
            onPress={handleImagePicker}
            style={styles.imageContainer}
            accessibilityLabel="Edit profile picture"
          >
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: colors.tint }]}>
                <Text style={styles.placeholderText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.editIcon, { backgroundColor: colors.tint }]}>
              <Text style={styles.editIconText}>📷</Text>
            </View>
          </TouchableOpacity>
        </ThemedView>

        {/* Info Section */}
        <ThemedView style={[styles.infoSection, { backgroundColor: colors.background }]}>
          {[
            ["Name", editedName, setEditedName, "Enter your name", user.name],
            ["Email", user.email],
            ["Age", editedAge, setEditedAge, "Enter your age", user.age],
            ["Height", editedHeight, setEditedHeight, "e.g., 173cm", user.height],
            ["Weight", editedWeight, setEditedWeight, "e.g., 70kg", user.weight],
            ["Blood Group", editedBloodGroup, setEditedBloodGroup, "e.g., O+", user.bloodGroup],
            ["Food Allergies", editedFoodAllergy, setEditedFoodAllergy, "e.g., peanuts", user.foodAllergy],
          ].map(([label, value, setValue, placeholder, displayValue], i) => (
            <View key={i} style={styles.infoItem}>
              <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
              {label !== "Email" && isEditing && setValue ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.icon,
                      color: colors.text,
                    },
                  ]}
                  value={String(value)}
                  onChangeText={(text) => setValue(text)}
                  placeholder={placeholder || ""}
                  onFocus={() => speakIfEnabled(`${label} field active`)}
                />
              ) : (
                <ThemedText style={[styles.value, { color: colors.text }]}>
                  {displayValue || "Not provided"}
                </ThemedText>
              )}
            </View>
          ))}
        </ThemedView>

        {/* Buttons */}
        <ThemedView style={[styles.buttonSection, { backgroundColor: colors.background }]}>
          {isEditing ? (
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.icon }]}
                onPress={handleCancelEdit}
              >
                <ThemedText style={[styles.buttonText, { color: colors.text }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveProfile}
              >
                <ThemedText style={styles.buttonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton, { backgroundColor: colors.tint }]}
              onPress={handleEditProfile}
            >
              <ThemedText style={styles.buttonText}>Edit Profile</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.signOutButton, { borderColor: colors.icon }]}
            onPress={handleSignOut}
          >
            <ThemedText style={[styles.buttonText, { color: colors.text }]}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  subtitle: { marginBottom: 5, textAlign: "center" },
  profileSection: { alignItems: "center", marginBottom: 32 },
  imageContainer: { position: "relative" },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 48, fontWeight: "bold", color: "white" },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  editIconText: { fontSize: 16 },
  infoSection: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  value: { fontSize: 16, paddingVertical: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonSection: { gap: 16 },
  editButtons: { flexDirection: "row", gap: 12 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  cancelButton: { borderWidth: 1 },
  signOutButton: { borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "white" },
  errorText: { textAlign: "center", fontSize: 16, marginTop: 50 },
});

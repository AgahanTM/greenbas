import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../services/supabase';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  app_mode: string | null;
  updated_at: string | null;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile>({
    id: '',
    username: null,
    full_name: null,
    avatar_url: null,
    app_mode: null,
    updated_at: null,
  });
  const [newPassword, setNewPassword] = useState('');
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('No user found');

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, app_mode, updated_at')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setEditedProfile(data);
      } catch (error: any) {
        console.error('Error fetching profile:', error.message);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsChangingPassword(false);
      setNewPassword('');
      Alert.alert('Success', 'Password updated successfully! Please log in again.');
      await handleLogout();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Need help? Contact us at agahanyazmyradov.vercel.app');
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editedProfile.username,
          full_name: editedProfile.full_name,
          avatar_url: editedProfile.avatar_url,
          app_mode: editedProfile.app_mode,
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .select();

      if (error) throw error;
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted) {
      const result = await ImagePicker.launchCameraAsync();
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditedProfile({ ...editedProfile, avatar_url: result.assets[0].uri });
      }
    } else {
      Alert.alert('Permission', 'Camera permission is required!');
    }
    setIsAvatarModalVisible(false);
  };

  const openImageLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted) {
      const result = await ImagePicker.launchImageLibraryAsync();
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditedProfile({ ...editedProfile, avatar_url: result.assets[0].uri });
      }
    } else {
      Alert.alert('Permission', 'Photo library permission is required!');
    }
    setIsAvatarModalVisible(false);
  };

  const setAvatarFromUrl = (url: string) => {
    setEditedProfile({ ...editedProfile, avatar_url: url });
    setIsAvatarModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {!isEditing ? (
          <View style={styles.profileCard}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
              style={styles.profileImage}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.cameraIcon} onPress={openCamera}>
              <Text style={styles.cameraText}>📷</Text>
            </TouchableOpacity>
            <Text style={styles.profileTitle}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.profileSubtitle}>@{profile?.username || 'No username'}</Text>
            <Text style={styles.profileDetail}>App Mode: {profile?.app_mode || 'Default'}</Text>
            <Text style={styles.profileDetail}>Updated: {profile?.updated_at || 'N/A'}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsChangingPassword(true)}>
                <Text style={styles.buttonText}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleSupport}>
                <Text style={styles.buttonText}>Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.editCard}>
            <TouchableOpacity style={styles.backButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.full_name || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
              placeholder="Full Name"
            />
            <TextInput
              style={styles.input}
              value={editedProfile.username || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, username: text })}
              placeholder="Username"
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => setIsAvatarModalVisible(true)}
            >
              <Text style={styles.inputText}>
                {editedProfile.avatar_url ? 'Change Avatar' : 'Add Avatar'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={editedProfile.app_mode || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, app_mode: text })}
              placeholder="App Mode"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Saving...' : 'SAVE'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Şifre Değiştirme Modal'ı */}
        <Modal
          visible={isChangingPassword}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsChangingPassword(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password"
                secureTextEntry={true}
                autoCapitalize="none"
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Change'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsChangingPassword(false);
                    setNewPassword('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Avatar Seçimi Modal'ı */}
        <Modal
          visible={isAvatarModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAvatarModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Avatar Source</Text>
              <TouchableOpacity style={styles.optionButton} onPress={openCamera}>
                <Text style={styles.buttonText}>Take Photo with Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionButton} onPress={openImageLibrary}>
                <Text style={styles.buttonText}>Choose from Files</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Enter URL"
                onChangeText={setAvatarFromUrl}
                onSubmitEditing={() => setIsAvatarModalVisible(false)}
              />
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsAvatarModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputText: {
    color: '#4B5563',
    textAlign: 'center',
    paddingVertical: 10,
  },
  optionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    marginBottom: 10,
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#EF4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    color: '#FFF',
    fontSize: 16,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
  },
  profileSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 15,
  },
  profileDetail: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    marginBottom: 10,
    alignItems: 'center',
  },
  editCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  backText: {
    fontSize: 24,
    color: '#1E293B',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 9999,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    marginTop: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 9999,
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
});
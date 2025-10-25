import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

// Renk kodları tanımlanıyor
const COLORS = {
  BACKGROUND: '#F7FCF8',
  CARD: '#FFFFFF',
  TEXT: '#0F1724',
  ACCENT: '#FFB84D',
};

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

  const [userId, setUserId] = useState<string | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        // Oturum açmış kullanıcıyı al
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('No user logged in');
        setUserId(user.id);

        // Kullanıcının profil bilgilerini çek
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsChangingPassword(false);
      setNewPassword('');
      Alert.alert('Success', 'Password updated successfully! Please log in again.');
      // Şifre değişiminden sonra kullanıcıyı çıkış yapmaya zorla (güvenlik için)
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

  const uploadAvatar = async (uri: string) => {
    if (!userId) return null;
    try {
      // Dosya adını ve yolunu oluştur
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}_avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Resmi blob olarak oku
      const response = await fetch(uri);
      const blob = await response.blob();

      // Supabase Storage'a yükle
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true });

      if (error) throw error;

      // Halka açık URL'i al
      const { data: publicURL } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicURL.publicUrl;
    } catch (error: any) {
      console.error('Avatar upload error:', error.message);
      Alert.alert('Error', 'Failed to upload avatar');
      return null;
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      let avatar_url = editedProfile.avatar_url;

      // Eğer avatar URL'si yerel bir dosya ise, Supabase Storage'a yükle
      if (avatar_url && avatar_url.startsWith('file://')) {
        const uploadedUrl = await uploadAvatar(avatar_url);
        if (uploadedUrl) avatar_url = uploadedUrl;
      }

      // Profili güncelle
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editedProfile.username,
          full_name: editedProfile.full_name,
          avatar_url,
          app_mode: editedProfile.app_mode,
        })
        .eq('id', userId);

      if (error) throw error;

      // Başarılı güncelleme sonrası state'i yenile
      setProfile({ ...editedProfile, avatar_url });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      // İzinleri kontrol et
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission', fromCamera ? 'Camera permission is required!' : 'Photo library permission is required!');
        return;
      }

      // Resim seçimi veya çekimi
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] });

      // Seçilen resmi düzenleme state'ine kaydet
      if (!result.canceled) {
        setEditedProfile({ ...editedProfile, avatar_url: result.assets[0].uri });
      }
    } catch (error: any) {
      console.error('Image picker error:', error.message);
    } finally {
      setIsAvatarModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.menuIcon}>☰</Text>
        <Text style={styles.welcomeText}>WELCOME {profile?.username || 'Guest'}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={{ alignItems: 'center' }}>
          <Image
            source={{ uri: 'https://via.placeholder.com/150x50?text=LOGO' }}
            style={styles.logo}
            resizeMode="contain"
            />

          <TouchableOpacity onPress={() => setIsAvatarModalVisible(true)}>
            <Image
              source={{ uri: editedProfile?.avatar_url || 'https://via.placeholder.com/120' }}
              style={styles.avatar}
              />
            </TouchableOpacity>
            <Text style={styles.nameText}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.usernameText}>@{profile?.username || 'No username'}</Text>
            <Text style={styles.detailText}>App Mode: {profile?.app_mode || 'Default'}</Text>
            <Text style={styles.detailText}>Updated: {new Date(profile?.updated_at || Date.now()).toLocaleDateString()}</Text>
        </View>

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

      {/* Edit Form (Inline for simpler visibility) */}
      {isEditing && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Edit Profile</Text>
          <TextInput
            style={styles.input}
            value={editedProfile.full_name || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
            placeholder="Full Name"
            placeholderTextColor="#94a3b8" 
          />
          <TextInput
            style={styles.input}
            value={editedProfile.username || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, username: text })}
            placeholder="Username"
            placeholderTextColor="#94a3b8" 
          />
          <TextInput
            style={styles.input}
            value={editedProfile.app_mode || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, app_mode: text })}
            placeholder="App Mode"
            placeholderTextColor="#94a3b8" 
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.buttonText}>SAVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.TEXT, marginTop: 10 }]} onPress={() => setIsEditing(false)}>
            <Text style={[styles.buttonText, { color: COLORS.CARD }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Password Modal */}
      <Modal visible={isChangingPassword} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                <Text style={styles.buttonText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.TEXT, marginLeft: 10 }]} onPress={() => setIsChangingPassword(false)}>
                <Text style={[styles.buttonText, { color: COLORS.CARD }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal visible={isAvatarModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Avatar</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => pickImage(true)}>
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => pickImage(false)}>
              <Text style={styles.buttonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.TEXT, marginTop: 10 }]} onPress={() => setIsAvatarModalVisible(false)}>
              <Text style={[styles.buttonText, { color: COLORS.CARD }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Genel Stil - Arkaplan Rengi: F7FCF8
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND, padding: 16 },

  // Başlık Stilleri - Metin Rengi: 0F1724
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  menuIcon: { fontSize: 24, color: COLORS.TEXT, fontWeight: 'bold' },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT },
  
  // Profil Kartı - Kart Rengi: FFFFFF
  profileCard: { 
    backgroundColor: COLORS.CARD, 
    borderRadius: 16, 
    padding: 20, 
    shadowColor: COLORS.TEXT, 
    shadowOffset: { width: 0, height: 4 }, // Gölge biraz daha belirgin yapıldı
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 8, 
    marginBottom: 20,
    justifyContent: 'space-between',
    minHeight: 550,
    borderWidth: 1, // Hafif kenarlık eklendi
    borderColor: '#e2e8f0',
  },
  
  // Avatar ve Metin Stilleri
  logo: { width: 150, height: 50, marginBottom: 15 },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 4, 
    borderColor: COLORS.ACCENT, // Vurgu rengi: FFB84D
    marginBottom: 15,
  },
  nameText: { fontSize: 24, fontWeight: '900', color: COLORS.TEXT, marginBottom: 5 }, // Metin Rengi: 0F1724
  usernameText: { fontSize: 16, color: COLORS.ACCENT, marginBottom: 10, fontWeight: '600' }, // Vurgu rengi: FFB84D
  detailText: { fontSize: 14, color: COLORS.TEXT, marginTop: 2, opacity: 0.7 }, // Metin Rengi: 0F1724 (Hafif şeffaflık)
  
  // Aksiyon Butonları - Arkaplan Rengi: FFB84D, Metin Rengi: 0F1724
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 15 },
  actionButton: { 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 30, 
    backgroundColor: COLORS.ACCENT, // Vurgu rengi: FFB84D
    margin: 5, 
    shadowColor: COLORS.ACCENT, 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  buttonText: { color: COLORS.TEXT, fontWeight: '700', textAlign: 'center' }, // Metin Rengi: 0F1724

  // Düzenleme Kartı ve Giriş Alanları
  editCard: { 
    padding: 20, 
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.TEXT, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 }, // Metin Rengi: 0F1724
  input: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 15, 
    fontSize: 16, 
    backgroundColor: COLORS.BACKGROUND, 
    color: COLORS.TEXT 
  },
  
  // Kaydet Butonu - Arkaplan Rengi: FFB84D
  saveButton: { 
    backgroundColor: COLORS.ACCENT, // Vurgu rengi: FFB84D
    borderRadius: 30, 
    paddingVertical: 14, 
    shadowColor: COLORS.ACCENT, 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  
  // Modal Stilleri
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { 
    width: '85%', 
    backgroundColor: COLORS.CARD, 
    padding: 25, 
    borderRadius: 20, 
    shadowColor: COLORS.TEXT, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT, marginBottom: 20, textAlign: 'center' }, // Metin Rengi: 0F1724
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { 
    flex: 1, 
    paddingVertical: 14, 
    marginRight: 10,
    backgroundColor: COLORS.ACCENT, // Vurgu rengi: FFB84D
    borderRadius: 30, 
    shadowColor: COLORS.ACCENT, 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 5, 
    elevation: 5, 
    alignItems: 'center',
  },
  
  // Yükleme/Hata Stilleri
  loadingText: { fontSize: 18, color: COLORS.TEXT, marginTop: 10, fontWeight: '500' }, // Metin Rengi: 0F1724
  errorText: { fontSize: 16, color: '#dc3545', fontWeight: 'bold' }, // Hata metni kırmızı kaldı
  retryButton: { 
    backgroundColor: COLORS.ACCENT, // Vurgu rengi: FFB84D
    borderRadius: 30, 
    padding: 12, 
    marginTop: 15,
    shadowColor: COLORS.ACCENT,
  }
});
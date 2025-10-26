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

// Renk kodlary
const COLORS = {
  BACKGROUND: '#F7FCF8',
  CARD: '#000000ff',
  TEXT: '#ffffffff',
  ACCENT: '#E8B923',
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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Ulanyjy girmedi');
        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, app_mode, updated_at')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setEditedProfile(data);
      } catch (error: any) {
        console.error('Profil ýüklenmesinde ýalňyşlyk:', error.message);
        setError('Profil maglumatlaryny ýüklemek başa barmady');
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
      console.error('Çykyş ýalňyşlygy:', error.message);
      Alert.alert('Ýalňyşlyk', 'Çykmak başa barmady');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Ýalňyşlyk', 'Parol azyndan 6 simwoldan ybarat bolmaly.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsChangingPassword(false);
      setNewPassword('');
      Alert.alert('Üstünlik', 'Parol üstünlikli täzelendi! Täzeden giriň.');
      await handleLogout();
    } catch (error: any) {
      Alert.alert('Ýalňyşlyk', error.message || 'Paroly täzelemek başa barmady');
    } finally {
      setLoading(false);
    }
  };

  const handleSupport = () => {
    Alert.alert('Goldaw', 'Kömek gerekmi? Bize şu ýerden ýazyň: agahanyazmyradov.vercel.app');
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      // avatar_url şu wagt diňe ýerli URI
      const avatar_url = editedProfile.avatar_url;

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

      setProfile({ ...editedProfile, avatar_url });
      setIsEditing(false);
      Alert.alert('Üstünlik', 'Profil üstünlikli täzelendi!');
    } catch (error: any) {
      Alert.alert('Ýalňyşlyk', error.message || 'Profili täzelemek başa barmady');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Rugsat', fromCamera ? 'Kamera rugsady zerur!' : 'Surat galereýasy rugsady zerur!');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] });

      if (!result.canceled) {
        setEditedProfile({ ...editedProfile, avatar_url: result.assets[0].uri });
      }
    } catch (error: any) {
      console.error('Surat saýlama ýalňyşlygy:', error.message);
    } finally {
      setIsAvatarModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
        <Text style={styles.loadingText}>Ýüklenýär...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
          <Text style={styles.buttonText}>Täzeden synanyş</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
  source={require('../../assets/images/logo.png')}
  style={styles.menuIcon}
  resizeMode="contain"
/>
        <Text style={styles.welcomeText}>HOŞ GELDIŇIZ {profile?.username || 'Myhman'}</Text>
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
          <Text style={styles.nameText}>{profile?.full_name || 'Ulanyjy'}</Text>
          <Text style={styles.usernameText}>@{profile?.username || 'Ulanyjy ady ýok'}</Text>
          <Text style={styles.detailText}>Programma tertibi: {profile?.app_mode || 'Adaty'}</Text>
          <Text style={styles.detailText}>Täzelendi: {new Date(profile?.updated_at || Date.now()).toLocaleDateString('tk-TM')}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.buttonText}>Profili redaktirlemek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setIsChangingPassword(true)}>
            <Text style={styles.buttonText}>Paroly çalyşmak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSupport}>
            <Text style={styles.buttonText}>Goldaw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>Çykmak</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEditing && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Profili redaktirlemek</Text>
          <TextInput
            style={styles.input}
            value={editedProfile.full_name || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
            placeholder="Doly ady"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.input}
            value={editedProfile.username || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, username: text })}
            placeholder="Ulanyjy ady"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.input}
            value={editedProfile.app_mode || ''}
            onChangeText={(text) => setEditedProfile({ ...editedProfile, app_mode: text })}
            placeholder="Programma tertibi"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.buttonText}>ÝATDA SAKLA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.TEXT, marginTop: 10 }]} onPress={() => setIsEditing(false)}>
            <Text style={[styles.buttonText, { color: COLORS.CARD }]}>Ýatyryň</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Parol modaly */}
      <Modal visible={isChangingPassword} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paroly çalyşmak</Text>
            <TextInput
              style={styles.input}
              placeholder="Täze parol"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                <Text style={styles.buttonText}>Çalyş</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.TEXT, marginLeft: 10 }]} onPress={() => setIsChangingPassword(false)}>
                <Text style={[styles.buttonText, { color: COLORS.CARD }]}>Ýatyryň</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Awatar modaly */}
      <Modal visible={isAvatarModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Awatar saýla</Text>
            
            <TouchableOpacity style={styles.avatarModalButton} onPress={() => pickImage(true)}>
              <Text style={styles.avatarModalButtonText}>Surat çek</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.avatarModalButton} onPress={() => pickImage(false)}>
              <Text style={styles.avatarModalButtonText}>Galereýadan saýla</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.avatarModalButton, { backgroundColor: COLORS.TEXT }]} onPress={() => setIsAvatarModalVisible(false)}>
              <Text style={styles.avatarModalButtonTextYatyryn}>Ýatyryň</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND, padding: 16 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    marginTop: 40,
  },
  menuIcon: { 
    width: 80, // Adjusted for logo size
    height: 80, 
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: 'black', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, marginBottom: 20, justifyContent: 'space-between', minHeight: 550, borderWidth: 1, borderColor: '#e2e8f0' },
  logo: { width: 150, height: 50, marginBottom: 15 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: COLORS.ACCENT, marginBottom: 15 },
  nameText: { fontSize: 24, fontWeight: '900', color: 'black', marginBottom: 5 },
  usernameText: { fontSize: 16, color: COLORS.ACCENT, marginBottom: 10, fontWeight: '600' },
  detailText: { fontSize: 14, color: 'black', marginTop: 2, opacity: 0.7 },
  buttonContainer: { 
  flexDirection: 'row', 
  flexWrap: 'wrap', 
  justifyContent: 'center', 
  marginTop: 15,

  // --- ADDED POSITIONING FOR BOTTOM CENTER ---
  position: 'absolute', // Takes it out of the normal document flow
  bottom: 30,          // Position 30 units from the bottom
  left: 0,             // Anchor to the left edge
  right: 0,            // Anchor to the right edge
  },
  actionButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, backgroundColor: COLORS.ACCENT, margin: 5, shadowColor: COLORS.ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  buttonText: { color: COLORS.TEXT, fontWeight: '700', textAlign: 'center' },
  editCard: { padding: 20, marginBottom: 20, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  editTitle: { fontSize: 18, fontWeight: 'bold', color: 'black', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 15, fontSize: 16, backgroundColor: COLORS.BACKGROUND, color: 'black' },
  saveButton: { backgroundColor: COLORS.ACCENT, borderRadius: 30, paddingVertical: 14, shadowColor: COLORS.ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', backgroundColor: 'white', padding: 25, borderRadius: 20, shadowColor: 'black', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'black', marginBottom: 20, textAlign: 'center' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, paddingVertical: 14, marginRight: 10, backgroundColor: COLORS.ACCENT, borderRadius: 30, shadowColor: COLORS.ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5, alignItems: 'center' },
  modalButtonText: { color: COLORS.TEXT, fontWeight: '700', textAlign: 'center', fontSize: 16 },
  avatarModalButton: { backgroundColor: COLORS.ACCENT, borderRadius: 30, paddingVertical: 14, marginBottom: 12, alignItems: 'center', shadowColor: COLORS.ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  avatarModalButtonText: { color: COLORS.TEXT, fontWeight: '700', fontSize: 16 },
  avatarModalButtonTextYatyryn: { color: 'black', fontWeight: '700', fontSize: 16 },
  loadingText: { fontSize: 18, color: 'black', marginTop: 10, fontWeight: '500' },
  errorText: { fontSize: 16, color: '#dc3545', fontWeight: 'bold' },
  retryButton: { backgroundColor: COLORS.ACCENT, borderRadius: 30, padding: 12, marginTop: 15, shadowColor: COLORS.ACCENT }
});
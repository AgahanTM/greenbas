import { analyzeImageWithGemini, Meal } from "@/services/geminiService";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ZW_COLORS = {
  BACKGROUND: '#f8fcf8',
  CARD: '#FFFFFF',
  PRIMARY_ACCENT: '#2EB86E',
  SECONDARY_ACCENT: '#FFB84D',
  TEXT_DARK: '#0F1724',
  TEXT_MUTED: '#64748b',
  BORDER: '#e2e8f0',
};

export default function MealRecognition() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mealResult, setMealResult] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleImageAnalysis = async (uri: string, mimeType?: string) => {
    setIsLoading(true);
    setMealResult(null);
    try {
      const result = await analyzeImageWithGemini(uri, mimeType);
      setMealResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analyz yalnys boldy.";
      Alert.alert("Analyz yalnys boldy", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Rugsat gerek", "Galareya rugsat gerek!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      handleImageAnalysis(asset.uri, asset.mimeType);
    }
  };

  const openCamera = async () => {
    const { granted } = await requestPermission();
    if (!granted) {
      Alert.alert("Rugsat gerek", "Kamera rugsat gerek!");
      return;
    }
    setIsCameraActive(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setIsCameraActive(false);
      setImageUri(photo.uri);
      handleImageAnalysis(photo.uri, 'image/jpeg');
    }
  };

  const resetState = () => {
    setImageUri(null);
    setMealResult(null);
  };

  // Camera View
  if (isCameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={() => setIsCameraActive(false)} style={styles.cameraButton}>
            <Text style={styles.cameraButtonText}>Yza don</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={capturePhoto} style={styles.captureButton} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={ZW_COLORS.PRIMARY_ACCENT} />
          <Text style={styles.infoText}>Nahar tanalyar...</Text>
        </View>
      ) : imageUri && mealResult ? (
        <View style={styles.centerBox}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.card}>
            <Text style={styles.mealName}>{mealResult.meal_name}</Text>
            <Text style={styles.description}>{mealResult.description}</Text>
            <View style={styles.nutrients}>
              <Text style={styles.nutrientText}>Kaloriya: {mealResult.calories}</Text>
              <Text style={styles.nutrientText}>Proteyin: {mealResult.protein_g} g</Text>
              <Text style={styles.nutrientText}>Uglewodlar: {mealResult.carbs_g} g</Text>
              <Text style={styles.nutrientText}>Yag: {mealResult.fat_g} g</Text>
            </View>
          </View>
          <TouchableOpacity onPress={resetState} style={styles.actionButton}>
            <Text style={styles.buttonText}>Tazeden synans</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerBox}>
          <View style={styles.card}>
            <Text style={styles.title}>Nahar tanama</Text>
            <Text style={styles.infoText}>Nahary tanamak ucin galareyadan yukle yada surata al.</Text>
            <TouchableOpacity onPress={openCamera} style={styles.actionButton}>
              <Text style={styles.buttonText}>Surata al</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
              <Text style={styles.buttonText}>Galareyadan yukle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ZW_COLORS.BACKGROUND,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: ZW_COLORS.TEXT_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFB84D',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: ZW_COLORS.TEXT_MUTED,
    marginVertical: 10,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: ZW_COLORS.SECONDARY_ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: ZW_COLORS.PRIMARY_ACCENT,
  },
  mealName: {
    fontSize: 22,
    fontWeight: '700',
    color: ZW_COLORS.PRIMARY_ACCENT,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: ZW_COLORS.TEXT_DARK,
    marginBottom: 12,
    textAlign: 'center',
  },
  nutrients: {
    borderTopWidth: 1,
    borderTopColor: ZW_COLORS.BORDER,
    paddingTop: 10,
  },
  nutrientText: {
    fontSize: 14,
    color: ZW_COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ZW_COLORS.CARD,
    borderWidth: 4,
    borderColor: ZW_COLORS.SECONDARY_ACCENT,
  },
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  cameraButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
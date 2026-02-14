import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera as CameraIcon, Trash2, MapPin, RefreshCw, CheckCircle } from 'lucide-react-native';
import axios from 'axios';

const POSSIBLE_IPS = ['192.168.43.211', '192.168.1.5', '192.168.1.10', '192.168.0.100']; // List common/last-known IPs
const PORT = '8000';

export default function App() {
  const [apiUrl, setApiUrl] = useState(`http://192.168.43.211:${PORT}`);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locStatus === 'granted');

      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }

      // Connectivity test - try to find the server
      for (const ip of POSSIBLE_IPS) {
        try {
          const testUrl = `http://${ip}:${PORT}`;
          const res = await axios.get(testUrl, { timeout: 1000 });
          if (res.data) {
            setApiUrl(testUrl);
            console.log("Server found at:", testUrl);
            break;
          }
        } catch (e) {
          // Continue to next IP
        }
      }
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });
      setImage(photo.uri);
    }
  };

  const uploadReport = async () => {
    if (!image || !location) {
      Alert.alert('Missing Info', 'Waiting for location or image...');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());

    // Create the file object
    const uriParts = image.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('image', {
      uri: image,
      name: `photo.${fileType}`,
      type: `image/${fileType}`,
    });

    try {
      const response = await axios.post(`${apiUrl}/reports/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        Alert.alert('Success', 'Waste report submitted successfully!');
        setImage(null);
      } else {
        Alert.alert('Notice', 'No plastic waste detected by the AI.');
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert('Error', 'Failed to connect to server. Check API_URL and Network.');
    } finally {
      setUploading(false);
    }
  };

  if (!permission || locationPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!permission.granted || !locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
          Permissions for Camera and Location are required to use this app.
        </Text>
        <TouchableOpacity style={styles.submitBtn} onPress={() => {
          requestPermission();
          Location.requestForegroundPermissionsAsync();
        }}>
          <Text style={styles.actionText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {!image ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            ref={cameraRef}
            facing="back"
          >
            <View style={styles.overlay}>
              <View style={styles.header}>
                <Trash2 color="#38bdf8" size={32} />
                <Text style={styles.title}>SmartWaste Detector</Text>
              </View>

              <View style={styles.footer}>
                <View style={styles.locationTag}>
                  <MapPin color="#fff" size={14} />
                  <Text style={styles.locationText}>
                    {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Locating...'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                  <View style={styles.captureBtnInner}>
                    <CameraIcon color="#0f172a" size={32} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />

          <LinearGradient colors={['transparent', 'rgba(15, 23, 42, 0.9)']} style={styles.previewOverlay}>
            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.retakeBtn]} onPress={() => setImage(null)}>
                <RefreshCw color="#fff" size={24} />
                <Text style={styles.actionText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.submitBtn]}
                onPress={uploadReport}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <>
                    <CheckCircle color="#0f172a" size={24} />
                    <Text style={[styles.actionText, { color: '#0f172a' }]}>Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 30,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    gap: 24,
    marginBottom: 40,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#38bdf8',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
  },
  preview: {
    flex: 1,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: 'flex-end',
    padding: 30,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  actionBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  retakeBtn: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

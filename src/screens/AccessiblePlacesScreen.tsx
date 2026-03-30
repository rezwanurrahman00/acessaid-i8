import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Place {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  wheelchair?: string;
  address?: string;
  distance?: number;
}

interface Category {
  key: string;
  label: string;
  emoji: string;
  amenities: string[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { key: 'all',      label: 'All',       emoji: '♿', amenities: ['restaurant','hospital','pharmacy','cafe','fast_food','bar','pub','food_court','ice_cream','toilets','bank'] },
  { key: 'food',     label: 'Food',      emoji: '🍽️', amenities: ['restaurant','cafe','fast_food','bar','pub','food_court','ice_cream','canteen','juice_bar','bbq','biergarten'] },
  { key: 'hospital', label: 'Hospitals', emoji: '🏥', amenities: ['hospital','clinic','doctors','dentist','veterinary','health_post'] },
  { key: 'pharmacy', label: 'Pharmacy',  emoji: '💊', amenities: ['pharmacy','chemist'] },
  { key: 'toilet',   label: 'Toilets',   emoji: '🚻', amenities: ['toilets'] },
];

const FRIENDLY_NAMES: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Fast Food',
  bar: 'Bar', pub: 'Pub', food_court: 'Food Court', ice_cream: 'Ice Cream',
  canteen: 'Canteen', juice_bar: 'Juice Bar', bbq: 'BBQ', biergarten: 'Beer Garden',
  hospital: 'Hospital', clinic: 'Clinic', doctors: 'Doctor',
  dentist: 'Dentist', veterinary: 'Vet', health_post: 'Health Post',
  pharmacy: 'Pharmacy', chemist: 'Chemist', toilets: 'Public Toilet', bank: 'Bank',
};

const CACHE_TTL = 15 * 60 * 1000; // 15 min

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number) {
  const miles = m / 1609.344;
  return miles < 0.1 ? `${Math.round(m)}m` : `${miles.toFixed(1)} mi`;
}

function wheelchairColor(w?: string) {
  if (w === 'yes') return '#22C55E';
  if (w === 'limited') return '#F59E0B';
  return null;
}

function wheelchairLabel(w?: string) {
  if (w === 'yes') return '✅ Accessible';
  if (w === 'limited') return '⚠️ Limited Access';
  return null;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

async function getCached(key: string): Promise<Place[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as Place[];
  } catch { return null; }
}

async function setCache(key: string, data: Place[]) {
  try { await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ─── Fetch — single request with abort support ────────────────────────────────

async function fetchPlaces(
  lat: number,
  lon: number,
  amenities: string[],
  signal: AbortSignal,
): Promise<Place[]> {
  const deg = 0.07; // ~8 km bounding box
  const bbox = `${lat - deg},${lon - deg},${lat + deg},${lon + deg}`;
  const regex = amenities.join('|');
  const query = `[out:json][timeout:20];(node["amenity"~"${regex}"](${bbox});way["amenity"~"${regex}"](${bbox}););out center 100;`;

  // Try lz4 first (fastest), then fallback
  const endpoints = [
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  let lastErr: any;
  for (const url of endpoints) {
    if (signal.aborted) throw new Error('Cancelled');
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });

      // Rate-limited or server error — try next
      if (resp.status === 429 || resp.status === 504 || resp.status === 502) {
        lastErr = new Error(`HTTP ${resp.status}`);
        continue;
      }
      if (!resp.ok) { lastErr = new Error(`HTTP ${resp.status}`); continue; }

      const json = await resp.json();
      const elements: any[] = json.elements ?? [];

      return elements
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          if (!elLat || !elLon) return null;
          const type: string = el.tags?.amenity ?? '';
          return {
            id: el.id,
            name: el.tags?.name || el.tags?.['name:en'] || FRIENDLY_NAMES[type] || type,
            type,
            lat: elLat,
            lon: elLon,
            wheelchair: el.tags?.wheelchair,
            address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street']]
              .filter(Boolean).join(' ') || undefined,
            distance: getDistance(lat, lon, elLat, elLon),
          } as Place;
        })
        .filter((p): p is Place => p !== null)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    } catch (e: any) {
      if (e?.name === 'AbortError' || e?.message === 'Cancelled') throw e;
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Could not reach map servers');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccessiblePlacesScreen() {
  const navigation = useNavigation();
  const mapRef     = useRef<MapView>(null);
  const abortRef   = useRef<AbortController | null>(null); // cancel in-flight request

  const [location, setLocation]         = useState<{ lat: number; lon: number } | null>(null);
  const [places, setPlaces]             = useState<Place[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);
  const [selectedPlace, setSelectedPlace]   = useState<Place | null>(null);

  // ── init location once ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please enable location to find accessible places near you.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelled) return;
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setLocation(coords);
      load(coords, CATEGORIES[0], false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── load with dedup ─────────────────────────────────────────────────────────
  const load = async (
    coords: { lat: number; lon: number },
    category: Category,
    forceRefresh: boolean,
  ) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cacheKey = `places_${category.key}_${coords.lat.toFixed(2)}_${coords.lon.toFixed(2)}`;

    // Serve from cache instantly when not forcing refresh
    if (!forceRefresh) {
      const cached = await getCached(cacheKey);
      if (cached && cached.length > 0) {
        setPlaces(cached);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    try {
      const data = await fetchPlaces(coords.lat, coords.lon, category.amenities, controller.signal);
      if (controller.signal.aborted) return;
      setPlaces(data);
      if (data.length > 0) setCache(cacheKey, data);
    } catch (e: any) {
      if (controller.signal.aborted || e?.message === 'Cancelled') return;
      Alert.alert(
        'Could Not Load Places',
        'The map server is busy. Please try again in a moment.',
        [{ text: 'Retry', onPress: () => load(coords, category, true) }, { text: 'Cancel' }],
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleCategoryPress = (cat: Category) => {
    if (!location || cat.key === activeCategory.key) return;
    setActiveCategory(cat);
    setLoading(true);
    setSelectedPlace(null);
    load(location, cat, false);
  };

  const handleRefresh = () => {
    if (!location) return;
    setRefreshing(true);
    load(location, activeCategory, true);
  };

  const handlePlacePress = (place: Place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion(
      { latitude: place.lat, longitude: place.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  };

  const handleDirections = (place: Place) => {
    const label = encodeURIComponent(place.name);
    const url = Platform.OS === 'ios'
      ? `maps://?daddr=${place.lat},${place.lon}&q=${label}`
      : `geo:${place.lat},${place.lon}?q=${label}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`)
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Accessible Places</Text>
          <Text style={styles.headerSub}>Wheelchair-friendly spots near you</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Banner */}
      <LinearGradient colors={['#EDE9FE', '#F5F3FF']} style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>Find Accessible Places</Text>
          <Text style={styles.bannerSub}>
            {places.length > 0
              ? <><Text style={styles.bannerHighlight}>{places.length} places</Text> found within 8 miles</>
              : <>Searching within <Text style={styles.bannerHighlight}>8 miles</Text> of you</>
            }
          </Text>
          <View style={styles.bannerStats}>
            <View style={styles.bannerStat}>
              <View style={[styles.bannerDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.bannerStatText}>Accessible</Text>
            </View>
            <View style={styles.bannerStat}>
              <View style={[styles.bannerDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.bannerStatText}>Limited</Text>
            </View>
          </View>
        </View>
        <View style={styles.bannerRight}>
          <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.bannerIconCircle}>
            <Text style={styles.bannerIconMain}>♿</Text>
          </LinearGradient>
          <View style={styles.bannerIconRow}>
            {['🍽️','🏥','💊','🚻'].map((e, i) => (
              <View key={i} style={styles.bannerIconSmall}>
                <Text style={{ fontSize: 14 }}>{e}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* Category filters */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => handleCategoryPress(cat)}
            style={[styles.catBtn, activeCategory.key === cat.key && styles.catBtnActive]}
          >
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catLabel, activeCategory.key === cat.key && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ latitude: location.lat, longitude: location.lon, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
          showsUserLocation
          showsMyLocationButton
        >
          {places.map(place => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lon }}
              title={place.name}
              description={wheelchairLabel(place.wheelchair)}
              pinColor={wheelchairColor(place.wheelchair) ?? '#6B7280'}
              onPress={() => handlePlacePress(place)}
            />
          ))}
        </MapView>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Finding places nearby…</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No places found nearby.</Text>
              <Text style={styles.emptySub}>Pull down to refresh or try another category.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, selectedPlace?.id === item.id && styles.cardSelected]}
              onPress={() => handlePlacePress(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeType}>{item.type.replace(/_/g, ' ')}</Text>
                {item.address ? <Text style={styles.placeAddress}>{item.address}</Text> : null}
                <View style={styles.badgeRow}>
                  {wheelchairLabel(item.wheelchair) !== null && (
                    <View style={[styles.badge, {
                      backgroundColor: (wheelchairColor(item.wheelchair) ?? '#9CA3AF') + '22',
                      borderColor: wheelchairColor(item.wheelchair) ?? '#9CA3AF',
                    }]}>
                      <Text style={[styles.badgeText, { color: wheelchairColor(item.wheelchair) ?? '#9CA3AF' }]}>
                        {wheelchairLabel(item.wheelchair)}
                      </Text>
                    </View>
                  )}
                  {item.distance !== undefined && (
                    <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.dirBtn} onPress={() => handleDirections(item)}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  categoryRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  catBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: '#F3F4F6' },
  catBtnActive: { backgroundColor: '#EDE9FE' },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 2 },
  catLabelActive: { color: '#7C3AED' },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD6FE',
  },
  bannerLeft: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#4C1D95' },
  bannerSub: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  bannerHighlight: { color: '#7C3AED', fontWeight: '700' },
  bannerStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  bannerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerStatText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  bannerRight: { alignItems: 'center', gap: 8 },
  bannerIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  bannerIconMain: { fontSize: 28 },
  bannerIconRow: { flexDirection: 'row', gap: 4 },
  bannerIconSmall: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },

  map: { height: 200 },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },

  list: { padding: 12, gap: 10, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardSelected: { borderColor: '#7C3AED', borderWidth: 2 },
  cardLeft: { flex: 1, gap: 4 },
  placeName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  placeType: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  placeAddress: { fontSize: 12, color: '#9CA3AF' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  distance: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  dirBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
});

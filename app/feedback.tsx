import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNightVision, NV_CARD } from '../src/context/NightVisionContext';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdAiMbjFPOTkY7rsBXo5Gar4WNbqSbIwKqescIH1oGUMxzEAQ/viewform?embedded=true';

const INJECT = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      body { background: #0a0d18 !important; color: #fff !important; font-family: sans-serif !important; }
      .freebirdFormviewerViewHeaderHeader,
      .freebirdFormviewerViewHeaderTitleRow { background: #0a0d18 !important; }
      .freebirdFormviewerViewItemsItemItemTitle { color: #fff !important; }
      .freebirdFormviewerViewItemsTextTextInput,
      .freebirdFormviewerViewItemsTextShortText { background: rgba(255,255,255,0.08) !important; color: #fff !important; border-color: rgba(255,255,255,0.15) !important; border-radius: 8px !important; }
      .quantumWizButtonPaperbuttonEl { background: #7ef0d2 !important; color: #000 !important; border-radius: 8px !important; }
      .freebirdFormviewerViewNavigationNoSubmitButton { display: none !important; }
    \`;
    document.head.appendChild(style);
  })();
  true;
`;

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { nightVision } = useNightVision();
  const bg = nightVision ? NV_CARD : '#0a0d18';
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.screen, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.navChev}>‹</Text>
          <Text style={styles.navBackLabel}>Settings</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Feedback</Text>
        <View style={styles.navSpacer} />
      </View>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#7ef0d2" />
        </View>
      )}
      <WebView
        source={{ uri: FORM_URL }}
        style={[styles.web, { backgroundColor: bg }]}
        injectedJavaScript={INJECT}
        onLoadEnd={() => setLoading(false)}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  navChev: {
    fontSize: 24,
    color: '#7ef0d2',
    lineHeight: 28,
    marginRight: 2,
  },
  navBackLabel: {
    fontSize: 15,
    color: '#7ef0d2',
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#fff',
  },
  navSpacer: {
    minWidth: 80,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    zIndex: 10,
  },
  web: {
    flex: 1,
  },
});

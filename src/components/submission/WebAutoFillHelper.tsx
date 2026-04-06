/**
 * WebAutoFillHelper — Provides auto-fill script to users on web platform.
 *
 * On web, we can't inject JavaScript into a cross-origin portal page
 * (X-Frame-Options blocks iframes, and cross-origin script injection is
 * blocked by the browser). Instead, we:
 *
 * 1. Open the portal in a new browser tab
 * 2. Offer to copy the auto-fill script to clipboard as a bookmarklet
 * 3. The user pastes it into the browser console or drags the bookmarklet
 *
 * The heuristic filler script (buildHeuristicFillScript) is already
 * standalone JavaScript — it just needs to be delivered to the user.
 */

import { View, Text, Pressable, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, ExternalLink, Check } from 'lucide-react-native';
import { useState, useCallback } from 'react';

interface WebAutoFillHelperProps {
  fillScript: string;
  portalName: string;
  onOpenPortal: () => void;
}

export function WebAutoFillHelper({
  fillScript,
  portalName,
  onOpenPortal,
}: WebAutoFillHelperProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyScript = useCallback(() => {
    // Wrap in a bookmarklet-friendly format
    const bookmarklet = `javascript:void(${encodeURIComponent(`(function(){${fillScript}})()`)})`;
    Clipboard.setString(bookmarklet);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }, [fillScript]);

  if (Platform.OS !== 'web') return null;

  return (
    <View className="flex-1 bg-surface p-6">
      <Text className="text-lg font-semibold text-primary mb-2">
        {portalName}
      </Text>

      <Text className="text-sm text-secondary mb-6 leading-5">
        Government portals can't be embedded on the web. Open the portal in a
        new tab, then use the auto-fill script to populate your information.
      </Text>

      {/* Step 1: Copy script */}
      <View className="bg-surface-secondary rounded-xl p-4 mb-4">
        <Text className="text-sm font-semibold text-primary mb-1">
          Step 1: Copy auto-fill script
        </Text>
        <Text className="text-xs text-muted mb-3">
          Copies a bookmarklet to your clipboard. After opening the portal,
          paste it into the browser address bar or developer console.
        </Text>
        <Pressable
          onPress={handleCopyScript}
          style={({ pressed }) => ({
            backgroundColor: copied ? '#10B981' : '#3B82F6',
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityLabel={copied ? 'Script copied' : 'Copy auto-fill script to clipboard'}
        >
          {copied ? (
            <Check size={18} color="#fff" />
          ) : (
            <Copy size={18} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {copied ? 'Copied!' : 'Copy Auto-Fill Script'}
          </Text>
        </Pressable>
      </View>

      {/* Step 2: Open portal */}
      <View className="bg-surface-secondary rounded-xl p-4">
        <Text className="text-sm font-semibold text-primary mb-1">
          Step 2: Open portal
        </Text>
        <Text className="text-xs text-muted mb-3">
          Opens {portalName} in a new browser tab.
        </Text>
        <Pressable
          onPress={onOpenPortal}
          style={({ pressed }) => ({
            backgroundColor: '#374151',
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityLabel={`Open ${portalName} in new tab`}
        >
          <ExternalLink size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            Open Portal
          </Text>
        </Pressable>
      </View>

      <Text className="text-xs text-muted mt-6 leading-4">
        After pasting the script, your passport details, travel information,
        and declaration answers will be auto-filled into the form fields.
      </Text>
    </View>
  );
}

/**
 * useTemplates — Business logic for TemplatesScreen.
 *
 * Manages template list loading, rename flow, delete confirmation, and use-template navigation.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { TripTemplate } from '@/types/trip';
import { tripTemplateService } from '@/services/trips/tripTemplateService';

export function useTemplates() {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [renameTarget, setRenameTarget] = useState<TripTemplate | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Reload templates each time the screen is focused
  useFocusEffect(
    useCallback(() => {
      setTemplates(tripTemplateService.list());
    }, []),
  );

  const handleDelete = useCallback((template: TripTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            tripTemplateService.delete(template.id);
            setTemplates(tripTemplateService.list());
          },
        },
      ],
    );
  }, []);

  const handleUseTemplate = useCallback((template: TripTemplate) => {
    (navigation as any).navigate('CreateTrip', { templateId: template.id });
  }, [navigation]);

  const handleRenameConfirm = useCallback((newName: string) => {
    if (!renameTarget) return;
    setIsRenaming(true);
    try {
      tripTemplateService.rename(renameTarget.id, newName);
      setTemplates(tripTemplateService.list());
    } finally {
      setIsRenaming(false);
      setRenameTarget(null);
    }
  }, [renameTarget]);

  const openRename = useCallback((template: TripTemplate) => {
    setRenameTarget(template);
  }, []);

  const closeRename = useCallback(() => {
    setRenameTarget(null);
  }, []);

  return {
    templates,
    renameTarget,
    isRenaming,
    handleDelete,
    handleUseTemplate,
    handleRenameConfirm,
    openRename,
    closeRename,
  };
}

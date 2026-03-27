/**
 * TemplatesScreen
 *
 * Lists saved trip templates.  Each template card shows the destination
 * country flags and leg count, with Rename and Delete actions.
 * An empty state is shown when no templates have been saved yet.
 */

import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { BookmarkPlus, Pencil, Trash2 } from 'lucide-react-native';
import { TripTemplate } from '@/types/trip';
import { CountryFlag } from '@/components/trips';
import { Card, ScreenContainer, EmptyState } from '@/components/ui';
import { useTemplates } from '@/hooks/useTemplates';
import { TEMPLATES_IDS } from './testIDs';

// ---------------------------------------------------------------------------
// RenameModal — inline subcomponent (tightly coupled to this screen)
// ---------------------------------------------------------------------------

interface RenameModalProps {
  visible: boolean;
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function RenameModal({ visible, currentName, onConfirm, onCancel, isSaving }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | undefined>(undefined);

  const onOpen = useCallback(() => {
    setName(currentName);
    setError(undefined);
  }, [currentName]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    setError(undefined);
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      onShow={onOpen}
      testID={TEMPLATES_IDS.renameTemplateModal.id}
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onCancel}
            disabled={isSaving}
            activeOpacity={0.7}
            testID={TEMPLATES_IDS.renameModalCancel.id}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900 dark:text-white" accessibilityRole="header">
            Rename Template
          </Text>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isSaving || !name.trim()}
            activeOpacity={0.7}
            testID={TEMPLATES_IDS.renameModalConfirm.id}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Confirm rename"
            accessibilityState={{ disabled: isSaving || !name.trim() }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text
                className={`font-semibold ${
                  name.trim() ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="p-4 mt-4">
          <View className="bg-white dark:bg-gray-800 rounded-xl px-4 py-4 mb-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template name
            </Text>
            <TextInput
              value={name}
              onChangeText={t => {
                setName(t);
                if (error) setError(undefined);
              }}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              className="text-base text-gray-900 dark:text-white"
              testID={TEMPLATES_IDS.renameTemplateField.id}
              accessibilityLabel="Template name, required"
              autoFocus
            />
          </View>
          {error && (
            <Text
              className="text-red-500 text-sm ml-1"
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
            >
              {error}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard — renders a single template row
// ---------------------------------------------------------------------------

export interface TemplateCardProps {
  template: TripTemplate;
  onRename: () => void;
  onDelete: () => void;
  onUse: () => void;
}

export function TemplateCard({ template, onRename, onDelete, onUse }: TemplateCardProps) {
  const uniqueCodes = Array.from(new Set(template.legs.map(l => l.countryCode)));
  const legCount = template.legs.length;

  return (
    <Card variant="elevated" className="mb-3">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-base font-semibold text-gray-900 dark:text-white flex-1 mr-3"
            numberOfLines={1}
          >
            {template.name}
          </Text>
          <View className="flex-row items-center gap-x-2">
            <TouchableOpacity
              onPress={onRename}
              activeOpacity={0.7}
              testID={TEMPLATES_IDS.renameTemplateButton.id.replace('${id}', template.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Rename template ${template.name}`}
              className="p-2"
            >
              <Pencil size={18} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              activeOpacity={0.7}
              testID={TEMPLATES_IDS.deleteTemplateButton.id.replace('${id}', template.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Delete template ${template.name}`}
              className="p-2"
            >
              <Trash2 size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="flex-row items-center"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          {uniqueCodes.slice(0, 5).map((code, index) => (
            <View key={code} style={{ marginRight: index < uniqueCodes.length - 1 ? 6 : 0 }}>
              <CountryFlag countryCode={code} size="small" />
            </View>
          ))}
          {uniqueCodes.length > 5 && (
            <Text className="ml-1 text-sm text-gray-500 dark:text-gray-400">
              +{uniqueCodes.length - 5}
            </Text>
          )}
        </View>

        <Text
          className="text-sm text-gray-500 dark:text-gray-400 mt-2"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          {legCount} leg{legCount !== 1 ? 's' : ''}
        </Text>
        <Text className="sr-only" accessibilityLabel={`${legCount} leg${legCount !== 1 ? 's' : ''}: ${uniqueCodes.join(', ')}`} />

        <TouchableOpacity
          onPress={onUse}
          activeOpacity={0.7}
          testID={TEMPLATES_IDS.useTemplateButton.id.replace('${id}', template.id)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Use template ${template.name}`}
          accessibilityHint="Create a new trip pre-filled with these destinations"
          className="mt-4 bg-blue-600 dark:bg-blue-500 rounded-lg py-2.5 items-center"
        >
          <Text className="text-white font-semibold text-sm">Use This Template</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TemplatesScreen
// ---------------------------------------------------------------------------

export default function TemplatesScreen() {
  const {
    templates,
    renameTarget,
    isRenaming,
    handleDelete,
    handleUseTemplate,
    handleRenameConfirm,
    openRename,
    closeRename,
  } = useTemplates();

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-800 px-4 py-5 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Trip Templates
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {templates.length === 0
                ? 'Saved templates appear here'
                : `${templates.length} saved template${templates.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      </View>

      {templates.length === 0 ? (
        <EmptyState
          icon={<BookmarkPlus size={40} color="#6b7280" />}
          title="No templates yet"
          description={'Save a trip as a template to reuse destinations and durations for future trips. Open any trip and tap "Save as Template".'}
          variant="illustration"
        />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              onRename={() => openRename(item)}
              onDelete={() => handleDelete(item)}
              onUse={() => handleUseTemplate(item)}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="List of saved trip templates"
          testID={TEMPLATES_IDS.templatesList.id}
        />
      )}

      <RenameModal
        visible={renameTarget !== null}
        currentName={renameTarget?.name ?? ''}
        onConfirm={handleRenameConfirm}
        onCancel={closeRename}
        isSaving={isRenaming}
      />
    </ScreenContainer>
  );
}

import { View, Text, ScrollView } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button, Card, ScreenContainer } from '@/components/ui';
import { usePortalLinks } from '@/hooks/usePortalLinks';
import { getCountryName } from '@/constants/countries';
import type { FormsStackParamList } from '@/app/navigation/types';
import { PORTAL_LINKS_IDS } from './testIDs';

type Route = RouteProp<FormsStackParamList, 'PortalLinks'>;

export default function PortalLinksScreen() {
  const route = useRoute<Route>();
  const { tripId, countryCodes } = route.params;

  const { portalCards, launchPortal } = usePortalLinks({ tripId, countryCodes });

  return (
    <ScreenContainer className="bg-surface-secondary">
      <View className="bg-surface px-4 py-6 border-b border-border-default">
        <Text
          className="text-2xl font-bold text-primary"
          accessibilityRole="header"
        >
          Submit your forms
        </Text>
        <Text
          className="text-base text-secondary mt-1"
          testID={PORTAL_LINKS_IDS.instructions.id}
        >
          Log in to each portal, then tap the auto-fill icon to fill your form automatically
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {portalCards.map(card => (
            <Card
              key={card.countryCode}
              className="mb-4"
              testID={`${PORTAL_LINKS_IDS.portalCard.id}-${card.countryCode}`}
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-primary">
                      {getCountryName(card.countryCode)}
                    </Text>
                    <Text className="text-sm text-tertiary">
                      {card.portalName}
                    </Text>
                  </View>
                  {card.isSubmitted ? (
                    <View className="flex-row items-center">
                      <CheckCircle size={20} color="#16a34a" />
                      <Text
                        className="text-success font-medium ml-1"
                        testID={`${PORTAL_LINKS_IDS.portalStatus.id}-${card.countryCode}`}
                      >
                        Submitted
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className="text-sm text-accent font-medium"
                      testID={`${PORTAL_LINKS_IDS.portalStatus.id}-${card.countryCode}`}
                    >
                      Ready to submit
                    </Text>
                  )}
                </View>
                <Button
                  title={card.isSubmitted ? 'Resubmit' : 'Launch Portal'}
                  onPress={() => launchPortal(card.countryCode)}
                  variant={card.isSubmitted ? 'secondary' : 'primary'}
                  size="large"
                  fullWidth
                  testID={`${PORTAL_LINKS_IDS.launchPortalButton.id}-${card.countryCode}`}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

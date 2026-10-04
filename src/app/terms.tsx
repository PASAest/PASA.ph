import { Screen } from '@/components/Screen';
import { Card, Text } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { termsSections } from '@/lib/terms';

export default function Terms() {
  const { settings } = useSettings();
  return (
    <Screen back title="Terms & community rules">
      {termsSections(settings.commission_rate).map(([title, body]) => (
        <Card key={title} style={{ gap: 6 }}>
          <Text variant="title">{title}</Text>
          <Text style={{ lineHeight: 21 }}>{body}</Text>
        </Card>
      ))}
    </Screen>
  );
}

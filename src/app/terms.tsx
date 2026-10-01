import { Screen } from '@/components/Screen';
import { Card, Text } from '@/components/ui';
import { CANCEL_CUTOFF_MIN, SERVICE_FEE_RATE } from '@/config';

const SECTIONS = [
  ['Who can join', 'PASA is for currently enrolled students of our school only. One account per student.'],
  ['What you can list', 'Only books and calculators, for sale or rent. Answer keys, exercises, practice sets, quizzes and reviewers are not allowed and will be removed.'],
  ['Tutoring', `Sessions are face-to-face on campus. Free cancellation until ${CANCEL_CUTOFF_MIN} minutes before the start time. No-shows can be reported.`],
  ['Payments and fees', `Pay through PASA so your money is protected. PASA adds a ${SERVICE_FEE_RATE * 100}% service fee and holds payment until the session is done or the item is received.`],
  ['Respect', 'Harsh, foul, or flirtatious language is blocked and may lead to suspension. Report anything that feels wrong.'],
  ['Your data', 'We collect only what we need to run PASA and protect it under the Data Privacy Act of 2012 (RA 10173). You can ask us to delete your account at any time.'],
];

export default function Terms() {
  return (
    <Screen back title="Terms & community rules">
      {SECTIONS.map(([title, body]) => (
        <Card key={title} style={{ gap: 6 }}>
          <Text variant="title">{title}</Text>
          <Text style={{ lineHeight: 21 }}>{body}</Text>
        </Card>
      ))}
    </Screen>
  );
}

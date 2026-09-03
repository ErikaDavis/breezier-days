export type HelpNowCategory = {
  id: string;
  label: string;
  emoji: string;
};

type SituationLike = {
  id: string;
  title: string;
  emoji: string;
  category?: string;
  description?: string;
  age?: string;
  guidance?: Record<string, { title: string; emoji: string; doNow: string; sayThis: string; avoidThis: string; afterward: string }>;
};

export const helpNowCategories: HelpNowCategory[] = [
  { id: 'behavior', label: 'Behavior & Boundaries', emoji: '🧭' },
  { id: 'feelings', label: 'Feelings & Big Reactions', emoji: '💛' },
  { id: 'sleep', label: 'Sleep', emoji: '🌙' },
  { id: 'meals', label: 'Food & Mealtimes', emoji: '🍓' },
  { id: 'siblings', label: 'Siblings', emoji: '👭' },
  { id: 'daily', label: 'Everyday Life', emoji: '🏠' },
];

const makeSituation = (
  id: string,
  title: string,
  emoji: string,
  category: string,
  description = ''
): SituationLike => ({
  id,
  title,
  emoji,
  category,
  description,
});

const restTimeScript = 'It’s still rest time. You don’t have to sleep, but you can rest quietly. I’ll come get you when it’s time to get up.';
const earlyWakeAvoid = 'Avoid lengthy reasoning, screens, bright lights, lots of choices, or making screaming the automatic signal that the day starts. Rest time is not punishment; do not physically force a child to stay in bed or lock them in.';
const earlyWakeAfterward = 'One unusual morning does not require a new sleep schedule. If an alarm, noise, a parent leaving, or another unusual event caused the wake-up, return to the normal routine. If early waking becomes a pattern, check bedtime, naps, morning light or noise, hunger, and overall sleep duration.';

const earlyWakeSituation = (id: string, title: string, doNow: string): SituationLike => {
  const guidance = { title, emoji: '🌅', doNow, sayThis: restTimeScript, avoidThis: earlyWakeAvoid, afterward: earlyWakeAfterward };
  return {
    id, title, emoji: '🌅', category: 'sleep',
    guidance: {
      baby: { ...guidance, doNow: 'Check feeding, diaper, comfort, and illness needs now. Keep stimulation low while you comfort your baby. The return-to-room and quiet-rest expectation is for toddlers and older children, not babies.', sayThis: 'I’m here. Let’s get you comfortable.', avoidThis: 'Do not delay a needed feed or expect a baby to follow a wake-up clock. Follow your usual safe-sleep routine.' },
      toddler: guidance, preschool: guidance, bigkid: guidance, tween: guidance,
    },
  };
};

export const newHelpNowSituations: SituationLike[] = [
  makeSituation('overwhelmed-now', 'I am completely overwhelmed', '😵‍💫', 'feelings', 'Everything feels like too much right now.'),
  makeSituation('meltdown-now', 'My child is having a meltdown', '🌋', 'feelings', 'The feelings are big and I need a next step.'),
  makeSituation('won-t-listen', 'My child will not listen', '🙉', 'behavior', 'I keep repeating myself and nothing is happening.'),
  makeSituation('refuses-now', 'My child is refusing', '🙅', 'behavior', 'We are stuck on a simple request.'),
  makeSituation('fighting-now', 'My kids are fighting', '💥', 'siblings', 'I need help getting through this moment.'),
  makeSituation('bedtime-now', 'Bedtime is falling apart', '🌙', 'sleep', 'We are stuck in a bedtime loop.'),
  earlyWakeSituation('early-wake-now', 'My child woke up too early—what should I do?', '1. Check that your child is safe and comfortable and address immediate needs. Keep lights and stimulation low.\n\n2. For a toddler or preschooler who is well and waking before the established wake-up time, calmly guide them back to bed or their room. Treat it as rest time: they do not have to fall asleep; quiet rest counts.\n\n3. Say the short rest-time script once, then keep interactions brief and calm.\n\n4. After a reasonable calm attempt, if they are clearly not settling, it is okay to start the day quietly rather than create a long battle.'),
  earlyWakeSituation('early-wake-return', 'Should I put my child back in bed if they wake before wake-up time?', 'Yes—if your toddler or preschooler is safe, comfortable, and their immediate needs are met, calmly walk them back to bed or their room. Keep the usual wake-up time as the expectation.\n\nAsk for quiet rest, not forced sleep. Keep lights dim and stimulation low, say the rest-time script, and give them a calm chance to settle. They do not have to fall back asleep.\n\nIf they clearly are not settling after a reasonable calm attempt, start the day quietly rather than turning repeated returns into a long battle.'),
  earlyWakeSituation('early-wake-crying', 'My child woke early and is crying or screaming—what do I do right now?', '1. Check for illness, pain, a wet or dirty diaper, toilet needs, fear, or unusual hunger. Meet those needs first. If the distress is unusual or does not ease, reassess rather than insisting on rest time.\n\n2. If those needs are okay, briefly comfort and reassure your child. Keep lights and stimulation low.\n\n3. Calmly guide your toddler or preschooler back to bed or their room and repeat the normal rest-time expectation. Quiet rest counts; they do not have to sleep.\n\n4. Avoid a long discussion or suddenly starting an exciting morning because the screaming got louder. After a reasonable calm attempt, if they clearly cannot settle, you can start the day quietly rather than continue a long battle.'),
  makeSituation('meal-now', 'Mealtime is a battle', '🍽️', 'meals', 'My child is refusing or melting down around food.'),
  makeSituation('leaving-now', 'We need to leave and my child will not cooperate', '🚪', 'daily', 'I need to get everyone moving.'),
  makeSituation('mess-now', 'The house is a mess and I do not know where to start', '🧺', 'daily', 'I need a realistic reset.'),
];

export const helpNowPremiumBySituation: Record<
  string,
  { doNow: string; sayThis: string; avoidThis: string; afterward: string }
> = {};

export const newHelpNowPremiumBySituation: Record<
  string,
  { doNow: string; sayThis: string; avoidThis: string; afterward: string }
> = {};

for (const s of newHelpNowSituations) {
  const defaults = {
    doNow: 'Pause and simplify. Get close, name what is happening, and give one clear next step.',
    sayThis: '“I hear you. We are going to do one thing at a time. I will help you.”',
    avoidThis: 'Avoid adding more instructions, arguing about the past, or trying to solve everything at once.',
    afterward: 'Once the moment is calm, we can look at what would make the next time easier.',
  };

  helpNowPremiumBySituation[s.id] = defaults;
  newHelpNowPremiumBySituation[s.id] = defaults;
}

export const helpNowDeepDiveBySituation: Record<
  string,
  Array<{ heading: string; body: string }>
> = {};

export const newHelpNowDeepDiveBySituation: Record<
  string,
  Array<{ heading: string; body: string }>
> = {};

for (const s of newHelpNowSituations) {
  const dive = [
    {
      heading: 'Why simplify first',
      body: 'When everyone is stressed, fewer words and one manageable step are easier to follow.',
    },
    {
      heading: 'What to do next',
      body: 'Get through the immediate moment first. You can solve the larger pattern later.',
    },
  ];

  helpNowDeepDiveBySituation[s.id] = dive;
  newHelpNowDeepDiveBySituation[s.id] = dive;
}

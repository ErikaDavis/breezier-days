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

export const newHelpNowSituations: SituationLike[] = [
  makeSituation('overwhelmed-now', 'I am completely overwhelmed', '😵‍💫', 'feelings', 'Everything feels like too much right now.'),
  makeSituation('meltdown-now', 'My child is having a meltdown', '🌋', 'feelings', 'The feelings are big and I need a next step.'),
  makeSituation('won-t-listen', 'My child will not listen', '🙉', 'behavior', 'I keep repeating myself and nothing is happening.'),
  makeSituation('refuses-now', 'My child is refusing', '🙅', 'behavior', 'We are stuck on a simple request.'),
  makeSituation('fighting-now', 'My kids are fighting', '💥', 'siblings', 'I need help getting through this moment.'),
  makeSituation('bedtime-now', 'Bedtime is falling apart', '🌙', 'sleep', 'We are stuck in a bedtime loop.'),
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

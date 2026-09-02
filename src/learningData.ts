export type LearningCategory = 'language' | 'thinking' | 'motor' | 'social' | 'independence' | 'creativity';
export type LearningTime = '5 min' | '10 min' | '20+ min';
export type LearningPrep = 'No prep' | 'Quick prep' | 'Some prep';
export type LearningLocation = 'Indoor' | 'Outdoor' | 'Both';
export type LearningEnergy = 'low' | 'medium' | 'high';

export type LearningActivity = {
  id: string;
  title: string;
  emoji: string;
  ages: string[];
  category: LearningCategory;
  time: LearningTime;
  prep: LearningPrep;
  location: LearningLocation;
  energy: LearningEnergy;
  learning: string;
  materials: string;
  steps: string[];
  description?: string;
  effort?: string;
};

export type LearningAgeGroup = {
  id: 'baby' | 'toddler' | 'preschool' | 'bigkid' | 'tween';
  label: string;
  range: string;
  emoji: string;
};

export type LearningPlanDay = {
  day: string;
  title: string;
  skill: string;
  easier: string;
  harder: string;
  activity: LearningActivity;
};

export type LearningPlan = {
  id: string;
  childId: number | null;
  childName: string | null;
  createdAt: string;
  dayLabel: string;
  focusArea: LearningCategory;
  goal: string;
  events: Array<{ label: string; time?: string }>;
  plan: LearningPlanDay[];
};

export const learningAgeGroups: LearningAgeGroup[] = [
  { id: 'baby', label: 'Baby', range: '0–12 months', emoji: '👶' },
  { id: 'toddler', label: 'Toddler', range: '1–2 years', emoji: '🧸' },
  { id: 'preschool', label: 'Preschool', range: '3–5 years', emoji: '🎨' },
  { id: 'bigkid', label: 'Big Kid', range: '6–9 years', emoji: '🧩' },
  { id: 'tween', label: 'Tween', range: '10–12 years', emoji: '🌱' },
];

export const learningCategories: Array<{ id: LearningCategory; label: string; emoji: string }> = [
  { id: 'language', label: 'Language', emoji: '💬' },
  { id: 'thinking', label: 'Thinking', emoji: '🧠' },
  { id: 'motor', label: 'Motor', emoji: '🏃' },
  { id: 'social', label: 'Social', emoji: '💛' },
  { id: 'independence', label: 'Independence', emoji: '🌱' },
  { id: 'creativity', label: 'Creativity', emoji: '🎨' },
];

const ages = ['baby', 'toddler', 'preschool', 'bigkid', 'tween'];

const makeActivity = (
  id: string,
  title: string,
  emoji: string,
  category: LearningCategory,
  time: LearningTime,
  prep: LearningPrep,
  location: LearningLocation,
  energy: LearningEnergy,
  learning: string,
  materials: string,
  steps: string[],
  ageList: string[] = ages,
): LearningActivity => ({
  id, title, emoji, ages: ageList, category, time, prep, location, energy,
  learning, materials, steps, description: learning, effort: energy,
});

export const learningActivities: LearningActivity[] = [
  makeActivity('laundry-sort', 'Sort the Laundry', '🧺', 'thinking', '5 min', 'No prep', 'Indoor', 'low',
    'Sorting by color, size, or who it belongs to builds early classification and attention.',
    'A small pile of clean laundry',
    ['Invite your child to make two or three groups.', 'Let them choose the sorting rule.', 'Name the pattern together.']),
  makeActivity('sock-match', 'Match the Socks', '🧦', 'thinking', '10 min', 'No prep', 'Indoor', 'low',
    'Matching pairs supports visual discrimination, memory, and problem-solving.',
    'Clean socks',
    ['Make a mixed pile.', 'Find matching pairs together.', 'Let your child explain how they know a pair matches.']),
  makeActivity('story-bag', 'Tell a Three-Item Story', '📚', 'language', '10 min', 'No prep', 'Indoor', 'low',
    'Building a story from a few objects strengthens vocabulary, sequencing, and imagination.',
    'Three household objects or toys',
    ['Choose three objects.', 'Start a simple story.', 'Let your child add what happens next.']),
  makeActivity('sound-hunt', 'Sound Hunt', '👂', 'language', '5 min', 'No prep', 'Both', 'medium',
    'Listening closely helps children notice sound, describe what they hear, and build attention.',
    'Nothing',
    ['Pause and listen.', 'Name sounds you hear.', 'See whether your child can find the source.']),
  makeActivity('cushion-path', 'Cushion Path', '🛋️', 'motor', '10 min', 'Quick prep', 'Indoor', 'high',
    'Simple movement challenges build balance, coordination, and body awareness.',
    'Cushions or pillows placed safely on the floor',
    ['Create a short path.', 'Walk, step, or crawl across.', 'Change one part and try again.']),
  makeActivity('water-pour', 'Pour and Transfer', '💧', 'motor', '10 min', 'Quick prep', 'Both', 'medium',
    'Pouring and transferring build hand control and concentration.',
    'Two cups and a little water; towel',
    ['Set up a small safe work area.', 'Pour from one cup to another.', 'Try different containers if your child enjoys it.']),
  makeActivity('pretend-store', 'Pretend Grocery Store', '🛒', 'social', '20+ min', 'No prep', 'Indoor', 'medium',
    'Pretend play supports language, flexible thinking, and social understanding.',
    'Empty food containers or pretend food',
    ['Set up a tiny store.', 'Take turns being shopper and cashier.', 'Let your child invent the rules.']),
  makeActivity('build-explain', 'Build and Explain', '🧩', 'thinking', '20+ min', 'No prep', 'Indoor', 'medium',
    'Building and explaining a plan supports problem-solving and expressive language.',
    'Blocks or household materials',
    ['Build something together.', 'Ask your child to explain the plan.', 'Try one small change and see what happens.']),
  makeActivity('cleanup-job', 'Give One Real Job', '🌱', 'independence', '5 min', 'No prep', 'Indoor', 'low',
    'A manageable household job builds responsibility and confidence.',
    'One ordinary household task',
    ['Choose one concrete job.', 'Show it once.', 'Step back and let your child try.']),
  makeActivity('nature-notice', 'Notice Five Things', '🌿', 'creativity', '10 min', 'No prep', 'Outdoor', 'medium',
    'Looking closely at ordinary surroundings builds observation and curiosity.',
    'Nothing',
    ['Find five things that are different.', 'Describe one detail about each.', 'Let your child choose the next thing to notice.']),
  makeActivity('freeze-dance', 'Freeze Dance', '🎵', 'motor', '5 min', 'No prep', 'Indoor', 'high',
    'Start-stop games support body control, listening, and attention.',
    'Music',
    ['Play music.', 'Move while it plays.', 'Pause the music and freeze.']),
  makeActivity('feelings-faces', 'Make Feeling Faces', '🙂', 'social', '5 min', 'No prep', 'Indoor', 'low',
    'Naming and acting out feelings helps children connect words with emotional experiences.',
    'Nothing',
    ['Name a simple feeling.', 'Make a face for it.', 'Ask when someone might feel that way.']),
  makeActivity('independent-bin', 'Independent Play Basket', '🧺', 'creativity', '20+ min', 'Quick prep', 'Indoor', 'low',
    'Open-ended materials invite self-directed play and problem-solving.',
    'A few familiar toys or household materials',
    ['Put out a small selection.', 'Tell your child they can choose what to do.', 'Stay nearby without directing every step.']),
  makeActivity('read-and-point', 'Read and Point', '📖', 'language', '5 min', 'No prep', 'Indoor', 'low',
    'Naming pictures and asking simple questions supports vocabulary and shared attention.',
    'A favorite book',
    ['Read one short book.', 'Pause to name pictures.', 'Let your child point, comment, or turn pages.']),
  makeActivity('count-snacks', 'Count the Snacks', '🍓', 'thinking', '5 min', 'No prep', 'Indoor', 'low',
    'Counting real objects makes early number concepts concrete and useful.',
    'Snack pieces',
    ['Put out a few pieces.', 'Count them together.', 'Ask how many there would be with one more.']),
];

const categoryDefaults: Record<LearningCategory, string> = {
  language: 'Build language through talking, reading, and back-and-forth play.',
  thinking: 'Practice flexible thinking through simple real-life problems.',
  motor: 'Build coordination through ordinary movement and hands-on play.',
  social: 'Practice connection, communication, and emotional understanding.',
  independence: 'Build confidence through manageable real-life responsibilities.',
  creativity: 'Protect time for open-ended play and making things.',
};

export type LearningPlanTemplate = {
  id: string;
  label: string;
  goal: string;
  focusArea: LearningCategory;
};

export const getAvailablePlanTemplates = (age: string): LearningPlanTemplate[] => {
  const validAge = learningAgeGroups.some((g) => g.id === age) ? age : 'preschool';
  return [
    { id: `${validAge}-language`, label: 'Language & Connection', goal: categoryDefaults.language, focusArea: 'language' },
    { id: `${validAge}-thinking`, label: 'Thinking & Problem-Solving', goal: categoryDefaults.thinking, focusArea: 'thinking' },
    { id: `${validAge}-independence`, label: 'Everyday Independence', goal: categoryDefaults.independence, focusArea: 'independence' },
    { id: `${validAge}-play`, label: 'Open-Ended Play', goal: categoryDefaults.creativity, focusArea: 'creativity' },
  ];
};

const ageActivities = (age: string, category?: LearningCategory) =>
  learningActivities.filter((a) => a.ages.includes(age) && (!category || a.category === category));

const buildPlan = (ageId: string, focusArea: LearningCategory, childName?: string, childId?: number | null): LearningPlan => {
  const pool = ageActivities(ageId, focusArea);
  const fallback = ageActivities(ageId);
  const source = pool.length ? pool : fallback;
  const selected = [0, 1, 2, 3].map((i) => source[i % source.length]);
  const today = new Date().toLocaleDateString();
  return {
    id: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    childId: childId ?? null,
    childName: childName ?? null,
    createdAt: today,
    dayLabel: 'A simple week',
    focusArea,
    goal: categoryDefaults[focusArea],
    events: selected.map((a) => ({ label: a.title })),
    plan: selected.map((activity, i) => ({
      day: `Day ${i + 1}`,
      title: activity.title,
      skill: activity.learning,
      easier: 'Make it shorter or simpler.',
      harder: 'Add one small challenge or invite your child to explain their thinking.',
      activity,
    })),
  };
};

export const buildLearningPlan = (
  ageId: string,
  _traits: string[] = [],
  childName?: string,
  childId?: number | null,
): LearningPlan => {
  const focusOrder: LearningCategory[] = ['language', 'thinking', 'independence', 'creativity'];
  const focus = focusOrder.find((category) => ageActivities(ageId, category).length) ?? 'thinking';
  return buildPlan(ageId, focus, childName, childId);
};

export const buildLearningPlanFromTemplate = (
  templateId: string,
  ageId: string,
  _traits: string[] = [],
  childName?: string,
  childId?: number | null,
): LearningPlan => {
  const template = getAvailablePlanTemplates(ageId).find((t) => t.id === templateId);
  return buildPlan(ageId, template?.focusArea ?? 'thinking', childName, childId);
};

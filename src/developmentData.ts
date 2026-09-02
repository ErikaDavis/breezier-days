export type DevelopmentAgeId = 'baby' | 'toddler' | 'preschool' | 'bigkid' | 'tween';

export type DevelopmentDeepDive = {
  heading: string;
  body: string;
};

export type DevelopmentGuidance = {
  title: string;
  emoji: string;
  common: string;
  watchFor: string;
  whatYouCanDo: string;
  whenToAsk: string;
  deepDive: DevelopmentDeepDive[];
};

export type DevelopmentTopic = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  guidance: Record<DevelopmentAgeId, DevelopmentGuidance>;
};

const baseGuidance = (title: string, emoji: string, common: string, whatYouCanDo: string): DevelopmentGuidance => ({
  title,
  emoji,
  common,
  watchFor: 'Look at the whole pattern over time rather than one isolated behavior.',
  whatYouCanDo,
  whenToAsk: 'Bring questions to your child’s pediatrician or another qualified child-development professional when you notice a persistent concern, loss of skills, or something that does not feel right to you.',
  deepDive: [
    { heading: 'What matters most', body: 'Children develop at different rates. The goal is to notice the overall pattern, support the next small step, and avoid unnecessary pressure.' },
    { heading: 'Keep it practical', body: 'Build support into ordinary routines, play, meals, reading, movement, and connection instead of turning every moment into a lesson.' },
  ],
});

export const developmentTopics: DevelopmentTopic[] = [
  {
    id: 'language',
    title: 'Language & Communication',
    subtitle: 'Talking, understanding, gestures, and conversation',
    emoji: '💬',
    guidance: {
      baby: baseGuidance('Early communication', '💬', 'Babies communicate through sounds, facial expressions, eye contact, gestures, and eventually words.', 'Narrate what you are doing, respond to your baby’s sounds, read simple books, and leave space for them to respond.'),
      toddler: baseGuidance('Toddler language', '💬', 'Toddlers often understand more than they can say and may use short words, gestures, and repeated phrases.', 'Use short sentences, name what your child is pointing to, expand their words, and give simple choices.'),
      preschool: baseGuidance('Preschool communication', '💬', 'Preschoolers are rapidly building vocabulary, storytelling, and back-and-forth conversation.', 'Talk about everyday events, read together, ask open questions, and give your child time to finish their thought.'),
      bigkid: baseGuidance('School-age communication', '💬', 'School-age children keep developing vocabulary, storytelling, listening, and the ability to explain ideas clearly.', 'Ask about their thinking, read widely together, and encourage them to explain how they reached an answer.'),
      tween: baseGuidance('Tween communication', '💬', 'Tweens are building more complex reasoning, humor, perspective-taking, and independent communication.', 'Listen without immediately correcting, ask what they think, and make room for private conversation.'),
    },
  },
  {
    id: 'motor',
    title: 'Movement & Motor Skills',
    subtitle: 'Big movements, coordination, and everyday physical skills',
    emoji: '🏃',
    guidance: {
      baby: baseGuidance('Early movement', '🏃', 'Babies build strength and coordination through reaching, rolling, sitting, crawling, and exploring movement.', 'Give safe floor time and opportunities to reach, grasp, roll, and move freely.'),
      toddler: baseGuidance('Toddler movement', '🏃', 'Toddlers are building balance, climbing, running, jumping, and hand skills through constant practice.', 'Offer safe places to climb, carry, push, pull, scribble, stack, and manipulate simple objects.'),
      preschool: baseGuidance('Preschool coordination', '🏃', 'Preschoolers are refining balance, jumping, throwing, catching, drawing, cutting, and other coordination skills.', 'Use playground time, balls, drawing, play dough, puzzles, and everyday tasks that use hands and whole-body movement.'),
      bigkid: baseGuidance('School-age coordination', '🏃', 'School-age children become more efficient and precise with movement and fine-motor tasks.', 'Encourage active play, sports or other movement they enjoy, and practical tasks that build coordination without making performance the goal.'),
      tween: baseGuidance('Growing coordination', '🏃', 'Tweens are still refining coordination while navigating growth spurts and changing body proportions.', 'Keep movement varied and enjoyable, focusing on skill, confidence, and participation rather than comparison.'),
    },
  },
  {
    id: 'social-emotional',
    title: 'Social & Emotional Growth',
    subtitle: 'Feelings, relationships, flexibility, and self-regulation',
    emoji: '💛',
    guidance: {
      baby: baseGuidance('Early social-emotional growth', '💛', 'Babies learn through responsive relationships, predictable routines, and co-regulation with trusted adults.', 'Respond consistently, name simple feelings, and use calm, predictable routines.'),
      toddler: baseGuidance('Toddler feelings', '💛', 'Toddlers have big feelings with still-developing self-control and language.', 'Stay close, keep limits simple, name the feeling, and help your child recover before expecting reasoning.'),
      preschool: baseGuidance('Preschool feelings', '💛', 'Preschoolers are learning to manage strong feelings, take turns, solve simple conflicts, and see another person’s point of view.', 'Practice emotion words, role-play simple problems, and coach instead of demanding perfect self-control.'),
      bigkid: baseGuidance('School-age emotional skills', '💛', 'School-age children are growing in perspective-taking, friendship skills, frustration tolerance, and problem-solving.', 'Talk through real situations, help them name the problem, and let them participate in solutions.'),
      tween: baseGuidance('Tween emotional growth', '💛', 'Tweens are becoming more independent while still needing connection, limits, and help with strong emotions.', 'Listen first, protect privacy when appropriate, and involve your child in solving recurring problems.'),
    },
  },
  {
    id: 'thinking',
    title: 'Thinking & Learning',
    subtitle: 'Attention, problem-solving, memory, and curiosity',
    emoji: '🧠',
    guidance: {
      baby: baseGuidance('Early learning', '🧠', 'Babies learn through repetition, cause and effect, movement, faces, sounds, and exploring objects.', 'Use simple sensory play, peekaboo, songs, and safe objects your baby can explore.'),
      toddler: baseGuidance('Toddler thinking', '🧠', 'Toddlers learn by repeating actions, testing what happens, and imitating adults.', 'Let your child try simple problems, sort, match, stack, pour, and help with everyday routines.'),
      preschool: baseGuidance('Preschool thinking', '🧠', 'Preschoolers are building early reasoning, pretend play, memory, classification, and flexible problem-solving.', 'Read, build, sort, count naturally, ask “What do you think will happen?”, and allow ordinary trial and error.'),
      bigkid: baseGuidance('School-age thinking', '🧠', 'School-age children become more able to plan, remember steps, use strategies, and explain their reasoning.', 'Let them solve manageable problems before stepping in and ask them to explain their thinking.'),
      tween: baseGuidance('Tween thinking', '🧠', 'Tweens are developing stronger planning, abstract thinking, judgment, and the ability to weigh multiple possibilities.', 'Let them help plan, compare options, and reflect on what worked rather than solving every problem for them.'),
    },
  },
  {
    id: 'independence',
    title: 'Independence & Everyday Skills',
    subtitle: 'Routines, self-help, responsibility, and confidence',
    emoji: '🌱',
    guidance: {
      baby: baseGuidance('Early independence', '🌱', 'Babies start practicing participation through reaching, holding, choosing, and joining familiar routines.', 'Let your baby safely participate in simple routines instead of doing every step automatically.'),
      toddler: baseGuidance('Toddler independence', '🌱', 'Toddlers strongly want to do things themselves, even when they still need a lot of help.', 'Offer small choices, simple jobs, and enough time to try before you step in.'),
      preschool: baseGuidance('Preschool independence', '🌱', 'Preschoolers can increasingly help with dressing, cleanup, simple food tasks, and routines with reminders.', 'Break routines into a few clear steps and let your child own the parts they can manage.'),
      bigkid: baseGuidance('School-age independence', '🌱', 'School-age children can take on more responsibility when expectations are clear and manageable.', 'Use checklists, routines, and real responsibilities while avoiding micromanagement.'),
      tween: baseGuidance('Tween independence', '🌱', 'Tweens need increasing ownership while still benefiting from structure, boundaries, and adult backup.', 'Shift from doing to coaching: agree on the goal, let them choose the method when appropriate, and review afterward.'),
    },
  },
  {
    id: 'play',
    title: 'Play & Creativity',
    subtitle: 'Imagination, exploration, and learning through play',
    emoji: '🎨',
    guidance: {
      baby: baseGuidance('Baby play', '🎨', 'Simple back-and-forth interaction and exploration are powerful forms of learning.', 'Use songs, faces, safe household objects, and floor play without needing lots of special toys.'),
      toddler: baseGuidance('Toddler play', '🎨', 'Toddlers learn through repetition, imitation, movement, and simple pretend play.', 'Provide open-ended materials and let your child repeat favorite play themes.'),
      preschool: baseGuidance('Preschool play', '🎨', 'Preschoolers use pretend play to practice language, social skills, planning, and creativity.', 'Follow your child’s lead, provide open-ended materials, and join briefly without taking over.'),
      bigkid: baseGuidance('School-age play', '🎨', 'School-age children can enjoy more complex projects, games, building, reading, and hobbies.', 'Protect some unstructured time and let your child pursue interests without turning every hobby into an achievement.'),
      tween: baseGuidance('Tween interests', '🎨', 'Tweens benefit from hobbies, creative projects, movement, reading, and downtime that they partly control.', 'Help provide access and time, then give your child room to develop genuine interests independently.'),
    },
  },
  {
    id: 'sleep',
    title: 'Sleep & Daily Rhythms',
    subtitle: 'Rest, routines, transitions, and changing sleep needs',
    emoji: '🌙',
    guidance: {
      baby: baseGuidance('Baby sleep', '🌙', 'Infant sleep changes a lot over the first year and is influenced by development, feeding, and family routines.', 'Keep the sleep environment safe, use a predictable wind-down routine, and talk with your pediatrician about specific sleep concerns.'),
      toddler: baseGuidance('Toddler sleep', '🌙', 'Toddlers often test boundaries around naps, bedtime, and transitions while their need for sleep is still substantial.', 'Keep routines predictable, offer limited choices, and respond consistently to bedtime resistance.'),
      preschool: baseGuidance('Preschool sleep', '🌙', 'Preschoolers may resist bedtime, outgrow naps, or have occasional fears and nighttime wake-ups.', 'Protect a calm routine, keep expectations steady, and adjust naps and bedtime based on the pattern you see.'),
      bigkid: baseGuidance('School-age sleep', '🌙', 'School-age children still need consistent sleep and may struggle when schedules become busy.', 'Protect a regular wind-down period and look at the whole evening routine rather than treating bedtime as one isolated moment.'),
      tween: baseGuidance('Tween sleep', '🌙', 'Tweens may experience changing sleep timing alongside school, activities, screens, and growing independence.', 'Keep a predictable baseline, talk openly about sleep, and involve your child in planning a routine they can actually follow.'),
    },
  },
];

export const getDevelopmentTopic = (id: string) => developmentTopics.find((topic) => topic.id === id) ?? null;

const keywordMap: Array<[string, string]> = [
  ['talk', 'language'],
  ['speak', 'language'],
  ['language', 'language'],
  ['words', 'language'],
  ['walking', 'motor'],
  ['running', 'motor'],
  ['climb', 'motor'],
  ['coordination', 'motor'],
  ['feelings', 'social-emotional'],
  ['emotion', 'social-emotional'],
  ['tantrum', 'social-emotional'],
  ['social', 'social-emotional'],
  ['learn', 'thinking'],
  ['learning', 'thinking'],
  ['attention', 'thinking'],
  ['independent', 'independence'],
  ['potty', 'independence'],
  ['play', 'play'],
  ['creative', 'play'],
  ['sleep', 'sleep'],
  ['nap', 'sleep'],
  ['bedtime', 'sleep'],
];

export const detectDevelopmentTopic = (text: string): string | null => {
  for (const [keyword, id] of keywordMap) {
    if (text.includes(keyword)) return id;
  }
  return null;
};

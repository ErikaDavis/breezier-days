import type { LearningActivity, LearningCategory } from './learningData';
type Seed = [string, LearningCategory, string, string, string];
// Small everyday invitations, not milestones to meet or a curriculum to finish.
const seeds: Record<string, Seed[]> = {
  baby: [
    ['One-page conversation', 'language', 'A board book', 'Name one picture while your awake baby looks. Pause for a glance or sound; turning pages is optional.', 'Hearing words and sharing attention'],
    ['Sound and pause', 'language', 'Your voice', 'Copy a sound your baby makes, then wait. For a newborn, speak softly and watch their response.', 'Early back-and-forth communication'],
    ['Where did it go?', 'thinking', 'A large baby-safe toy', 'For a baby already reaching, partly hide a toy behind your hand and reveal it. For younger babies, slowly move it within view.', 'Early object permanence and visual attention'],
    ['Shake and listen', 'thinking', 'An intact age-rated rattle', 'Shake it softly and pause. Offer it only if your baby is ready to grasp; otherwise let them watch you.', 'Cause and effect through sound'],
    ['Look and reach', 'motor', 'A baby-safe toy and clear floor space', 'Stay beside your awake baby during a brief floor session. Offer the toy within view; reaching or rolling is optional. Stop at tired cues.', 'Exploring movement at their own pace'],
    ['Copy a smile', 'social', 'Your face', 'Smile and pause face-to-face with your comfortable, awake baby. Looking or listening counts; no need to copy you yet.', 'Connection and early imitation'],
    ['Soft song, little pause', 'creativity', 'A familiar song', 'Sing a few lines softly, then pause for a look or sound. Follow your baby’s interest and stop when they turn away.', 'Rhythm and language exposure'],
    ['Feel and name', 'thinking', 'A clean soft washcloth', 'Hold the cloth and let your awake baby touch it with you. Say “soft.” Keep it away from their face and stop when they lose interest.', 'Supervised sensory exploration'],
  ],
  toddler: [
    ['Two-color tidy', 'thinking', 'Large blocks in two colors', 'Put one block in each group, then invite a match. Name colors without asking for correct answers.', 'Color matching and sorting'],
    ['Count as you put away', 'thinking', 'Three large toys', 'Put toys in a basket one at a time and count aloud. Your child can hand you a toy; counting along is optional.', 'Counting exposure and one-at-a-time grouping'],
    ['Find the round one', 'thinking', 'Large age-rated shape pieces', 'Offer two shapes and help match one to its space. Turn it together if it does not fit.', 'Shapes and simple puzzle solving'],
    ['Name and bring', 'language', 'A familiar toy', 'Say “Bring the ball” and gesture if helpful. Add a describing word as you play: “big ball.”', 'Vocabulary and one-step directions'],
    ['Scribble a path', 'motor', 'Large non-toxic crayons and paper', 'Make a short line and invite marks alongside it. Let your child choose the direction.', 'Early hand control'],
    ['Roll it back', 'social', 'A large soft ball', 'Sit close and roll the ball gently between you. Help with waiting; turns can be very short.', 'Shared attention and turn-taking'],
    ['Put the cloth away', 'independence', 'A clean cloth and low basket', 'Show where the cloth goes, then invite your child to put it there with you nearby.', 'Following a manageable household routine'],
    ['Animal sound story', 'creativity', 'A picture book', 'Choose an animal picture and make its sound. Let your child point, make a sound, or choose another page.', 'Imitation and playful vocabulary'],
  ],
  preschool: [
    ['Name-letter detective', 'language', 'Paper and a crayon', 'Write your child’s name clearly. Find its first letter on a book or package and say its sound together.', 'Name recognition and letter sounds'],
    ['Rhyme time', 'language', 'Nothing', 'Try a word like cat and take turns making rhymes, including silly made-up ones. Offer an example first.', 'Hearing and playing with word sounds'],
    ['Set the table, count the places', 'thinking', 'Unbreakable cups', 'Count who is eating and put one cup at each place. Check together whether anyone needs one.', 'Counting with a real purpose'],
    ['Make a repeating pattern', 'thinking', 'Large blocks in two colors', 'Start red-blue-red-blue. Invite the next block, then let your child invent a pattern for you.', 'Patterns and prediction'],
    ['Draw a message', 'motor', 'Paper and crayons', 'Draw a note for someone. Add lines, shapes, or any letters your child wants; write their dictated words alongside.', 'Pre-writing and meaningful marks'],
    ['What happened first?', 'social', 'A familiar story', 'Retell the beginning, middle, and end together. Ask how one character felt and what helped.', 'Sequencing and perspective-taking'],
    ['Leaf detective', 'creativity', 'A fallen leaf and paper', 'Look closely at a safe fallen leaf. Draw its edges or veins and wonder aloud why leaves differ.', 'Early nature observation'],
    ['Pack a little outing bag', 'independence', 'A small bag', 'Choose two things needed for a short outing. Let your child pack and check them with you.', 'Planning a simple sequence'],
  ],
  bigkid: [
    ['Read, predict, prove it', 'language', 'A book at a comfortable reading level', 'Read or listen to a short passage. Predict what happens next and point to one clue that supports the guess.', 'Reading comprehension and evidence'],
    ['Write a useful how-to', 'language', 'Paper and pencil', 'Write three steps for a skill you know. Ask someone to follow them, then fix any unclear instruction.', 'Writing clearly for a reader'],
    ['Word builder', 'language', 'A book or package', 'Choose an unfamiliar word, work out its meaning from context, then check with a dictionary or adult. Use it in a new sentence.', 'Vocabulary and spelling attention'],
    ['Snack budget challenge', 'thinking', 'A grocery receipt or price list', 'Choose two snack options within an imaginary budget. Add the prices and explain your choice; an adult checks any real purchase.', 'Practical addition and money decisions'],
    ['Paper bridge test', 'thinking', 'Paper, two books, and large blocks', 'Bridge a small gap with paper. Predict which fold holds more blocks, change one thing, and compare.', 'Fair testing and simple engineering'],
    ['Design your own movement circuit', 'motor', 'Clear floor space', 'Choose three safe movements and a comfortable number of repeats. Try the circuit, then adjust it to feel better.', 'Planning and body awareness'],
    ['Laundry skills mission', 'independence', 'Clean clothes', 'Choose a small pile, check a care label with an adult, fold it, and put it away. Find a folding method that works for you.', 'Contributing and learning a real household skill'],
    ['Create a six-panel comic', 'creativity', 'Paper and pencil', 'Invent a character with a problem. Draw six panels showing the attempt, setback, and solution; add dialogue if you like.', 'Story structure and creative ownership'],
    ['Neighborhood field notes', 'thinking', 'Paper and pencil', 'On an agreed safe route with an adult, record three observations and one question. Use a book later to investigate your question.', 'Observation and research curiosity'],
    ['Solve a shared-space problem', 'social', 'A shared shelf or play space', 'Ask what each person needs from the space. Sketch a fair arrangement, try it, and agree when to check back.', 'Negotiation and practical problem-solving'],
  ],
  tween: [
    ['Check a claim', 'language', 'Two books or adult-approved sources', 'Choose a claim about an interest. Compare two sources, note who made them, and explain what remains uncertain.', 'Research and critical reading'],
    ['Write a recommendation', 'language', 'Paper or an existing notes app', 'Recommend a book, game, or hobby in a short paragraph. Give two specific reasons, then edit out anything vague.', 'Persuasive writing and revision'],
    ['Recipe scaling challenge', 'thinking', 'A familiar recipe', 'Work out the quantities for half or twice the servings. Check units and calculations with someone before cooking.', 'Fractions and applied math'],
    ['Plan a small project', 'independence', 'Paper or an existing calendar', 'Choose a project you care about. List supplies, three steps, and a realistic first deadline. Start the smallest step today.', 'Organization and independent follow-through'],
    ['Design, test, improve', 'thinking', 'Paper and tape', 'Build a paper tower with a fixed amount of material. Measure its height, change one feature, and compare stability.', 'STEM design under constraints'],
    ['Own a household system', 'independence', 'A shelf, laundry routine, or shopping list', 'Agree on one useful responsibility and what “done” means. Design a simple system, try it, and suggest an improvement.', 'Responsibility and systems thinking'],
    ['Create for a real audience', 'creativity', 'Paper or tools already available', 'Make a short comic, review, illustration, or guide about an interest. Choose who it is for and ask for one useful piece of feedback.', 'Creative projects and purposeful revision'],
    ['Build a movement routine', 'motor', 'A safe space', 'Choose movements you enjoy, include an easy start and finish, and adjust the intensity to how you feel. Track what you want to improve.', 'Independent planning and body awareness'],
    ['Map a local question', 'thinking', 'Notebook', 'On an agreed safe route, investigate a question such as where shade is available. Record observations and sketch a map with a key.', 'Field research and interpreting data'],
    ['Work through a disagreement', 'social', 'A quiet moment', 'Write each person’s goal, name one shared need, and suggest two workable options. Invite feedback before choosing a plan.', 'Perspective-taking and negotiation'],
  ],
};
export const stageLearningActivities: LearningActivity[] = Object.entries(seeds).flatMap(([age, entries]) => entries.map(([title, category, materials, action, learning], i) => ({
  id: `${age}-everyday-${i}`, title, emoji: '📖', ages: [age], category,
  time: age === 'baby' ? '5 min' : '10 min', prep: 'No prep', location: /field notes|Map a local|Leaf detective/.test(title) ? 'Outdoor' : 'Indoor', energy: category === 'motor' ? 'medium' : 'low',
  learning, materials, steps: [action], description: action, effort: 'low',
})));
export const academicPreviews = (age: string) => stageLearningActivities.filter(a => a.ages.includes(age) && ['language', 'thinking'].includes(a.category)).map(a => ({title: a.title, area: '📖 Learning / Academic', description: a.steps[0]}));

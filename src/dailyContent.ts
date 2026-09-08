export type DailyStage = 'general' | 'expecting' | 'baby' | 'toddler' | 'preschool' | 'bigkid' | 'tween';

// A small editorial collection, separate from the deeper activity and plan tools.
const activities: Record<DailyStage, string[]> = {
  general: [
    'Take two minutes to notice the view from a window together. Name one thing each of you spots.',
    'Hum a familiar tune together. Let anyone who wants to join choose the next song.',
    'Tell a tiny story about something funny that happened in your family.',
    'Look at a family photo together and share one thing you remember.',
    'Spend three minutes following your child’s choice of play, with your phone put away.',
    'Take turns making a friendly face or gesture for the other person to copy.',
    'Share one small thing you enjoyed today. Children can point, gesture, or use words.',
  ],
  expecting: [
    'Choose a favorite song to share with your baby after they arrive.',
    'Write one sentence about a family tradition you would like to pass on.',
    'Spend five minutes with someone you trust, talking about something other than preparation.',
    'Pick a family photo and tell its story to someone close to you.',
    'Write a short note to your future self about what matters most to you as a parent.',
    'Choose a children’s book you would enjoy reading aloud when baby arrives.',
    'Recall a comforting childhood memory and share it with someone you trust.',
  ],
  baby: [
    'While your baby is awake and comfortable, sit face-to-face and copy one of their sounds. Pause for a reply.',
    'Sing a short, familiar song softly to your awake baby. Stop if they turn away or seem tired.',
    'Look at one page of a board book together. Name the picture your baby looks toward.',
    'Describe what you are doing during one ordinary care moment, using a warm, unhurried voice.',
    'Hold your awake baby securely near a window and name one thing you can see.',
    'Smile at your awake baby and wait quietly for their response. A glance counts.',
    'Show your baby your hand and slowly wiggle your fingers while you talk softly.',
  ],
  toddler: [
    'Sit together and roll a large soft ball back and forth for a few turns.',
    'Make three gentle animal movements together: stretch like a cat, waddle like a duck, reach like a giraffe.',
    'Let your toddler put two washcloths into a basket, then take them out again.',
    'Open a picture book and let your toddler choose one picture for you to name.',
    'Point to two familiar things in the room and say their colors together.',
    'Copy your toddler’s clap or wave, then pause to let them invent the next move.',
    'Let your toddler help wipe one low, clear surface with a damp cloth while you stay beside them.',
  ],
  preschool: [
    'Invent a two-minute story together: you name a character and your child chooses where it goes.',
    'Take turns copying three silly poses in a clear space.',
    'Ask your child to find three things of one color by pointing around the room.',
    'Draw one squiggle and let your child turn it into something. Swap roles.',
    'Invite your child to arrange a few books from smallest to biggest.',
    'Pretend to run a tiny café: take each other’s imaginary snack orders.',
    'Look out a window together and invent a name for something you notice.',
  ],
  bigkid: [
    'Take turns adding one sentence to a story that starts, “The doorbell rang, and outside was…”',
    'Invent a gentle three-move stretch routine and teach it to each other.',
    'Give each other clues about an object in the room until someone guesses it.',
    'Draw a quick map of your favorite room together and add one imaginary feature.',
    'Ask your child to teach you something they learned or discovered recently.',
    'Design a silly family mascot on scrap paper and give it a name.',
    'Take turns describing a favorite place without naming it. See if the other person can guess.',
  ],
  tween: [
    'Invite your tween to share one song they like and tell you what they enjoy about it.',
    'Ask your tween to lead a short stretch break, if they feel like joining.',
    'Trade one interesting fact each, then come up with a question you would like to explore.',
    'Sketch an imaginary room together, giving each person three must-have features.',
    'Let your tween teach you a quick skill or explain a hobby they enjoy.',
    'Invent a funny title for a movie about an ordinary moment from your day.',
    'Take turns naming a place you would like to visit and one thing you would do there.',
  ],
};

const tips: Record<DailyStage, string[]> = {
  general: ['Give one direction at a time, then leave space for a response.', 'Notice a specific effort: “You kept trying with that.”', 'Preview the next transition in a few simple words.', 'A familiar routine can make a busy moment easier to follow.', 'Offer connection before adding another instruction.', 'Ask what would help, and listen before offering a solution.', 'Keep a small promise today; everyday follow-through builds trust.', 'If a moment goes badly, a brief apology can help you reconnect.'],
  expecting: ['Name one practical kind of help you could ask for after baby arrives.', 'Agree on a simple way to tell your support person when you need a break.', 'Keep preparation small: one useful decision is enough for today.', 'You can change your mind about a plan as your family’s needs change.', 'Write down questions as they occur to you so you do not have to hold them all in your head.', 'Talk about which everyday chores someone else could take over.', 'It is okay to set a boundary around visits after baby arrives.', 'Make room for something you enjoy alongside baby preparation.'],
  baby: ['Pause after talking to your baby; their look or sound can be their turn.', 'Turning away can mean your baby needs a break from interaction.', 'Your familiar voice is enough; play does not need special equipment.', 'Follow your baby’s interest instead of trying to finish a whole book.', 'Keep little interactions brief and let your baby set the pace.', 'Describe one everyday action; ordinary care can be a moment of connection.', 'Repeating a favorite song is welcome; you do not need new entertainment each time.', 'Notice the small ways your baby asks for your attention, including a glance.'],
  toddler: ['Offer two acceptable choices when a decision is getting stuck.', 'Say what to do: “Feet on the floor” is clearer than “Stop that.”', 'Leave a little extra time for your toddler to try a small task.', 'Use the same short phrase for a familiar transition.', 'Stay close during a tricky moment and use fewer words.', 'Give a simple job with a clear finish, such as putting one book away.', 'Name the feeling briefly before restating a limit.', 'Repeat a favorite game without worrying about making it more complicated.'],
  preschool: ['Give a small preview before changing activities.', 'Describe the effort you noticed instead of asking for a perfect result.', 'Playful practice can make a routine easier to remember.', 'Offer one manageable responsibility and let your child try.', 'Let a story wander; conversation matters more than finishing the book.', 'Give your child time to answer before repeating a question.', 'When setting a limit, name what your child can do next.', 'A quick repair after a hard moment models how to begin again.'],
  bigkid: ['Ask what they have tried before stepping in to solve a problem.', 'Break a large task into one clear first step.', 'Offer feedback about a specific strategy or effort.', 'Leave room for harmless choices about how a task gets done.', 'Listen to the whole story before suggesting what to do.', 'Give a heads-up before interrupting focused play.', 'Practice a new responsibility together before expecting independence.', 'Ask whether they want help or just someone to listen.'],
  tween: ['Ask permission before giving advice about a small everyday problem.', 'Make room for an opinion that differs from yours.', 'Notice effort privately if public praise feels uncomfortable.', 'Explain the reason behind a boundary in a short, calm sentence.', 'Let them choose a manageable part of a shared task.', 'A low-pressure side-by-side chat may feel easier than lots of questions.', 'Respect a request for space and agree on when to reconnect.', 'Ask whether they want ideas, practical help, or a listening ear.'],
};

export function localDay(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function dailyContent(date: Date, stage: DailyStage = 'general', traits: readonly string[] = []) {
  const day = localDay(date);
  const index = (length: number) => ((day % length) + length) % length;
  const adaptation = stage === 'general' || stage === 'expecting' || stage === 'baby' ? ''
    : traits.includes('sensitive') || traits.includes('slow-to-warm-up') ? ' Start quietly and let them watch first.'
    : traits.includes('independent') || traits.includes('strong-willed') ? ' Let them choose who goes first.' : '';
  return { activity: activities[stage][index(activities[stage].length)] + adaptation, tip: tips[stage][index(tips[stage].length)] };
}

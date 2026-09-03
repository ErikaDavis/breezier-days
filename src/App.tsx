import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import { useCloudSync } from './useCloudSync';
import { checkPremiumStatus, createPremiumAccount, createCheckoutSession, createPortalSession, getPremiumUser, onPremiumAuthChange, signInToPremium, type PremiumUser } from './supabaseClient';
import { developmentTopics, getDevelopmentTopic, detectDevelopmentTopic, type DevelopmentGuidance } from './developmentData';
import {
  learningActivities, learningCategories, learningAgeGroups,
  buildLearningPlan, buildLearningPlanFromTemplate, getAvailablePlanTemplates,
  type LearningActivity, type LearningCategory, type LearningTime,
  type LearningPrep, type LearningLocation, type LearningEnergy,
  type LearningPlan, type LearningPlanDay,
} from './learningData';
import {
  helpNowCategories, newHelpNowSituations,
  helpNowPremiumBySituation as extendedHelpNowPremium,
  newHelpNowPremiumBySituation,
  helpNowDeepDiveBySituation as extendedHelpNowDeepDive,
  newHelpNowDeepDiveBySituation,
  type HelpNowCategory,
} from './helpNowData';

export type AgeId = 'baby' | 'toddler' | 'preschool' | 'bigkid' | 'tween';
type ParentingStageId = 'expecting' | 'newparent' | AgeId;

type AgeGroup = {
  id: AgeId;
  label: string;
  range: string;
  emoji: string;
};

type Activity = {
  title: string;
  description: string;
  time: string;
  category: string;
  emoji: string;
  ages: AgeId[];
  needs: Array<'outside' | 'calm' | 'play' | 'get-things-done' | 'lowest-effort'>;
  effort: 'Very low' | 'Low' | 'Medium';
  setup: 'None' | '2 min' | '5 min+';
  mess: 'None' | 'Low' | 'Some';
};

type HelpOption = {
  id: string;
  title: string;
  description: string;
  emoji: string;
};

type Guidance = {
  title: string;
  emoji: string;
  doNow: string;
  sayThis: string;
  avoidThis: string;
  afterward: string;
  thenTry?: string;
  ifNotWorking?: string;
  keepBusy?: string;
  contactParent?: string;
};

type DeepDive = {
  heading: string;
  body: string;
};

type PremiumHelpNow = {
  whyThisWorks: string;
  tryNext: string[];
  whenToReassess: string;
  whatToAvoid?: string[];
  ageSpecific?: Record<AgeId, string>;
  phrasesToSay?: string[];
  relatedHelp?: string[];
};

const premiumHelpNowBySituation: Record<string, PremiumHelpNow> = {
  'meltdown-now': {
    whyThisWorks: 'Meltdowns happen when a child\'s nervous system is overloaded — not when they are choosing to be difficult. Your calm presence helps co-regulate their nervous system. Reducing words reduces cognitive demand, which lets them settle faster.',
    tryNext: ['Note what triggered the meltdown — hunger, tiredness, transitions, or overstimulation are common triggers.', 'Build a 5-minute connection break into the routine before the next transition.', 'Practice a calming skill (deep breath, safe space) during a calm moment — not during the meltdown.'],
    whenToReassess: 'If meltdowns happen several times a day for more than two weeks, or involve self-harm or aggression you cannot safely manage, talk with your pediatrician or a child behavioral specialist.',
  },
  'hitting-now': {
    whyThisWorks: 'Children hit when they do not have the words or impulse control to handle a big feeling. Blocking the hit keeps everyone safe. Short, firm words work better than long explanations because your child\'s thinking brain is offline in that moment.',
    tryNext: ['Teach a replacement behavior during calm time: "When you are mad, you can say stop, stomp your feet, or ask for help."', 'Watch for the build-up — clenched fists, raised voice — and intervene before the hit happens.', 'Give positive attention when your child uses words or gentle hands.'],
    whenToReassess: 'If hitting continues daily for more than a few weeks, escalates in severity, or you feel unable to keep everyone safe, seek guidance from your pediatrician or a child behavioral specialist.',
  },
  'siblings-now': {
    whyThisWorks: 'Sibling conflict is developmentally normal — it is how children practice negotiation, boundaries, and repair. Stepping in for safety while letting them practice solving problems when calm builds long-term skills. Avoiding blame prevents the pattern of deciding who is the bad guy.',
    tryNext: ['Create brief one-on-one time with each child daily — even 5 minutes reduces competition.', 'Teach a simple conflict script: "I was using that. Can I have a turn?"', 'Notice and narrate when they share or help each other.'],
    whenToReassess: 'If conflict involves regular physical harm, one child seems persistently targeted, or the dynamic feels unsafe, consider consulting a family counselor or parenting coach.',
  },
  'sleep-now': {
    whyThisWorks: 'Sleep resistance is rarely about defiance. It usually means the child is overtired, overstimulated, testing a boundary, or processing something from the day. A predictable, boring routine helps the nervous system wind down. Keeping your response consistent is more important than the specific method you choose. Children settle faster when the routine is the same every night and the adult stays calm and boring.',
    tryNext: [
      'Track sleep patterns for 3 to 5 days. Note bedtime, how long it takes to fall asleep, night wakings, wake time, and nap times. Look for timing issues — bedtime may be too late, naps may need adjusting, or the child may be overtired.',
      'Move high-energy play, roughhousing, and screens to earlier in the day. Aim for at least 1 hour of screen-free wind-down time before bed.',
      'Add a transition warning 10 minutes before the wind-down starts. Use the same phrase every night so your child knows what is coming.',
      'If your child is fighting bedtime specifically (not night wakings), try moving bedtime 15 minutes earlier for a week. Many children need an earlier bedtime than parents expect.',
      'If your child is waking repeatedly during the night, check for environmental factors (temperature, noise, light) and consider whether separation anxiety or a recent change is playing a role.',
      'If your child is getting out of bed repeatedly, use a consistent, boring walk-back. No conversation, no negotiation, no extra cuddles. The same short phrase every time.',
      'If your child is waking very early (before 6 AM), check whether they are going to bed too early, whether morning light is entering the room, or whether an early nap is reinforcing the pattern.',
    ],
    whenToReassess: 'If sleep struggles persist for more than 2 weeks despite a consistent routine, or if your child snores, breathes through their mouth, sweats heavily during sleep, seems excessively tired during the day despite enough hours in bed, or you notice pauses in breathing, talk with your pediatrician. These can be signs of sleep-disordered breathing or other medical factors that need evaluation.',
    whatToAvoid: [
      'Avoid adding endless extra requests to the bedtime routine. One more story, one more glass of water, one more hug — each one teaches that stalling works.',
      'Do not turn bedtime into a long conversation. If your child wants to talk, schedule it for earlier in the evening and keep bedtime brief.',
      'Avoid keeping a baby awake to hit a wake-window target. An overtired baby is harder to settle, not easier.',
      'Avoid screens in the hour before bed. The blue light and stimulation make it harder for the brain to wind down.',
      'Avoid changing the routine every few nights. Consistency matters more than the specific method. Pick a routine and stick with it for at least a week before judging whether it works.',
      'Avoid turning night wakings into playtime or long interactions. Keep it dark, quiet, and boring.',
    ],
    ageSpecific: {
      baby: 'For babies, the most common cause of settling difficulty is overtiredness. Check wake windows — many babies are kept awake too long between naps. Also check hunger, diaper, temperature, and discomfort. If your baby is teething or going through a developmental leap, sleep may be disrupted for a few days. Keep the sleep space safe, dark, and calm. Use white noise. If your baby is consistently hard to settle, review their nap schedule and consider whether bedtime is too late.',
      toddler: 'For toddlers, bedtime resistance is often about testing boundaries and seeking connection. Keep the routine short (15 to 20 minutes), predictable, and the same every night. Offer one transition warning, then follow through. If they stall with requests, build one allowed request into the routine (one glass of water, one story) and hold the boundary after that. If they get out of bed, walk them back calmly with the same short phrase every time. Check whether they are overtired — many toddlers need an earlier bedtime than parents expect.',
      preschool: 'For preschoolers, fears and nightmares may emerge alongside boundary testing. Acknowledge fears without making bedtime bigger. A nightlight, a comfort item, or a brief check-in can help. If they keep getting up, use a consistent walk-back with no conversation. A bedtime check chart (a card you mark each time they stay in bed) can give them a sense of accomplishment. Check whether they are getting enough daytime activity and whether screens are interfering with the wind-down.',
      bigkid: 'For school-age children, sleep difficulties are often linked to schedule changes, stress, screens, or worries. Give them a wind-down routine they can follow independently. If they want to talk about their day, schedule that for before the wind-down, not during it. Remove screens from the bedroom. If they are waking early, check whether they are going to bed too early or whether morning light is entering the room. If anxiety is a factor, a brief worry journal before bed can help them process and set worries aside.',
      tween: 'For tweens, sleep difficulties are often tied to academic stress, social worries, screens, and changing sleep needs during early puberty. Help them create their own wind-down routine — one they design and own. Move all screens out of the bedroom and charge devices in a shared space. If they want to process their day, encourage a worry journal or a brief check-in before the wind-down starts. Early puberty can shift sleep timing, so watch for a natural later bedtime and adjust the schedule rather than fighting it. If anxiety or persistent insomnia is interfering with daytime functioning, talk with a healthcare professional.',
    },
    phrasesToSay: [
      'It is bedtime. I will help you get settled.',
      'Your job is to rest. I am nearby.',
      'You do not have to fall asleep right away. Your job is to rest.',
      'You are safe. It is time to rest. I am right here.',
      'I will check on you in a few minutes.',
    ],
    relatedHelp: ['overwhelmed-now', 'bedtime-now'],
  },
  'nap-now': {
    whyThisWorks: 'Nap resistance usually means one of three things: the child is tired but fighting sleep, the nap timing is off, or the child is genuinely outgrowing naps. Most children between 1 and 3 still benefit from a nap, and many preschoolers do too — but the window varies. The key is reading your child\'s cues rather than forcing sleep or dropping the nap too early. If a child is genuinely ready to stop napping, quiet time is a healthy bridge that still gives their body and brain a break without making sleep a battle.',
    tryNext: [
      'Track nap patterns for 3 to 5 days. Note when you tried the nap, how long it took to fall asleep (or whether they slept at all), and how they behaved afterward. Look for the sweet spot — the window where they are tired enough to sleep but not so overtired that they fight it.',
      'Try shifting the nap 15 to 30 minutes earlier or later. A nap that is too late in the day can interfere with bedtime, while a nap that comes too early may catch them before they are tired enough.',
      'Create a mini wind-down routine before the nap: dim the lights, close the curtains, read one short book or sing a quiet song. The routine should be a shorter version of the bedtime wind-down.',
      'If your child fights the nap but is clearly tired, try a "rest time" instead. Say: "You do not have to sleep, but your body needs to rest." Let them lie down with a book or a quiet toy in a dim room for 20 to 30 minutes. Sleep often comes on its own when the pressure is off.',
      'If your child consistently skips the nap but stays cheerful through the afternoon, they may be ready to drop it. Move bedtime 20 to 30 minutes earlier to compensate for the lost sleep.',
      'If your child skips the nap but becomes cranky, clingy, or falls asleep in the car by 4 PM, they still need the nap — the timing or approach may need adjusting, not the nap itself.',
      'For preschoolers (3 to 5 years), if naps are becoming a daily fight, try alternating nap days and quiet-time days. This gives you both a break while the transition settles.',
    ],
    whenToReassess: 'If your child is consistently cranky, falling asleep early in the evening, or having more meltdowns after dropping a nap, they may still need daytime rest. If sleep struggles persist for more than 2 weeks, or if your child snores, mouth-breathes during sleep, or seems excessively tired despite enough hours in bed, talk with your pediatrician.',
    whatToAvoid: [
      'Do not assume a child who fights naps is ready to drop them. Many children fight naps because they are overtired, not because they no longer need them.',
      'Avoid making nap time a power struggle. If your child feels pressured to sleep, the adrenaline of the conflict makes sleep harder, not easier.',
      'Do not let a late nap push bedtime too late. If the nap runs past mid-afternoon, it may need to be shorter or earlier rather than eliminated.',
      'Avoid skipping the nap entirely on busy days without an earlier bedtime. An overtired child has a harder time settling at night, not an easier one.',
      'Do not compare your child\'s nap schedule to another child\'s. Some 3-year-olds still nap every day and some do not — both can be normal.',
    ],
    ageSpecific: {
      baby: 'Babies under 12 months typically need 2 to 4 naps depending on age. If your baby fights a nap, check the wake window — they may be overtired (kept up too long) or undertired (put down too soon). Also check for hunger, a dirty diaper, teething, or overstimulation. A consistent nap routine in a dark, quiet space with white noise helps. If a specific nap is consistently hard, try adjusting the timing by 15 to 30 minutes rather than dropping it.',
      toddler: 'Toddlers (1 to 2 years) typically need 1 nap, usually lasting 1 to 2 hours, often in the early afternoon. If your toddler fights the nap, first check timing — many toddlers are put down too late, when they are already overtired. Try moving the nap 15 to 30 minutes earlier. If they resist, offer quiet time in a dim room instead of forcing sleep. Most toddlers still need a nap until at least 2.5 to 3 years, even if they fight it.',
      preschool: 'Preschoolers (3 to 5 years) are in the nap transition zone. Some still nap every day, some nap occasionally, and some have dropped it entirely. If your preschooler fights the nap daily for more than a week, try quiet time instead: 30 to 45 minutes of rest with a book or quiet toy in a dim room. If they fall asleep, great — if not, their body still got a break. Watch their afternoon behavior: if they are cranky or melting down by 4 or 5 PM, they still need the nap (or an earlier bedtime). If they sail through the afternoon, the nap may be phasing out naturally.',
      bigkid: 'Most school-age children (9 to 12 years) no longer nap. If your child seems tired during the day, focus on an earlier bedtime and consistent sleep schedule rather than adding a nap. A brief quiet time after school — 15 to 20 minutes of rest with a book or a quiet activity — can help them decompress without interfering with bedtime. Persistent daytime sleepiness at this age should be discussed with a healthcare professional.',
      tween: 'Tweens (9 to 12 years) no longer nap. If your tween seems tired during the day, focus on a consistent bedtime that allows 9 to 12 hours of sleep. Early puberty can shift their internal clock later, making an earlier bedtime feel unnatural — but the total sleep need is still high. A brief decompression period after school — 15 to 20 minutes of independent reading, music, or quiet time — can help them reset without interfering with bedtime. If daytime sleepiness persists despite adequate sleep, discuss it with a healthcare professional, as sleep quality, mood, or screen habits may be factors.',
    },
    phrasesToSay: [
      'Your body needs a rest. You do not have to sleep, but you need to lie down and rest.',
      'It is quiet time. Let us read a book and let your body relax.',
      'I can see you are tired. Let us try resting for a little while.',
      'You do not have to sleep. Just rest your body for a few minutes.',
      'It is time to slow down. Let us make the room quiet and cozy.',
    ],
    relatedHelp: ['sleep-now', 'overwhelmed-now', 'meltdown-now'],
  },
  'eat-now': {
    whyThisWorks: 'Refusing food is often about control, sensory sensitivity, or feeling pressured — not hunger. When you stop pressuring, your child can listen to their own body. Keeping meals predictable and pressure-free builds a healthy relationship with food over time.',
    tryNext: ['Keep a safe food on the plate alongside something new — no pressure to try it.', 'Eat the same food together without commenting on what your child is or is not eating.', 'Offer food every 2–3 hours so a missed meal does not become a crisis.'],
    whenToReassess: 'If your child consistently eats very little, loses weight, shows distress around food, or you notice gagging or swallowing difficulty, consult your pediatrician or a feeding specialist.',
  },
  'potty-now': {
    whyThisWorks: 'Accidents are part of learning, not misbehavior. A neutral response keeps your child from associating bathroom use with shame, which can cause withholding and make things worse. Predictable bathroom times help the body build a habit.',
    tryNext: ['Schedule bathroom breaks at transitions — after meals, before leaving, before bed.', 'Watch for constipation — hard stools can cause accidents even when a child knows the potty.', 'Let your child help clean up without making it a punishment.'],
    whenToReassess: 'If accidents continue for more than a few weeks after consistent training, involve pain or blood, or your child was previously dry for months and suddenly regresses, talk with your pediatrician.',
  },
  'dressed-now': {
    whyThisWorks: 'Clothing battles are usually about autonomy — your child wants a say. Offering two acceptable choices gives control within your boundary. Transition warnings reduce the friction of switching from play to getting ready.',
    tryNext: ['Lay out clothes the night before to reduce morning decisions.', 'Give a 5-minute warning before dressing time.', 'Make it a race or game for younger children — "Can you get your shirt on before I count to 10?"'],
    whenToReassess: 'If getting dressed is a daily battle for more than a few weeks, check whether mornings are too rushed, sleep is too short, or your child may have sensory sensitivities to certain fabrics or tags.',
  },
  'screen-now': {
    whyThisWorks: 'Screens are designed to be hard to leave. A warning helps your child\'s brain prepare for the transition. Following through consistently — even through a meltdown — teaches that limits are real, which actually reduces future meltdowns over time.',
    tryNext: ['Set a visible timer so the limit is external, not just you saying time is up.', 'Have the next activity ready before you turn the screen off.', 'Keep a consistent daily media window rather than negotiating each time.'],
    whenToReassess: 'If screen transitions are a daily crisis, consider whether your child is getting enough physical play and outdoor time, or whether a more structured media plan would help.',
  },
  'overwhelmed-now': {
    whyThisWorks: 'When you are overwhelmed, your nervous system is in fight-or-flight mode — the same state your child gets in during a meltdown. Taking a brief pause when everyone is safe lets your brain come back online. Repairing after losing patience teaches your child that mistakes happen and relationships can recover.',
    tryNext: ['Identify your top trigger — mornings, transitions, bedtime — and simplify one thing about it.', 'Build a 5-minute reset into your day — even if it is just sitting with a cup of tea.', 'Text one person today and ask for help with one specific thing.'],
    whenToReassess: 'If you feel overwhelmed most days, are crying frequently, feel numb or disconnected, or have thoughts of harming yourself or your child, please reach out to a healthcare professional or call a support line. You deserve support too.',
  },
  'losing-control-now': {
    whyThisWorks: 'When you feel like you might lose control, your nervous system is in full survival mode. Your brain is not making rational decisions right now — and that is exactly why getting physical space from your child is the safest move. You are not failing. You are protecting your child by stepping away.',
    tryNext: ['Call someone right now — a friend, family member, or neighbor. Even leaving a voicemail helps you feel less alone.', 'If another adult is present, hand off the children directly. Say: "I need a break. Can you take over for 10 minutes?"', 'If you are alone, put your child in a safe space and step outside or into the bathroom. Run cold water on your face — it triggers the dive reflex and can rapidly lower your heart rate.'],
    whenToReassess: 'If you have thoughts of harming your child, or if you feel like you might lose control frequently, please reach out for support. Call or text 988 (Suicide and Crisis Lifeline) or 1-800-273-8255. Postpartum Support International is also available at 1-800-273-8255. You deserve support, and asking for it is protecting your child.',
    phrasesToSay: [
      'I need to step away for a minute. I will be right back.',
      'I am getting frustrated. Can you take over for a few minutes while I reset?',
      'I am having a really hard moment right now. I need a break.',
    ],
    relatedHelp: ['overwhelmed-now', 'meltdown-now'],
  },
};

const deepDiveBySituation: Record<string, DeepDive[]> = {
  'meltdown-now': [
    { heading: 'What is happening in the brain', body: 'During a meltdown, the emotional brain takes over and the thinking brain goes offline. Your child is not choosing to be difficult — their nervous system is overwhelmed. This is why calm presence works better than reasoning.' },
    { heading: 'Why your calm matters', body: 'Children co-regulate with the adults around them. Your steady voice and body send a signal of safety that helps their nervous system settle. This is why reducing your own intensity is often the most effective intervention.' },
    { heading: 'The pattern to watch for', body: 'Track when meltdowns happen for a few days. Common patterns include hunger, missed naps, transitions, sensory overload, or too many demands. One or two triggers account for most meltdowns in most families.' },
  ],
  'hitting-now': [
    { heading: 'Why children hit', body: 'Hitting usually means a child has a feeling too big for their words. Young children lack impulse control — the part of the brain that stops a reaction is still developing. They need your help, not just your consequences.' },
    { heading: 'What replacement behavior to teach', body: 'After everyone is calm, practice what to do instead: say "stop," stomp feet, come to a trusted adult. Children need a specific alternative, not just "don\'t hit." Practice it when things are calm so it is available when emotions run high.' },
    { heading: 'When hitting is more than a phase', body: 'Frequent hitting that does not improve with consistent coaching, hitting that escalates in severity, or hitting you feel unable to manage safely may benefit from professional support. This is not a failure — it is getting the right tools.' },
  ],
  'siblings-now': [
    { heading: 'Why siblings fight', body: 'Sibling conflict is a normal part of development. Children practice negotiation, boundaries, and repair with siblings in a way they cannot with peers. The goal is not eliminating conflict — it is keeping it safe and teaching repair.' },
    { heading: 'What does not help', body: 'Deciding who started it, forcing immediate apologies, or comparing children tends to increase conflict. Each child needs to feel seen individually, not as half of a pair.' },
    { heading: 'What builds long-term peace', body: 'Individual connection time with each child, clear family rules about bodies and belongings, and teaching a simple conflict script all reduce fighting over time. The first few weeks of a new approach may see more conflict before it improves.' },
  ],
  'sleep-now': [
    { heading: 'Why sleep resistance happens', body: 'Sleep resistance usually means one of three things: the child is overtired, overstimulated, or testing a boundary. All three are normal. The fix is a consistent, calm routine — not a different strategy every night. When the routine is predictable, the child\'s nervous system learns to wind down on cue.' },
    { heading: 'The most common timing mistake', body: 'Bedtime is often too late. Many children need an earlier bedtime than parents expect. If your child takes more than 30 minutes to fall asleep regularly, try moving bedtime 15 minutes earlier for a week. Also check naps — a late or skipped nap can leave a child overtired, which makes settling harder, not easier.' },
    { heading: 'Separation anxiety and nighttime fears', body: 'Around 12 to 18 months and again in the preschool years, separation anxiety can peak and make bedtime harder. Nighttime fears and nightmares often emerge between ages 3 and 5. Acknowledge the fear without making bedtime bigger. A nightlight, a comfort item, and a brief, consistent check-in can help. Avoid turning the fear into a long conversation or investigation at bedtime.' },
    { heading: 'Screens, stimulation, and the wind-down', body: 'Screens in the hour before bed make it harder for the brain to wind down. The blue light suppresses melatonin and the content keeps the mind active. Aim for at least 1 hour of screen-free wind-down time. Move high-energy play and roughhousing earlier in the day. The last hour should be calm, quiet, and predictable.' },
    { heading: 'When to look deeper', body: 'If a consistent routine does not help after two weeks, or if your child snores, mouth-breathes, sweats heavily during sleep, or seems exhausted despite enough hours in bed, talk with your pediatrician about possible sleep-disordered breathing or other medical factors. Also seek guidance if sleep difficulties are causing significant distress for the family or affecting your child\'s daytime behavior.' },
  ],
  'nap-now': [
    { heading: 'Is it the nap or the timing?', body: 'When a child fights a nap, the first question is not whether they still need naps — it is whether the nap is at the right time. Most nap resistance comes from putting a child down too late, when they are already overtired. An overtired child has more cortisol and adrenaline in their system, which makes it harder to fall asleep, not easier. Try moving the nap 15 to 30 minutes earlier for a few days before concluding the nap is over.' },
    { heading: 'Tired but fighting it', body: 'Some children are clearly tired — rubbing eyes, yawning, getting clumsy — but still fight the nap. This is common around 12 to 18 months and again around 3 years. The child wants to keep playing but their body needs rest. In this case, take the pressure off: offer quiet time in a dim room with a book or a familiar comfort item. Say "You do not have to sleep, but your body needs to rest." Sleep often comes on its own when the power struggle is removed.' },
    { heading: 'The quiet-time bridge', body: 'If your child is transitioning away from naps, quiet time is the healthy bridge. It gives their body and brain a break without making sleep a battle. Aim for 20 to 45 minutes of rest in a dim, calm space. A book, a stuffed animal, or a quiet audio story works well. Some days they will sleep, some days they will not — both are okay. The point is the rest, not the sleep.' },
    { heading: 'Signs they may be outgrowing naps', body: 'A child may be ready to drop the nap if they consistently skip it for 1 to 2 weeks, fall asleep takes more than 30 minutes of fighting, the nap pushes bedtime past a reasonable hour, or they go to bed significantly later on days they do nap. But even after dropping the nap, watch for afternoon meltdowns, car-seat snoozes, or early-evening crashes — these are signs they still need some form of daytime rest. Move bedtime 20 to 30 minutes earlier to compensate.' },
    { heading: 'When to look deeper', body: 'If your child seems excessively tired during the day despite what seems like enough sleep, snores, mouth-breathes, or has pauses in breathing during sleep, talk with your pediatrician. These can be signs of sleep-disordered breathing, which can make naps and nighttime sleep both harder regardless of timing or routine.' },
  ],
  'eat-now': [
    { heading: 'Why pressure backfires', body: 'When adults push, bribe, or beg a child to eat, the child often eats less, not more. Pressure turns meals into a power struggle, and the child learns that food is a way to get attention or control.' },
    { heading: 'The division of responsibility', body: 'You decide what food is offered and when. Your child decides whether and how much to eat. This approach reduces mealtime stress and helps children learn to listen to their own hunger and fullness.' },
    { heading: 'When to look deeper', body: 'Consistent food refusal, weight loss, gagging, distress around food, or eating only a very narrow range of foods for weeks may benefit from a feeding specialist or pediatric evaluation.' },
  ],
  'potty-now': [
    { heading: 'Why accidents are not setbacks', body: 'Accidents are how children learn. The brain-body connection for using the toilet takes time to build. A neutral response keeps the process low-pressure, which is what allows the habit to form.' },
    { heading: 'The constipation connection', body: 'Many accidents are caused by constipation, even when a child seems to have regular bowel movements. Hard or painful stools can cause leaking, withholding, and frequent small accidents. If accidents persist, ask your pediatrician to check for constipation.' },
    { heading: 'When to look deeper', body: 'Regression after months of dryness, pain, blood, or accidents that persist for more than a few weeks despite consistent routines should be discussed with your pediatrician.' },
  ],
  'dressed-now': [
    { heading: 'Why clothing battles happen', body: 'Getting dressed is a transition — from play to leaving, from pajamas to daytime. Transitions are hard for young brains. Add in a child\'s growing need for autonomy and you get resistance. The fix is structure, not more pressure.' },
    { heading: 'What makes mornings easier', body: 'Laying clothes out the night before, giving a 5-minute warning, and offering two choices instead of asking "what do you want to wear?" all reduce friction. The fewer decisions in the moment, the smoother it goes.' },
    { heading: 'When to look deeper', body: 'If clothing distress is extreme — meltdowns over specific fabrics, tags, or fits that go beyond typical preference — consider whether sensory sensitivities are involved. An occupational therapy evaluation can help identify sensory needs.' },
  ],
  'screen-now': [
    { heading: 'Why screens are hard to leave', body: 'Screens are designed to keep attention. The brain gets a steady stream of stimulation that real life cannot match. Turning off a screen feels like a drop in stimulation — which is why children react strongly.' },
    { heading: 'What makes transitions easier', body: 'A visible timer, a warning before the limit, and a ready next activity all help. The key is that the limit is predictable and consistent — not negotiated each time. Children adjust to consistent limits faster than they adjust to unpredictable ones.' },
    { heading: 'When to look deeper', body: 'If screen transitions are a daily crisis that does not improve, consider whether your child is getting enough physical play, outdoor time, and face-to-face connection. A family media plan with clear rules can help reduce daily friction.' },
  ],
  'overwhelmed-now': [
    { heading: 'Why you matter most', body: 'Your regulation is the foundation. A child\'s nervous system learns to calm by mirroring yours. When you are at your limit, the most effective thing you can do is lower your own intensity — not solve every problem at once.' },
    { heading: 'What actually helps', body: 'Lowering the bar for the next hour is more effective than trying to fix everything. One safe activity, one simple meal, and five minutes of quiet can reset the trajectory of the day. Perfection is not the goal — safety and connection are.' },
    { heading: 'When to get support', body: 'If you feel overwhelmed most days, cry frequently, feel numb or disconnected, or have thoughts of harming yourself or your child, please reach out. Postpartum Support International (1-800-273-8255) and the 988 Suicide and Crisis Lifeline are available. You deserve support.' },
  ],
  'losing-control-now': [
    { heading: 'Why getting space is the right thing to do', body: 'When you feel like you might lose control, your body is in a full stress response. In that state, your thinking brain is largely offline. Stepping away from your child — when they are safe — is not abandoning them. It is the most protective thing you can do. You are preventing harm.' },
    { heading: 'What to do if you are alone', body: 'Put your child in the safest space available — a crib, a gated room, or a childproofed area. Step outside, into the bathroom, or to a window. Splash cold water on your face. Take 60 seconds. Your child will not be harmed by crying for a few minutes while you calm down.' },
    { heading: 'What to do if another adult is present', body: 'Hand off directly. You do not need to explain or justify. Say: "I need a break. Can you take over for 10 minutes?" Take that time to reset — not to plan or problem-solve. Come back when you can speak calmly.' },
    { heading: 'When to get support', body: 'If you feel like you might lose control frequently, or if you have thoughts of harming your child, please reach out. Call or text 988, or call Postpartum Support International at 1-800-273-8255. Asking for help is protecting your child. You are not alone.' },
  ],
  fever: [
    { heading: 'What matters most', body: 'Look at your child as a whole: how they are breathing, drinking, waking, interacting, and whether they are getting better or worse—not just the temperature number.' },
    { heading: 'When to get medical help', body: 'A baby younger than 3 months with a temperature of 100.4°F (38°C) or higher needs prompt medical evaluation. Seek urgent care for serious symptoms such as trouble breathing, extreme sleepiness or difficulty waking, seizure, stiff neck, severe dehydration, or a concerning purple or bruise-like rash.' },
    { heading: 'A simple next step', body: 'Check the temperature with an appropriate digital thermometer, offer fluids when appropriate, keep your child comfortable, and write down the temperature, timing, and other symptoms to share with their healthcare professional.' },
  ],
  jealous: [
    { heading: 'What is underneath the jealousy', body: 'Jealousy after a new baby often shows up as a request for connection. Your older child may be reacting to a change in attention, routines, or their sense of security.' },
    { heading: 'What helps', body: 'Name the feeling without rewarding unsafe behavior, protect the baby, and create small predictable moments that belong just to your older child. Even five minutes of focused connection can be meaningful.' },
    { heading: 'Over the next few days', body: 'Look for opportunities to notice your older child when they are doing something well, involve them only when they want to help, and avoid making them responsible for the baby.' },
  ],
  options: [
    { heading: 'What each option involves', body: 'Breastfeeding requires learning positioning and latch and may involve early discomfort. Formula feeding involves bottles and following safe preparation guidelines. Combination feeding blends both. Pumping or expressed milk lets you feed breast milk by bottle and involves a pump, storage bags, and cleaning routines.' },
    { heading: 'Questions to think about', body: 'What is your daily schedule like? Will you return to work? Who will help with feeding? How does your body feel about each option? There is no single right answer — the best plan is the one that works for your family and can adapt over time.' },
    { heading: 'When to ask for feeding support', body: 'Ask a lactation consultant or your healthcare provider if you have pain, concerns about supply, questions about pumping, or feel unsure about your plan. Many hospitals and birth centers offer feeding support after discharge, and early help often prevents bigger challenges.' },
  ],
  bag: [
    { heading: 'Optional items', body: 'A robe, your own pillow, entertainment (book or downloaded shows), a nursing pillow, or a special outfit for photos are all optional. Pack them only if they bring comfort or joy — they are not essentials.' },
    { heading: 'What can wait until later', body: 'Most baby items beyond the going-home outfit and a few diapers can wait. You do not need a full diaper bag, a stroller at the hospital, or future-stage clothing packed ahead. Focus on the first 24–48 hours.' },
    { heading: 'Check your hospital or birth center list', body: 'Many hospitals provide basics like diapers, wipes, pads, and infant shirts. Some restrict certain items like snacks, electronics, or personal pillows. Ask your provider or check their website for a specific packing list so you do not overpack or miss a rule.' },
  ],
};

const fallbackDeepDive = (): DeepDive[] => [];

type Situation = {
  id: string;
  title: string;
  emoji: string;
  guidance: Record<AgeId, Guidance>;
  category?: HelpNowCategory;
  ages?: AgeId[];
};

const ageGroups: AgeGroup[] = [
  { id: 'baby', label: 'Baby', range: '0–12 months', emoji: '👶' },
  { id: 'toddler', label: 'Toddler', range: '1–2 years', emoji: '🧸' },
  { id: 'preschool', label: 'Preschool', range: '3–5 years', emoji: '🦋' },
  { id: 'bigkid', label: 'School Age', range: '6–8 years', emoji: '🎒' },
  { id: 'tween', label: 'Tween', range: '9–12 years', emoji: '🧩' },
];

const helpOptions: HelpOption[] = [
  { id: 'activities', title: 'Give me an activity', description: 'Something fun to do right now', emoji: '✨' },
  { id: 'feelings', title: 'Big feelings & tantrums', description: 'Meltdowns, hitting, screaming & more', emoji: '😤' },
  { id: 'potty', title: 'Potty training', description: 'Getting started, accidents & resistance', emoji: '🚽' },
  { id: 'sleep', title: 'Sleep', description: 'Wake windows, naps, bedtime & safe sleep', emoji: '😴' },
  { id: 'mealtime', title: 'Mealtime', description: 'Healthy food, picky eating & routines', emoji: '🍽️' },
  { id: 'siblings', title: 'Sibling problems', description: 'Fighting, sharing, jealousy & boundaries', emoji: '👧' },
  { id: 'bullying', title: 'Bullying & Friendship Problems', description: 'Teasing, exclusion, conflict, school & online problems', emoji: '🛡️' },
  { id: 'health', title: 'Health & Everyday Care', description: 'Everyday health questions & when to seek care', emoji: '🩺' },
  { id: 'development', title: 'Development & Milestones', description: 'Speech, movement, thinking, social & more', emoji: '🌱' },
];

const stageOptions: Array<{ id: ParentingStageId; label: string; description: string; emoji: string; range: string }> = [
  { id: 'expecting', label: 'Baby on the way', description: 'Pregnancy support and preparation — even if you already have children', emoji: '🤍', range: 'Pregnancy · before baby arrives' },
  { id: 'newparent', label: 'New Parent', description: 'Support for those first weeks and months', emoji: '🍼', range: 'Newborn + first months' },
  { id: 'baby', label: 'Baby', description: 'Feeding, sleep, development & everyday care', emoji: '👶', range: '0–12 months' },
  { id: 'toddler', label: 'Toddler', description: 'Big feelings, routines, independence & play', emoji: '🧸', range: '1–2 years' },
  { id: 'preschool', label: 'Preschooler', description: 'Behavior, learning, friendships & getting ready for school', emoji: '🦋', range: '3–5 years' },
  { id: 'bigkid', label: 'School Age', description: 'Growing independence, emotions, school & family life', emoji: '🎒', range: '6–8 years' },
  { id: 'tween', label: 'Tween', description: 'Growing independence, friendships, school stress & identity', emoji: '🧩', range: '9–12 years' },
];

const expectingHelpOptions: HelpOption[] = [
  { id: 'expecting-prep', title: 'What should I focus on first?', description: 'The few things worth doing before baby arrives', emoji: '📝' },
  { id: 'expecting-needs', title: 'What do I actually need?', description: 'Skip the overbuying and decision overload', emoji: '🛒' },
  { id: 'expecting-pack', title: 'What should I pack?', description: 'A simple hospital or birth-center checklist', emoji: '👜' },
  { id: 'expecting-feeding', title: 'Feeding prep', description: 'Understand your options without the pressure', emoji: '🤱' },
  { id: 'expecting-overwhelmed', title: 'I feel overwhelmed', description: 'One simple next step instead of a giant list', emoji: '💛' },
  { id: 'expecting-older-children', title: 'Preparing my older child', description: 'Help the family adjust without making them responsible for the baby', emoji: '👧' },
];


const pregnancyTodayOptions: Record<string, { label: string; emoji: string; focus: string; action: string; skip: string }> = {
  nauseous: { label: 'I feel nauseous', emoji: '🤢', focus: 'Keep today simple and choose foods and routines that feel tolerable.', action: 'Pick one easy food or drink you can tolerate and make the next hour as low-effort as possible.', skip: 'Skip nonessential chores, complicated meals, and anything that can wait.' },
  exhausted: { label: 'I am exhausted', emoji: '😮‍💨', focus: 'Protect your energy for what truly matters today.', action: 'Choose one necessary task, then give yourself permission to sit or rest while your child safely plays nearby.', skip: 'Skip extra errands, ambitious cleaning, and activities that require you to be “on.”' },
  sore: { label: 'I feel sore or uncomfortable', emoji: '🛋️', focus: 'Build the day around comfort and avoid making ordinary discomfort a productivity challenge.', action: 'Set up one comfortable place to sit, keep essentials nearby, and choose a low-effort activity or independent play for your child.', skip: 'Skip unnecessary lifting, rushing, and tasks that can reasonably wait.' },
  overwhelmed: { label: 'I feel overwhelmed', emoji: '🌊', focus: 'You do not need to prepare for everything at once.', action: 'Choose the single thing that would make today easier. Do that one thing and stop.', skip: 'Let the rest of the preparation list wait.' },
  anxious: { label: 'I feel anxious', emoji: '💛', focus: 'You do not have to solve every unknown today.', action: 'Write down the one question or concern you want to bring to your prenatal provider, then return to what is actually in front of you today.', skip: 'Skip reassurance-seeking rabbit holes and unnecessary planning for scenarios that have not happened.' },
  good: { label: 'I feel good', emoji: '☀️', focus: 'You can use good energy without turning it into a giant to-do list.', action: 'Pick one practical preparation task you will genuinely appreciate later, then leave some time open.', skip: 'Skip the urge to “catch up” on everything just because you feel good today.' },
  low: { label: 'I need a low-energy day', emoji: '🌿', focus: 'A lower-energy day is still a productive day if it protects you and your family.', action: 'Keep the essentials, choose simple food, and let your child have ordinary independent play while you rest nearby when safe.', skip: 'Skip anything that exists mainly because you feel like you should be doing more.' },
};

const newParentHelpOptions: HelpOption[] = [
  { id: 'feeding', title: 'Infant feeding', description: 'Breastfeeding, formula, pumping & combo feeding', emoji: '🤱' },
  { id: 'sleep', title: 'Newborn sleep', description: 'Safe sleep, wakefulness, naps & night waking', emoji: '😴' },
  { id: 'newparent-care', title: 'Taking care of me', description: 'Small ways to reduce the mental load', emoji: '💛' },
  { id: 'newparent-leave', title: 'Leaving the house', description: 'A simpler way to get out the door', emoji: '🚪' },
  { id: 'newparent-crying', title: 'Baby is crying', description: 'A calm checklist for the moment you need it', emoji: '👶' },
  { id: 'health', title: 'Baby health & everyday care', description: 'General education and when to seek help', emoji: '🩺' },
];

const activities: Activity[] = [
  { title: 'Tummy Time Treasure Hunt', description: 'Place a few safe, interesting objects within reach and encourage your baby to look, reach, roll, and explore.', time: '10–15 min', category: 'Play', emoji: '👶', ages: ['baby'], needs: ['play', 'lowest-effort'], effort: 'Low', setup: '2 min', mess: 'None' },
  { title: 'Mirror & Face Play', description: 'Sit with your baby near a baby-safe mirror. Make faces, smile, talk, and let your baby watch you.', time: '10–15 min', category: 'Connection', emoji: '🪞', ages: ['baby'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Sing & Clap Together', description: 'Sing a favorite song while gently clapping, bouncing, or moving along with the rhythm.', time: '5–10 min', category: 'Music', emoji: '🎵', ages: ['baby'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Read a Board Book', description: 'Choose a sturdy board book and let your baby touch the pages while you point to pictures and talk.', time: '10–20 min', category: 'Reading', emoji: '📚', ages: ['baby'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Peekaboo', description: 'Try peekaboo with your hands, a blanket, or around a doorway.', time: '5–10 min', category: 'Play', emoji: '🙈', ages: ['baby'], needs: ['play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Kitchen Helper', description: 'Give your little one a simple safe job such as washing fruit, stirring, or carrying a lightweight item.', time: '15–20 min', category: 'Everyday', emoji: '🥣', ages: ['toddler', 'preschool'], needs: ['get-things-done', 'play'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Color Hunt', description: 'Choose one color and search around the house or yard for things that match.', time: '10–20 min', category: 'Play', emoji: '🌈', ages: ['toddler', 'preschool'], needs: ['play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Pretend Doctor', description: 'Set up a pretend doctor visit and let your child check your heartbeat or care for a stuffed animal.', time: '15–30 min', category: 'Pretend', emoji: '🩺', ages: ['toddler', 'preschool'], needs: ['play'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Cozy Reading Fort', description: 'Grab blankets and pillows and make a little reading space together.', time: '20–30 min', category: 'Calm', emoji: '📚', ages: ['toddler', 'preschool', 'bigkid'], needs: ['calm', 'play'], effort: 'Low', setup: '5 min+', mess: 'Low' },
  { title: 'Go on a Bug Hunt', description: 'Look outside for butterflies, ants, caterpillars, leaves, flowers, and other tiny discoveries.', time: '15–30 min', category: 'Outside', emoji: '🦋', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'None' },
  { title: 'Sidewalk Art', description: 'Use sidewalk chalk to draw roads, flowers, animals, or a giant picture together.', time: '20–40 min', category: 'Creative', emoji: '🖍️', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Some' },
  { title: 'Mini Obstacle Course', description: 'Create a course for jumping, crawling, balancing, and moving using things you already have.', time: '20–30 min', category: 'Active', emoji: '🏃', ages: ['preschool', 'bigkid'], needs: ['play', 'outside'], effort: 'Medium', setup: '5 min+', mess: 'Some' },
  { title: 'Make Up a Story', description: 'Pick three random objects and create a silly story together.', time: '15–25 min', category: 'Imagination', emoji: '📖', ages: ['preschool', 'bigkid'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Treasure Hunt', description: 'Hide a few objects and make simple clues for your child to follow.', time: '20–30 min', category: 'Adventure', emoji: '🗺️', ages: ['bigkid'], needs: ['outside', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Low' },
  { title: 'Sock Toss Laundry Game', description: 'While you fold laundry, let your child make a basket with rolled socks and practice tossing them in.', time: '10–15 min', category: 'Everyday', emoji: '🧺', ages: ['toddler', 'preschool', 'bigkid'], needs: ['get-things-done', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Water Play at the Sink', description: 'Set out a few cups and a small amount of water for supervised pouring and scooping play.', time: '10–15 min', category: 'Calm', emoji: '💧', ages: ['toddler', 'preschool'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Low', setup: '2 min', mess: 'Some' },
  { title: 'Backyard Nature Basket', description: 'Collect safe natural items such as leaves, pinecones, and sticks, then sort or talk about what you found.', time: '15–25 min', category: 'Outside', emoji: '🌿', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'Low' },
  { title: 'Bubble Chase', description: 'Blow bubbles and let your child chase, pop, count, or try to catch them.', time: '15–20 min', category: 'Outside', emoji: '🫧', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: '2 min', mess: 'Low' },
  { title: 'Kitchen Transfer Game', description: 'Set out cups, spoons, and a small bowl and let your child practice moving dry, safe items from one container to another.', time: '15–20 min', category: 'Everyday', emoji: '🥣', ages: ['toddler', 'preschool'], needs: ['calm', 'play', 'get-things-done'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Stickers + Paper', description: 'Put out a few stickers and paper and let your child make a simple picture or scene.', time: '10–20 min', category: 'Creative', emoji: '⭐', ages: ['toddler', 'preschool', 'bigkid'], needs: ['calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Toy Wash', description: 'Give your child a small tub or basin with water and a cloth to "wash" washable toys while you work nearby.', time: '15–20 min', category: 'Everyday', emoji: '🧽', ages: ['toddler', 'preschool'], needs: ['get-things-done', 'play'], effort: 'Low', setup: '2 min', mess: 'Some' },
  { title: 'Independent Play Bin', description: 'Put out three familiar items in a small bin and let your child explore while you finish one short task nearby.', time: '10–20 min', category: 'Independent', emoji: '🧸', ages: ['toddler', 'preschool'], needs: ['get-things-done', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Driveway Scavenger Hunt', description: 'Look for simple things such as a bird, a red car, a flower, a rock, or a cloud.', time: '10–20 min', category: 'Outside', emoji: '🔎', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Quiet Audiobook + Coloring', description: 'Put on a short child-friendly audiobook or story and offer crayons and paper for a calmer activity.', time: '15–30 min', category: 'Calm', emoji: '🎧', ages: ['preschool', 'bigkid'], needs: ['calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },

  // ─── Outdoor: Free play & unstructured time ───
  { title: 'Just Go Outside', description: 'No plan, no toys, no agenda. Step into the yard, balcony, or park and let your child decide what to do. You can sit nearby and watch.', time: '20–60 min', category: 'Outside', emoji: '🌤️', ages: ['toddler', 'preschool', 'bigkid', 'tween'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Blanket on the Grass', description: 'Bring a blanket outside and let your baby lie down, look at the sky, feel the breeze, and listen to outdoor sounds. Sit beside them.', time: '15–30 min', category: 'Outside', emoji: '🧺', ages: ['baby'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: '2 min', mess: 'None' },
  { title: 'Free Yard Time', description: 'Open the door and let your child run, dig, roll, climb, or just sit in the grass. No structure needed — unstructured outdoor time is the goal.', time: '30–60 min', category: 'Outside', emoji: '🌳', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Follow the Child Walk', description: 'Head outside and let your child choose which way to go and when to stop. Follow their lead — they may want to watch ants for ten minutes and that is the whole point.', time: '20–45 min', category: 'Outside', emoji: '🚶', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Cloud Watching', description: 'Lie on the grass or a blanket and look at the clouds together. Talk about shapes, animals, or stories you see. No equipment needed.', time: '10–20 min', category: 'Outside', emoji: '☁️', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Outdoor Free Choice', description: 'Tell your child they have 30 minutes outside to do whatever they want — climb, run, sit, dig, explore. No instructions from you unless safety requires it.', time: '30 min', category: 'Outside', emoji: '🛟', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Nature exploration ───
  { title: 'Bug Hunt', description: 'Look under rocks, leaves, and logs for ants, beetles, worms, and other tiny creatures. Watch gently and put things back when done.', time: '15–30 min', category: 'Outside', emoji: '🐜', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Nature Collection Walk', description: 'Bring a small bag or basket and collect leaves, pinecones, acorns, pebbles, or flowers. Sort them at home by color, size, or type.', time: '20–40 min', category: 'Outside', emoji: '🍂', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'Low' },
  { title: 'Bird Watching', description: 'Sit quietly outside or near a window and look for birds. Count how many you see, notice their colors and sounds. No binoculars needed.', time: '10–20 min', category: 'Outside', emoji: '🐦', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Puddle Jumping', description: 'After rain, put on boots and go jump in puddles. Let your child get wet and messy — it is just water and clothes wash.', time: '15–30 min', category: 'Outside', emoji: '💧', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Some' },
  { title: 'Tree Bark Rubbings', description: 'Hold paper against a tree trunk and rub with a crayon to reveal the bark pattern. Try different trees and compare textures.', time: '15–25 min', category: 'Outside', emoji: '🌳', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Flower and Weed Discovery', description: 'Walk around your yard or block and look at flowers, weeds, and plants. Touch gently, smell, and talk about what is growing.', time: '15–30 min', category: 'Outside', emoji: '🌸', ages: ['toddler', 'preschool'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Nature Scavenger Hunt', description: 'Make a quick mental list: find something smooth, something rough, something green, something brown, something that moves. Hunt together or let your child go solo.', time: '15–30 min', category: 'Outside', emoji: '🔎', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Watch the Sunset', description: 'Find a spot with a view of the western sky and watch the colors change as the sun goes down. Talk about what you see or just sit quietly together.', time: '15–25 min', category: 'Outside', emoji: '🌅', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Star Gazing', description: 'On a clear evening, step outside and look up at the stars. Try to find bright ones, notice patterns, or just enjoy the quiet.', time: '10–20 min', category: 'Outside', emoji: '⭐', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Listen to Nature Sounds', description: 'Sit outside, close your eyes, and listen. How many different sounds can you hear — birds, wind, cars, insects? Compare what you each noticed.', time: '5–15 min', category: 'Outside', emoji: '👂', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Movement & active play ───
  { title: 'Run and Chase', description: 'Just run. Tag, chase, race to the tree and back. No equipment, no setup — just let your child move their body hard.', time: '10–20 min', category: 'Outside', emoji: '🏃', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Jump the Line', description: 'Draw a line with chalk or use a crack in the driveway. Jump over it, jump along it, hop on one foot, see how far you can jump.', time: '10–20 min', category: 'Outside', emoji: '🦘', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Balance Beam Walk', description: 'Find a curb, low wall, fallen log, or drawn chalk line. Walk across it like a balance beam. Hold hands if needed.', time: '10–15 min', category: 'Outside', emoji: '🤸', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Simon Says (Outdoor Edition)', description: 'Play Simon Says with big movements — jump, spin, touch the ground, reach for the sky, run to the tree and back.', time: '10–15 min', category: 'Outside', emoji: '🎯', ages: ['preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Red Light Green Light', description: 'One person is the traffic light. Green means run, red means freeze. Simple, active, and needs no equipment.', time: '10–15 min', category: 'Outside', emoji: '🚦', ages: ['preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Hopscotch', description: 'Draw a hopscotch grid with chalk and hop through it. Great for balance and counting.', time: '15–25 min', category: 'Outside', emoji: '🔢', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Ball Kicking', description: 'Bring a ball outside and kick it around the yard or park. No goal, no rules — just kicking, running, and chasing.', time: '15–30 min', category: 'Outside', emoji: '⚽', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Jump Rope or Hokey Pokey', description: 'If you have a jump rope, try it. If not, do the Hokey Pokey or any silly movement song outside in the fresh air.', time: '10–20 min', category: 'Outside', emoji: '🪢', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'None' },
  { title: 'Climb and Explore', description: 'Find a safe climbing structure — playground equipment, a low tree branch, or a boulder — and let your child climb, hang, and test their body.', time: '20–30 min', category: 'Outside', emoji: '🧗', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'Low' },

  // ─── Outdoor: Backyard activities ───
  { title: 'Mud Kitchen', description: 'Give your child a few old containers, spoons, and water. Let them make mud pies, mud soup, and mud cakes. It washes off.', time: '20–40 min', category: 'Outside', emoji: '🥘', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: '2 min', mess: 'Some' },
  { title: 'Dig in the Dirt', description: 'Give your child a small shovel or spoon and a patch of dirt. Let them dig, scoop, and build. No plan needed.', time: '20–40 min', category: 'Outside', emoji: '🕳️', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Some' },
  { title: 'Backyard Fort', description: 'Use blankets, chairs, sticks, or whatever is around to build a simple outdoor fort or hideout. Let your child lead the design.', time: '20–40 min', category: 'Outside', emoji: '⛺', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Low' },
  { title: 'Paint with Water', description: 'Give your child a cup of water and a paintbrush. Let them paint the sidewalk, fence, or wall. It dries clear and there is zero cleanup.', time: '15–30 min', category: 'Outside', emoji: '🖌️', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: '2 min', mess: 'None' },
  { title: 'Shadow Tracing', description: 'On a sunny day, stand in the sun and trace each other\'s shadows with chalk. Come back later to see how they moved.', time: '15–25 min', category: 'Outside', emoji: '👤', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Low', setup: '2 min', mess: 'Low' },
  { title: 'Backyard Camping', description: 'Set up a tent in the yard or just bring sleeping bags outside for a nap or story time under the sky. Even 30 minutes feels like an adventure.', time: '30–60 min', category: 'Outside', emoji: '🏕️', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Low' },
  { title: 'Sticky Nature Walk', description: 'Wrap a strip of tape around your child\'s wrist sticky-side out. Collect leaves, petals, and seeds as you walk and stick them on.', time: '15–30 min', category: 'Outside', emoji: '🌿', ages: ['toddler', 'preschool'], needs: ['outside', 'play'], effort: 'Low', setup: '2 min', mess: 'Low' },

  // ─── Outdoor: Water play ───
  { title: 'Sprinkler Run', description: 'Turn on a hose or sprinkler and let your child run through it. No pool needed — just water and energy to burn.', time: '15–30 min', category: 'Outside', emoji: '💦', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: '2 min', mess: 'Some' },
  { title: 'Water Table or Basin Play', description: 'Fill a basin or tub with a small amount of water. Add cups, spoons, or funnels. Let your child pour, scoop, and splash.', time: '20–30 min', category: 'Outside', emoji: '🪣', ages: ['baby', 'toddler', 'preschool'], needs: ['outside', 'calm', 'play'], effort: 'Low', setup: '2 min', mess: 'Some' },
  { title: 'Sponge Transfer', description: 'Give your child two bowls and a sponge. Move water from one bowl to the other by soaking the sponge and squeezing it out. Simple and absorbing.', time: '15–20 min', category: 'Outside', emoji: '🧽', ages: ['toddler', 'preschool'], needs: ['outside', 'calm', 'play'], effort: 'Low', setup: '2 min', mess: 'Some' },
  { title: 'Ice Rescue', description: 'Freeze small toys in a block of ice. Bring it outside and let your child figure out how to melt or chip the toys free. Warm water and spoons work.', time: '20–30 min', category: 'Outside', emoji: '🧊', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Low' },
  { title: 'Paint the Pavement with Water', description: 'Give your child a big brush and a bucket of water. Let them paint the driveway, sidewalk, or patio. It evaporates and they can do it again.', time: '15–30 min', category: 'Outside', emoji: '💧', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: '2 min', mess: 'None' },
  { title: 'Water Balloon Toss', description: 'Fill a few water balloons and toss them back and forth. Move further apart each round. Simple, wet, and fun on a hot day.', time: '15–25 min', category: 'Outside', emoji: '🎈', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: '5 min+', mess: 'Some' },

  // ─── Outdoor: Gardening ───
  { title: 'Water the Plants', description: 'Give your child a watering can or cup and let them water plants, flowers, or a garden bed. Simple, helpful, and gets them outside.', time: '10–15 min', category: 'Outside', emoji: '🚿', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'get-things-done'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Plant Seeds', description: 'Give your child a few seeds and a small pot or patch of dirt. Let them dig, plant, and water. Check back over the coming days.', time: '15–25 min', category: 'Outside', emoji: '🌱', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: '5 min+', mess: 'Some' },
  { title: 'Pull Weeds Together', description: 'Show your child which plants are weeds and pull them together. It is real work, gets hands dirty, and helps the garden.', time: '15–25 min', category: 'Outside', emoji: '🧤', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'get-things-done'], effort: 'Low', setup: 'None', mess: 'Some' },
  { title: 'Harvest from the Garden', description: 'If you have vegetables, herbs, or fruit growing, let your child pick them. Talk about how they grew and what they taste like.', time: '10–20 min', category: 'Outside', emoji: '🥕', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'get-things-done'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Make a Mini Garden', description: 'Use a container, old pot, or patch of soil. Let your child fill it with dirt, plant seeds or small plants, and water them. They can check on it daily.', time: '20–30 min', category: 'Outside', emoji: '🪴', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Medium', setup: '5 min+', mess: 'Some' },

  // ─── Outdoor: Sensory activities ───
  { title: 'Sensory Walk Barefoot', description: 'On a warm day, walk barefoot on grass, sand, smooth stones, or dirt. Talk about how each surface feels on your feet.', time: '10–15 min', category: 'Outside', emoji: '🦶', ages: ['toddler', 'preschool'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Sand or Dirt Sensory Bin', description: 'Fill a shallow container with sand, rice, or dirt. Add scoops, cups, or toy animals. Let your child dig, pour, and feel.', time: '20–30 min', category: 'Outside', emoji: '🏖️', ages: ['baby', 'toddler', 'preschool'], needs: ['outside', 'calm', 'play'], effort: 'Low', setup: '5 min+', mess: 'Some' },
  { title: 'Smell the Garden', description: 'Walk around the yard or park and smell flowers, herbs, grass, and leaves. Talk about which smells you like and which you do not.', time: '10–15 min', category: 'Outside', emoji: '👃', ages: ['toddler', 'preschool'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Texture Hunt', description: 'Find things outside that are smooth, rough, bumpy, soft, hard, and fuzzy. Touch each one and describe how it feels.', time: '10–20 min', category: 'Outside', emoji: '✋', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Wind and Weather Feel', description: 'Step outside and notice the wind on your face, the sun on your arms, the temperature. Talk about what your body feels. Great for babies too.', time: '5–10 min', category: 'Outside', emoji: '🌬️', ages: ['baby', 'toddler', 'preschool'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Simple games ───
  { title: 'Hide and Seek', description: 'Classic outdoor hide and seek. No equipment, just a yard or park and a few hiding spots.', time: '15–25 min', category: 'Outside', emoji: '🙈', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Duck Duck Goose', description: 'Sit in a circle outside and play Duck Duck Goose. Great for groups or even two people with a modified version.', time: '10–20 min', category: 'Outside', emoji: '🦆', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'What Time Is It Mr. Wolf?', description: 'One person is the wolf, standing with their back turned. The others ask "What time is it Mr. Wolf?" and creep forward until the wolf turns around and chases.', time: '10–20 min', category: 'Outside', emoji: '🐺', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Color Tag', description: 'Pick a color. The person who is "it" chases. You are safe if you are touching something that color. Run between safe spots.', time: '10–15 min', category: 'Outside', emoji: '🎨', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Obstacle Race', description: 'Set up a simple course: run to the tree, jump three times, touch the fence, hop back. Time it or just do it for fun.', time: '15–25 min', category: 'Outside', emoji: '🏁', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: '2 min', mess: 'None' },
  { title: 'Freeze Dance (Outdoor)', description: 'Play music from your phone and dance outside. Freeze when the music stops. Simple, active, and gets everyone moving in fresh air.', time: '10–15 min', category: 'Outside', emoji: '💃', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Walks & neighborhood exploration ───
  { title: 'Neighborhood Walk', description: 'Just walk. No destination, no agenda. Let your child set the pace and stop when they want to look at something.', time: '20–45 min', category: 'Outside', emoji: '🚶', ages: ['toddler', 'preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Color Walk', description: 'Pick a color before you leave. Count how many things you see in that color on your walk. Switch colors next time.', time: '15–30 min', category: 'Outside', emoji: '🌈', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Number Hunt Walk', description: 'Look for numbers on your walk — house numbers, car license plates, signs. Count them, find specific numbers, or see who spots the highest.', time: '15–25 min', category: 'Outside', emoji: '🔢', ages: ['preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Letter Walk', description: 'Look for letters on signs, mailboxes, and buildings. Find the letters of your child\'s name or go through the alphabet.', time: '15–25 min', category: 'Outside', emoji: '🔤', ages: ['preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Sensory Walk', description: 'Walk and notice one thing for each sense: something you see, hear, smell, and feel. Talk about what you each noticed at the end.', time: '15–30 min', category: 'Outside', emoji: '🌿', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Explore a New Street', description: 'Take a different route than usual. See what is different — new houses, trees, dogs, or shops. Let your child choose which way at each corner.', time: '20–40 min', category: 'Outside', emoji: '🧭', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Walk and Talk', description: 'Walk together with no toys, no phone, no agenda. Let your child talk about whatever is on their mind. The walk is the activity.', time: '20–40 min', category: 'Outside', emoji: '💬', ages: ['bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Playground ideas ───
  { title: 'Playground Visit', description: 'Go to a nearby playground. Let your child choose what to play on — swings, slides, climbing structures. Follow their lead and resist the urge to direct.', time: '30–60 min', category: 'Outside', emoji: '🛝', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'Low' },
  { title: 'Climbing Structure Challenge', description: 'At the playground, challenge your child to climb to the top, hang from the bars, or try a new part of the structure they usually avoid.', time: '20–30 min', category: 'Outside', emoji: '🧗', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'play'], effort: 'Low', setup: 'None', mess: 'Low' },
  { title: 'Slide Races', description: 'Take turns going down the slide and racing back to the stairs. Simple, repetitive, and burns energy.', time: '15–25 min', category: 'Outside', emoji: '🛼', ages: ['toddler', 'preschool'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Swing and Chat', description: 'Push your child on the swing and just talk. The rhythm of swinging often opens up conversation in a way sitting face-to-face does not.', time: '15–25 min', category: 'Outside', emoji: '🎠', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Playground Scavenger Hunt', description: 'Find things at the playground: something red, something to climb, something that spins, something to balance on. Explore the whole space.', time: '15–25 min', category: 'Outside', emoji: '🎯', ages: ['preschool', 'bigkid'], needs: ['outside', 'play'], effort: 'Very low', setup: 'None', mess: 'None' },

  // ─── Outdoor: Quiet activities (reading, drawing, observing) ───
  { title: 'Read Outside', description: 'Bring a few books to the yard, porch, or park. Read together or let your child look at books on a blanket while you sit nearby.', time: '15–30 min', category: 'Outside', emoji: '📖', ages: ['baby', 'toddler', 'preschool', 'bigkid'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Outdoor Drawing', description: 'Bring paper and crayons outside. Draw what you see — a tree, a flower, the sky, a bug. Or just doodle in the fresh air.', time: '15–25 min', category: 'Outside', emoji: '🎨', ages: ['preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'play'], effort: 'Very low', setup: '2 min', mess: 'Low' },
  { title: 'Nature Journal', description: 'Bring a notebook outside. Draw or write about what you observe — a bird, a leaf, the weather. No pressure to be artistic, just notice and record.', time: '15–30 min', category: 'Outside', emoji: '📓', ages: ['bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Quiet Sitting Outside', description: 'Bring a blanket or chair and just sit outside together. No activity, no talking required. Watch, listen, and be still. Good for you too.', time: '10–20 min', category: 'Outside', emoji: '🧘', ages: ['baby', 'toddler', 'preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Cloud Stories', description: 'Look at the clouds and take turns making up stories about the shapes you see. A dragon, a whale, a castle — whatever the clouds suggest.', time: '10–20 min', category: 'Outside', emoji: '☁️', ages: ['preschool', 'bigkid'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
  { title: 'Outdoor Snack Picnic', description: 'Take a snack outside on a blanket. Eat together on the grass, porch, or balcony. The change of scenery makes it feel special with zero extra effort.', time: '15–25 min', category: 'Outside', emoji: '🧺', ages: ['baby', 'toddler', 'preschool', 'bigkid', 'tween'], needs: ['outside', 'calm', 'lowest-effort'], effort: 'Very low', setup: '2 min', mess: 'Low' },
  { title: 'Watch the Ants', description: 'Find an ant trail or a busy spot in the dirt. Sit and watch. Where are they going? What are they carrying? Quiet observation is a real activity.', time: '10–15 min', category: 'Outside', emoji: '🐜', ages: ['toddler', 'preschool', 'bigkid'], needs: ['outside', 'calm', 'play', 'lowest-effort'], effort: 'Very low', setup: 'None', mess: 'None' },
];


const feelingsSituations: Situation[] = [
  {
    id: 'meltdown',
    title: "They\'re having a meltdown",
    emoji: '😤',
    guidance: {
      baby: { title: 'Baby is overwhelmed', emoji: '👶', doNow: 'Lower stimulation and check hunger, tiredness, temperature, discomfort, and whether your baby needs closeness.', sayThis: 'You are having a hard time. I am here with you.', avoidThis: 'Do not try to teach a lesson while your baby is crying hard.', afterward: 'Once calm, think about what may have triggered the crying.' },
      toddler: { title: 'Toddler meltdown', emoji: '😤', doNow: 'Stay close, keep everyone safe, reduce talking, and use a calm voice.', sayThis: 'You are really upset. I am here. I will help you.', avoidThis: 'Avoid long explanations, yelling, threats, or lots of questions during the peak.', afterward: 'Once calm, briefly name what happened and practice what to try next time.' },
      preschool: { title: 'Preschool meltdown', emoji: '🦋', doNow: 'Stay calm and close enough to keep your child safe. Keep your words short and hold the boundary without arguing.', sayThis: 'You are angry. It is okay to be angry. I will not let you hurt anyone.', avoidThis: 'Avoid trying to reason through every detail while your child is highly upset.', afterward: 'Reconnect first, then briefly talk about the trigger and a better choice.' },
      bigkid: { title: 'Big kid emotional overload', emoji: '🎨', doNow: 'Give your child some space to calm down while staying available.', sayThis: 'I can see this is really frustrating. I am here when you are ready.', avoidThis: 'Avoid sarcasm, embarrassment, or forcing an immediate conversation.', afterward: 'Talk about what happened and involve your child in finding a better strategy.' },
      tween: { title: 'Tween emotional overload', emoji: '🧩', doNow: 'Give your tween space to calm down — they may need to retreat to their room. Check in briefly without demanding a conversation. Tweens can feel embarrassed by big emotions, so normalize it.', sayThis: 'I can see this is really hard. I am going to give you some space. I am here when you are ready.', avoidThis: 'Avoid sarcasm, embarrassment, or treating their feelings as drama. Do not bring it up in front of siblings or friends.', afterward: 'When things are calm, ask your tween what they think would help next time. Let them propose the strategy — they are old enough to help design their own plan.' },
    },
  },
  {
    id: 'hitting',
    title: "They\'re hitting or kicking",
    emoji: '👊',
    guidance: {
      baby: { title: 'Baby is experimenting with movement', emoji: '👶', doNow: 'Gently block the movement and move your baby or the object if needed.', sayThis: 'I will not let you hit. Gentle hands.', avoidThis: 'Avoid hitting back or using punishment with a baby.', afterward: 'Redirect to a safe activity and keep practicing gentle touch.' },
      toddler: { title: 'Toddler is hitting', emoji: '👊', doNow: 'Block the hit, create space, and keep your words very short.', sayThis: 'I will not let you hit. I will help you.', avoidThis: 'Do not hit, threaten, or give a long lecture in the middle of the behavior.', afterward: 'Once calm, name the feeling and practice a safe alternative.' },
      preschool: { title: 'Preschooler is hitting', emoji: '👊', doNow: 'Stop the hitting immediately and separate children if necessary.', sayThis: 'I will not let you hit. You can say, "I\'m mad," or ask for help.', avoidThis: 'Avoid shaming your child or calling them a bad kid.', afterward: 'Practice the exact replacement behavior you want next time.' },
      bigkid: { title: 'Big kid is hitting', emoji: '👊', doNow: 'Create physical safety and give everyone space.', sayThis: 'You are allowed to be angry. You are not allowed to hurt someone.', avoidThis: 'Avoid physical punishment or humiliation.', afterward: 'Once calm, discuss what led up to it and what to do differently.' },
      tween: { title: 'Tween is hitting', emoji: '🧩', doNow: 'Create physical safety and give your tween space. Stress, peer conflict, or early puberty changes can amplify reactions at this age.', sayThis: 'You are allowed to be angry. You are not allowed to hurt anyone. Take space and we will figure this out.', avoidThis: 'Avoid physical punishment, humiliation, or bringing it up in front of peers or siblings.', afterward: 'Talk privately once calm, identify the build-up, and let your tween choose a safer response. Recurring aggression or bullying concerns deserve professional support.' },
    },
  },
  {
    id: 'refusing',
    title: "They\'re refusing everything",
    emoji: '🚫',
    guidance: {
      baby: { title: 'Baby is resisting', emoji: '👶', doNow: 'Pause and check whether your baby is tired, hungry, uncomfortable, or overstimulated.', sayThis: 'You are telling me you need a break.', avoidThis: 'Avoid treating normal baby resistance as deliberate defiance.', afterward: 'Adjust the timing or environment when possible.' },
      toddler: { title: 'Toddler says no to everything', emoji: '🚫', doNow: 'Give one clear expectation and offer two acceptable choices when you can.', sayThis: 'It is time to get dressed. Red shirt or blue shirt?', avoidThis: 'Avoid turning every refusal into a power struggle.', afterward: 'Use predictable routines and transition warnings.' },
      preschool: { title: 'Preschooler is refusing', emoji: '🚫', doNow: 'Connect first, then state the expectation clearly. Offer a limited choice if there really is a choice.', sayThis: 'You do not want to clean up. It is still time to clean up. Blocks or books first?', avoidThis: 'Avoid endless negotiating.', afterward: 'Notice whether the task, timing, or transition is consistently causing problems.' },
      bigkid: { title: 'Big kid is refusing', emoji: '🚫', doNow: 'State the expectation and give your child some ownership over how they complete it.', sayThis: 'The expectation is still the same. You can choose how you get it done.', avoidThis: 'Avoid arguing about whether the expectation should exist in the middle of the conflict.', afterward: 'Talk about how to make the routine smoother next time.' },
      tween: { title: 'Tween is refusing', emoji: '🧩', doNow: 'State the expectation clearly and give your tween ownership of how and when they complete it within a reasonable boundary.', sayThis: 'The expectation is the same. You can figure out your own approach — I trust you to get it done.', avoidThis: 'Avoid turning it into a power struggle or debating fairness in the heat of the moment.', afterward: 'When calm, problem-solve together and agree on a consequence that connects to the unfinished responsibility.' },
    },
  },
];

const pottySituations: Situation[] = [
  {
    id: 'start',
    title: 'How do we start?',
    emoji: '🚽',
    guidance: {
      baby: { title: 'Baby: potty awareness', emoji: '👶', doNow: 'At this age, focus on normal diapering and learning your baby\'s cues rather than formal toilet training.', sayThis: 'The potty will be here when you are ready.', avoidThis: 'Avoid expecting a baby to be independently toilet trained.', afterward: 'When your child is older and shows readiness, introduce the potty gradually.' },
      toddler: { title: 'Starting potty training', emoji: '🚽', doNow: 'Make the potty familiar, watch for readiness signs, and keep the routine low-pressure.', sayThis: 'We are learning how the potty works. We can practice together.', avoidThis: 'Avoid rushing because another child is trained.', afterward: 'Celebrate effort and learning rather than demanding success.' },
      preschool: { title: 'Starting potty training', emoji: '🦋', doNow: 'Offer predictable potty opportunities after waking, before leaving, before bath or bedtime, and when your child notices the urge.', sayThis: 'Your body is learning when it needs to use the potty.', avoidThis: 'Avoid shame, pressure, or long forced sits.', afterward: 'Keep the routine consistent.' },
      bigkid: { title: 'Getting back on track', emoji: '🎨', doNow: 'Talk privately about what is getting in the way and make a simple bathroom plan.', sayThis: 'Let\'s figure out what would make the bathroom routine easier.', avoidThis: 'Avoid embarrassment or treating accidents as shameful.', afterward: 'If accidents continue or there are concerning symptoms, talk with a healthcare professional.' },
      tween: { title: 'Getting back on track', emoji: '🧩', doNow: 'Talk privately about what is getting in the way and make a simple bathroom plan.', sayThis: 'Let\'s figure out what would make the bathroom routine easier.', avoidThis: 'Avoid embarrassment or treating accidents as shameful.', afterward: 'If accidents continue or there are concerning symptoms, talk with a healthcare professional.' },
    },
  },
  {
    id: 'accidents',
    title: "They\'re having accidents",
    emoji: '👖',
    guidance: {
      baby: { title: 'Baby: diapers are normal', emoji: '👶', doNow: 'Keep diapering calm and focus on comfort and skin care.', sayThis: 'Let\'s get you cleaned up.', avoidThis: 'Avoid treating wetness as misbehavior.', afterward: 'Return to your normal routine.' },
      toddler: { title: 'Toddler accidents', emoji: '👖', doNow: 'Stay neutral, help your child get cleaned up, and calmly remind them where the potty is.', sayThis: 'Accidents happen. Let\'s get cleaned up and try again.', avoidThis: 'Avoid punishment or shame.', afterward: 'Look for patterns such as distraction, constipation, or long stretches between potty opportunities.' },
      preschool: { title: 'Preschool accidents', emoji: '👖', doNow: 'Keep your reaction matter-of-fact and return to the routine.', sayThis: 'It was an accident. We can clean up and try again.', avoidThis: 'Avoid making accidents a big emotional event.', afterward: 'Consider reminders, clothing, and bathroom opportunities.' },
      bigkid: { title: 'Big kid accidents', emoji: '👖', doNow: 'Stay calm and private. Help your child clean up without teasing or shaming.', sayThis: 'Accidents happen. Let\'s figure out what your body needed.', avoidThis: 'Avoid punishment or public discussion.', afterward: 'Frequent, sudden, painful, or concerning accidents should be discussed with a healthcare professional.' },
      tween: { title: 'Tween accidents', emoji: '👖', doNow: 'Stay calm and private. Help your tween clean up without teasing or shaming.', sayThis: 'Accidents happen. Let\'s figure out what your body needed.', avoidThis: 'Avoid punishment or public discussion.', afterward: 'Frequent, sudden, painful, or concerning accidents should be discussed with a healthcare professional.' },
    },
  },
  {
    id: 'refuse',
    title: 'They refuse the potty',
    emoji: '🙅',
    guidance: {
      baby: { title: 'Baby: no pressure', emoji: '👶', doNow: 'There is no need for formal potty training at this stage.', sayThis: 'We can learn about the potty when you are ready.', avoidThis: 'Avoid pressure or forced toilet sitting.', afterward: 'Focus on normal diaper routines.' },
      toddler: { title: 'Toddler refuses the potty', emoji: '🙅', doNow: 'Take the pressure down and offer simple choices around the routine.', sayThis: 'We can practice when you are ready.', avoidThis: 'Avoid forcing your child to sit or turning it into a power struggle.', afterward: 'Keep the potty available and familiar.' },
      preschool: { title: 'Preschooler refuses', emoji: '🙅', doNow: 'Ask what they dislike or fear and give some control over the routine.', sayThis: 'Tell me what feels hard about using the potty. I can help.', avoidThis: 'Avoid threats and shame.', afterward: 'Address the specific concern and consider a brief reset.' },
      bigkid: { title: 'Big kid refuses', emoji: '🙅', doNow: 'Talk privately about what is making bathroom use difficult and work together on a plan.', sayThis: 'I\'m not here to embarrass you. Let\'s solve this together.', avoidThis: 'Avoid teasing or punishment.', afterward: 'Persistent problems should be discussed with a healthcare professional.' },
      tween: { title: 'Tween refuses', emoji: '🙅', doNow: 'Talk privately about what is making bathroom use difficult and work together on a plan.', sayThis: 'I\'m not here to embarrass you. Let\'s solve this together.', avoidThis: 'Avoid teasing or punishment.', afterward: 'Persistent problems should be discussed with a healthcare professional.' },
    },
  },
  {
    id: 'poop',
    title: 'Pooping on the potty',
    emoji: '💩',
    guidance: {
      baby: { title: 'Baby: normal diaper stage', emoji: '👶', doNow: 'Keep bowel movements comfortable and watch for constipation.', sayThis: 'Let\'s get you comfortable.', avoidThis: 'Avoid formal poop training at this stage.', afterward: 'Discuss painful or concerning bowel movements with your healthcare professional.' },
      toddler: { title: 'Toddler is afraid to poop', emoji: '💩', doNow: 'Keep the process calm and watch for constipation or painful bowel movements. A foot support can help with stability.', sayThis: 'Your body can take its time. I am here to help.', avoidThis: 'Avoid forced sitting or ignoring constipation.', afterward: 'Painful, hard, bloody, or repeatedly withheld stool should be discussed with a healthcare professional.' },
      preschool: { title: 'Preschooler struggles with poop', emoji: '💩', doNow: 'Keep the bathroom calm and private and watch for withholding and constipation.', sayThis: 'Pooping should not hurt. We can get help if your tummy is having trouble.', avoidThis: 'Avoid punishment for poop accidents.', afterward: 'Discuss persistent constipation or painful bowel movements with a healthcare professional.' },
      bigkid: { title: 'Big kid poop accidents', emoji: '💩', doNow: 'Handle the situation privately and without shame and look for constipation or withholding.', sayThis: 'You are not in trouble. We need to figure out what your body needs.', avoidThis: 'Avoid embarrassment or punishment.', afterward: 'Persistent stool accidents deserve a healthcare conversation.' },
      tween: { title: 'Tween poop accidents', emoji: '💩', doNow: 'Handle the situation privately and without shame and look for constipation or withholding.', sayThis: 'You are not in trouble. We need to figure out what your body needs.', avoidThis: 'Avoid embarrassment or punishment.', afterward: 'Persistent stool accidents deserve a healthcare conversation.' },
    },
  },
];

const sleepSituations: Situation[] = [
  {
    id: 'month',
    title: 'What should sleep look like by month?',
    emoji: '👶',
    guidance: {
      baby: { title: 'Infant sleep by age', emoji: '👶', doNow: 'Use age ranges as guides, not strict schedules. Newborns often sleep about 16–17 hours total in 24 hours, usually in short stretches. Sleep becomes more organized as babies mature, but individual babies vary.', sayThis: 'We are learning your sleep rhythm together.', avoidThis: 'Do not treat a wake window as a deadline or medical requirement.', afterward: 'Watch your baby\'s cues and adjust based on development, feeding, mood, and sleep patterns.' },
      toddler: { title: 'Toddler sleep expectations', emoji: '🧸', doNow: 'Toddlers generally need about 11–14 hours of sleep in 24 hours, including naps.', sayThis: 'Your body is getting ready for sleep.', avoidThis: 'Avoid expecting every toddler to follow the exact same schedule.', afterward: 'Look at the whole 24-hour sleep pattern.' },
      preschool: { title: 'Preschool sleep expectations', emoji: '🦋', doNow: 'Preschoolers generally need about 10–13 hours in 24 hours. Some still nap and some do not.', sayThis: 'Your body needs rest so you can play and learn tomorrow.', avoidThis: 'Avoid assuming dropping a nap means your child no longer needs an early bedtime.', afterward: 'Keep a predictable wind-down routine.' },
      bigkid: { title: 'Big kid sleep expectations', emoji: '🎨', doNow: 'School-age children generally need about 9–12 hours of sleep in 24 hours.', sayThis: 'Sleep helps your brain and body recharge.', avoidThis: 'Avoid treating chronic tiredness as simply bad behavior.', afterward: 'Persistent sleep difficulty or daytime sleepiness should be discussed with a healthcare professional.' },
      tween: { title: 'Tween sleep expectations', emoji: '🧩', doNow: 'Tweens generally need about 9–12 hours of sleep in 24 hours.', sayThis: 'Sleep helps your brain and body recharge.', avoidThis: 'Avoid treating chronic tiredness as simply bad behavior.', afterward: 'Persistent sleep difficulty or daytime sleepiness should be discussed with a healthcare professional.' },
    },
  },
  {
    id: 'wake',
    title: 'Wake windows',
    emoji: '⏰',
    guidance: {
      baby: { title: 'Wake windows: use them gently', emoji: '⏰', doNow: 'Wake windows are approximate ranges, not strict rules. Younger babies generally tolerate shorter awake periods and older infants generally stay awake longer.', sayThis: 'Let\'s watch your sleepy cues.', avoidThis: 'Do not keep a baby awake just to hit a target window.', afterward: 'Track patterns for a few days if helpful and adjust based on your baby.' },
      toddler: { title: 'Toddler awake time', emoji: '⏰', doNow: 'Focus on total sleep and whether the daily routine is working rather than calculating exact wake windows.', sayThis: 'It looks like your body is getting tired.', avoidThis: 'Avoid treating one late nap as a failure.', afterward: 'Adjust gradually if naps or bedtime are consistently difficult.' },
      preschool: { title: 'Preschool awake time', emoji: '⏰', doNow: 'Use behavior, nap needs, and bedtime as clues instead of exact awake periods.', sayThis: 'Let\'s start winding down.', avoidThis: 'Avoid keeping a child awake because a chart says they should be able to.', afterward: 'Use a routine that fits your family.' },
      bigkid: { title: 'Big kid sleep schedule', emoji: '⏰', doNow: 'Focus on a regular bedtime, wake time, and enough total sleep.', sayThis: 'Let\'s make sure you have enough time to recharge.', avoidThis: 'Avoid using one late night as proof your child needs less sleep.', afterward: 'Watch for daytime sleepiness or trouble concentrating.' },
      tween: { title: 'Tween sleep schedule', emoji: '⏰', doNow: 'Focus on a regular bedtime, wake time, and enough total sleep.', sayThis: 'Let\'s make sure you have enough time to recharge.', avoidThis: 'Avoid using one late night as proof your tween needs less sleep.', afterward: 'Watch for daytime sleepiness or trouble concentrating.' },
    },
  },
  {
    id: 'bedtime',
    title: 'Bedtime is a struggle',
    emoji: '🌙',
    guidance: {
      baby: { title: 'Baby bedtime', emoji: '🌙', doNow: 'Keep the routine simple and predictable and use a safe sleep space.', sayThis: 'It is time to rest. I am right here.', avoidThis: 'Avoid overstimulation right before sleep.', afterward: 'Keep nighttime interactions quiet and low stimulation.' },
      toddler: { title: 'Toddler bedtime struggle', emoji: '🌙', doNow: 'Use a short predictable routine and offer limited choices.', sayThis: 'It is bedtime. You can choose which part we do first.', avoidThis: 'Avoid endless extra books, drinks, or negotiations.', afterward: 'Respond calmly and consistently if your toddler gets out of bed.' },
      preschool: { title: 'Preschool bedtime struggle', emoji: '🌙', doNow: 'Use the same sequence every night: bathroom, pajamas, brush, book, bed.', sayThis: 'Your routine is starting. Let\'s do the next step.', avoidThis: 'Avoid turning bedtime into a long negotiation.', afterward: 'Praise cooperation the next morning.' },
      bigkid: { title: 'Big kid bedtime struggle', emoji: '🌙', doNow: 'Set a consistent bedtime and wind-down period. Turn screens off about an hour before bed when possible.', sayThis: 'You do not have to be asleep yet. Your job is to be in bed and resting.', avoidThis: 'Avoid using bedtime as a nightly argument.', afterward: 'Persistent sleep problems should be discussed with a healthcare professional.' },
      tween: { title: 'Tween bedtime struggle', emoji: '🧩', doNow: 'Help your tween design a wind-down routine and charge devices outside the bedroom. Early puberty can shift sleep timing, so adjust the schedule together while protecting enough total sleep.', sayThis: 'Your body is changing. Let us build a routine that helps you get enough sleep.', avoidThis: 'Avoid turning bedtime into a nightly power struggle or ignoring social and school stress.', afterward: 'If sleep problems, anxiety, snoring, or daytime sleepiness persist, talk with a healthcare professional.' },
    },
  },
  {
    id: 'safe',
    title: 'Safe sleep',
    emoji: '🛏️',
    guidance: {
      baby: { title: 'Safe sleep basics', emoji: '🛏️', doNow: 'For every sleep, place baby on their back on a firm, flat, noninclined sleep surface made for infant sleep. Keep loose blankets, pillows, bumpers, and toys out of the sleep space.', sayThis: 'Sleep time means a clear, safe sleep space.', avoidThis: 'Avoid routine sleep on couches, armchairs, inclined products, or other surfaces not designed for infant sleep.', afterward: 'Check the sleep space each time you put your baby down.' },
      toddler: { title: 'Toddler sleep safety', emoji: '🛏️', doNow: 'Secure furniture, cords, windows, and climbing hazards and keep the sleep space appropriate for your child.', sayThis: 'Your room is your safe place to sleep.', avoidThis: 'Avoid accessible hazards as toddlers climb and explore.', afterward: 'Recheck the room as mobility changes.' },
      preschool: { title: 'Preschool sleep safety', emoji: '🛏️', doNow: 'Keep the bedroom free of obvious hazards and make sure your child can safely get in and out of bed.', sayThis: 'Let\'s make your room safe and cozy for sleep.', avoidThis: 'Avoid loose cords, unstable furniture, or unsafe climbing opportunities.', afterward: 'Update the room as your child grows.' },
      bigkid: { title: 'Big kid sleep safety', emoji: '🛏️', doNow: 'Keep furniture secure, pathways clear, and screens out of the bedroom when possible.', sayThis: 'Your room should help your brain wind down.', avoidThis: 'Avoid unsafe furniture setups or charging cords near the pillow.', afterward: 'Recheck the room when routines change.' },
      tween: { title: 'Tween sleep safety', emoji: '🛏️', doNow: 'Keep furniture secure, pathways clear, and screens out of the bedroom when possible.', sayThis: 'Your room should help your brain wind down.', avoidThis: 'Avoid unsafe furniture setups or charging cords near the pillow.', afterward: 'Recheck the room when routines change.' },
    },
  },
  {
    id: 'night',
    title: 'They keep waking at night',
    emoji: '🌙',
    guidance: {
      baby: { title: 'Baby night waking', emoji: '🌙', doNow: 'Night waking is normal, especially in young infants. Feed, change, or comfort as needed and keep lights and stimulation low.', sayThis: 'It is still nighttime. I am here.', avoidThis: 'Avoid expecting a newborn to sleep through the night.', afterward: 'Sleep patterns change as babies mature.' },
      toddler: { title: 'Toddler night waking', emoji: '🌙', doNow: 'Keep responses brief and boring and check for illness, discomfort, fear, or a schedule problem.', sayThis: 'You are safe. It is still nighttime.', avoidThis: 'Avoid creating a brand-new routine during every waking.', afterward: 'Look for patterns across several nights.' },
      preschool: { title: 'Preschool night waking', emoji: '🌙', doNow: 'Check for nightmares, fears, illness, bathroom needs, or changes in routine.', sayThis: 'You are safe. Let\'s get comfortable and back to bed.', avoidThis: 'Avoid making nighttime fears embarrassing.', afterward: 'Practice the response during daytime.' },
      bigkid: { title: 'Big kid night waking', emoji: '🌙', doNow: 'Ask about worries, nightmares, schedule changes, screens, or stressors.', sayThis: 'Tell me what is keeping you awake and we can work on it.', avoidThis: 'Avoid dismissing recurring fears or worries.', afterward: 'Persistent sleep problems should be discussed with a healthcare professional.' },
      tween: { title: 'Tween night waking', emoji: '🌙', doNow: 'Ask about worries, nightmares, schedule changes, screens, or stressors.', sayThis: 'Tell me what is keeping you awake and we can work on it.', avoidThis: 'Avoid dismissing recurring fears or worries.', afterward: 'Persistent sleep problems should be discussed with a healthcare professional.' },
    },
  },
];

const feedingSituations: Situation[] = [
  {
    id: 'hungry',
    title: 'How do I know my baby is hungry?',
    emoji: '🤱',
    ages: ['baby', 'toddler'],
    guidance: {
      baby: { title: 'Baby hunger cues', emoji: '👶', doNow: 'Look for early cues such as stirring, hand-to-mouth movements, rooting, lip smacking, or increased alertness. Crying is a later cue.', sayThis: 'I see you are ready to eat. Let\'s get comfortable.', avoidThis: 'Avoid waiting for crying to be the only cue when possible.', afterward: 'Over time you will learn your baby\'s individual hunger and fullness patterns.' },
      toddler: { title: 'Toddler hunger cues', emoji: '🧸', doNow: 'Offer regular meals and snacks and let your child respond to hunger and fullness.', sayThis: 'Your body will tell you when you are hungry or full.', avoidThis: 'Avoid pressuring your child to finish food or a drink.', afterward: 'Keep a predictable eating routine.' },
      preschool: { title: 'Preschool hunger cues', emoji: '🦋', doNow: 'Offer meals and snacks at predictable times and let your child decide how much to eat from the foods offered.', sayThis: 'You can listen to your tummy and decide how much you need.', avoidThis: 'Avoid pressure to eat a certain amount.', afterward: 'Continue offering variety.' },
      bigkid: { title: 'Big kid hunger cues', emoji: '🎨', doNow: 'Help your child notice hunger and fullness while keeping regular meals and snacks available.', sayThis: 'Let\'s listen to what your body is telling you.', avoidThis: 'Avoid making food intake about earning approval.', afterward: 'Encourage age-appropriate independence.' },
      tween: { title: 'Tween hunger cues', emoji: '🧩', doNow: 'Help your tween notice hunger and fullness while keeping regular meals and snacks available.', sayThis: 'Let\'s listen to what your body is telling you.', avoidThis: 'Avoid making food intake about earning approval.', afterward: 'Encourage age-appropriate independence.' },
    },
  },
  {
    id: 'formula',
    title: 'Formula feeding',
    emoji: '🍼',
    ages: ['baby', 'toddler'],
    guidance: {
      baby: { title: 'Formula feeding', emoji: '🍼', doNow: 'If you use infant formula, follow the product label and your healthcare professional\'s directions exactly. Formula is a valid infant-feeding option when breastfeeding is not possible or when a family chooses formula.', sayThis: 'We are making sure you are fed, safe, and cared for.', avoidThis: 'Never dilute formula, make homemade formula, or substitute ingredients without medical guidance.', afterward: 'Follow current safe preparation, handling, and storage guidance.' },
      toddler: { title: 'Moving beyond infant formula', emoji: '🍼', doNow: 'Ask your child\'s healthcare professional how milk, water, and a varied diet fit together for your toddler.', sayThis: 'Food and drinks are part of growing your strong body.', avoidThis: 'Avoid using toddler drinks as a substitute for a varied diet unless recommended.', afterward: 'Continue regular meals and snacks.' },
      preschool: { title: 'Preschool feeding', emoji: '🥛', doNow: 'Focus on regular meals and snacks with a variety of foods and age-appropriate drinks.', sayThis: 'Let\'s choose foods that help your body grow.', avoidThis: 'Avoid making one food or drink responsible for everything your child needs.', afterward: 'Discuss nutrition concerns with your healthcare professional.' },
      bigkid: { title: 'Big kid nutrition', emoji: '🥛', doNow: 'Build meals and snacks around a variety of foods and age-appropriate drinks.', sayThis: 'Let\'s choose a mix of foods that helps your body.', avoidThis: 'Avoid using food as a reward or punishment.', afterward: 'Encourage age-appropriate independence.' },
      tween: { title: 'Tween nutrition', emoji: '🥛', doNow: 'Build meals and snacks around a variety of foods and age-appropriate drinks.', sayThis: 'Let\'s choose a mix of foods that helps your body.', avoidThis: 'Avoid using food as a reward or punishment.', afterward: 'Encourage age-appropriate independence.' },
    },
  },
  {
    id: 'combo',
    title: 'Breast + formula',
    emoji: '🤱🍼',
    ages: ['baby', 'toddler'],
    guidance: {
      baby: { title: 'Combination feeding', emoji: '🤱🍼', doNow: 'Breast milk and infant formula can both be part of an infant feeding plan. If you have concerns about supply, latch, or growth, contact your baby\'s healthcare professional or a lactation professional.', sayThis: 'We are finding the feeding plan that works for our baby and family.', avoidThis: 'Avoid feeling that combination feeding means you have failed.', afterward: 'If maintaining milk supply matters to you, ask a lactation professional about feeding or pumping frequency.' },
      toddler: { title: 'Toddler combination feeding', emoji: '🤱🍼', doNow: 'If your toddler still breastfeeds, continue age-appropriate meals and snacks alongside milk feeding.', sayThis: 'We can have milk and meals as part of our routine.', avoidThis: 'Avoid pressure or shame around continuing or weaning.', afterward: 'Make changes gradually if that works best for your family.' },
      preschool: { title: 'Family feeding choices', emoji: '🤱🍼', doNow: 'Focus on overall nutrition and your family\'s routine rather than comparing feeding choices.', sayThis: 'Every family can have a feeding routine that works for them.', avoidThis: 'Avoid judgment around how another family feeds their child.', afterward: 'Ask your healthcare professional about individualized nutrition concerns.' },
      bigkid: { title: 'Healthy family feeding', emoji: '🤱🍼', doNow: 'Focus on balanced meals, regular snacks, hydration, and age-appropriate independence.', sayThis: 'Let\'s find foods that help you feel strong and energized.', avoidThis: 'Avoid using feeding choices as a measure of parenting success.', afterward: 'Keep meals relaxed and supportive.' },
      tween: { title: 'Healthy family feeding', emoji: '🤱🍼', doNow: 'Focus on balanced meals, regular snacks, hydration, and age-appropriate independence.', sayThis: 'Let\'s find foods that help you feel strong and energized.', avoidThis: 'Avoid using feeding choices as a measure of parenting success.', afterward: 'Keep meals relaxed and supportive.' },
    },
  },
  {
    id: 'latch',
    title: 'Baby is having trouble latching',
    emoji: '👄',
    ages: ['baby', 'toddler'],
    guidance: {
      baby: { title: 'Trouble with latch', emoji: '👄', doNow: 'Try a comfortable position and seek help if feeding is painful, baby is not transferring milk well, or you are worried about intake.', sayThis: 'We can pause and try again. We do not have to rush.', avoidThis: 'Do not ignore significant pain or persistent feeding difficulty.', afterward: 'Contact a lactation professional or healthcare professional if needed.' },
      toddler: { title: 'Toddler feeding discomfort', emoji: '👄', doNow: 'If your child reports pain while eating or drinking, pause and look for a physical cause.', sayThis: 'Tell me what feels uncomfortable.', avoidThis: 'Avoid forcing food or drink when there is pain.', afterward: 'Persistent pain should be discussed with a healthcare professional.' },
      preschool: { title: 'Preschool feeding discomfort', emoji: '👄', doNow: 'Listen to your child if eating or swallowing hurts.', sayThis: 'I believe you. Let\'s figure out what hurts.', avoidThis: 'Avoid assuming every refusal is picky eating.', afterward: 'Contact your healthcare professional for persistent pain or swallowing concerns.' },
      bigkid: { title: 'Big kid feeding discomfort', emoji: '👄', doNow: 'Take complaints about pain or difficulty swallowing seriously.', sayThis: 'Tell me what you are feeling so we can help.', avoidThis: 'Avoid forcing a child to eat through pain.', afterward: 'Seek professional guidance for persistent or concerning symptoms.' },
      tween: { title: 'Tween feeding discomfort', emoji: '👄', doNow: 'Take complaints about pain or difficulty swallowing seriously.', sayThis: 'Tell me what you are feeling so we can help.', avoidThis: 'Avoid forcing a child to eat through pain.', afterward: 'Seek professional guidance for persistent or concerning symptoms.' },
    },
  },
  {
    id: 'overwhelmed',
    title: 'I feel overwhelmed',
    emoji: '💛',
    guidance: {
      baby: { title: 'You are not failing', emoji: '💛', doNow: 'Ask for help if you can. Feeding a baby can be demanding whether you breastfeed, formula feed, pump, combination feed, or change plans.', sayThis: 'I am doing the best I can with the support I have.', avoidThis: 'Avoid comparing your feeding journey with someone else\'s.', afterward: 'Reach out to your healthcare professional or trusted support person when needed.' },
      toddler: { title: 'Feeding can be hard', emoji: '💛', doNow: 'Simplify the next meal and focus on one feeding at a time.', sayThis: 'We do not have to make this perfect.', avoidThis: 'Avoid blaming yourself for every difficult meal.', afterward: 'Look for one small change that could make tomorrow easier.' },
      preschool: { title: 'You do not have to do it perfectly', emoji: '💛', doNow: 'Take the pressure off and focus on a safe, calm feeding moment.', sayThis: 'We are learning together.', avoidThis: 'Avoid judging yourself by social media or another family\'s routine.', afterward: 'Ask for help when you need it.' },
      bigkid: { title: 'Family feeding pressure', emoji: '💛', doNow: 'Focus on connection, regular meals, and reasonable expectations.', sayThis: 'We can work this out together.', avoidThis: 'Avoid making food a measure of whether you are a good parent.', afterward: 'Get professional support for persistent nutrition or feeding concerns.' },
      tween: { title: 'Family feeding pressure', emoji: '💛', doNow: 'Focus on connection, regular meals, and reasonable expectations.', sayThis: 'We can work this out together.', avoidThis: 'Avoid making food a measure of whether you are a good parent.', afterward: 'Get professional support for persistent nutrition or feeding concerns.' },
    },
  },
];

const mealtimeSituations: Situation[] = [
  {
    id: 'picky',
    title: 'They are picky',
    emoji: '🥕',
    guidance: {
      baby: { title: 'Baby exploring foods', emoji: '👶', doNow: 'Offer developmentally appropriate foods and textures and let your baby explore at their own pace.', sayThis: 'You can explore this food.', avoidThis: 'Avoid forcing a baby to finish food.', afterward: 'Keep offering variety over time.' },
      toddler: { title: 'Toddler picky eating', emoji: '🥕', doNow: 'Offer a familiar food alongside less familiar foods and let your child decide how much to eat.', sayThis: 'You do not have to eat it. It can stay on your plate.', avoidThis: 'Avoid making a separate meal every time a food is refused.', afterward: 'Continue offering variety without pressure.' },
      preschool: { title: 'Preschool picky eating', emoji: '🥕', doNow: 'Keep meals predictable and include at least one food your child usually accepts.', sayThis: 'You can choose what and how much to eat from what is offered.', avoidThis: 'Avoid bribing or shaming over food.', afterward: 'Keep re-offering foods without pressure.' },
      bigkid: { title: 'Big kid picky eating', emoji: '🥕', doNow: 'Involve your child in choosing and preparing foods and keep a balanced variety available.', sayThis: 'Let\'s find a few foods you like and build from there.', avoidThis: 'Avoid labeling your child as a picky eater.', afterward: 'Keep meals relaxed and varied.' },
      tween: { title: 'Tween picky eating', emoji: '🥕', doNow: 'Involve your tween in choosing and preparing foods and keep a balanced variety available.', sayThis: 'Let\'s find a few foods you like and build from there.', avoidThis: 'Avoid labeling your tween as a picky eater.', afterward: 'Keep meals relaxed and varied.' },
    },
  },
  {
    id: 'healthy',
    title: 'I need a healthy meal idea',
    emoji: '🥑',
    guidance: {
      baby: { title: 'Baby food idea', emoji: '🥑', doNow: 'Offer developmentally appropriate foods with safe textures and close supervision. Ask your healthcare professional about your baby\'s readiness and allergen introduction.', sayThis: 'We are trying a new food together.', avoidThis: 'Avoid foods or shapes that are choking hazards for your baby.', afterward: 'Keep exploring a variety of safe foods.' },
      toddler: { title: 'Toddler meal idea', emoji: '🥑', doNow: 'Try a simple plate with a protein, fruit or vegetable, and an age-appropriate grain or starch.', sayThis: 'Here are a few foods you can choose from.', avoidThis: 'Avoid pressure to clean the plate.', afterward: 'Offer water and keep the next meal predictable.' },
      preschool: { title: 'Preschool meal idea', emoji: '🥑', doNow: 'Try chicken or beans, a fruit or vegetable, and rice, potatoes, pasta, or whole grains.', sayThis: 'There are a few foods to choose from.', avoidThis: 'Avoid making one meal a test of healthy eating.', afterward: 'Keep offering variety.' },
      bigkid: { title: 'Big kid meal idea', emoji: '🥑', doNow: 'Build a balanced plate with protein, produce, a grain or starch, and a drink such as water or milk.', sayThis: 'Let\'s build a meal that helps you feel full and energized.', avoidThis: 'Avoid making healthy eating about perfection.', afterward: 'Invite your child to help prepare the next meal.' },
      tween: { title: 'Tween meal idea', emoji: '🥑', doNow: 'Build a balanced plate with protein, produce, a grain or starch, and a drink such as water or milk.', sayThis: 'Let\'s build a meal that helps you feel full and energized.', avoidThis: 'Avoid making healthy eating about perfection.', afterward: 'Invite your tween to help prepare the next meal.' },
    },
  },
];


const additionalMealSituations: Situation[] = [
  {
    id: 'breakfast',
    title: 'I need an easy breakfast',
    emoji: '🥞',
    guidance: {
      baby: { title: 'Simple baby breakfast', emoji: '🥣', doNow: 'Keep breakfast simple and developmentally appropriate. Depending on age and feeding stage, think soft foods such as oatmeal, yogurt, mashed fruit, or another familiar option.', sayThis: 'Breakfast can be simple. We are just starting the day.', avoidThis: 'Avoid feeling like you need to make a special breakfast every morning.', afterward: 'Repeat easy favorites and change one thing when you want variety.' },
      toddler: { title: 'Easy toddler breakfast', emoji: '🥞', doNow: 'Pick one familiar food plus one easy add-on: oatmeal + fruit, toast + egg, yogurt + berries, or banana + nut/seed butter when appropriate for your child.', sayThis: 'Here are two foods for breakfast. You can choose what and how much to eat.', avoidThis: 'Avoid turning breakfast into a negotiation before the day even starts.', afterward: 'Keep a few repeat breakfasts in rotation.' },
      preschool: { title: 'Easy preschool breakfast', emoji: '🥞', doNow: 'Use a simple mix-and-match plate: whole grain or starch + protein/fat + fruit. Try toast and egg with berries, yogurt with fruit and oats, or oatmeal with banana.', sayThis: 'You do not need a perfect breakfast. We just need something that works this morning.', avoidThis: 'Avoid making breakfast complicated on busy mornings.', afterward: 'Save two or three breakfasts your child already accepts.' },
      bigkid: { title: 'Easy school-age breakfast', emoji: '🥞', doNow: 'Build a quick breakfast around a grain or starch, a protein or dairy food, and fruit when available. Keep a couple of grab-and-go choices ready.', sayThis: 'Let\'s choose a breakfast that gets you fueled without taking all morning.', avoidThis: 'Avoid making every breakfast a production.', afterward: 'Create a short list of dependable school-morning choices.' },
      tween: { title: 'Easy school-age breakfast', emoji: '🥞', doNow: 'Build a quick breakfast around a grain or starch, a protein or dairy food, and fruit when available. Keep a couple of grab-and-go choices ready.', sayThis: 'Let\'s choose a breakfast that gets you fueled without taking all morning.', avoidThis: 'Avoid making every breakfast a production.', afterward: 'Create a short list of dependable school-morning choices.' },
    },
  },
  {
    id: 'preschool-lunch',
    title: 'I need a preschool lunch idea',
    emoji: '🎒',
    guidance: {
      baby: { title: 'Lunch for a baby', emoji: '👶', doNow: 'Use developmentally appropriate foods and textures that your baby already handles safely. Keep portions simple and include familiar foods.', sayThis: 'Lunch can be simple and familiar.', avoidThis: 'Avoid packing foods your baby has not learned to handle safely just because they look cute in a lunchbox.', afterward: 'Repeat foods your baby handles well and add variety gradually.' },
      toddler: { title: 'Toddler lunchbox', emoji: '🎒', doNow: 'Try one familiar food + one protein-rich food + fruit or vegetable + a drink. Examples: cheese quesadilla strips + berries + cucumber; turkey and cheese roll-ups + fruit; hummus + pita pieces + soft fruit.', sayThis: 'Here is your lunch. You can choose what and how much you eat.', avoidThis: 'Avoid sending a lunch made up only of "healthy" foods your child has never liked.', afterward: 'Notice which foods reliably come home untouched and swap one at a time.' },
      preschool: { title: 'Preschool lunchbox ideas', emoji: '🎒', doNow: 'Choose 3–4 familiar components and keep prep simple. Try: turkey + cheese roll-ups + fruit + crackers; mini pasta + peas + fruit; hummus + pita + cucumber + berries; or a sunbutter sandwich + banana + yogurt. Check the school or preschool allergy policy before packing.', sayThis: 'I packed a few foods you know. You can decide what and how much to eat.', avoidThis: 'Avoid packing a completely different lunch every day just because yesterday\'s food came home.', afterward: 'Keep a short rotation of lunches your child reliably eats.' },
      bigkid: { title: 'School-age lunch ideas', emoji: '🎒', doNow: 'Use a simple formula: main + produce + extra. Try a sandwich or wrap + fruit + yogurt, pasta salad + fruit + cheese, or leftovers + a crunchy side.', sayThis: 'Let\'s pick a lunch you will actually eat.', avoidThis: 'Avoid making lunch so ambitious that packing it becomes another daily project.', afterward: 'Rotate a few reliable favorites.' },
      tween: { title: 'Tween lunch ideas', emoji: '🧩', doNow: 'Use a simple formula: main + produce + extra. Try a sandwich or wrap + fruit + yogurt, pasta salad + fruit + cheese, or leftovers + a crunchy side.', sayThis: 'Let\'s pick a lunch you will actually eat.', avoidThis: 'Avoid making lunch so ambitious that packing it becomes another daily project.', afterward: 'Rotate a few reliable favorites.' },
    },
  },
  {
    id: 'snack',
    title: 'I need an easy snack',
    emoji: '🍎',
    guidance: {
      baby: { title: 'Simple baby snack', emoji: '👶', doNow: 'Choose a familiar, developmentally appropriate food or meal component and supervise closely while your baby eats.', sayThis: 'Here is something for your tummy.', avoidThis: 'Avoid foods or shapes that are not appropriate for your baby\'s developmental stage.', afterward: 'Keep a couple of easy options ready for predictable snack times when appropriate.' },
      toddler: { title: 'Easy toddler snack', emoji: '🍎', doNow: 'Try fruit + yogurt, banana + nut/seed butter when appropriate, cheese + soft fruit, toast + avocado, or another familiar pairing.', sayThis: 'Here are your snack choices.', avoidThis: 'Avoid turning snacks into an all-day grazing pattern when a predictable routine works better for your child.', afterward: 'Keep two or three easy pairings on repeat.' },
      preschool: { title: 'Easy preschool snack', emoji: '🍎', doNow: 'Pair two simple foods: fruit + cheese, yogurt + berries, crackers + hummus, toast + avocado, or applesauce + oats. Adjust for your child and school rules.', sayThis: 'Here is a snack to help you make it to the next meal.', avoidThis: 'Avoid making snacks so elaborate that they create more work for you.', afterward: 'Keep a small list of no-prep combinations.' },
      bigkid: { title: 'Easy school-age snack', emoji: '🍎', doNow: 'Pick a quick combination such as fruit + cheese, yogurt + granola, toast + nut/seed butter, or veggies + hummus.', sayThis: 'Pick one snack that will hold you over until the next meal.', avoidThis: 'Avoid turning snack time into another big decision.', afterward: 'Keep a few grab-and-go options visible and easy to reach.' },
      tween: { title: 'Easy school-age snack', emoji: '🍎', doNow: 'Pick a quick combination such as fruit + cheese, yogurt + granola, toast + nut/seed butter, or veggies + hummus.', sayThis: 'Pick one snack that will hold you over until the next meal.', avoidThis: 'Avoid turning snack time into another big decision.', afterward: 'Keep a few grab-and-go options visible and easy to reach.' },
    },
  },
  {
    id: 'preschool-snacks',
    title: 'Preschool snack ideas',
    emoji: '🧺',
    guidance: {
      baby: { title: 'Baby snack idea', emoji: '👶', doNow: 'Use familiar developmentally appropriate foods rather than introducing a brand-new snack just for variety.', sayThis: 'We can keep this simple.', avoidThis: 'Avoid adding unnecessary snack prep.', afterward: 'Keep a few safe foods easy to reach.' },
      toddler: { title: 'Toddler snack rotation', emoji: '🧺', doNow: 'Keep a short rotation: banana + yogurt, cheese + fruit, crackers + hummus, toast + avocado, or applesauce + oat cereal when appropriate.', sayThis: 'You can choose from the snack we have.', avoidThis: 'Avoid making a separate snack for every preference.', afterward: 'Reuse what works.' },
      preschool: { title: 'Preschool snack rotation', emoji: '🧺', doNow: 'Try a small rotation of simple pairings: apple + cheese, banana + yogurt, crackers + hummus, berries + cottage cheese, toast + avocado, or a simple homemade oat bar.', sayThis: 'You can eat what you need from what is offered.', avoidThis: 'Avoid turning snacks into treats or rewards.', afterward: 'Write down the five easiest snacks your child accepts and repeat them.' },
      bigkid: { title: 'School-age snack rotation', emoji: '🧺', doNow: 'Keep a few choices available for independence: fruit, yogurt, cheese, whole-grain crackers, hummus, or nut/seed butter when appropriate.', sayThis: 'You can choose a snack that will hold you until the next meal.', avoidThis: 'Avoid making every snack a negotiation.', afterward: 'Let your child help restock easy options.' },
      tween: { title: 'Tween snack rotation', emoji: '🧺', doNow: 'Keep a few choices available for independence: fruit, yogurt, cheese, whole-grain crackers, hummus, or nut/seed butter when appropriate.', sayThis: 'You can choose a snack that will hold you until the next meal.', avoidThis: 'Avoid making every snack a negotiation.', afterward: 'Let your tween help restock easy options.' },
    },
  },
  {
    id: 'five-minute-meal',
    title: 'I need a meal in 5 minutes',
    emoji: '⏱️',
    guidance: {
      baby: { title: 'Fast baby meal', emoji: '⏱️', doNow: 'Use a familiar ready-to-serve baby food or another safe food that fits your baby\'s feeding stage. Keep the goal simple: fed, safe, and calm.', sayThis: 'We are keeping this easy today.', avoidThis: 'Avoid feeling pressure to make a full homemade meal every time.', afterward: 'Keep one backup option stocked for rushed days.' },
      toddler: { title: '5-minute toddler meal', emoji: '⏱️', doNow: 'Build from what is already in the kitchen: cheese quesadilla + fruit, toast + scrambled egg, yogurt + banana + oats, or a familiar leftover with fruit.', sayThis: 'Dinner does not have to be fancy.', avoidThis: 'Avoid starting a brand-new recipe when you only have five minutes.', afterward: 'Save your fastest three meals.' },
      preschool: { title: '5-minute preschool meal', emoji: '⏱️', doNow: 'Use a familiar main plus one produce item and one easy side. Examples: cheese quesadilla + berries; rotisserie chicken + crackers + cucumber; pasta + peas + fruit; or hummus + pita + fruit.', sayThis: 'This is our easy dinner tonight.', avoidThis: 'Avoid apologizing for a simple meal.', afterward: 'Keep a few emergency meals stocked.' },
      bigkid: { title: '5-minute school-age meal', emoji: '⏱️', doNow: 'Think assembled meal, not recipe: sandwich + fruit, quesadilla + salsa/fruit, yogurt + oats + fruit, or leftovers + a quick side.', sayThis: 'Fast is still a real meal.', avoidThis: 'Avoid overcomplicating a rushed night.', afterward: 'Keep emergency staples on hand.' },
      tween: { title: '5-minute school-age meal', emoji: '⏱️', doNow: 'Think assembled meal, not recipe: sandwich + fruit, quesadilla + salsa/fruit, yogurt + oats + fruit, or leftovers + a quick side.', sayThis: 'Fast is still a real meal.', avoidThis: 'Avoid overcomplicating a rushed night.', afterward: 'Keep emergency staples on hand.' },
    },
  },
  {
    id: 'picky-lunch',
    title: 'They are picky at lunch',
    emoji: '🥪',
    guidance: {
      baby: { title: 'Baby lunch refusal', emoji: '👶', doNow: 'Offer familiar foods alongside other developmentally appropriate options and let your baby decide whether to eat.', sayThis: 'You can explore or leave it.', avoidThis: 'Avoid forcing bites.', afterward: 'Keep mealtimes predictable.' },
      toddler: { title: 'Toddler picky lunch', emoji: '🥪', doNow: 'Pack one familiar food your child usually eats, then add one or two less familiar foods. Keep portions small enough that the meal does not feel overwhelming.', sayThis: 'There is something familiar here, and you can decide what you eat.', avoidThis: 'Avoid making a totally separate lunch after refusal every day.', afterward: 'Repeat familiar lunches and vary one component at a time.' },
      preschool: { title: 'Preschool picky lunch', emoji: '🥪', doNow: 'Use a reliable "anchor" food plus small amounts of other foods. A familiar sandwich, crackers, fruit, cheese, or yogurt can make a new food feel less risky.', sayThis: 'There is something you know here. You can choose what and how much to eat.', avoidThis: 'Avoid bribing with dessert or making lunchtime a test.', afterward: 'Notice patterns instead of judging the lunch by one day.' },
      bigkid: { title: 'School-age picky lunch', emoji: '🥪', doNow: 'Ask your child to help choose from a short list of dependable lunch components so the meal feels predictable without becoming repetitive.', sayThis: 'Let\'s choose a lunch you will actually eat.', avoidThis: 'Avoid making school lunch a daily argument.', afterward: 'Build a rotating list of reliable meals together.' },
      tween: { title: 'Tween picky lunch', emoji: '🥪', doNow: 'Ask your tween to help choose from a short list of dependable lunch components so the meal feels predictable without becoming repetitive.', sayThis: 'Let\'s choose a lunch you will actually eat.', avoidThis: 'Avoid making school lunch a daily argument.', afterward: 'Build a rotating list of reliable meals together.' },
    },
  },
  {
    id: 'no-cook',
    title: 'I do not want to cook',
    emoji: '🧊',
    guidance: {
      baby: { title: 'No-cook baby option', emoji: '🧊', doNow: 'Use a safe familiar ready-to-serve option that fits your baby\'s feeding stage.', sayThis: 'Tonight can be simple.', avoidThis: 'Avoid feeling guilty for choosing convenience.', afterward: 'Restock one or two backup options.' },
      toddler: { title: 'No-cook toddler meal', emoji: '🧊', doNow: 'Assemble a plate from ready foods: cheese + fruit + crackers, hummus + pita + cucumber, yogurt + banana + oats, or another familiar combination.', sayThis: 'We are building an easy plate tonight.', avoidThis: 'Avoid thinking a meal only counts if you cooked it.', afterward: 'Keep easy staples visible.' },
      preschool: { title: 'No-cook preschool meal', emoji: '🧊', doNow: 'Make a "snack plate dinner" with 3–4 familiar components such as cheese, fruit, crackers, hummus, cucumber, yogurt, or leftover chicken.', sayThis: 'You get a few foods to choose from tonight.', avoidThis: 'Avoid apologizing for an assembled meal.', afterward: 'Keep a list of no-cook meals that work.' },
      bigkid: { title: 'No-cook school-age meal', emoji: '🧊', doNow: 'Build an assembled plate or sandwich from ready foods plus fruit or another produce option.', sayThis: 'We are keeping dinner easy tonight.', avoidThis: 'Avoid treating convenience food as a parenting failure.', afterward: 'Stock a few ingredients specifically for no-cook nights.' },
      tween: { title: 'No-cook school-age meal', emoji: '🧊', doNow: 'Build an assembled plate or sandwich from ready foods plus fruit or another produce option.', sayThis: 'We are keeping dinner easy tonight.', avoidThis: 'Avoid treating convenience food as a parenting failure.', afterward: 'Stock a few ingredients specifically for no-cook nights.' },
    },
  },
  {
    id: 'packable-lunch',
    title: 'I need a lunch that packs easily',
    emoji: '📦',
    guidance: {
      baby: { title: 'Portable baby food', emoji: '👶', doNow: 'Choose foods that travel well and are appropriate for your baby\'s stage, with safe storage and supervision.', sayThis: 'We are making lunch easy to take with us.', avoidThis: 'Avoid packing food that requires more preparation on the go than it saves.', afterward: 'Keep a small travel-food checklist.' },
      toddler: { title: 'Easy packable toddler lunch', emoji: '📦', doNow: 'Choose low-mess items that can be eaten with minimal help: sandwich strips, cheese, fruit, crackers, yogurt pouch, or a familiar leftover in an insulated container.', sayThis: 'This lunch is made to be easy.', avoidThis: 'Avoid packing five things your child has to open, peel, or assemble.', afterward: 'Simplify your packing routine.' },
      preschool: { title: 'Easy packable preschool lunch', emoji: '📦', doNow: 'Choose 3–4 foods that travel well and match the school\'s rules. Think sandwich/roll-up + fruit + crunchy side + yogurt or cheese. Use an insulated container when needed.', sayThis: 'Everything is ready for you to eat.', avoidThis: 'Avoid sending foods that are difficult for a preschooler to open or manage independently.', afterward: 'Create a short lunchbox rotation and pack from it.' },
      bigkid: { title: 'Easy packable school lunch', emoji: '📦', doNow: 'Use a simple main + produce + extra formula and choose foods your child can open and eat independently.', sayThis: 'Pick the lunch you know you can finish and manage on your own.', avoidThis: 'Avoid overpacking.', afterward: 'Let your child help choose and restock favorites.' },
      tween: { title: 'Easy packable school lunch', emoji: '📦', doNow: 'Use a simple main + produce + extra formula and choose foods your tween can open and eat independently.', sayThis: 'Pick the lunch you know you can finish and manage on your own.', avoidThis: 'Avoid overpacking.', afterward: 'Let your tween help choose and restock favorites.' },
    },
  },
];

const siblingSituations: Situation[] = [
  {
    id: 'fighting',
    title: 'They keep fighting',
    emoji: '🥊',
    guidance: {
      baby: { title: 'Protect the baby', emoji: '👶', doNow: 'Move children to safety and set the boundary for the older child. Babies cannot resolve sibling conflict themselves.', sayThis: 'I will keep everyone safe. Gentle hands.', avoidThis: 'Avoid expecting a baby to understand fairness or sharing.', afterward: 'Give each child positive one-on-one attention when you can.' },
      toddler: { title: 'Toddler sibling fighting', emoji: '🥊', doNow: 'Separate if needed, stop hitting or grabbing, and help everyone calm down before solving the problem.', sayThis: 'I will not let you hurt each other. We can solve it when bodies are calm.', avoidThis: 'Avoid deciding who is the bad guy while everyone is upset.', afterward: 'Help each child name what they wanted and practice a safer response.' },
      preschool: { title: 'Preschool sibling fighting', emoji: '🥊', doNow: 'Stop unsafe behavior, separate children if necessary, and keep your voice calm.', sayThis: 'You can be angry. You cannot hurt each other.', avoidThis: 'Avoid forcing an immediate apology while a child is highly upset.', afterward: 'Practice words, turn-taking, or getting an adult.' },
      bigkid: { title: 'Big kid sibling fighting', emoji: '🥊', doNow: 'Make sure everyone is safe, then let children cool down before discussing the conflict.', sayThis: 'I will listen to both sides when everyone is calm.', avoidThis: 'Avoid automatically blaming the older child.', afterward: 'Help them identify the problem and agree on a solution or boundary.' },
      tween: { title: 'Tween sibling fighting', emoji: '🥊', doNow: 'Make sure everyone is safe, then let children cool down before discussing the conflict.', sayThis: 'I will listen to both sides when everyone is calm.', avoidThis: 'Avoid automatically blaming the older child.', afterward: 'Help them identify the problem and agree on a solution or boundary.' },
    },
  },
  {
    id: 'sharing',
    title: "They won\'t share",
    emoji: '🧸',
    guidance: {
      baby: { title: 'Baby + sharing', emoji: '👶', doNow: 'Babies are not developmentally ready for true sharing. Protect the baby\'s space and redirect the older child.', sayThis: 'That toy is being used right now. Let\'s find another one.', avoidThis: 'Avoid expecting a baby to understand ownership.', afterward: 'Practice simple turn-taking with the older child.' },
      toddler: { title: 'Toddler and sharing', emoji: '🧸', doNow: 'Use short turns and help your toddler understand when the turn will change.', sayThis: 'You are using it now. Then it will be your sibling\'s turn.', avoidThis: 'Avoid forcing a child to hand over a favorite toy immediately.', afterward: 'Practice turns with a timer or predictable routine.' },
      preschool: { title: 'Preschool sharing', emoji: '🧸', doNow: 'Teach turn-taking and give children words for requesting a turn.', sayThis: 'You can ask, "Can I have a turn when you are done?"', avoidThis: 'Avoid labeling a child selfish.', afterward: 'Praise cooperative behavior when you see it.' },
      bigkid: { title: 'Big kid sharing', emoji: '🧸', doNow: 'Help children negotiate ownership, turns, and shared spaces. Some personal belongings can remain private.', sayThis: 'You can have your own things and still learn to work together.', avoidThis: 'Avoid forcing a child to lend a personal possession.', afterward: 'Create simple family rules for shared belongings.' },
      tween: { title: 'Tween sharing', emoji: '🧸', doNow: 'Help children negotiate ownership, turns, and shared spaces. Some personal belongings can remain private.', sayThis: 'You can have your own things and still learn to work together.', avoidThis: 'Avoid forcing a child to lend a personal possession.', afterward: 'Create simple family rules for shared belongings.' },
    },
  },
  {
    id: 'jealous',
    title: "They\'re jealous of the baby",
    emoji: '💛',
    guidance: {
      baby: { title: 'New baby adjustment', emoji: '👶', doNow: 'Give the older child small ways to participate while protecting special one-on-one time.', sayThis: 'The baby needs help, and you still have a special place with me.', avoidThis: 'Avoid making the older child responsible for caring for the baby.', afterward: 'Look for small daily moments of undivided attention.' },
      toddler: { title: 'Toddler jealousy', emoji: '💛', doNow: 'Name the feeling without judging it and offer connection.', sayThis: 'Sometimes it is hard when the baby gets my attention. You can be mad and I still love you.', avoidThis: 'Avoid saying they should not need you because they are a big kid.', afterward: 'Build predictable one-on-one moments.' },
      preschool: { title: 'Preschool sibling jealousy', emoji: '💛', doNow: 'Acknowledge the feeling and make room for your child to express it safely.', sayThis: 'You wish you had me all to yourself. I understand.', avoidThis: 'Avoid shaming your child for wanting attention.', afterward: 'Give specific positive attention unrelated to helping the baby.' },
      bigkid: { title: 'Big kid jealousy', emoji: '💛', doNow: 'Listen without dismissing the feeling and reassure your child that they matter.', sayThis: 'You can tell me when you feel left out. I want to know.', avoidThis: 'Avoid assuming older children no longer need individual attention.', afterward: 'Create predictable individual time.' },
      tween: { title: 'Tween jealousy', emoji: '💛', doNow: 'Listen without dismissing the feeling and reassure your tween that they matter.', sayThis: 'You can tell me when you feel left out. I want to know.', avoidThis: 'Avoid assuming older children no longer need individual attention.', afterward: 'Create predictable individual time.' },
    },
  },
  {
    id: 'attention',
    title: 'They are fighting for my attention',
    emoji: '🙋',
    guidance: {
      baby: { title: 'Baby needs connection', emoji: '👶', doNow: 'Respond to your baby\'s cues and include the older child in simple connection moments when safe.', sayThis: 'I see you. I am coming to you as soon as I can.', avoidThis: 'Avoid expecting babies to wait quietly for long periods.', afterward: 'Use small predictable moments of connection.' },
      toddler: { title: 'Toddler wants all your attention', emoji: '🙋', doNow: 'Give brief focused attention when possible and clearly explain what you are doing next.', sayThis: 'I am helping your sister right now. Then it will be your turn with me.', avoidThis: 'Avoid making attention a competition.', afterward: 'Try short predictable special-time moments.' },
      preschool: { title: 'Preschooler wants your attention', emoji: '🙋', doNow: 'Acknowledge the need for connection and offer a realistic time when you can give focused attention.', sayThis: 'I hear that you want me. I am finishing this, then I can sit with you.', avoidThis: 'Avoid promising a time you cannot keep.', afterward: 'Follow through whenever possible.' },
      bigkid: { title: 'Big kid needs attention', emoji: '🙋', doNow: 'Listen and make space for individual connection, even if it is brief.', sayThis: 'You do not have to compete with your sibling for my love.', avoidThis: 'Avoid dismissing the need for attention as babyish.', afterward: 'Look for regular one-on-one moments.' },
      tween: { title: 'Tween needs attention', emoji: '🙋', doNow: 'Listen and make space for individual connection, even if it is brief.', sayThis: 'You do not have to compete with your sibling for my love.', avoidThis: 'Avoid dismissing the need for attention as babyish.', afterward: 'Look for regular one-on-one moments.' },
    },
  },
];

const expectingSituations: Record<string, Situation[]> = {
  'expecting-prep': [
    { id: 'prepare', title: 'What should I actually do before baby arrives?', emoji: '📝', guidance: {
      baby: { title: 'Start with the basics', emoji: '📝', doNow: 'Choose the few practical things that will make the first days easier: a safe sleep space, feeding supplies that fit your plan, diapers, a way to get baby home safely, and support contacts.', sayThis: 'I do not need to have everything perfect before baby arrives.', avoidThis: 'Avoid letting endless checklists convince you that you need every new-parent product.', afterward: 'Write down the three things you still need and stop there for today.' },
      toddler: { title: 'Start with the basics', emoji: '📝', doNow: 'Focus on the practical basics and support system that will make the transition home easier.', sayThis: 'We can prepare one small thing at a time.', avoidThis: 'Avoid trying to prepare for every possible scenario.', afterward: 'Choose one task for tomorrow rather than making a huge list.' },
      preschool: { title: 'Start with the basics', emoji: '📝', doNow: 'Focus on the practical basics and support system that will make the transition home easier.', sayThis: 'We can prepare one small thing at a time.', avoidThis: 'Avoid trying to prepare for every possible scenario.', afterward: 'Choose one task for tomorrow rather than making a huge list.' },
      bigkid: { title: 'Start with the basics', emoji: '📝', doNow: 'Focus on the practical basics and support system that will make the transition home easier.', sayThis: 'We can prepare one small thing at a time.', avoidThis: 'Avoid trying to prepare for every possible scenario.', afterward: 'Choose one task for tomorrow rather than making a huge list.' },
      tween: { title: 'Start with the basics', emoji: '📝', doNow: 'Focus on the practical basics and support system that will make the transition home easier.', sayThis: 'We can prepare one small thing at a time.', avoidThis: 'Avoid trying to prepare for every possible scenario.', afterward: 'Choose one task for tomorrow rather than making a huge list.' },
    }},
    { id: 'support', title: 'Who can actually help me?', emoji: '🤝', guidance: {
      baby: { title: 'Build your support list', emoji: '🤝', doNow: 'Write down two or three people or services you could contact for practical help, meals, errands, or emotional support.', sayThis: 'I do not have to do every part of this alone.', avoidThis: 'Avoid waiting until you are completely depleted before asking for help.', afterward: 'Send one specific request today.' }, toddler: { title: 'Build your support list', emoji: '🤝', doNow: 'Write down two or three people or services you could contact for practical help, meals, errands, or emotional support.', sayThis: 'I do not have to do every part of this alone.', avoidThis: 'Avoid waiting until you are completely depleted before asking for help.', afterward: 'Send one specific request today.' }, preschool: { title: 'Build your support list', emoji: '🤝', doNow: 'Write down two or three people or services you could contact for practical help, meals, errands, or emotional support.', sayThis: 'I do not have to do every part of this alone.', avoidThis: 'Avoid waiting until you are completely depleted before asking for help.', afterward: 'Send one specific request today.' }, bigkid: { title: 'Build your support list', emoji: '🤝', doNow: 'Write down two or three people or services you could contact for practical help, meals, errands, or emotional support.', sayThis: 'I do not have to do every part of this alone.', avoidThis: 'Avoid waiting until you are completely depleted before asking for help.', afterward: 'Send one specific request today.' },
      tween: { title: 'Build your support list', emoji: '🧩', doNow: 'Build a support list that includes practical help and trusted adults your tween can turn to as family roles change. Let your tween help choose one preparation task so they feel included rather than overlooked.', sayThis: 'We do not have to do every part of this alone, and you can tell me what support would help you too.', avoidThis: 'Avoid making your tween responsible for caring for the baby or dismissing their worries.', afterward: 'Plan a regular one-on-one check-in with your tween during the family transition.' },
    },
    },
  ],
  'expecting-needs': [
    { id: 'needs', title: 'What do I actually need?', emoji: '🛒', guidance: {
      baby: { title: 'The real essentials', emoji: '🛒', doNow: 'You need a safe sleep space, a feeding plan and supplies, diapers, basic clothing, a car seat, and a way to transport baby. Everything else is optional and can come later.', sayThis: 'I can start with the basics and add more if I need it.', avoidThis: 'Avoid buying every product on a registry checklist before baby arrives.', afterward: 'Write down what you already have, then list only the items still missing.' },
      toddler: { title: 'The real essentials', emoji: '🛒', doNow: 'Focus on what you need for the first two weeks: a safe sleep space, feeding supplies, diapers, basic clothing, and a car seat. The rest can wait.', sayThis: 'I do not need everything before baby arrives.', avoidThis: 'Avoid treating a registry as a requirements list.', afterward: 'Pick one missing item to buy or borrow this week.' },
      preschool: { title: 'The real essentials', emoji: '🛒', doNow: 'The true essentials are a safe sleep space, feeding supplies, diapers, basic clothing, and a car seat. Everything else is a nice-to-have.', sayThis: 'I can keep this simple.', avoidThis: 'Avoid buying for every possible scenario.', afterward: 'Add one item to your list and stop shopping for today.' },
      bigkid: { title: 'The real essentials', emoji: '🛒', doNow: 'Start with the essentials: safe sleep, feeding, diapers, clothing, and a car seat. Most other items can be added after baby arrives.', sayThis: 'I can figure out the rest later.', avoidThis: 'Avoid overbuying before you know what works for your baby.', afterward: 'Ask a trusted friend what they actually used versus what sat unused.' },
      tween: { title: 'The real essentials', emoji: '🛒', doNow: 'Start with the essentials: safe sleep, feeding, diapers, clothing, and a car seat. Most other items can be added after baby arrives.', sayThis: 'I can figure out the rest later.', avoidThis: 'Avoid overbuying before you know what works for your baby.', afterward: 'Ask a trusted friend what they actually used versus what sat unused.' },
    }},
    { id: 'skip', title: 'What can I skip?', emoji: '✋', guidance: {
      baby: { title: 'What you can skip', emoji: '✋', doNow: 'You can skip wipe warmers, bottle warmers, fancy nursery decor, newborn shoes, and most baby-specific gadgets. They are marketed hard but rarely essential.', sayThis: 'I do not need every baby gadget.', avoidThis: 'Avoid buying things just because a checklist says to.', afterward: 'Save the money or put it toward a few weeks of meal delivery instead.' },
      toddler: { title: 'What you can skip', emoji: '✋', doNow: 'Skip nursery decor, wipe warmers, bottle sanitizers if you have a dishwasher, newborn shoes, and baby loungers that are not safe for sleep.', sayThis: 'I can skip the extras.', avoidThis: 'Avoid buying items marketed as must-have that solve minor inconveniences.', afterward: 'Borrow or buy second-hand for items you are unsure about.' },
      preschool: { title: 'What you can skip', emoji: '✋', doNow: 'You can skip most baby gadgets, nursery themes, expensive bedding sets, and clothing sizes your baby will outgrow quickly.', sayThis: 'I do not need the full collection.', avoidThis: 'Avoid buying a full wardrobe before baby arrives.', afterward: 'Put a few items on a wish list and let others gift them if they want.' },
      bigkid: { title: 'What you can skip', emoji: '✋', doNow: 'Skip nursery decor, wipe warmers, bottle warmers, newborn shoes, and most baby gadgets. Buy those only if they turn out to be useful after baby arrives.', sayThis: 'I can wait and see what I actually need.', avoidThis: 'Avoid buying everything before you know your baby.', afterward: 'Keep receipts and return anything you do not use.' },
      tween: { title: 'What you can skip', emoji: '✋', doNow: 'Skip nursery decor, wipe warmers, bottle warmers, newborn shoes, and most baby gadgets. Buy those only if they turn out to be useful after baby arrives.', sayThis: 'I can wait and see what I actually need.', avoidThis: 'Avoid buying everything before you know your baby.', afterward: 'Keep receipts and return anything you do not use.' },
    }},
    { id: 'nursery', title: 'How much nursery prep is enough?', emoji: '🛏️', guidance: {
      baby: { title: 'Nursery prep', emoji: '🛏️', doNow: 'You need a safe, clear sleep space that meets current safe-sleep guidance. Decor, themes, and a fully styled room are optional and can wait.', sayThis: 'A safe sleep space is enough.', avoidThis: 'Avoid spending time and money on nursery decor before the basics are sorted.', afterward: 'Focus on safety first, then add decor later if you want it.' },
      toddler: { title: 'Nursery prep', emoji: '🛏️', doNow: 'A safe sleep space is the priority. A bassinet or crib that meets current safety standards is enough to start. The rest of the room can come together over time.', sayThis: 'The room does not need to be finished before baby comes home.', avoidThis: 'Avoid treating nursery decor as a prerequisite for bringing baby home.', afterward: 'Pick one small thing to add to the room this week, if you want.' },
      preschool: { title: 'Nursery prep', emoji: '🛏️', doNow: 'Prioritize a safe sleep space and a place to change diapers. Wall art, matching furniture, and themed bedding are optional.', sayThis: 'Safe and functional is enough.', avoidThis: 'Avoid spending on decor before you have the essentials.', afterward: 'Add one personal touch when the basics are done.' },
      bigkid: { title: 'Nursery prep', emoji: '🛏️', doNow: 'A safe sleep space and a changing area are the essentials. Everything else is styling and can be added gradually.', sayThis: 'I can keep the room simple.', avoidThis: 'Avoid treating the nursery as a project that must be finished before baby arrives.', afterward: 'Do one small thing and then take a break.' },
      tween: { title: 'Nursery prep', emoji: '🛏️', doNow: 'A safe sleep space and a changing area are the essentials. Everything else is styling and can be added gradually.', sayThis: 'I can keep the room simple.', avoidThis: 'Avoid treating the nursery as a project that must be finished before baby arrives.', afterward: 'Do one small thing and then take a break.' },
    }},
  ],
  'expecting-pack': [
    { id: 'bag', title: 'What should go in my bag?', emoji: '👜', guidance: {
      baby: { title: 'Hospital bag essentials', emoji: '👜', doNow: 'Pack parent essentials (ID, insurance card, phone and charger, comfortable clothes, toiletries, going-home outfit), baby essentials (two outfits, going-home outfit, diapers, wipes), and any snacks or drinks your hospital allows.', sayThis: 'I can pack a simple bag with the real essentials.', avoidThis: 'Avoid packing for every possible scenario — most extras can be brought later.', afterward: 'Check your hospital or birth center for their own packing list and rules.' },
      toddler: { title: 'Hospital bag essentials', emoji: '👜', doNow: 'Pack for yourself and baby: comfortable clothing, toiletries, phone and charger, ID and insurance documents, a going-home outfit, baby going-home outfit, diapers, and wipes. Add snacks or drinks if your hospital allows them.', sayThis: 'I only need the basics for a short stay.', avoidThis: 'Avoid overpacking — most hospitals provide basics and extras can come later.', afterward: 'Ask your hospital or birth center for their own list so you know what is and is not provided.' },
      preschool: { title: 'Hospital bag essentials', emoji: '👜', doNow: 'Focus on the essentials: comfortable clothing, toiletries, phone and charger, documents, a going-home outfit for you and baby, diapers, and wipes. Keep snacks simple if allowed.', sayThis: 'I can keep this bag simple.', avoidThis: 'Avoid packing items that are optional or can wait until after birth.', afterward: 'Check the hospital or birth-center packing list before finalizing your bag.' },
      bigkid: { title: 'Hospital bag essentials', emoji: '👜', doNow: 'Pack the real essentials: comfortable clothes, toiletries, phone and charger, ID and insurance documents, a going-home outfit for you and baby, diapers, and wipes. Remember the car seat for the ride home.', sayThis: 'I can pack what matters and skip the rest.', avoidThis: 'Avoid packing items you will not use in the first 24–48 hours.', afterward: 'Review your hospital or birth-center list and adjust.' },
      tween: { title: 'Hospital bag essentials', emoji: '👜', doNow: 'Pack the real essentials: comfortable clothes, toiletries, phone and charger, ID and insurance documents, a going-home outfit for you and baby, diapers, and wipes. Remember the car seat for the ride home.', sayThis: 'I can pack what matters and skip the rest.', avoidThis: 'Avoid packing items you will not use in the first 24–48 hours.', afterward: 'Review your hospital or birth-center list and adjust.' },
    }},
    { id: 'documents', title: 'What should I bring with me?', emoji: '📄', guidance: {
      baby: { title: 'Documents and essentials', emoji: '📄', doNow: 'Bring your ID, insurance card, birth plan if you have one, emergency contacts, and any paperwork your hospital or birth center requested. Also pack your phone, charger, and a list of important phone numbers.', sayThis: 'I can keep the important papers in one place.', avoidThis: 'Avoid leaving documents to the last minute.', afterward: 'Put all documents in a single folder or bag pocket so they are easy to find.' },
      toddler: { title: 'Documents and essentials', emoji: '📄', doNow: 'Pack your ID, insurance card, any birth plan, emergency contacts, and hospital paperwork. Include your phone, charger, and a list of key phone numbers.', sayThis: 'I can have the paperwork ready.', avoidThis: 'Avoid scrambling for documents when it is time to go.', afterward: 'Keep a folder with all documents ready near your bag.' },
      preschool: { title: 'Documents and essentials', emoji: '📄', doNow: 'Bring your ID, insurance card, birth plan if you have one, emergency contacts, and any forms from your provider. Pack your phone, charger, and important numbers.', sayThis: 'I can have everything in one place.', avoidThis: 'Avoid forgetting the charger — it is one of the most-used items.', afterward: 'Double-check your document folder the night before.' },
      bigkid: { title: 'Documents and essentials', emoji: '📄', doNow: 'Gather your ID, insurance card, birth plan, emergency contacts, and hospital paperwork. Do not forget your phone charger.', sayThis: 'I can keep the essentials organized.', avoidThis: 'Avoid leaving paperwork to the last minute.', afterward: 'Put everything in one spot so you can grab it quickly.' },
      tween: { title: 'Documents and essentials', emoji: '📄', doNow: 'Gather your ID, insurance card, birth plan, emergency contacts, and hospital paperwork. Do not forget your phone charger.', sayThis: 'I can keep the essentials organized.', avoidThis: 'Avoid leaving paperwork to the last minute.', afterward: 'Put everything in one spot so you can grab it quickly.' },
    }},
    { id: 'last-minute', title: 'What can wait until later?', emoji: '⏳', guidance: {
      baby: { title: 'What can wait', emoji: '⏳', doNow: 'Nursery decor, a full wardrobe, baby gadgets, most toys, and items for later months can all wait. Focus only on what you need for the first few days home.', sayThis: 'I do not need everything before baby arrives.', avoidThis: 'Avoid buying ahead for stages you have not reached yet.', afterward: 'Make a short list of later items and revisit it after baby is home.' },
      toddler: { title: 'What can wait', emoji: '⏳', doNow: 'Later-stage clothing, nursery finishing touches, most toys, baby gadgets, and anything for months ahead can wait. Pack only what you need for the first days.', sayThis: 'I can wait on the rest.', avoidThis: 'Avoid buying for future stages before you know what you need.', afterward: 'Keep a separate list of nice-to-haves and check it after baby arrives.' },
      preschool: { title: 'What can wait', emoji: '⏳', doNow: 'Decor, extra clothing sizes, gadgets, and most toys can wait. You only need the essentials for the first few days.', sayThis: 'I can add things later.', avoidThis: 'Avoid buying ahead of time for stages you have not reached.', afterward: 'Revisit your wish list after the first few weeks.' },
      bigkid: { title: 'What can wait', emoji: '⏳', doNow: 'Nursery decor, future-stage clothing, gadgets, and most toys can all wait. Focus on the first few days and add the rest as you learn what you need.', sayThis: 'I can figure out the rest after baby is here.', avoidThis: 'Avoid buying for every future stage at once.', afterward: 'Keep a list of later items and check it once you are settled at home.' },
      tween: { title: 'What can wait', emoji: '⏳', doNow: 'Nursery decor, future-stage clothing, gadgets, and most toys can all wait. Focus on the first few days and add the rest as you learn what you need.', sayThis: 'I can figure out the rest after baby is here.', avoidThis: 'Avoid buying for every future stage at once.', afterward: 'Keep a list of later items and check it once you are settled at home.' },
    }},
  ],
  'expecting-feeding': [
    { id: 'options', title: 'What are my feeding options?', emoji: '🤱', guidance: {
      baby: { title: 'Understanding feeding choices', emoji: '🤱', doNow: 'The main options are breastfeeding, formula feeding, combination feeding (breast and formula), and pumping or expressed milk. Each involves different routines, supplies, and support needs. Think about what fits your life, your body, and your support system.', sayThis: 'I can explore my options without committing to a permanent plan.', avoidThis: 'Avoid feeling locked into one choice before baby arrives — feeding plans can change.', afterward: 'Write down one question to ask your healthcare provider or a lactation consultant about feeding.' },
      toddler: { title: 'Understanding feeding choices', emoji: '🤱', doNow: 'Your options include breastfeeding, formula feeding, combination feeding, and pumping or expressed milk. Each involves different routines and supplies. Consider what fits your daily life and support system.', sayThis: 'I can learn about my options without pressure.', avoidThis: 'Avoid feeling you must decide everything before baby arrives.', afterward: 'Note one question to ask your provider about feeding.' },
      preschool: { title: 'Understanding feeding choices', emoji: '🤱', doNow: 'Breastfeeding, formula feeding, combination feeding, and pumping are all valid options. Each has different routines, supplies, and support needs. Think about what fits your family.', sayThis: 'I can explore what works for us.', avoidThis: 'Avoid feeling pressured to choose before you are ready.', afterward: 'Write down one feeding question for your next appointment.' },
      bigkid: { title: 'Understanding feeding choices', emoji: '🤱', doNow: 'The main feeding options are breastfeeding, formula feeding, combination feeding, and pumping or expressed milk. Each involves different routines, supplies, and support. Consider what fits your life and body.', sayThis: 'I can keep an open mind about feeding.', avoidThis: 'Avoid committing to a plan that feels rigid before baby arrives.', afterward: 'Ask your provider or a lactation professional about feeding support options.' },
      tween: { title: 'Understanding feeding choices', emoji: '🤱', doNow: 'The main feeding options are breastfeeding, formula feeding, combination feeding, and pumping or expressed milk. Each involves different routines, supplies, and support. Consider what fits your life and body.', sayThis: 'I can keep an open mind about feeding.', avoidThis: 'Avoid committing to a plan that feels rigid before baby arrives.', afterward: 'Ask your provider or a lactation professional about feeding support options.' },
    }},
    { id: 'supplies', title: 'What feeding supplies do I really need?', emoji: '🍼', guidance: {
      baby: { title: 'Feeding supplies', emoji: '🍼', doNow: 'If breastfeeding: nursing pads and a comfortable setup. If formula: bottles, nipples, and formula. If pumping: a pump and storage bags. You do not need every product before baby arrives — start with the basics for your plan.', sayThis: 'I can start with what I need for my feeding plan.', avoidThis: 'Avoid buying every feeding accessory before you know what works.', afterward: 'Add supplies gradually based on what you actually use.' },
      toddler: { title: 'Feeding supplies', emoji: '🍼', doNow: 'Start with the basics for your chosen plan: bottles and formula, or nursing pads and a comfortable setup for breastfeeding, or a pump and storage bags for pumping. Add more as you learn what works.', sayThis: 'I can buy the basics and add more later.', avoidThis: 'Avoid buying a full feeding kit before baby arrives.', afterward: 'Keep a short list of items to add after the first week.' },
      preschool: { title: 'Feeding supplies', emoji: '🍼', doNow: 'Depending on your plan, start with the essentials: bottles and formula, nursing pads, or a pump and storage bags. Skip the extras until you know what you need.', sayThis: 'I can start simple.', avoidThis: 'Avoid buying every accessory before baby arrives.', afterward: 'Add one item at a time as you learn what works.' },
      bigkid: { title: 'Feeding supplies', emoji: '🍼', doNow: 'Begin with the essentials for your feeding plan: bottles and formula, nursing pads, or a pump and storage bags. Most extras can be added after baby arrives.', sayThis: 'I can keep it simple to start.', avoidThis: 'Avoid buying a full feeding kit before you know what works.', afterward: 'Make a short list of items to add after the first week.' },
      tween: { title: 'Feeding supplies', emoji: '🍼', doNow: 'Begin with the essentials for your feeding plan: bottles and formula, nursing pads, or a pump and storage bags. Most extras can be added after baby arrives.', sayThis: 'I can keep it simple to start.', avoidThis: 'Avoid buying a full feeding kit before you know what works.', afterward: 'Make a short list of items to add after the first week.' },
    }},
    { id: 'pressure', title: 'I feel pressure about feeding', emoji: '💛', guidance: {
      baby: { title: 'Feeding pressure', emoji: '💛', doNow: 'Feeding choices are personal. Breastfeeding, formula feeding, combination feeding, and pumping are all valid. What matters is that your baby is fed and that you have support.', sayThis: 'I can choose what works for my family without guilt.', avoidThis: 'Avoid letting other people opinions override what is right for you and your baby.', afterward: 'If feeding feels overwhelming after baby arrives, ask a lactation consultant or your healthcare provider for support.' },
      toddler: { title: 'Feeding pressure', emoji: '💛', doNow: 'There is no single right way to feed a baby. Every feeding option is valid. Focus on what works for your body, your baby, and your family.', sayThis: 'I can make my own choice without guilt.', avoidThis: 'Avoid comparing your feeding plan to someone else.', afterward: 'Reach out for feeding support if you need it — that is a sign of strength, not failure.' },
      preschool: { title: 'Feeding pressure', emoji: '💛', doNow: 'Feeding pressure is common, but every valid feeding option exists for a reason. Choose what fits your family and seek support if you need it.', sayThis: 'I can trust my own decision.', avoidThis: 'Avoid letting guilt drive your feeding choice.', afterward: 'If feeding becomes stressful after birth, contact a lactation professional or your provider.' },
      bigkid: { title: 'Feeding pressure', emoji: '💛', doNow: 'Every feeding choice is valid. What matters is that your baby is fed and you have the support you need. Plans can change, and that is okay.', sayThis: 'I can choose what works for us.', avoidThis: 'Avoid letting pressure from others override your judgment.', afterward: 'Ask for feeding support early if you need it — it is easier to get help before things feel overwhelming.' },
      tween: { title: 'Feeding pressure', emoji: '💛', doNow: 'Every feeding choice is valid. What matters is that your baby is fed and you have the support you need. Plans can change, and that is okay.', sayThis: 'I can choose what works for us.', avoidThis: 'Avoid letting pressure from others override your judgment.', afterward: 'Ask for feeding support early if you need it — it is easier to get help before things feel overwhelming.' },
    }},
  ],
  'expecting-older-children': [
    { id: 'older-child', title: 'Preparing your older child for a new baby', emoji: '👧', guidance: {
      baby: { title: 'Keep the older child included', emoji: '👧', doNow: 'Talk simply about the baby coming and protect small moments that belong just to your older child. They do not need a job as a helper.', sayThis: 'You will always have your own place in our family. The baby will be joining us, not replacing you.', avoidThis: 'Avoid making your older child responsible for the baby or promising that everything will stay exactly the same.', afterward: 'Choose one ordinary one-on-one moment you can keep after the baby arrives.' },
      toddler: { title: 'Prepare without over-preparing', emoji: '🧸', doNow: 'Use simple, honest language about the baby and practice small changes only when they are useful. Keep familiar routines where you can.', sayThis: 'There will be a baby here, and you will still have time with me.', avoidThis: 'Avoid making every conversation about the baby or expecting your toddler to understand sharing attention before it happens.', afterward: 'Protect a short predictable connection ritual that can continue after birth.' },
      preschool: { title: 'Help them picture real life with a baby', emoji: '🦋', doNow: 'Talk about what the baby will actually do: sleep, cry, eat, and need adults. Give your preschooler a chance to ask questions and keep their own routines and interests important.', sayThis: 'Sometimes the baby will need me, and sometimes I will be all yours. We will still have our time together.', avoidThis: 'Avoid promising that they will love every part of having a sibling or making them the “big helper” all the time.', afterward: 'Plan one small one-on-one tradition to protect after the baby arrives.' },
      bigkid: { title: 'Make room for mixed feelings', emoji: '🎒', doNow: 'Let your child know they can feel excited, worried, annoyed, or all three. Give honest information about what will change and what will stay familiar.', sayThis: 'You can have any feelings about the baby. You do not have to be excited all the time.', avoidThis: 'Avoid making your big kid responsible for entertaining or caring for the baby.', afterward: 'Ask what they are most curious or worried about and answer just that.' },
      tween: { title: 'Include them without assigning responsibility', emoji: '🧩', doNow: 'Give your tween honest information, room for mixed feelings, and a voice in small family preparations if they want it.', sayThis: 'You are part of this family change, but you are not responsible for taking care of the baby.', avoidThis: 'Avoid parentifying your tween or assuming they should be excited simply because a baby is coming.', afterward: 'Keep regular private time where the conversation is about them, not the baby.' },
    }},
  ],
  'expecting-overwhelmed': [
    { id: 'overwhelmed', title: 'There is so much to do', emoji: '😵‍💫', guidance: {
      baby: { title: 'When it feels like too much', emoji: '😵‍💫', doNow: 'Pick one small task — not the whole list. Do that one thing today and let the rest wait.', sayThis: 'I do not have to do everything today.', avoidThis: 'Avoid looking at the entire preparation list all at once.', afterward: 'Put the list away and do something restful.' },
      toddler: { title: 'When it feels like too much', emoji: '😵‍💫', doNow: 'Choose one task from your list and do only that. Everything else can wait.', sayThis: 'I can focus on one thing right now.', avoidThis: 'Avoid trying to tackle the whole list at once.', afterward: 'Close the list and take a real break.' },
      preschool: { title: 'When it feels like too much', emoji: '😵‍💫', doNow: 'Pick the single most useful task and do that. Let the rest wait until tomorrow.', sayThis: 'One thing at a time is enough.', avoidThis: 'Avoid staring at the full list and feeling paralyzed.', afterward: 'Put the list down and rest.' },
      bigkid: { title: 'When it feels like too much', emoji: '😵‍💫', doNow: 'Choose one task and complete it. Ignore the rest of the list for today.', sayThis: 'I can do one thing and stop.', avoidThis: 'Avoid trying to prepare for everything at once.', afterward: 'Take a break and come back to the list tomorrow.' },
      tween: { title: 'When it feels like too much', emoji: '😵‍💫', doNow: 'Choose one task and complete it. Ignore the rest of the list for today.', sayThis: 'I can do one thing and stop.', avoidThis: 'Avoid trying to prepare for everything at once.', afterward: 'Take a break and come back to the list tomorrow.' },
    }},
    { id: 'anxious', title: 'I am anxious about becoming a parent', emoji: '💛', guidance: {
      baby: { title: 'Anxiety about parenthood', emoji: '💛', doNow: 'Anxiety before baby arrives is very common. Talk to someone you trust — a partner, friend, or healthcare provider. You do not have to feel ready for everything.', sayThis: 'It is okay to feel unsure. I can ask for support.', avoidThis: 'Avoid bottling up anxiety or assuming it means you will not be a good parent.', afterward: 'If anxiety feels constant or overwhelming, mention it to your healthcare provider.' },
      toddler: { title: 'Anxiety about parenthood', emoji: '💛', doNow: 'Feeling anxious is normal. Talk to someone you trust or your healthcare provider. You do not have to feel prepared for everything.', sayThis: 'I can share how I am feeling.', avoidThis: 'Avoid hiding anxiety or assuming it means something is wrong with you.', afterward: 'If anxiety is persistent or intense, bring it up with your provider.' },
      preschool: { title: 'Anxiety about parenthood', emoji: '💛', doNow: 'Anxiety is a common part of this transition. Share it with someone you trust or your healthcare provider.', sayThis: 'I am allowed to feel nervous.', avoidThis: 'Avoid assuming anxiety means you are not ready.', afterward: 'Reach out to your provider if anxiety feels overwhelming.' },
      bigkid: { title: 'Anxiety about parenthood', emoji: '💛', doNow: 'It is normal to feel anxious. Talk to someone you trust or your healthcare provider about what you are feeling.', sayThis: 'I can ask for support.', avoidThis: 'Avoid keeping anxiety to yourself.', afterward: 'If anxiety is persistent, mention it to your provider so they can help.' },
      tween: { title: 'Anxiety about parenthood', emoji: '💛', doNow: 'It is normal to feel anxious. Talk to someone you trust or your healthcare provider about what you are feeling.', sayThis: 'I can ask for support.', avoidThis: 'Avoid keeping anxiety to yourself.', afterward: 'If anxiety is persistent, mention it to your provider so they can help.' },
    }},
    { id: 'decide', title: 'I cannot make one more decision', emoji: '🧠', guidance: {
      baby: { title: 'Decision fatigue', emoji: '🧠', doNow: 'Stop making decisions for today. Pick one default option for the next thing you need and move on. You can change it later.', sayThis: 'I do not have to decide everything right now.', avoidThis: 'Avoid researching more options when you are already overwhelmed.', afterward: 'Come back to the decision tomorrow or ask someone to help you choose.' },
      toddler: { title: 'Decision fatigue', emoji: '🧠', doNow: 'Pick the simplest acceptable option and stop researching. You can change it later.', sayThis: 'Good enough is good enough.', avoidThis: 'Avoid comparing more options when you are already depleted.', afterward: 'Ask someone else to help with the next decision.' },
      preschool: { title: 'Decision fatigue', emoji: '🧠', doNow: 'Choose the simplest option and let it be done. You can revisit it later if needed.', sayThis: 'I can pick one thing and move on.', avoidThis: 'Avoid more research when you are already tired of deciding.', afterward: 'Delegate the next decision if you can.' },
      bigkid: { title: 'Decision fatigue', emoji: '🧠', doNow: 'Pick the simplest acceptable choice and stop. You can always change it later.', sayThis: 'I do not need the perfect choice, just a workable one.', avoidThis: 'Avoid endless research when you are already overwhelmed.', afterward: 'Ask someone to help with the next decision.' },
      tween: { title: 'Decision fatigue', emoji: '🧠', doNow: 'Pick the simplest acceptable choice and stop. You can always change it later.', sayThis: 'I do not need the perfect choice, just a workable one.', avoidThis: 'Avoid endless research when you are already overwhelmed.', afterward: 'Ask someone to help with the next decision.' },
    }},
  ],
};

const genericSituations = (topic: string, items: Array<[string, string, string]>): Situation[] =>
  items.map(([id, title, emoji]) => ({
    id,
    title,
    emoji,
    guidance: {
      baby: { title, emoji, doNow: `Keep this age-appropriate and focus first on safety, comfort, and your baby\'s basic needs. ${topic} can look different for babies.`, sayThis: 'I am here. We can take this one step at a time.', avoidThis: 'Avoid expecting skills that are beyond your child\'s developmental stage.', afterward: 'Watch for patterns and ask your child\'s healthcare professional if something seems unusual.' },
      toddler: { title, emoji, doNow: `Keep the expectation simple and give your toddler one clear next step. ${topic} is still a learning process at this age.`, sayThis: 'I will help you. Let\'s do the next step together.', avoidThis: 'Avoid long lectures, shame, or turning the moment into a power struggle.', afterward: 'Practice the skill again during a calm moment.' },
      preschool: { title, emoji, doNow: `Connect first, then give a clear expectation and a small choice when appropriate. ${topic} is a skill your child is still practicing.`, sayThis: 'I hear you. We can work through this together.', avoidThis: 'Avoid threats, embarrassment, or expecting perfection.', afterward: 'Praise progress and practice the replacement behavior.' },
      bigkid: { title, emoji, doNow: `Listen to your child, set the necessary boundary, and give them reasonable ownership of the solution.`, sayThis: 'Tell me what is going on and we will figure out the next step.', avoidThis: 'Avoid humiliation or reacting before you understand the problem.', afterward: 'Talk about what worked and what to try next time.' },
      tween: { title, emoji, doNow: `Listen to your tween, set the necessary boundary, and give them reasonable ownership of the solution.`, sayThis: 'Tell me what is going on and we will figure out the next step.', avoidThis: 'Avoid humiliation or reacting before you understand the problem.', afterward: 'Talk about what worked and what to try next time.' },
    },
  }));

const everydaySituations = genericSituations('everyday routines', [
  ['dressed', 'They refuse to get dressed', '👕'],
  ['leave', 'They will not leave the house', '🚪'],
  ['clean', 'They will not clean up', '🧹'],
  ['teeth', 'They refuse to brush teeth', '🪥'],
  ['listen', 'They are not listening', '👂'],
  ['bed', 'They fight every routine', '🔄'],
]);

const learningSituations = genericSituations('learning and development', [
  ['play', 'What should we practice today?', '🧠'],
  ['reading', 'They do not want to read', '📚'],
  ['independent', 'They want to do it themselves', '🙌'],
  ['frustrated', 'They get frustrated learning', '😣'],
  ['screen', 'I need a screen-free idea', '📵'],
  ['milestone', 'I am wondering about a milestone', '🌱'],
]);


const helpNowSituations: Situation[] = [
  {
    id: 'meltdown-now',
    title: 'Meltdown happening',
    emoji: '😤',
    category: 'behavior',
    guidance: {
      baby: { title: 'Baby is overwhelmed', emoji: '👶', doNow: 'Lower stimulation, check basic needs, and stay close and calm.', sayThis: 'You are having a hard time. I am here.', avoidThis: 'Do not try to teach a lesson while your baby is crying hard.', afterward: 'Once calm, think about what may have triggered the distress.' },
      toddler: { title: 'Toddler meltdown', emoji: '😤', doNow: 'Stay close, keep everyone safe, reduce talking, and use a calm voice.', sayThis: 'You are really upset. I am here. I will help you.', avoidThis: 'Avoid long explanations, yelling, threats, or lots of questions during the peak.', afterward: 'Once calm, briefly name what happened and practice what to try next time.' },
      preschool: { title: 'Preschool meltdown', emoji: '😤', doNow: 'Stay calm and keep the boundary while giving your child time to settle.', sayThis: 'You are very upset. I am here. I will not let you hurt anyone.', avoidThis: 'Avoid trying to reason through every detail while your child is highly upset.', afterward: 'Reconnect first, then briefly talk about the trigger and a better choice.' },
      bigkid: { title: 'Big kid emotional overload', emoji: '😤', doNow: 'Give your child some space while staying available and keeping everyone safe.', sayThis: 'I can see this is really frustrating. I am here when you are ready.', avoidThis: 'Avoid sarcasm, embarrassment, or forcing an immediate conversation.', afterward: 'Talk about what happened and find a strategy for next time.' },
      tween: { title: 'Tween emotional overload', emoji: '😤', doNow: 'Give your tween some space while staying available and keeping everyone safe.', sayThis: 'I can see this is really frustrating. I am here when you are ready.', avoidThis: 'Avoid sarcasm, embarrassment, or forcing an immediate conversation.', afterward: 'Talk about what happened and find a strategy for next time.' },
    },
  },
  {
    id: 'hitting-now',
    title: 'Someone is hitting',
    emoji: '🥊',
    category: 'behavior',
    guidance: {
      baby: { title: 'Keep baby safe', emoji: '👶', doNow: 'Block unsafe contact and move your baby or the other child away.', sayThis: 'I will keep everyone safe. Gentle hands.', avoidThis: 'Never hit back or use physical punishment.', afterward: 'Redirect and address the situation once everyone is calm.' },
      toddler: { title: 'Stop the hitting', emoji: '🥊', doNow: 'Block the hit, create space, and keep your words very short.', sayThis: 'I will not let you hit. I will help you.', avoidThis: 'Do not hit, threaten, or give a long lecture in the middle of the behavior.', afterward: 'Practice a safe replacement such as asking for help or saying "stop."' },
      preschool: { title: 'Stop the hitting', emoji: '🥊', doNow: 'Stop the hitting immediately and separate children if needed.', sayThis: 'You can be mad. You cannot hurt someone.', avoidThis: 'Avoid shaming your child or calling them bad.', afterward: 'Practice exactly what your child can do next time.' },
      bigkid: { title: 'Physical conflict', emoji: '🥊', doNow: 'Create physical safety and give everyone space to calm down.', sayThis: 'You are allowed to be angry. You are not allowed to hurt someone.', avoidThis: 'Avoid physical punishment or humiliation.', afterward: 'Discuss what led up to it and how to handle it next time.' },
      tween: { title: 'Physical conflict', emoji: '🥊', doNow: 'Create physical safety and give everyone space to calm down.', sayThis: 'You are allowed to be angry. You are not allowed to hurt someone.', avoidThis: 'Avoid physical punishment or humiliation.', afterward: 'Discuss what led up to it and how to handle it next time.' },
    },
  },
  {
    id: 'siblings-now',
    title: 'Siblings are fighting',
    emoji: '👧',
    category: 'multiple-children',
    guidance: {
      baby: { title: 'Protect the baby', emoji: '👶', doNow: 'Move children to safety and protect the baby from rough contact.', sayThis: 'I will keep everyone safe. Gentle hands.', avoidThis: 'Avoid expecting the baby to resolve conflict.', afterward: 'Give each child positive attention when things are calm.' },
      toddler: { title: 'Sibling fight', emoji: '👧', doNow: 'Separate if needed and stop hitting, grabbing, or dangerous behavior.', sayThis: 'I will not let you hurt each other. We can solve it when bodies are calm.', avoidThis: 'Avoid deciding who is the bad guy while everyone is upset.', afterward: 'Help each child explain what they wanted and practice a safer response.' },
      preschool: { title: 'Sibling fight', emoji: '👧', doNow: 'Stop unsafe behavior and give children a chance to calm down before solving the conflict.', sayThis: 'You can be angry. You cannot hurt each other.', avoidThis: 'Avoid forcing an apology while a child is still highly upset.', afterward: 'Practice turn-taking, asking for help, or using words.' },
      bigkid: { title: 'Sibling conflict', emoji: '👧', doNow: 'Make sure everyone is safe, then listen to both sides once they are calm.', sayThis: 'I will listen to both sides when everyone is calm.', avoidThis: 'Avoid automatically blaming one child.', afterward: 'Help them identify the problem and agree on a solution.' },
      tween: { title: 'Sibling conflict', emoji: '👧', doNow: 'Make sure everyone is safe, then listen to both sides once they are calm.', sayThis: 'I will listen to both sides when everyone is calm.', avoidThis: 'Avoid automatically blaming one child.', afterward: 'Help them identify the problem and agree on a solution.' },
    },
  },
  {
    id: 'sleep-now',
    title: "They won\'t sleep",
    emoji: '🌙',
    category: 'daily-care',
    guidance: {
      baby: { title: 'Baby will not settle', emoji: '👶', doNow: `They won't sleep? Start here.\n\nDo a quick needs check.\nMake sure your baby is fed, has a clean diaper, is not too hot or cold, and is not showing signs of illness or discomfort. Check for a fever, a wet diaper, or clothing that is too tight or scratchy.\n\nMake the room boring again.\nDim the lights, reduce noise, and remove stimulating toys or screens. A calm, predictable sleep space helps your baby's nervous system wind down.\n\nKeep your response calm and brief.\nIf your baby is crying, avoid turning it into a long interaction. Use the same short reassurance each time. A quiet hum, a gentle pat, or a soft voice is enough.\n\nThink about what changed today.\nA late nap, a skipped nap, an exciting day, visitors, travel, or a new routine can all make settling harder. Babies are sensitive to changes in their schedule.\n\nGive them one simple chance to settle.\nTry a familiar comfort item, a short cuddle, a lullaby, or another part of their normal bedtime routine rather than starting the whole routine over.\n\nIf they are upset, acknowledge it without making bedtime bigger.\nTry something like: "You are safe. It is time to rest. I am right here."\n\nIf this keeps happening, look at the pattern.\nConsider nap timing, wake windows, feeding schedule, and whether your baby may be getting overtired or not tired enough. Track sleep for 3 to 5 days to spot patterns.\n\nTry this tonight:\n1. Do a 60-second needs check (diaper, temperature, hunger, illness signs).\n2. Dim the lights and remove all stimulation from the sleep space.\n3. Use one familiar comfort method (patting, shushing, or a lullaby) and repeat it calmly without escalation.`, sayThis: 'It is time to rest. I am here.', avoidThis: 'Do not keep a baby awake to hit a wake-window target. Do not introduce new soothing methods in the middle of the night.', afterward: 'Return to a calm, predictable sleep routine tomorrow. If settling is consistently difficult, review nap timing and wake windows.', thenTry: 'If your baby is still unsettled after the needs check, try a different position (rocking, holding, or a carrier), a change of scenery for 2 minutes, or a warm bath before trying again.', ifNotWorking: 'If your baby is crying continuously after all needs are met and comfort is not helping, check for signs of illness (fever, congestion, unusual crying pattern). Contact the parent if concerned.', keepBusy: 'A white noise machine or a dark, swaddled sleep space can reduce stimulation and help your baby settle.', contactParent: 'Contact the parent if the baby has a fever (100.4F or higher), is breathing unusually, has been crying for more than an hour despite all comfort measures, or seems unwell.' },
      toddler: { title: 'Toddler will not sleep', emoji: '🌙', doNow: `They won't sleep? Start here.\n\nDo a quick needs check.\nMake sure they are comfortable, not too hot or cold, do not need the bathroom, are not hungry or thirsty, and are not showing signs of illness or pain.\n\nMake the room boring again.\nDim the lights, reduce noise, put away stimulating toys and screens, and keep the room calm and predictable.\n\nKeep your response calm and brief.\nIf they are getting out of bed or calling for you, avoid turning it into a long conversation or playtime. Use the same short reassurance each time.\n\nThink about what changed today.\nA late nap, skipped nap, exciting day, travel, visitors, a new routine, or being overtired can all make settling harder.\n\nGive them one simple chance to settle.\nTry a familiar comfort item, a short cuddle, one book, or another part of their normal bedtime routine rather than starting the whole routine over.\n\nIf they are upset or afraid, acknowledge it without making bedtime bigger.\nTry something like: "You are safe. It is bedtime. I am right here. Your job is to rest."\n\nIf this keeps happening, look at the pattern rather than treating every night as a new problem.\nConsider nap timing, bedtime timing, consistency of the routine, and whether they may be getting overtired or not tired enough.\n\nTry this tonight:\n1. Do a quick needs check (bathroom, water, temperature, illness signs).\n2. Dim the lights and remove all toys and screens from the room.\n3. Walk them back to bed calmly with the same short phrase every time they get up. No negotiations.`, sayThis: 'It is bedtime. I will help you get settled.', avoidThis: 'Avoid adding endless extra requests. Do not turn bedtime into a long conversation or negotiation.', afterward: 'Look at naps and bedtime timing if the problem repeats. Track sleep for 3 to 5 days to spot patterns.', thenTry: 'If they keep getting up, try a simple bedtime pass (one allowed trip out of bed for a specific reason), then hold the boundary firmly after that.', ifNotWorking: 'If they are genuinely upset or afraid (not just stalling), sit quietly nearby without engaging in conversation. Your calm presence helps them settle without making bedtime bigger.', keepBusy: 'A familiar comfort item (stuffed animal, blanket, or nightlight) can help them feel safe and settled.', contactParent: 'Contact the parent if the child seems unwell, is in pain, or the sleep difficulty is new and unusual.' },
      preschool: { title: 'Preschooler will not sleep', emoji: '🌙', doNow: `They won't sleep? Start here.\n\nDo a quick needs check.\nMake sure they are comfortable, not too hot or cold, do not need the bathroom, are not hungry or thirsty, and are not showing signs of illness or pain.\n\nMake the room boring again.\nDim the lights, reduce noise, put away stimulating toys and screens, and keep the room calm and predictable.\n\nKeep your response calm and brief.\nIf they are getting out of bed or calling for you, avoid turning it into a long conversation or playtime. Use the same short reassurance each time.\n\nThink about what changed today.\nA late nap, skipped nap, exciting day, travel, visitors, a new routine, or being overtired can all make settling harder.\n\nGive them one simple chance to settle.\nTry a familiar comfort item, a short cuddle, one book, or another part of their normal bedtime routine rather than starting the whole routine over.\n\nIf they are upset or afraid, acknowledge it without making bedtime bigger.\nTry something like: "You are safe. It is bedtime. I am right here. Your job is to rest."\n\nIf this keeps happening, look at the pattern rather than treating every night as a new problem.\nConsider nap timing, bedtime timing, consistency of the routine, and whether they may be getting overtired or not tired enough.\n\nTry this tonight:\n1. Do a quick needs check (bathroom, water, temperature, illness signs).\n2. Dim the lights and remove all toys and screens from the room.\n3. Walk them back to bed calmly with the same short phrase every time. No long conversations.`, sayThis: 'Your job is to rest. I am nearby.', avoidThis: 'Avoid turning bedtime into a long conversation. Do not negotiate the boundary after it is set.', afterward: 'Adjust the routine during the daytime if needed. Track sleep for 3 to 5 days to spot patterns.', thenTry: 'If they keep getting up, try a bedtime check chart (a simple card you leave on their door that you check off each time they stay in bed). Give positive reinforcement in the morning.', ifNotWorking: 'If they are afraid of the dark or monsters, acknowledge the fear without dismissing it, add a nightlight, and keep your response brief and consistent. Do not turn it into a long investigation.', keepBusy: 'A quiet audiobook, a familiar stuffed animal, or a nightlight can help them feel safe and settled.', contactParent: 'Contact the parent if the child seems unwell, is in pain, or the sleep difficulty is new and unusual.' },
      bigkid: { title: 'Big kid will not sleep', emoji: '🌙', doNow: `They won't sleep? Start here.\n\nDo a quick needs check.\nMake sure they are comfortable, not too hot or cold, do not need the bathroom, are not hungry or thirsty, and are not showing signs of illness or pain.\n\nMake the room boring again.\nDim the lights, reduce noise, put away stimulating toys and screens, and keep the room calm and predictable.\n\nKeep your response calm and brief.\nIf they are getting out of bed or calling for you, avoid turning it into a long conversation or playtime. Use the same short reassurance each time.\n\nThink about what changed today.\nA late nap, skipped nap, exciting day, travel, visitors, a new routine, or being overtired can all make settling harder.\n\nGive them one simple chance to settle.\nTry a familiar comfort item, a short cuddle, one book, or another part of their normal bedtime routine rather than starting the whole routine over.\n\nIf they are upset or afraid, acknowledge it without making bedtime bigger.\nTry something like: "You are safe. It is bedtime. I am right here. Your job is to rest."\n\nIf this keeps happening, look at the pattern rather than treating every night as a new problem.\nConsider nap timing, bedtime timing, consistency of the routine, and whether they may be getting overtired or not tired enough.\n\nTry this tonight:\n1. Do a quick needs check (bathroom, water, temperature, illness signs).\n2. Remove all screens and stimulating toys from the bedroom.\n3. Offer one quiet activity (a book or a calm conversation) with a clear end, then lights out.`, sayThis: 'You do not have to fall asleep right away. Your job is to rest.', avoidThis: 'Avoid nightly arguments about whether bedtime is necessary. Do not negotiate the boundary after it is set.', afterward: 'Look for schedule, stress, or sleep-environment issues. Track sleep for 3 to 5 days to spot patterns.', thenTry: 'If they keep getting up, try a wind-down checklist (a simple visual list of bedtime steps they can follow independently) and praise them in the morning for completing it.', ifNotWorking: 'If they seem worried or anxious, give them 5 minutes to talk about it before bed, then close the conversation. Do not let bedtime become the time for processing the whole day.', keepBusy: 'A book, a quiet journal, or a nightlight can help them wind down independently.', contactParent: 'Contact the parent if the child seems unwell, is in pain, or the sleep difficulty is new and unusual.' },
      tween: { title: 'Tween will not sleep', emoji: '🌙', doNow: `They won't sleep? Start here.\n\nDo a quick needs check.\nMake sure they are comfortable, not too hot or cold, do not need the bathroom, are not hungry or thirsty, and are not showing signs of illness or pain.\n\nMake the room boring again.\nDim the lights, reduce noise, put away stimulating toys and screens, and keep the room calm and predictable.\n\nKeep your response calm and brief.\nIf they are getting out of bed or calling for you, avoid turning it into a long conversation or playtime. Use the same short reassurance each time.\n\nThink about what changed today.\nA late nap, skipped nap, exciting day, travel, visitors, a new routine, or being overtired can all make settling harder.\n\nGive them one simple chance to settle.\nTry a familiar comfort item, a short cuddle, one book, or another part of their normal bedtime routine rather than starting the whole routine over.\n\nIf they are upset or afraid, acknowledge it without making bedtime bigger.\nTry something like: "You are safe. It is bedtime. I am right here. Your job is to rest."\n\nIf this keeps happening, look at the pattern rather than treating every night as a new problem.\nConsider nap timing, bedtime timing, consistency of the routine, and whether they may be getting overtired or not tired enough.\n\nTry this tonight:\n1. Do a quick needs check (bathroom, water, temperature, illness signs).\n2. Remove all screens and stimulating toys from the bedroom.\n3. Offer one quiet activity (a book or a calm conversation) with a clear end, then lights out.`, sayThis: 'You do not have to fall asleep right away. Your job is to rest.', avoidThis: 'Avoid nightly arguments about whether bedtime is necessary. Do not negotiate the boundary after it is set.', afterward: 'Look for schedule, stress, or sleep-environment issues. Track sleep for 3 to 5 days to spot patterns.', thenTry: 'If they keep getting up, try a wind-down checklist (a simple visual list of bedtime steps they can follow independently) and praise them in the morning for completing it.', ifNotWorking: 'If they seem worried or anxious, give them 5 minutes to talk about it before bed, then close the conversation. Do not let bedtime become the time for processing the whole day.', keepBusy: 'A book, a quiet journal, or a nightlight can help them wind down independently.', contactParent: 'Contact the parent if the child seems unwell, is in pain, or the sleep difficulty is new and unusual.' },
    },
  },
  {
    id: 'nap-now',
    title: "Won\'t nap",
    emoji: '😴',
    category: 'daily-care',
    guidance: {
      baby: { title: 'Baby will not nap', emoji: '😴', doNow: `They won't nap? Start here.\n\nDo a quick needs check.\nMake sure your baby is fed, has a clean diaper, is not too hot or cold, and is not showing signs of illness or discomfort.\n\nCheck the wake window.\nMost nap resistance in babies comes from being put down too late. An overtired baby fights sleep harder, not easier. Try moving the nap 15 to 30 minutes earlier.\n\nMake the room dark and calm.\nClose the curtains, use white noise, and remove stimulating toys. A dark, quiet space signals sleep time.\n\nUse the same nap routine every time.\nA short version of your bedtime routine — a book, a song, a dim room — helps your baby's brain recognize it is nap time.\n\nThink about what changed today.\nA late morning wake-up, an exciting morning, visitors, or a developmental leap can all disrupt naps.\n\nTry this right now:\n1. Do a 30-second needs check (diaper, temperature, hunger).\n2. Close the curtains and turn on white noise.\n3. Try one familiar soothing method (rocking, patting, or shushing) for 5 minutes. If your baby is still fighting it, try again in 20 to 30 minutes.`, sayThis: 'It is rest time. I am here.', avoidThis: 'Do not keep a baby awake hoping they will nap better later. An overtired baby is harder to settle, not easier.', afterward: 'Track nap times and wake windows for 3 to 5 days to find the sweet spot. If a specific nap is consistently hard, adjust the timing rather than dropping it.', thenTry: 'If your baby fights the nap after 10 minutes of trying, get them up and try a quiet activity for 20 minutes, then try again when they seem drowsy.', ifNotWorking: 'If your baby is crying hard and will not settle after all needs are met, check for illness signs (fever, teething, congestion). Some days naps just do not happen — an earlier bedtime can compensate.', keepBusy: 'A dark room and white noise are the most effective tools for nap time. A consistent nap routine helps your baby learn the pattern.', contactParent: 'Contact the parent if the baby has a fever, seems unwell, or has missed all naps and is extremely fussy.' },
      toddler: { title: 'Toddler will not nap', emoji: '😴', doNow: `They won't nap? Start here.\n\nCheck the timing first.\nThe most common reason a toddler fights a nap is that the nap is too late. By the time they are put down, they are overtired and running on adrenaline. Try moving the nap 15 to 30 minutes earlier for a few days.\n\nTake the pressure off.\nIf your toddler knows you are anxious about whether they sleep, it becomes a power struggle. Say: "You do not have to sleep, but your body needs to rest." Let them lie down with a book or a quiet toy in a dim room.\n\nCreate a mini wind-down.\nA 5 to 10 minute routine before the nap — dim the lights, read one book, sing a quiet song — helps their brain shift into rest mode. Keep it the same every day.\n\nThink about whether the nap is still needed.\nMost toddlers between 1 and 3 still need a nap. If your toddler fights it daily but is cheerful all afternoon, they may be transitioning. If they fight it and then melt down by 4 PM, they still need it — the timing or approach needs adjusting, not the nap itself.\n\nTry this right now:\n1. Check the time — if it is later than their usual nap window, try 15 to 30 minutes earlier tomorrow.\n2. Dim the room and offer one quiet activity (a book or a stuffed animal).\n3. Say: "Your body needs to rest. You do not have to sleep." Set a timer for 30 minutes of quiet time.`, sayThis: 'Your body needs a rest. You do not have to sleep, but you need to lie down and rest.', avoidThis: 'Do not make nap time a battle. If your toddler feels pressured to sleep, the stress makes sleep harder, not easier. Do not assume a toddler who fights naps is ready to drop them.', afterward: 'Track nap times and afternoon behavior for 3 to 5 days. If they skip the nap but melt down by late afternoon, they still need it — try an earlier nap time or an earlier bedtime.', thenTry: 'If they will not lie down, try a quiet activity together in a dim room — reading a book or listening to soft music. The goal is rest, not necessarily sleep.', ifNotWorking: 'If your toddler consistently skips the nap but stays cheerful, try quiet time instead and move bedtime 20 to 30 minutes earlier to compensate for the lost sleep.', keepBusy: 'A familiar comfort item, a short audio story, or a board book can help a toddler settle into quiet time even if they do not sleep.', contactParent: 'Contact the parent if the child seems unwell, is in pain, or has not napped and is becoming extremely fussy.' },
      preschool: { title: 'Preschooler will not nap', emoji: '😴', doNow: `They won't nap? Start here.\n\nThis is the nap transition age.\nSome 3 to 5 year olds still nap every day, some nap occasionally, and some have stopped entirely. All three can be normal. The question is whether your child still needs daytime rest — and their afternoon behavior will tell you.\n\nOffer quiet time instead of forcing sleep.\nSay: "You do not have to sleep, but your body needs a rest." Set up a dim, calm space with a book, a quiet toy, or an audio story for 20 to 45 minutes. Some days they will sleep, some days they will not — both are okay.\n\nWatch the afternoon.\nIf your preschooler skips the nap and is cranky, clingy, or melting down by 4 or 5 PM, they still need some form of daytime rest. If they sail through the afternoon happily, the nap may be phasing out naturally.\n\nDo not rush the transition.\nDropping a nap too early can lead to more meltdowns, harder bedtimes, and an overtired child. If you are not sure, keep offering quiet time — it gives their body a break whether or not they sleep.\n\nTry this right now:\n1. Create a calm, dim space — close the curtains, turn off screens.\n2. Offer one quiet activity (a book, a puzzle, or a stuffed animal).\n3. Set a timer for 30 minutes and say: "This is quiet time. Your body needs to rest."`, sayThis: 'Your body needs a rest. You do not have to sleep, but you need to slow down for a little while.', avoidThis: 'Do not assume your preschooler is ready to drop naps just because they fight them. Do not make quiet time feel like a punishment — frame it as a break for their body.', afterward: 'If your preschooler is consistently cranky in the afternoon after skipping naps, they still need daytime rest. Try an earlier bedtime (20 to 30 minutes earlier) to compensate.', thenTry: 'If they resist lying down, try a quiet activity at a table or on the couch — coloring, looking at a book, or listening to a calm audio story. The goal is rest, not a specific posture.', ifNotWorking: 'If naps are a daily fight for more than a week, try alternating nap days and quiet-time days. This gives you both a break while the transition settles naturally.', keepBusy: 'A quiet audiobook, a stack of picture books, or a calm music playlist can make quiet time feel special rather than restrictive.', contactParent: 'Contact the parent if the child seems unwell or is consistently exhausted despite what seems like enough sleep.' },
      bigkid: { title: 'Big kid will not nap', emoji: '😴', doNow: `Most school-age children no longer nap, and that is normal.\n\nIf your child seems tired during the day, focus on nighttime sleep.\nCheck whether they are getting 9 to 12 hours of sleep at night. An earlier, consistent bedtime is usually more effective than adding a nap at this age.\n\nOffer a brief quiet time after school.\nIf your child comes home tired, 15 to 20 minutes of rest with a book or a quiet activity can help them decompress without interfering with bedtime. This is not a nap — it is a reset.\n\nLook at the schedule.\nIf your child is consistently tired during the day, check whether screens, homework, activities, or an inconsistent bedtime are cutting into sleep. Moving bedtime 20 to 30 minutes earlier often helps more than a nap.\n\nTry this right now:\n1. Offer a 15-minute quiet break with a book or a calm activity.\n2. Check whether bedtime is early enough — most school-age children need 9 to 12 hours.\n3. If daytime sleepiness persists, track sleep for a week and talk with your pediatrician.`, sayThis: 'Your body needs a little break. Let us rest for a few minutes and then get back to your day.', avoidThis: 'Do not force a nap on a school-age child who no longer needs one. Persistent daytime sleepiness at this age should be discussed with a healthcare professional, not treated with a nap.', afterward: 'If your child is consistently sleepy during the day despite enough nighttime sleep, talk with your healthcare professional. It may be worth checking for sleep quality, screen habits, or other factors.', thenTry: 'If your child is tired after school, try a 15-minute quiet break with a book or a snack before homework or activities start.', ifNotWorking: 'If daytime tiredness persists for more than a week or two despite adequate sleep, discuss it with your pediatrician.', keepBusy: 'A short walk, a snack, or a few minutes of quiet reading can help a tired school-age child reset without a full nap.', contactParent: 'Contact the parent if the child seems unwell or is consistently sleepy despite what seems like enough sleep.' },
      tween: { title: 'Tween will not nap', emoji: '😴', doNow: `Most tweens no longer nap, and that is normal.\n\nIf your tween seems tired during the day, focus on nighttime sleep.\nCheck whether they are getting 9 to 12 hours of sleep at night. An earlier, consistent bedtime is usually more effective than adding a nap at this age.\n\nOffer a brief quiet time after school.\nIf your tween comes home tired, 15 to 20 minutes of rest with a book or a quiet activity can help them decompress without interfering with bedtime. This is not a nap — it is a reset.\n\nLook at the schedule.\nIf your tween is consistently tired during the day, check whether screens, homework, activities, or an inconsistent bedtime are cutting into sleep. Moving bedtime 20 to 30 minutes earlier often helps more than a nap.\n\nTry this right now:\n1. Offer a 15-minute quiet break with a book or a calm activity.\n2. Check whether bedtime is early enough — most tweens need 9 to 12 hours.\n3. If daytime sleepiness persists, track sleep for a week and talk with your pediatrician.`, sayThis: 'Your body needs a little break. Let us rest for a few minutes and then get back to your day.', avoidThis: 'Do not force a nap on a tween who no longer needs one. Persistent daytime sleepiness at this age should be discussed with a healthcare professional, not treated with a nap.', afterward: 'If your tween is consistently sleepy during the day despite enough nighttime sleep, talk with your healthcare professional. It may be worth checking for sleep quality, screen habits, or other factors.', thenTry: 'If your tween is tired after school, try a 15-minute quiet break with a book or a snack before homework or activities start.', ifNotWorking: 'If daytime tiredness persists for more than a week or two despite adequate sleep, discuss it with your pediatrician.', keepBusy: 'A short walk, a snack, or a few minutes of quiet reading can help a tired tween reset without a full nap.', contactParent: 'Contact the parent if the child seems unwell or is consistently sleepy despite what seems like enough sleep.' },
    },
  },
  {
    id: 'eat-now',
    title: "They won\'t eat",
    emoji: '🍽️',
    category: 'daily-care',
    guidance: {
      baby: { title: 'Baby refuses a feed', emoji: '👶', doNow: 'Pause, check for discomfort or overstimulation, and offer the feed again. If intake is significantly reduced or you are worried about hydration or illness, contact your healthcare professional.', sayThis: 'We can pause. I am here.', avoidThis: 'Do not force-feed.', afterward: 'Watch your baby\'s overall feeding and diaper pattern.' },
      toddler: { title: 'Toddler refuses food', emoji: '🍽️', doNow: 'Offer the planned meal with at least one familiar food and let your child decide whether and how much to eat.', sayThis: 'You do not have to eat. This is what is available right now.', avoidThis: 'Avoid begging, bribing, or forcing bites.', afterward: 'Offer the next meal or snack at the normal time.' },
      preschool: { title: 'Preschooler refuses food', emoji: '🍽️', doNow: 'Stay neutral and keep the meal routine predictable.', sayThis: 'You can decide what and how much to eat from what is offered.', avoidThis: 'Avoid making eating a battle.', afterward: 'Continue offering variety over time.' },
      bigkid: { title: 'Big kid refuses food', emoji: '🍽️', doNow: 'Keep the meal calm and talk about hunger and fullness rather than demanding a clean plate.', sayThis: 'Listen to your body. You can tell me when you are hungry or full.', avoidThis: 'Avoid using food as a reward or punishment.', afterward: 'Keep regular meals and snacks.' },
      tween: { title: 'Tween refuses food', emoji: '🍽️', doNow: 'Keep the meal calm and talk about hunger and fullness rather than demanding a clean plate.', sayThis: 'Listen to your body. You can tell me when you are hungry or full.', avoidThis: 'Avoid using food as a reward or punishment.', afterward: 'Keep regular meals and snacks.' },
    },
  },
  {
    id: 'potty-now',
    title: 'Potty accident',
    emoji: '🚽',
    category: 'daily-care',
    guidance: {
      baby: { title: 'Baby diaper change', emoji: '👶', doNow: 'Clean your baby gently and keep the response neutral.', sayThis: 'Let\'s get you cleaned up.', avoidThis: 'Avoid treating a diaper as misbehavior.', afterward: 'Return to your normal diaper routine.' },
      toddler: { title: 'Toddler potty accident', emoji: '🚽', doNow: 'Stay neutral, help your child clean up, and calmly remind them where the potty is.', sayThis: 'Accidents happen. Let\'s get cleaned up and try again.', avoidThis: 'Avoid punishment or shame.', afterward: 'Look for patterns and keep potty opportunities predictable.' },
      preschool: { title: 'Preschool potty accident', emoji: '🚽', doNow: 'Keep your reaction matter-of-fact and return to the routine.', sayThis: 'It was an accident. We can clean up and try again.', avoidThis: 'Avoid making the accident a big emotional event.', afterward: 'Consider reminders and regular bathroom opportunities.' },
      bigkid: { title: 'Big kid accident', emoji: '🚽', doNow: 'Handle it privately and help your child clean up without teasing or shaming.', sayThis: 'You are not in trouble. Let\'s figure out what your body needed.', avoidThis: 'Avoid public discussion or punishment.', afterward: 'Frequent or concerning accidents should be discussed with a healthcare professional.' },
      tween: { title: 'Tween accident', emoji: '🚽', doNow: 'Handle it privately and help your tween clean up without teasing or shaming.', sayThis: 'You are not in trouble. Let\'s figure out what your body needed.', avoidThis: 'Avoid public discussion or punishment.', afterward: 'Frequent or concerning accidents should be discussed with a healthcare professional.' },
    },
  },
  {
    id: 'dressed-now',
    title: "They won\'t get dressed",
    emoji: '👕',
    category: 'daily-care',
    guidance: {
      baby: { title: 'Baby dressing', emoji: '👶', doNow: 'Keep dressing calm and quick and check for hunger, tiredness, or discomfort.', sayThis: 'Let\'s get your clothes on and then we can cuddle.', avoidThis: 'Avoid expecting a baby to cooperate like an older child.', afterward: 'Keep clothing choices comfortable and simple.' },
      toddler: { title: 'Toddler refuses clothes', emoji: '👕', doNow: 'Offer two acceptable choices and keep the routine moving.', sayThis: 'Blue shirt or green shirt?', avoidThis: 'Avoid turning clothing into a long negotiation.', afterward: 'Give a transition warning before dressing time.' },
      preschool: { title: 'Preschooler refuses clothes', emoji: '👕', doNow: 'State the expectation and offer a limited choice.', sayThis: 'We need clothes on. Do you want to choose your shirt or pants first?', avoidThis: 'Avoid arguing about every clothing detail.', afterward: 'Lay clothes out ahead of time.' },
      bigkid: { title: 'Big kid refuses clothes', emoji: '👕', doNow: 'Give reasonable ownership while keeping the departure time clear.', sayThis: 'You can choose your outfit, but we need to be dressed by this time.', avoidThis: 'Avoid micromanaging every choice.', afterward: 'Use a checklist if mornings are repeatedly difficult.' },
      tween: { title: 'Tween refuses clothes', emoji: '👕', doNow: 'Give reasonable ownership while keeping the departure time clear.', sayThis: 'You can choose your outfit, but we need to be dressed by this time.', avoidThis: 'Avoid micromanaging every choice.', afterward: 'Use a checklist if mornings are repeatedly difficult.' },
    },
  },
  {
    id: 'screen-now',
    title: "They won\'t give up the screen",
    emoji: '📱',
    category: 'behavior',
    guidance: {
      baby: { title: 'Baby screen transition', emoji: '👶', doNow: 'Turn the screen off and move into a simple hands-on activity.', sayThis: 'Screen is all done. Let\'s play together.', avoidThis: 'Avoid using screens as the only way to calm every difficult moment.', afterward: 'Use predictable routines around media.' },
      toddler: { title: 'Toddler screen transition', emoji: '📱', doNow: 'Give a short warning, turn it off calmly, and immediately offer the next activity.', sayThis: 'One more minute, then screen is all done. After that we will play with blocks.', avoidThis: 'Avoid reopening the negotiation after the limit.', afterward: 'Keep the media routine predictable.' },
      preschool: { title: 'Preschool screen transition', emoji: '📱', doNow: 'Give a warning and follow through with the agreed limit.', sayThis: 'Screen time is finished. You can choose books or blocks next.', avoidThis: 'Avoid adding extra minutes because of a meltdown.', afterward: 'Praise successful transitions.' },
      bigkid: { title: 'Big kid screen transition', emoji: '📱', doNow: 'Use a clear family media rule and give your child ownership of stopping at the agreed time.', sayThis: 'The limit is the limit. You can choose what you do next.', avoidThis: 'Avoid making screen limits up during the argument.', afterward: 'Create a predictable family media plan.' },
      tween: { title: 'Tween screen transition', emoji: '🧩', doNow: 'Use a family media rule your tween helped set and give them ownership of stopping at the agreed time. Explain the connection to sleep, homework, mood, and relationships.', sayThis: 'The limit is the one we agreed on. You can choose what you do next.', avoidThis: 'Avoid changing rules during the argument or shaming your tween for caring about friends and online activities.', afterward: 'Review the plan together as responsibilities and needs change.' },
    },
  },
  {
    id: 'overwhelmed-now',
    title: "I'm overwhelmed / frustrated",
    emoji: '💛',
    category: 'energy-based',
    guidance: {
      baby: { title: 'Take a breath', emoji: '💛', doNow: 'If your baby is safe in a crib or safe space, step a few feet away. Take 3 slow breaths. You do not need to solve anything right now except steadying yourself.', sayThis: 'I am having a hard moment. I am going to take a breath and then I will help you.', avoidThis: 'Do not shake, hit, or handle your baby roughly. If you feel you might, put your baby down in a safe space and get help immediately.', afterward: 'Once you are calmer, pick your baby up, check basic needs, and start again. You do not need to be perfect.' },
      toddler: { title: 'Create space', emoji: '💛', doNow: 'Make sure your child is safe, then create physical space — step into the next room or the hallway for 30 to 60 seconds. Take 3 slow breaths. Lower your shoulders and your voice.', sayThis: 'I need a minute to calm my body. I will be right back.', avoidThis: 'Do not try to solve the behavior and calm yourself at the same time. Calm yourself first.', afterward: 'Come back when you can speak calmly. Reconnect with a touch or a short sentence. Repair if you snapped.' },
      preschool: { title: 'Pause and simplify', emoji: '💛', doNow: 'Make sure everyone is safe. Then stop. Do not try to fix the behavior right now. Take 3 slow breaths. Drop one thing from your plate for the next 30 minutes.', sayThis: 'I am having a hard moment. I am going to calm down and then I will help you.', avoidThis: 'Do not try to solve everything at once. Do not discipline while you are at your limit.', afterward: 'When you feel steadier, come back and address one thing — not everything. Repair if you raised your voice.' },
      bigkid: { title: 'Step back', emoji: '💛', doNow: 'If everyone is safe, take a brief pause. Step into another room or step outside for 60 seconds. Breathe. You are allowed to need a moment.', sayThis: 'I love you. I need a minute to calm down before we continue.', avoidThis: 'Do not discipline while you are angry. Do not make your child responsible for your emotions.', afterward: 'Come back when you can speak calmly. Repair if you handled something poorly — it teaches your child how to repair too.' },
      tween: { title: 'Step back', emoji: '💛', doNow: 'If everyone is safe, take a brief pause. Step into another room or step outside for 60 seconds. Breathe. You are allowed to need a moment.', sayThis: 'I love you. I need a minute to calm down before we continue.', avoidThis: 'Do not discipline while you are angry. Do not make your tween responsible for your emotions.', afterward: 'Come back when you can speak calmly. Repair if you handled something poorly — it teaches your tween how to repair too.' },
    },
  },
  {
    id: 'losing-control-now',
    title: 'I might lose control',
    emoji: '🆘',
    category: 'energy-based',
    guidance: {
      baby: { title: 'Put your baby down safely', emoji: '🆘', doNow: 'Put your baby in their crib or the safest space available right now. Step away. You will not harm your baby by letting them cry for a few minutes while you calm down.', sayThis: '(Say nothing to your baby right now. Just put them down safely and step away.)', avoidThis: 'Do not pick your baby back up until you feel calmer. Do not shake, hit, or handle your baby roughly. If you feel you might, put them down and call someone immediately.', afterward: 'Call a trusted person, a friend, or a support line. If you feel you may hurt your baby, call 988 or 911 right now. You are not alone.' },
      toddler: { title: 'Get space now', emoji: '🆘', doNow: 'Make sure your child is in a safe space — a room with no hazards, a crib, or a gated area. Step away immediately. You need space before you can safely respond.', sayThis: '(Do not try to discipline right now. Get space first.)', avoidThis: 'Do not try to teach a lesson right now. Do not grab, hit, or yell. Your only job right now is to calm your own body.', afterward: 'Call someone. Ask for help. If you feel you may hurt your child, call 988 or 911. There is no shame in this. You are protecting your child by getting space.' },
      preschool: { title: 'Get space now', emoji: '🆘', doNow: 'Tell your child to stay in their room or a safe spot. Step away — into the bathroom, outside, or the next room. You need 60 seconds of space before you can respond safely.', sayThis: 'I need to step away for a minute. Stay here. I will be right back.', avoidThis: 'Do not discipline right now. Do not grab, hit, or yell. Your only job is to calm down before you go back.', afterward: 'Call someone. Ask for help. If you feel you may hurt your child, call 988 or 911. Getting space is the right thing to do.' },
      bigkid: { title: 'Get space now', emoji: '🆘', doNow: 'Tell your child you need a moment and step away. Go to the bathroom, step outside, or go to another room. You need space before you can respond safely.', sayThis: 'I need to step away for a minute. I will be right back.', avoidThis: 'Do not discipline right now. Do not grab, hit, or yell. Your only job is to calm down.', afterward: 'Call someone. Ask for help. If you feel you may hurt your child, call 988 or 911. Getting space is the right thing to do.' },
      tween: { title: 'Get space now', emoji: '🆘', doNow: 'Tell your tween you need a moment and step away. Go to the bathroom, step outside, or go to another room. You need space before you can respond safely.', sayThis: 'I need to step away for a minute. I will be right back.', avoidThis: 'Do not discipline right now. Do not grab, hit, or yell. Your only job is to calm down.', afterward: 'Call someone. Ask for help. If you feel you may hurt your child, call 988 or 911. Getting space is the right thing to do.' },
    },
  },
];


const healthCareSituations: Situation[] = [
  {
    id: 'take-it-easy',
    title: 'Take it easy: when they are not feeling well',
    emoji: '🛋️',
    guidance: {
      baby: { title: 'Take it easy with a baby', emoji: '🛋️', doNow: 'Today can be a quieter day. Prioritize comfortable rest, regular feeds, and hydration that is appropriate for your baby. Let your baby set the pace for activity while you stay close and watch how they are acting.', sayThis: 'You do not have to do anything today. We can rest, cuddle, drink, and take it easy.', avoidThis: 'Do not feel pressure to keep the normal schedule or squeeze in activities. Do not force extra bed rest when your baby is awake and comfortable.', afterward: 'Keep the next few hours simple and return to your usual routine as your baby starts feeling better.', thenTry: 'Offer a calm place to rest, familiar comfort, and feeds more often as appropriate. Watch wet diapers and your baby\'s overall alertness.', ifNotWorking: 'If your baby is feeding poorly, has fewer wet diapers, is unusually sleepy or difficult to wake, has trouble breathing, or seems much worse, contact your healthcare professional promptly.', contactParent: 'For urgent concerns such as severe breathing difficulty, inability to wake normally, or signs of severe dehydration, seek urgent medical care.' },
      toddler: { title: 'Take it easy with a toddler', emoji: '🛋️', doNow: 'Let today be a recovery day. Offer frequent fluids, simple familiar foods as tolerated, and plenty of chances to rest. If your toddler is tired, it is okay to put the normal schedule aside and let them sleep or have quiet time.', sayThis: 'You are not feeling your best. We can rest today and take it easy.', avoidThis: 'Do not make a sick or uncomfortable day into a battle over activities, naps, or meals. Do not force bed rest when your child is awake and comfortable.', afterward: 'Keep the day low-pressure and ease back into your normal routine as your toddler feels better.', thenTry: 'Set up a cozy spot with books, a favorite toy, a quiet show, or cuddles. Offer small, frequent drinks and check wet diapers/urination.', ifNotWorking: 'If your toddler is drinking very little, urinating much less than usual, has trouble breathing, is unusually hard to wake, or is getting worse, contact your healthcare professional.', contactParent: 'Seek urgent medical care for severe breathing difficulty, inability to wake normally, or signs of severe dehydration.' },
      preschool: { title: 'Take it easy with a preschooler', emoji: '🛋️', doNow: 'Lower the expectations for the day. Prioritize fluids, rest, comfort, and simple food as tolerated. If your preschooler wants to sleep or curl up and rest, let the day be quiet.', sayThis: 'Today is a rest day. We can do less while your body feels better.', avoidThis: 'Do not push through a normal activity schedule just because it is on the calendar. Do not force bed rest when your child is awake and feels like playing quietly.', afterward: 'Watch the overall trend and return to normal activities gradually as your child recovers.', thenTry: 'Offer a simple choice: couch + book, a quiet show, coloring, or a nap. Keep water or another age-appropriate fluid within reach.', ifNotWorking: 'If your child is drinking poorly, urinating much less than usual, having breathing trouble, unusually difficult to wake, or worsening, contact your healthcare professional.', contactParent: 'Seek urgent medical care for severe breathing difficulty, inability to wake normally, or signs of severe dehydration.' },
      bigkid: { title: 'Take it easy with a school-age child', emoji: '🛋️', doNow: 'Give the day a lighter pace. Prioritize fluids, rest, comfort, and simple food as tolerated. Your child can choose quiet activities or sleep more if they are tired.', sayThis: 'You do not have to keep up today. Let us help your body rest.', avoidThis: 'Do not insist on the usual homework, activity, or exercise schedule when your child is clearly unwell. Do not force bed rest when they are awake and comfortable.', afterward: 'As they improve, ease back into the usual routine instead of trying to catch up all at once.', thenTry: 'Keep the basics nearby: water, a simple snack, tissues, a blanket, a book, or a quiet show. Check in on how they are feeling rather than counting what they accomplished.', ifNotWorking: 'If symptoms are worsening or your child has breathing trouble, significant dehydration, unusual sleepiness, severe pain, or other concerning changes, contact your healthcare professional.', contactParent: 'Seek urgent medical care for severe breathing difficulty, inability to wake normally, or signs of severe dehydration.' },
      tween: { title: 'Take it easy with a tween', emoji: '🛋️', doNow: 'Let the day get smaller. Prioritize fluids, rest, comfort, and simple food as tolerated, and let your tween choose quiet activities or extra sleep if they are tired.', sayThis: 'You do not have to push through today. Let us keep things easy while you recover.', avoidThis: 'Do not pressure your tween to keep up with schoolwork, activities, or exercise when they are clearly unwell. Do not force bed rest when they are awake and comfortable.', afterward: 'Return to the usual routine gradually as your tween feels better rather than trying to make everything up at once.', thenTry: 'Give your tween a low-pressure recovery setup: fluids nearby, easy food, comfortable clothes, rest, and something quiet they enjoy.', ifNotWorking: 'If symptoms are worsening or your tween has breathing trouble, significant dehydration, unusual sleepiness, severe pain, or other concerning changes, contact your healthcare professional.', contactParent: 'Seek urgent medical care for severe breathing difficulty, inability to wake normally, or signs of severe dehydration.' },
    },
  },
  {
    id: 'poop',
    title: 'What should poop look like?',
    emoji: '💩',
    guidance: {
      baby: { title: 'Baby poop', emoji: '💩', doNow: 'Baby stool varies with age and feeding. Breastfed stools are often loose and yellow, while formula-fed stools are often thicker and yellow, tan, or green. Focus on feeding, hydration, comfort, and growth.', sayThis: 'Poop can look different from day to day. We are watching the whole picture.', avoidThis: 'Get medical advice for unusually pale or white stool, black tarry stool after the newborn period, or blood in the stool.', afterward: 'Contact your child\'s healthcare professional if the change is concerning or your baby seems ill.' },
      toddler: { title: 'Toddler poop', emoji: '💩', doNow: 'Soft, easy-to-pass stools are generally the goal. Hard, dry, painful stools or withholding can point toward constipation.', sayThis: 'Pooping should not hurt. We can help make it easier.', avoidThis: 'Avoid shame or punishment around poop.', afterward: 'Talk with your child\'s healthcare professional if constipation is frequent or painful.' },
      preschool: { title: 'Preschool poop', emoji: '💩', doNow: 'Look at stool softness, pain, withholding, and regularity rather than counting bowel movements alone.', sayThis: 'Your body is learning what it needs to do.', avoidThis: 'Avoid making toilet habits embarrassing.', afterward: 'Persistent constipation, blood, significant pain, or stool leakage should be discussed with a healthcare professional.' },
      bigkid: { title: 'Big kid poop', emoji: '💩', doNow: 'Encourage regular bathroom opportunities, fluids, and a balanced diet with fiber-rich foods.', sayThis: 'Poop should be comfortable and easy to pass.', avoidThis: 'Avoid teasing or shaming your child about bowel habits.', afterward: 'Frequent constipation or ongoing changes should be discussed with a healthcare professional.' },
      tween: { title: 'Tween poop', emoji: '💩', doNow: 'Encourage regular bathroom opportunities, fluids, and a balanced diet with fiber-rich foods.', sayThis: 'Poop should be comfortable and easy to pass.', avoidThis: 'Avoid teasing or shaming your tween about bowel habits.', afterward: 'Frequent constipation or ongoing changes should be discussed with a healthcare professional.' },
    },
  },
  {
    id: 'fever',
    title: 'Fever',
    emoji: '🌡️',
    guidance: {
      baby: { title: 'Baby fever', emoji: '🌡️', doNow: 'A temperature of 100.4°F (38°C) or higher in a baby under 3 months needs prompt medical evaluation. For older babies, focus on hydration, behavior, and other symptoms.', sayThis: 'We are going to check you and make sure you are okay.', avoidThis: 'Do not give fever medicine to a very young infant without medical guidance.', afterward: 'Seek urgent medical advice for a young infant with fever or for any child who has trouble breathing, is difficult to wake, or seems very ill.' },
      toddler: { title: 'Toddler fever', emoji: '🌡️', doNow: 'Offer fluids, allow rest, and focus on comfort. Fever is usually a sign the body is fighting an infection.', sayThis: 'Your body is working hard. Let\'s keep you comfortable and hydrated.', avoidThis: 'Avoid treating the number alone; how your child looks and acts matters too.', afterward: 'Contact your healthcare professional if your child worsens or the fever persists.' },
      preschool: { title: 'Preschool fever', emoji: '🌡️', doNow: 'Encourage fluids and rest and watch your child\'s behavior and symptoms.', sayThis: 'Let\'s rest and drink some fluids while your body fights this.', avoidThis: 'Avoid ice baths or cold-water baths.', afterward: 'Seek medical advice for concerning symptoms or a fever that persists or returns.' },
      bigkid: { title: 'Big kid fever', emoji: '🌡️', doNow: 'Keep your child hydrated and comfortable and monitor symptoms and behavior.', sayThis: 'Let\'s help your body rest while we watch how you are feeling.', avoidThis: 'Avoid assuming a high number automatically tells you how sick your child is.', afterward: 'Seek medical care for trouble breathing, severe dehydration, unusual sleepiness, stiff neck, seizure, concerning rash, or repeated vomiting.' },
      tween: { title: 'Tween fever', emoji: '🌡️', doNow: 'Keep your tween hydrated and comfortable and monitor symptoms and behavior.', sayThis: 'Let\'s help your body rest while we watch how you are feeling.', avoidThis: 'Avoid assuming a high number automatically tells you how sick your tween is.', afterward: 'Seek medical care for trouble breathing, severe dehydration, unusual sleepiness, stiff neck, seizure, concerning rash, or repeated vomiting.' },
    },
  },
  {
    id: 'medicine',
    title: 'Giving medicine safely',
    emoji: '💊',
    guidance: {
      baby: { title: 'Baby medicine safety', emoji: '💊', doNow: 'Use only medicine appropriate for your baby and follow the product label or your healthcare professional\'s instructions. Use an oral syringe for liquid medicine.', sayThis: 'I am going to give you your medicine safely.', avoidThis: 'Never guess a dose or use a household spoon for dosing.', afterward: 'Store all medicines locked and out of reach and keep them in their original containers.' },
      toddler: { title: 'Toddler medicine', emoji: '💊', doNow: 'Measure liquid medicine with an oral syringe or supplied dosing device and verify the dose before giving it.', sayThis: 'Here is your medicine. I will help you take it safely.', avoidThis: 'Avoid combining products that contain the same active ingredient.', afterward: 'Put medicine away immediately after use.' },
      preschool: { title: 'Preschool medicine', emoji: '💊', doNow: 'Give medicine while your child is sitting upright and use the correct measuring device and dose.', sayThis: 'This medicine is to help you feel better. I will stay with you.', avoidThis: 'Do not squirt liquid medicine toward the back of the throat.', afterward: 'Secure medicine immediately.' },
      bigkid: { title: 'Big kid medicine', emoji: '💊', doNow: 'Teach your child that medicine is not candy and that an adult controls when and how it is taken.', sayThis: 'Only an adult gives medicine, even if you know what it is.', avoidThis: 'Never let a child self-dose without appropriate supervision.', afterward: 'Keep medications locked away.' },
      tween: { title: 'Tween medicine', emoji: '💊', doNow: 'Teach your tween that medicine is not candy and that an adult controls when and how it is taken.', sayThis: 'Only an adult gives medicine, even if you know what it is.', avoidThis: 'Never let a child self-dose without appropriate supervision.', afterward: 'Keep medications locked away.' },
    },
  },
  {
    id: 'teeth-care',
    title: 'Teeth & dental care',
    emoji: '🦷',
    guidance: {
      baby: { title: 'Baby dental care', emoji: '🦷', doNow: 'Begin brushing when teeth appear and establish regular dental care. Use age-appropriate fluoride toothpaste according to dental guidance.', sayThis: 'We take care of your little teeth every day.', avoidThis: 'Avoid putting a baby to bed with a bottle containing sugary drinks.', afterward: 'Keep regular dental visits.' },
      toddler: { title: 'Toddler dental care', emoji: '🦷', doNow: 'Brush twice a day with help and make the routine predictable.', sayThis: 'You can start, and I will help finish.', avoidThis: 'Avoid letting brushing become a reward that can be taken away.', afterward: 'Continue regular dental visits.' },
      preschool: { title: 'Preschool dental care', emoji: '🦷', doNow: 'Let your child participate while an adult makes sure teeth are thoroughly cleaned.', sayThis: 'Let\'s make sure every tooth gets clean.', avoidThis: 'Avoid assuming a preschooler can brush thoroughly without help.', afterward: 'Keep routine dental care and limit frequent sugary drinks and snacks.' },
      bigkid: { title: 'Big kid dental care', emoji: '🦷', doNow: 'Encourage independence while checking technique and maintaining regular dental visits.', sayThis: 'You are getting more independent, and I\'m still here to help.', avoidThis: 'Avoid shaming your child about cavities or dental habits.', afterward: 'Keep brushing and flossing part of the daily routine.' },
      tween: { title: 'Tween dental care', emoji: '🦷', doNow: 'Encourage independence while checking technique and maintaining regular dental visits.', sayThis: 'You are getting more independent, and I\'m still here to help.', avoidThis: 'Avoid shaming your tween about cavities or dental habits.', afterward: 'Keep brushing and flossing part of the daily routine.' },
    },
  },
  {
    id: 'rash',
    title: 'Rash or skin irritation',
    emoji: '🩹',
    guidance: {
      baby: { title: 'Baby rash', emoji: '🩹', doNow: 'Notice where the rash is, how it looks, whether it is spreading, and whether your baby otherwise seems well.', sayThis: 'I noticed your skin changed. Let\'s keep you comfortable.', avoidThis: 'Seek prompt medical advice for a rapidly spreading rash, purple or bruise-like spots, breathing problems, facial swelling, or a baby who appears very ill.', afterward: 'Avoid introducing multiple new skin products at once.' },
      toddler: { title: 'Toddler rash', emoji: '🩹', doNow: 'Keep the skin clean and avoid introducing several new products at once.', sayThis: 'We are going to take care of your skin.', avoidThis: 'Avoid harsh scrubbing or scratching.', afterward: 'Contact your healthcare professional if the rash is persistent, worsening, or associated with concerning symptoms.' },
      preschool: { title: 'Preschool rash', emoji: '🩹', doNow: 'Observe the rash and your child\'s overall condition.', sayThis: 'Tell me if your skin hurts or itches.', avoidThis: 'Avoid assuming every rash is an allergy or infection.', afterward: 'Get medical advice for concerning changes or associated symptoms.' },
      bigkid: { title: 'Big kid rash', emoji: '🩹', doNow: 'Ask about itching, pain, new products, foods, medicines, illness, or exposures.', sayThis: 'Tell me what you noticed and when it started.', avoidThis: 'Avoid diagnosing the rash from appearance alone.', afterward: 'Seek medical care for rapid spread, breathing problems, facial swelling, severe pain, or a child who looks very ill.' },
      tween: { title: 'Tween rash', emoji: '🩹', doNow: 'Ask about itching, pain, new products, foods, medicines, illness, or exposures.', sayThis: 'Tell me what you noticed and when it started.', avoidThis: 'Avoid diagnosing the rash from appearance alone.', afterward: 'Seek medical care for rapid spread, breathing problems, facial swelling, severe pain, or a child who looks very ill.' },
    },
  },
  {
    id: 'hydration',
    title: 'Hydration',
    emoji: '💧',
    guidance: {
      baby: { title: 'Baby hydration', emoji: '💧', doNow: 'For infants, breast milk or infant formula provides the main fluid source. Watch feeding and diaper patterns, especially during illness.', sayThis: 'We are making sure your body gets what it needs.', avoidThis: 'Do not give plain water to a young infant unless your healthcare professional specifically recommends it.', afterward: 'Seek medical advice if your baby is feeding poorly or you are concerned about dehydration.' },
      toddler: { title: 'Toddler hydration', emoji: '💧', doNow: 'Offer water regularly and more often during heat, activity, vomiting, or diarrhea.', sayThis: 'Let\'s take some water for your body.', avoidThis: 'Avoid relying on sugary drinks for hydration.', afterward: 'Make water easy to access throughout the day.' },
      preschool: { title: 'Preschool hydration', emoji: '💧', doNow: 'Offer water with meals and throughout active days.', sayThis: 'Your body needs water when you play and move.', avoidThis: 'Avoid waiting until your child is extremely thirsty every time.', afterward: 'Send a labeled water bottle when appropriate.' },
      bigkid: { title: 'Big kid hydration', emoji: '💧', doNow: 'Encourage water throughout the day, especially during sports and hot weather.', sayThis: 'Take your water with you so you can drink when you need it.', avoidThis: 'Avoid making sports drinks or sweet drinks the default.', afterward: 'Build hydration into school and activity routines.' },
      tween: { title: 'Tween hydration', emoji: '💧', doNow: 'Encourage water throughout the day, especially during sports and hot weather.', sayThis: 'Take your water with you so you can drink when you need it.', avoidThis: 'Avoid making sports drinks or sweet drinks the default.', afterward: 'Build hydration into school and activity routines.' },
    },
  },
  {
    id: 'doctor',
    title: 'When should I call the doctor?',
    emoji: '☎️',
    guidance: {
      baby: { title: 'Baby: when to seek care', emoji: '☎️', doNow: 'For a young infant, fever, trouble breathing, poor feeding, unusual sleepiness, dehydration, or a baby who looks very ill warrants prompt medical advice.', sayThis: 'I am going to get help because I want to make sure you are safe.', avoidThis: 'Avoid waiting on a serious concern because you are worried about overreacting.', afterward: 'If you think your baby may be seriously ill, seek urgent medical care.' },
      toddler: { title: 'Toddler: when to seek care', emoji: '☎️', doNow: 'Contact your healthcare professional when symptoms are persistent, worsening, unusually severe, or you are concerned about hydration, breathing, pain, or behavior.', sayThis: 'I am going to check with your doctor so we know what to do.', avoidThis: 'Avoid using the app as a substitute for medical evaluation.', afterward: 'Keep notes about symptoms, temperature, fluids, medicines, and timing to share with the clinician.' },
      preschool: { title: 'Preschool: when to seek care', emoji: '☎️', doNow: 'Pay attention to breathing, hydration, alertness, severe pain, persistent vomiting, concerning rash, and whether your child is getting worse.', sayThis: 'We are going to get help if your body needs it.', avoidThis: 'Avoid relying on one symptom or one number alone.', afterward: 'When in doubt about a concerning change, contact your healthcare professional.' },
      bigkid: { title: 'Big kid: when to seek care', emoji: '☎️', doNow: 'Look at the whole child: breathing, hydration, alertness, pain, symptoms, and whether they are improving or worsening.', sayThis: 'Tell me what feels different so we can decide what help you need.', avoidThis: 'Avoid diagnosing serious symptoms from an app.', afterward: 'Seek emergency care for severe breathing difficulty, unresponsiveness, seizure, or other life-threatening symptoms.' },
      tween: { title: 'Tween: when to seek care', emoji: '☎️', doNow: 'Look at the whole child: breathing, hydration, alertness, pain, symptoms, and whether they are improving or worsening.', sayThis: 'Tell me what feels different so we can decide what help you need.', avoidThis: 'Avoid diagnosing serious symptoms from an app.', afterward: 'Seek emergency care for severe breathing difficulty, unresponsiveness, seizure, or other life-threatening symptoms.' },
    },
  },
];

const allHelpNowSituations: Situation[] = [...helpNowSituations, ...newHelpNowSituations as Situation[]];

const allPremiumHelpNowBySituation: Record<string, PremiumHelpNow> = {
  ...premiumHelpNowBySituation,
  ...extendedHelpNowPremium,
  ...newHelpNowPremiumBySituation,
};

const allDeepDiveBySituation: Record<string, DeepDive[]> = {
  ...deepDiveBySituation,
  ...extendedHelpNowDeepDive,
  ...newHelpNowDeepDiveBySituation,
};


type ChildNote = { id: number; text: string; createdAt: string; };
type DevelopmentActivity = {
  id: number;
  title: string;
  area: string;
  description: string;
  completed: boolean;
};

type SavedHelp = {
  id: number;
  title: string;
  category: string;
  savedAt: string;
};

type MealIdea = {
  id: string;
  title: string;
  emoji: string;
  prepMinutes: number;
  method: string;
  ingredients: string[];
  steps: string[];
  kidTip?: string;
  pickyFit?: string;
};

type PickyEatingProfile = {
  safeFoods: string;
  learningFoods: string;
  avoidTextures: string;
  mealtimeNotes: string;
};

type SavedIdea = {
  id: number;
  title: string;
  category: 'Activity' | 'Meal' | 'Caregiver Help' | 'Development' | 'Learning' | 'Home Reset';
  emoji: string;
  description: string;
  meta: string;
  savedAt: string;
  meal?: MealIdea;
  helpNowId?: string;
  helpNowAge?: string;
  helpNowChildId?: number | null;
  helpNowFull?: {
    doNow: string;
    sayThis?: string;
    thenTry?: string;
    ifNotWorking?: string;
    keepBusy?: string;
    contactParent?: string;
    avoidThis?: string;
    afterward?: string;
    deepDive?: DeepDive[];
  };
};

type ChildReminder = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  notified: boolean;
};

export type TemperamentTrait =
  | 'sensitive'
  | 'strong-willed'
  | 'very-active'
  | 'slow-to-warm-up'
  | 'easygoing'
  | 'independent'
  | 'a-mix';

const temperamentTraits: { id: TemperamentTrait; label: string; emoji: string }[] = [
  { id: 'sensitive', label: 'Sensitive', emoji: '💛' },
  { id: 'strong-willed', label: 'Strong-willed', emoji: '💪' },
  { id: 'very-active', label: 'Very active', emoji: '🏃' },
  { id: 'slow-to-warm-up', label: 'Slow to warm up', emoji: '🐢' },
  { id: 'easygoing', label: 'Easygoing', emoji: '😌' },
  { id: 'independent', label: 'Independent', emoji: '🧒' },
  { id: 'a-mix', label: 'A mix of these', emoji: '🌈' },
];

type AboutChild = {
  enjoys: string;
  whatWorks: string;
  workedBefore: string;
  makesHarder: string;
  anythingElse: string;
};

type DailyChildLog = {
  date: string;
  wakeTime: string;
  napTime: string;
  meals: string;
  mood: string;
  potty: string;
  note: string;
};

type ChildProfile = {
  id: number;
  name: string;
  age: string;
  notes: ChildNote[];
  reminders: ChildReminder[];
  savedHelp: SavedHelp[];
  development: DevelopmentActivity[];
  traits: TemperamentTrait[];
  aboutChild: AboutChild;
  dailyLog: DailyChildLog;
  pickyEating?: PickyEatingProfile;
};

type PremiumFeatureId =
  | 'unlimited-help-now'
  | 'deeper-behavior'
  | 'personalized-daily-plan'
  | 'time-based-recommendations'
  | 'food-on-hand'
  | 'picky-eating'
  | 'preschool-lunch'
  | 'multi-child'
  | 'unlimited-saved'
  | 'real-reminders'
  | 'advanced-activities'
  | 'weather-smart-activities'
  | 'personalized-learning'
  | 'learning-plans'
  | 'home-reset-premium'
  | 'temperament-personalization';

type PremiumFeature = {
  id: PremiumFeatureId;
  title: string;
  description: string;
  emoji: string;
  free?: boolean;
};

const premiumFeatures: PremiumFeature[] = [
  { id: 'unlimited-help-now', title: 'Unlimited What Do I Do Now?', description: 'Get instant next steps for any situation, as many times as you need.', emoji: '🚨' },
  { id: 'deeper-behavior', title: 'Deeper Behavior Solutions', description: 'Go beyond the quick fix with deeper context and longer-term strategies.', emoji: '🧠' },
  { id: 'personalized-daily-plan', title: 'Plan My Day', description: 'A flexible day plan tailored to your child\'s age, temperament, and your energy — with a simpler version when you\'re overwhelmed.', emoji: '☀️' },
  { id: 'time-based-recommendations', title: 'Time-Based Recommendations', description: 'Ideas matched to the exact time you have — 5, 15, 20, or 30+ minutes.', emoji: '⏱️' },
  { id: 'food-on-hand', title: 'What Can I Make With What I Have?', description: 'Tell us what\'s in your kitchen and get meal ideas your child will eat.', emoji: '🥘' },
  { id: 'picky-eating', title: 'Picky Eating Help', description: 'Practical, low-pressure strategies for selective eaters.', emoji: '🥦' },
  { id: 'preschool-lunch', title: 'Preschool Lunch Ideas', description: 'A rotating library of packable, kid-approved lunch ideas.', emoji: '🥪' },
  { id: 'multi-child', title: 'Multiple-Child Personalization', description: 'Switch betweens and get ideas personalized for each one — free for everyone.', emoji: '👧👦', free: true },
  { id: 'unlimited-saved', title: 'Unlimited Saved Ideas', description: 'Save as many activities, meals, and caregiver tips as you want.', emoji: '❤️' },
  { id: 'real-reminders', title: 'My Parenting Tools', description: 'Save routines, scripts, calming ideas, and snack ideas so the little things that work are always at your fingertips.', emoji: '🧰' },
  { id: 'advanced-activities', title: 'Advanced Personalized Activities', description: 'Smarter activity picks based on your child\'s interests and development.', emoji: '✨' },
  { id: 'weather-smart-activities', title: 'Weather-Smart Activities', description: 'Activity ideas based on the real weather where you are — rain or shine.', emoji: '☀️' },
  { id: 'personalized-learning', title: 'Personalized Learning Activities', description: 'Activities tailored to your child\'s age, interests, and your energy level.', emoji: '🎓' },
  { id: 'learning-plans', title: 'Personalized Learning Plans', description: 'A custom learning plan that adapts as your child grows.', emoji: '📋' },
  { id: 'home-reset-premium', title: 'Personalized Home Reset Plans', description: 'Room-by-room reset plans, decluttering guides, and saved routines for your home.', emoji: '🏠' },
  { id: 'temperament-personalization', title: 'Temperament Personalization', description: 'Save temperament traits for each child and get guidance tailored to their personality.', emoji: '🌈' },
];

const FREE_SAVED_IDEA_LIMIT = 5;
const FREE_PERSONALIZED_HELP_LIMIT = 5;


type RefineContextId = 'tired' | 'hungry' | 'frustrated' | 'want-something' | 'connection' | 'not-sure';

const refineContextOptions: { id: RefineContextId; label: string; emoji: string }[] = [
  { id: 'tired', label: 'They\'re tired', emoji: '😴' },
  { id: 'hungry', label: 'They\'re hungry', emoji: '🍎' },
  { id: 'frustrated', label: 'They\'re frustrated', emoji: '😤' },
  { id: 'want-something', label: 'They want something they can\'t have', emoji: '🚫' },
  { id: 'connection', label: 'They\'re seeking connection', emoji: '💛' },
  { id: 'not-sure', label: 'I\'m not sure', emoji: '🤷' },
];

const refineContextNotes: Record<RefineContextId, string> = {
  tired: 'Tiredness lowers impulse control and raises reactivity. Move the next step earlier, keep it physical and low-demand, and protect a rest or quiet moment soon.',
  hungry: 'Hunger amplifies every feeling. Offer food before addressing the behavior — a hungry child cannot access their thinking brain.',
  frustrated: 'Frustration means the child\'s intention met an obstacle. Name the obstacle, validate the feeling, and give one small way forward.',
  'want-something': 'When a child wants something they cannot have, the feeling is real even if the answer is no. Acknowledge the want, hold the boundary, and offer a small acceptable alternative.',
  connection: 'Connection-seeking behavior is a request for closeness, not defiance. Lead with a brief moment of focused attention before redirecting.',
  'not-sure': 'When the trigger is unclear, start with the body — offer food, rest, or a calm moment — and observe what shifts before deciding on a bigger response.',
};

type DayBlock = {
  label: string;
  emoji: string;
  routine: string;
  activity: string;
  transition: string;
  connection: string;
};

type DayPlan = {
  intro: string;
  blocks: { morning: DayBlock; midday: DayBlock; afternoon: DayBlock; evening: DayBlock };
  easier: boolean;
};

type DayEventType = 'zoo' | 'preschool' | 'gymnastics' | 'playdate' | 'appointment' | 'grandma' | 'church' | 'travel' | 'custom';

type DayEvent = {
  id: string;
  type: DayEventType;
  label: string;
  time: string;
  /** Day offset within the planner (0=today). Older saved events without this field are treated as today. */
  dayOffset?: number;
};

type DayEventSuggestion = {
  phase: 'before' | 'during' | 'after' | 'evening' | 'morning' | 'midmorning' | 'lunch' | 'nap' | 'afternoon' | 'dinner';
  label: string;
  emoji: string;
  items: string[];
  timeRange?: string;
};

type DayEventPlan = {
  events: DayEvent[];
  suggestions: DayEventSuggestion[];
  traitTips: string[];
  intro: string;
};

type SavedDayPlan = {
  id: number;
  dayLabel: string;
  savedAt: string;
  events: DayEvent[];
  plan: DayEventPlan;
  childId: number | null;
  childName: string;
  childAge: string;
  traits: TemperamentTrait[];
};

type DayRoutineMemory = {
  id: number;
  label: string;
  days: string;
  time: string;
  duration: string;
  prepMinutes: string;
  travelMinutes: string;
  childId: number | null;
  emoji: string;
};

const dayEventTypes: { id: DayEventType; label: string; emoji: string }[] = [
  { id: 'zoo', label: 'Zoo trip', emoji: '🦁' },
  { id: 'preschool', label: 'Preschool', emoji: '🏫' },
  { id: 'gymnastics', label: 'Gymnastics', emoji: '🤸' },
  { id: 'playdate', label: 'Playdate', emoji: '🧒' },
  { id: 'appointment', label: 'Appointment', emoji: '🩺' },
  { id: 'grandma', label: 'Grandma / Babysitter', emoji: '👵' },
  { id: 'church', label: 'Church', emoji: '⛪' },
  { id: 'travel', label: 'Travel', emoji: '🚗' },
  { id: 'custom', label: 'Custom event', emoji: '📌' },
];

const dayEventSuggestionsByType: Record<DayEventType, { before: string[]; during: string[]; after: string[]; evening: string[] }> = {
  zoo: {
    before: ['Easy breakfast — something familiar and filling. Bagels, fruit, or oatmeal.', 'Getting-ready routine: give one simple choice (which shirt, which shoes) to keep it moving.', 'Pack: water bottles, snacks, sunscreen, hats, a small bag for each kid to carry.'],
    during: ['Point out one animal and ask: "What do you think that one does all day?" Let them lead the pace — you do not need to see every exhibit.', 'Play a simple game: "Find an animal that can jump higher than you." It keeps them engaged without a screen.'],
    after: ['Lunch — something easy and familiar. They will be tired; do not try anything new.', 'Decompression: 20–30 minutes of quiet time or a stroller ride. Dim, calm, low demands.'],
    evening: ['Simple wind-down: bath, one book, bed. They are overstimulated — keep the routine shorter than usual.', 'Name one thing you all loved about today. That is enough.'],
  },
  preschool: {
    before: ['Wake up with enough time — rushing makes mornings harder. Breakfast, get dressed, one choice about something small.', 'Pack the bag the night before if possible. If not, grab it first thing.'],
    during: ['You do not need to do anything during preschool — this is your time. Take a break, run an errand, or rest.', 'If you are staying: bring a coffee and something to read or do. Do not hover — they do better when you step back.'],
    after: ['Snack right after pickup — hunger is the most common cause of after-school meltdowns.', 'Low-key activity: a walk, a snack, or 20 minutes of free play. Do not schedule anything demanding.'],
    evening: ['Normal bedtime routine. If they are extra tired, move bedtime 15 minutes earlier.', 'Ask one specific question: "Who did you play with today?" Not "How was school?"'],
  },
  gymnastics: {
    before: ['Light snack 30 minutes before — fruit or crackers. Not a full meal.', 'Comfortable clothes they can move in. Water bottle packed.'],
    during: ['Let them do the class. Watch if you want, but do not coach from the sidelines — it adds pressure.', 'If you have other kids: bring one quiet activity (stickers, a book) to keep them occupied.'],
    after: ['Hydrate and snack right after. They will be hungry and tired.', 'Calm transition home — a quiet car ride or a short walk. Avoid screens right after high-energy activity.'],
    evening: ['They may be extra tired. Move bedtime 15–20 minutes earlier if needed.', 'A short bath and one book. Keep it simple.'],
  },
  playdate: {
    before: ['Tidy just the room they will play in — not the whole house. Ten minutes is enough.', 'Set out one simple snack and one activity (blocks, playdough, a craft). Let them choose from there.'],
    during: ['Check in once, then step back. Kids play better when adults are nearby but not directing.', 'Have a snack ready at a set time — it gives a natural break if energy gets high.'],
    after: ['A calm transition: a snack, a short walk, or 15 minutes of quiet time. Do not plan anything demanding right after.', 'If emotions are high at pickup, offer food and a quiet space before asking about it.'],
    evening: ['Normal routine. If they are wound up, add 10 extra minutes of quiet time before bed.', 'One book and a snuggle. Keep it familiar.'],
  },
  appointment: {
    before: ['Pack: snacks, a small toy or book, a water bottle. Waiting is the hardest part.', 'Tell them one simple thing about what will happen: "We are going to see the doctor, then we will get a snack."'],
    during: ['Bring the snack and toy out during the wait, not all at once. Pace them.', 'If they get anxious: hold them close, keep your voice low, and narrate what is happening.'],
    after: ['Do something small and rewarding after — a trip to a park, a favorite snack, or 20 minutes of free play.', 'If it was a hard appointment, offer quiet time before asking about it.'],
    evening: ['Normal routine. If they are extra tired, simplify — skip the bath if you need to.', 'Extra snuggle time. They may need more closeness after a stressful day.'],
  },
  grandma: {
    before: ['Write down the routine: nap time, meal times, snacks, bedtime. One line each is enough.', 'Pack: comfort item, change of clothes, any specific food or milk they need.'],
    during: ['Let grandma or the babysitter handle it. Do not check in constantly — trust the plan you gave them.', 'If you are reachable, let them know they can text you. One channel, not five.'],
    after: ['Ask one question: "How did it go?" Then listen. Do not interrogate.', 'Reconnect with your child for 5–10 minutes of focused attention before moving into the next thing.'],
    evening: ['Normal routine. If the schedule shifted, get back on track gently — do not overcorrect.', 'A few minutes of one-on-one time to reconnect after being apart.'],
  },
  church: {
    before: ['Lay out clothes the night before. Keep breakfast simple and early.', 'Pack a quiet bag: small snacks, a notebook and crayons, a soft toy. Not screens.'],
    during: ['Sit where you can step out easily if needed. Take a walk if energy gets high.', 'Give them one small job: hold the bulletin, find the songs in the book. It keeps them engaged.'],
    after: ['Lunch right after. They will be hungry and sitting still has used up their patience.', 'Active time after: a playground, a walk, or free play to burn the energy they held in.'],
    evening: ['Normal routine. If they are extra tired from the early morning, simplify bedtime.', 'One book and a quiet snuggle. Keep it calm.'],
  },
  travel: {
    before: ['Pack the night before: snacks, water, a change of clothes, comfort item, one new small toy or activity.', 'Leave with buffer time. Rushing makes everything harder with kids.'],
    during: ['Pace the snacks — not all at once. One per hour or per stop.', 'Audio stories or music work better than screens for long stretches. Plan one quiet activity for the last hour.'],
    after: ['Arrival: a snack and 20 minutes of free time before unpacking. Let them settle in.', 'Do not plan anything demanding the first hour. Let everyone decompress.'],
    evening: ['Stick to the bedtime routine as much as possible, even in a new place. Familiar steps matter more than the exact time.', 'Extra comfort: a familiar book, a favorite stuffed animal, a few extra minutes of snuggling.'],
  },
  custom: {
    before: ['Think about what this event requires: food, clothes, supplies, timing. Pack what you can the night before.', 'Give your child a one-sentence preview: "Today we are going to [event]. We will [do X], then we will [do Y]."'],
    during: ['Watch for overstimulation. If energy gets high, take a 5-minute break — step outside or find a quiet corner.', 'One small job or choice keeps them engaged: "Can you hold this?" or "Do you want to sit here or there?"'],
    after: ['Decompression time: a snack, a quiet activity, or 15 minutes of free play. Do not stack another commitment right after.', 'If it was a big event, expect some emotional spillover. Offer food and quiet before addressing it.'],
    evening: ['Simplify the bedtime routine if they are tired. Skip the bath if you need to.', 'A few minutes of quiet connection to close the day.'],
  },
};

const dayEventTraitTips: Record<TemperamentTrait, string> = {
  sensitive: 'Preview the event beforehand — sensitive kids do better when they know what to expect. Build in a quiet break if the event is stimulating.',
  'strong-willed': 'Offer a choice within the event: what to bring, where to sit, what to do first. A sense of control prevents power struggles.',
  'very-active': 'Plan movement before and after any sitting or waiting. A quick run around before you leave burns the energy that would otherwise come out as fussing.',
  'slow-to-warm-up': 'Arrive early and let them observe before joining in. Do not push them to participate right away — they need a few minutes to adjust.',
  independent: 'Give them a small role or responsibility during the event. They engage more when they feel useful and trusted.',
  easygoing: 'Keep it simple and follow their lead. They will adapt — just make sure food and rest are on track.',
  'a-mix': 'Watch what they need in the moment. A mix of temperaments means the right approach may shift throughout the day.',
};

const dayEventAgeAdjust: Record<AgeId, string> = {
  baby: 'For a baby: focus on feeding, naps, and comfort. Bring the stroller or carrier, and watch for tired cues — do not wait for a meltdown.',
  toddler: 'For a toddler: snacks and a comfort item are essential. Expect at least one meltdown and plan a quiet break.',
  preschool: 'For a preschooler: give them a small job or choice to keep them engaged. Preview what will happen and when.',
  bigkid: 'For a school-age child: let them help plan or pack. They can carry their own bag and handle more independence.',
  tween: 'For a tween: give them autonomy and a role. They can manage their own supplies and may want time to decompress after.',
};

const dayPlanTraitTips: Record<TemperamentTrait, string> = {
  sensitive: 'Keep transitions calm and predictable — preview each change before it happens and avoid rushing.',
  'strong-willed': 'Offer a choice within each block so they feel ownership of the day.',
  'very-active': 'Build in movement before seated activities — their body needs to move first.',
  'slow-to-warm-up': 'Give extra time at each transition — they need a few minutes to adjust before engaging.',
  independent: 'Frame activities as things they can do on their own — they engage more with autonomy.',
  easygoing: 'Keep it simple and follow their lead — they will adapt to whatever you offer.',
  'a-mix': 'Watch what they need in each block — the right approach may shift throughout the day.',
};

const parseTimeStr = (str: string): number | null => {
  const s = str.trim().toUpperCase();
  const match = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const parseTimeRange = (timeStr: string): { start: number; end: number } | null => {
  if (!timeStr.trim()) return null;
  const parts = timeStr.split(/–|-|to|until/i).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const start = parseTimeStr(parts[0]);
    let end = parseTimeStr(parts[1]);
    if (start !== null && end !== null) {
      if (end < start && end < 12 * 60) end += 12 * 60;
      return { start, end };
    }
  }
  const start = parseTimeStr(timeStr);
  if (start !== null) return { start, end: start + 60 };
  return null;
};

const formatTime = (minutes: number): string => {
  const totalMin = ((minutes % 1440) + 1440) % 1440;
  let h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${period}`;
};

const formatTimeRange = (start: number, end: number): string => `${formatTime(start)} – ${formatTime(end)}`;

const defaultEventTimes: Record<DayEventType, { start: number; end: number }> = {
  preschool: { start: 9 * 60, end: 12 * 60 },
  zoo: { start: 10 * 60, end: 14 * 60 },
  gymnastics: { start: 16 * 60, end: 17 * 60 },
  playdate: { start: 10 * 60, end: 12 * 60 },
  appointment: { start: 10 * 60, end: 11 * 60 },
  grandma: { start: 13 * 60, end: 17 * 60 },
  church: { start: 10 * 60, end: 12 * 60 },
  travel: { start: 9 * 60, end: 17 * 60 },
  custom: { start: 10 * 60, end: 12 * 60 },
};

const dayFillerContent: Record<string, Record<AgeId, { label: string; emoji: string; items: string[] }>> = {
  midmorning: {
    baby: { label: 'Morning Activity', emoji: '🌤️', items: ['Floor play, tummy time, or take the stroller outside for fresh air and a walk.', 'A feed or snack if needed.', 'Free play — let them explore safely.'] },
    toddler: { label: 'Morning Activity', emoji: '🌤️', items: ['Head outside first — even 20 minutes of unstructured outdoor play sets up a better morning.', 'A mid-morning snack.', 'Let them lead the play — you do not need to entertain every minute.'] },
    preschool: { label: 'Morning Activity', emoji: '🌤️', items: ['Try to get outside early — a walk, the yard, or a playground. Outdoor time before screens makes the whole day go better.', 'A mid-morning snack.', 'One small activity they can do on their own while you catch up.'] },
    bigkid: { label: 'Morning Activity', emoji: '🌤️', items: ['Outdoor time first — send them to the yard, a park, or on a walk. Fresh air and movement before screens.', 'A mid-morning snack.', 'They can play independently — check in once and step back.'] },
    tween: { label: 'Morning Activity', emoji: '🌤️', items: ['Encourage outdoor time — a walk, bike ride, or just time outside. Movement and fresh air help mood and focus.', 'A mid-morning snack.', 'They can manage their own time — check in once.'] },
  },
  morning: {
    baby: { label: 'Morning Routine', emoji: '🌅', items: ['Morning feed and diaper change.', 'Cuddle and play on a mat.', 'Get dressed for the day.'] },
    toddler: { label: 'Morning Routine', emoji: '🌅', items: ['Breakfast — something familiar.', 'Get dressed, brush teeth. One small choice.', 'A 5-minute connection moment before the day starts.'] },
    preschool: { label: 'Morning Routine', emoji: '🌅', items: ['Breakfast — something familiar and filling.', 'Get dressed, brush teeth. One small choice (which shirt, which shoes).', 'A 5-minute connection moment before the day starts.'] },
    bigkid: { label: 'Morning Routine', emoji: '🌅', items: ['Breakfast — something filling.', 'Get dressed, brush teeth, pack their bag.', 'A quick check-in: "What are you looking forward to today?"'] },
    tween: { label: 'Morning Routine', emoji: '🌅', items: ['Breakfast — something filling.', 'Get dressed, brush teeth, pack their bag.', 'A quick check-in: "What is your plan for today?"'] },
  },
  lunch: {
    baby: { label: 'Lunch + Feed', emoji: '🥪', items: ['Lunch feed or meal.', 'Quiet transition — a cuddle or a story.'] },
    toddler: { label: 'Lunch + Decompress', emoji: '🥪', items: ['Lunch — something easy and familiar.', 'Quiet transition: a story, a cuddle, or 15 minutes of calm.'] },
    preschool: { label: 'Lunch + Decompress', emoji: '🥪', items: ['Lunch — something easy and familiar.', 'Quiet transition: a story, a cuddle, or 15 minutes of calm.'] },
    bigkid: { label: 'Lunch + Decompress', emoji: '🥪', items: ['Lunch — something filling.', 'A short break before the afternoon.'] },
    tween: { label: 'Lunch + Decompress', emoji: '🥪', items: ['Lunch — something filling.', 'A short break before the afternoon.'] },
  },
  nap: {
    baby: { label: 'Nap Time', emoji: '😴', items: ['Nap — watch for tired cues and do not wait too long.', 'Dim, calm space. White noise helps.'] },
    toddler: { label: 'Nap / Quiet Time', emoji: '😴', items: ['Nap time, or quiet rest if they do not sleep.', 'Dim, calm space. No screens.'] },
    preschool: { label: 'Nap / Quiet Time', emoji: '😴', items: ['Nap or quiet rest if they still nap.', 'If not, 30 minutes of quiet time — books, puzzles, or audio stories.'] },
    bigkid: { label: 'Quiet Time / Decompression', emoji: '😴', items: ['Quiet time — reading, drawing, or resting.', 'No screens. A break from stimulation helps the afternoon go better.'] },
    tween: { label: 'Quiet Time / Decompression', emoji: '😴', items: ['Quiet time — reading, drawing, or resting.', 'No screens. A break from stimulation helps the afternoon go better.'] },
  },
  afternoon: {
    baby: { label: 'Afternoon Activity', emoji: '🌤️', items: ['Floor play, tummy time, or a blanket outside in the shade for fresh air.', 'A feed or snack if needed.'] },
    toddler: { label: 'Afternoon Activity', emoji: '🌤️', items: ['Back outside if you can — yard time, a walk, or free play outdoors. A second outdoor block burns energy before evening.', 'A snack if needed.'] },
    preschool: { label: 'Afternoon Activity', emoji: '🌤️', items: ['Try another stretch outside — playground, sidewalk chalk, or just free play in nature. It helps with the afternoon slump.', 'A snack if needed.'] },
    bigkid: { label: 'Afternoon Activity', emoji: '🌤️', items: ['Outdoor time or active play — a walk, a ball, or free play outside. Movement now makes evening wind-down easier.', 'A snack if needed.'] },
    tween: { label: 'Afternoon Activity', emoji: '🌤️', items: ['Outdoor time or movement — a walk, a bike ride, or time outside. Fresh air helps reset after a long day.', 'A snack if needed.'] },
  },
  dinner: {
    baby: { label: 'Dinner + Family Time', emoji: '🍽️', items: ['Evening feed or meal.', 'Cuddle and quiet connection.'] },
    toddler: { label: 'Dinner + Family Time', emoji: '🍽️', items: ['Dinner together if possible.', 'One simple question: "What was the best part of your day?"'] },
    preschool: { label: 'Dinner + Family Time', emoji: '🍽️', items: ['Dinner together if possible.', 'One simple question: "What was the best part of your day?"'] },
    bigkid: { label: 'Dinner + Family Time', emoji: '🍽️', items: ['Dinner together if possible.', 'One simple question: "What was the best part of your day?"'] },
    tween: { label: 'Dinner + Family Time', emoji: '🍽️', items: ['Dinner together if possible.', 'One simple question: "What was the best part of your day?"'] },
  },
  evening: {
    baby: { label: 'Wind-down + Bedtime', emoji: '🌙', items: ['Bath or wash-up.', 'A feed, a song, or a few minutes of quiet.', 'Into the crib drowsy but awake.'] },
    toddler: { label: 'Bath + Books + Bedtime', emoji: '🌙', items: ['Bath or wash-up.', 'One book, one song, or a few minutes of quiet connection.', 'Lights out.'] },
    preschool: { label: 'Bath + Books + Bedtime', emoji: '🌙', items: ['Bath or wash-up.', 'One book, one song, or a few minutes of quiet connection.', 'Lights out.'] },
    bigkid: { label: 'Wind-down + Bedtime', emoji: '🌙', items: ['Bath or wash-up.', 'One book or quiet activity.', 'Lights out. Screens off and charged outside the bedroom.'] },
    tween: { label: 'Wind-down + Bedtime', emoji: '🌙', items: ['Bath or wash-up.', 'Reading or quiet time.', 'Lights out. Screens off and charged outside the bedroom.'] },
  },
};

const personalizeGuidance = (guidance: Guidance, traits: TemperamentTrait[]): Guidance => {
  if (!traits.length) return guidance;
  const has = (t: TemperamentTrait) => traits.includes(t);
  const parts: string[] = [];

  if (has('sensitive')) {
    parts.push('Keep your voice low and your movements slow — too much input can overwhelm a sensitive child. Offer one calm direction at a time rather than a list.');
  }
  if (has('strong-willed')) {
    parts.push('Offer two acceptable choices rather than a single instruction — a strong-willed child responds better when they feel some control.');
  }
  if (has('very-active')) {
    parts.push('Give their body something to do first — a movement step or a physical way to help channels high energy productively.');
  }
  if (has('slow-to-warm-up')) {
    parts.push('Give a slow-to-warm-up child a few moments to adjust before expecting a response. Preview what is coming next so transitions feel safe.');
  }
  if (has('independent')) {
    parts.push('Frame the next step as something they can do themselves — an independent child engages more when they feel ownership.');
  }
  if (has('easygoing')) {
    parts.push('Keep it simple and light — an easygoing child will follow your calm lead without needing much buildup.');
  }
  if (has('a-mix')) {
    parts.push('Watch what your child needs in this moment — a mix of temperaments means the right approach may shift depending on the day.');
  }

  const tip = parts.join(' ');
  if (!tip) return guidance;
  return { ...guidance, doNow: `${guidance.doNow}\n\n${tip}` };
};

const feelingPrefixes: Record<string, string> = {
  frustrated: 'This is a hard moment, and you do not have to get it perfect. ',
  overwhelmed: 'Pick one thing from this list. The rest can wait. ',
  exhausted: 'Keep it as simple as possible. ',
  alone: 'Feeling alone can make an ordinary parenting moment feel much heavier. Let\'s give you one small way to feel supported right now. ',
  worried: 'Trust your instincts on this one. ',
  unsure: 'Start here, then adjust as you go. ',
};

const feelingResponses: Record<string, string> = {
  frustrated: "Let's lower the intensity first, then decide what actually needs to happen.",
  overwhelmed: "You do not need another list. Let's decide what can wait, what matters today, and your next smallest step.",
  exhausted: "Today can be smaller. Let's choose the lowest-effort option that still gets you through the next part.",
  alone: "You deserve support, not just another thing to do. Here are a few small ways to create some connection right now.",
  worried: "Let's separate what you know from what you are wondering, then take one concrete next step.",
};

const feelingActionOptions: Record<string, { title: string; body: string }[]> = {
  frustrated: [
    { title: 'Pause before solving', body: 'Put down the task for 60 seconds, unclench your jaw, take a slow breath, and decide what actually needs your attention right now.' },
    { title: 'Lower the demand', body: 'If the child is safe, drop one expectation for the next 15 minutes. You do not have to teach, clean, or fix everything during a hard moment.' },
    { title: 'Reconnect simply', body: 'Get low, use fewer words, and offer one simple choice: “Do you want a hug or to sit beside me?” Connection can come before the solution.' },
  ],
  overwhelmed: [
    { title: 'Choose what can wait', body: 'Pick one thing that truly matters today. Everything else can move to tomorrow or stay unfinished.' },
    { title: 'Make the next hour smaller', body: 'Aim for safe kids, simple food, and the next transition. You do not need to optimize the whole day.' },
    { title: 'Use a 10-minute reset', body: 'Set a short timer and do only the one task that would make the next part of the day easier. Stop when the timer ends.' },
  ],
  exhausted: [
    { title: 'Choose the easiest version', body: 'Simple dinner, skipped bath, paper plates, screen time, or an unfinished house can all be reasonable when you are running on empty.' },
    { title: 'Sit while they play', body: 'If your child is safe and happily engaged, you do not need to create an activity. Sit nearby, drink something, and let the play continue.' },
    { title: 'Ask for a handoff', body: 'If another trusted adult is available, ask directly: “Can you take over for 20 minutes? I need to sit down.”' },
  ],
  alone: [
    { title: 'Send one honest text', body: 'Try: “I am having a lonely day. Can you talk for 10 minutes?” You do not need to explain everything.' },
    { title: 'Go where people are', body: 'Take a short walk, sit outside, visit the library, or choose a familiar place where you can be around other people without needing to socialize much.' },
    { title: 'Create a tiny connection', body: 'Sit beside your child, read one book, have a snack together, or ask them to show you what they are playing. It does not need to become an activity.' },
  ],
  worried: [
    { title: 'Name the next fact', body: 'Write down what you actually know right now and the one thing you still need to find out. That can keep worry from becoming a dozen imagined problems.' },
    { title: 'Take one concrete step', body: 'If you need advice, contact your child’s healthcare professional, school, or another trusted person rather than trying to solve the uncertainty alone.' },
    { title: 'Give yourself a stopping point', body: 'Choose when you will reassess instead of checking constantly. Until then, return to the next ordinary thing in front of you.' },
  ],
};

const feelingToneAdjustments: Record<string, string> = {
  frustrated: 'Short directions and a steady voice help here. Frustration travels, and your calm gives them something to match.',
  overwhelmed: 'You do not need the whole plan right now. Just the next step.',
  exhausted: 'Go with the lowest-effort option. Getting through the next few minutes is enough.',
  alone: 'You do not have to make the whole day better. One small point of connection is enough.',
  worried: 'A small, concrete step can help you feel steadier too.',
  unsure: 'You do not need the full picture. Just the next move.',
};

const applyCaregiverFeeling = (guidance: Guidance, feeling: string): Guidance => {
  if (!feeling || !feelingPrefixes[feeling]) return guidance;
  const prefix = feelingPrefixes[feeling];
  const tone = feelingToneAdjustments[feeling];
  const doNow = `${prefix}${guidance.doNow}`;
  const afterward = tone ? `${guidance.afterward}\n\n${tone}` : guidance.afterward;
  return { ...guidance, doNow, afterward };
};

const applyAboutChild = (guidance: Guidance, about: AboutChild | undefined): Guidance => {
  if (!about) return guidance;
  const parts: string[] = [];
  if (about.whatWorks.trim()) {
    parts.push(`What usually works: ${about.whatWorks.trim()}`);
  }
  if (about.workedBefore.trim()) {
    parts.push(`what has helped before: ${about.workedBefore.trim()}`);
  }
  if (about.makesHarder.trim()) {
    parts.push(`what tends to make things harder: ${about.makesHarder.trim()}`);
  }
  if (about.enjoys.trim()) {
    parts.push(`what they enjoy: ${about.enjoys.trim()}`);
  }
  if (about.anythingElse.trim()) {
    parts.push(`other things to know: ${about.anythingElse.trim()}`);
  }
  if (!parts.length) return guidance;
  const contextNote = `\n\nWhat you know about this child — ${parts.join('; ')}.`;
  return { ...guidance, doNow: `${guidance.doNow}${contextNote}` };
};

const getChildGuidanceAge = (age: string): AgeId => {
  if (age === 'Newborn' || age === '0–12 months') return 'baby';
  if (age === '1 year' || age === '2 years') return 'toddler';
  if (age === '3 years' || age === '4 years' || age === '5 years') return 'preschool';
  if (age === '6–8 years') return 'bigkid';
  if (age === '9–12 years' || age === '13+ years') return 'tween'; // 13+ is retained only for legacy profiles; new profiles stop at 9–12.
  return 'bigkid';
};

const A_GOOD_WAY_ICON_DATA_URL = 'data:image/webp;base64,UklGRqgoAABXRUJQVlA4IJwoAADQxwCdASoAAgACPj0ejUUiIaGioTFZWFAHiWdu4WUHGmYYh9jPS8VzpVMf4ESZLY/o78W3px+bTzofOg9QD+j9UH6IHTC/3b/s/tfmXPqz/G9vX+E/tnee+yfwn5faBn8d+3/6v/CcV/yp1CPwz+V/4f+0/t3/hOMa17/d+gX7T/S/9Z92Hw69c/Qj+n9QD8zeM39R9gD+i/4b/0f4f3a/57/y/5z/Yfup7d/zj/D/+H/Ef5P5Cv5d/XP+N/gvaf///uN/cT//+6r+wX//ETDbYbbDbYbbDbYbbDbYbbDbXyM9QNjS6IW23h4VbmICRAR4wW3Wlx84Gmh0MoWxt9JyUt/sxErWNfqX+qCeKTc/gAvUg7pjiVmw2YpqZG7PaCj8dGG3KcDqSc/IXF3GIE2GTo75YUCSZlkNIbaAVAPrtzmFfJFAT6FeAOn53t44591FlIm9TNtDDzUfUaNoZfpUPjuUdwexsq1+0wnmQD/6s17gcHEoO2rYnT0abYngyxHTrl+LPpIzKYZZr5ShMMNwK1j/1Aq/XTy6o8tVyFBL8SHqv5jw///4gfehha/zm8e+9ziVk1dfr/sC66qw1PRNyNkbA2wwJIaTrMjOFybClZLQiwF5AOmwS24EYiyr4Q26TS1E2GVvXv1lXMhHYBGngoqzEOr52TvSryZO4T+4Y4GMG/uGOBjJyiybRXrlGvPBlwXl0fOTiirp+WIJNn2TNLNsr6XfHlg62eXEdScLuUZ3cPgdEfxMUPury7DuozXRVI2OAwCmH27xcR8o+OjhEfGG/ZJBRjkLgSqLFZg6QlbcJ/bAQXQK4dqdrAcnaygCrv00RY2DyFx62UdgdRKVE3IXE9sMIYf//Fz/PCsgWNULTsnyqZlP6FcJyjWUOr/XDQrpJBnx07w9FRUKIyYlytXM7qKTONg1uHVq+SlcSqa2qHadr69Nsk07TavqcorobHO/506IfmKO6cAroS7BZtY/6sUXMVK8EnLVEThcCJaFx2t/mc3w6jk2kp/07nQy+tmsWmcUdWCxjG5B/EC5BvyRF72+fCSpXyeiIbPFj45g6Vg75O+NawNsIj9L+uRq89gPaiisNSBP58h8dtdZHXnM1NglHWYoZXwh9TYPPi2B9QIyXjxGJZYFork1sCpds8g1H8hFYHlCm6GifiHO4XrQbm2YS4LuffI7EcZF5lO2cffzRnclcVlEIT8Q8A7J8DGz0knToyzf//2rtYi9+W7C5fZ1SlOWKUndXgu3L8GOmEEB8Jx9fOaiTMyr7LLijpCpR62uxw2UzTOolzbk9o2pfdltrYQtuPY6hiDEvuQxN58rXov37z5oB1Ro7d6vdD0O7Xsd39Ez/upPDJkOcxxHorjmP5kSApro5VHSf0eKpPS0nGmEwY0JEKKbOQlrIC+GL6h6jhk6AwEb8qeE1jSL4MCnmz/4DHzI9REi6k5EAAa0tOsewyWx/cXJrpNvdkI0FZGOSU1jELnvHqtqbqbOw2e0lWZNsTEtHWmz9QY3N7cKh3Cn8rjxTJg2bWetWDfRWWb1Mzg2x3/GTEdP8253/7RMFo//gT7llEKv6m68SVg71gJ/SRdyKxRh4571s51nuqS0LmKBuqoBJFzHP5lUdIV6dDO4ULh0yCBRRLlqFmvAJyivMb1fMrGofy+NXaUEp6l1K5emmvYjlC6V38hQWPtd1riJ8R06x+nSNX3wL4/Koag2idjKZ3bYWen/wXfSn/IG03NXXBdXJPvzxCujGfVU4kbgvhi59s0JclFZ8JULFoPHwgG4yNc0EUW/z1O6tnj4RUbMDSLd1/0sFQfP0079vh/Ukvk0wdBjNGKXrdi13zhBSjtNGiibEl1l/BPyphAqauHuNi8bKNwYWYP/ttNFT4tnzCVXcd6rQXPE+uzbBRjiJS1mBYjhWFdNu8Fkc2zj+zBQSn9go0sDjFhGMrVtZOviH4ZDgEYCgyrXAaJK2RAfWqZhQS/MKlx0bfOE+VriXwSNc+PtukMCIbqgd4eAJ3orIwFJ3QUVu3dLmwcSJq7f2G9KL97TQIMRy/1r618lJjzGH83q3/RNhpf3YHO4Z8PkTsVZW81eVvNXlbzV5W81UScGxVD9TrbDZimkOKr89p5INLXhpOSloI45NmMnAAD+/wTQAAAAAA/OrcVRKSx4X3X0mw75AD6rivKwOdNJC40bI2pOc6rIWKU+WEqh1R45bbttjqYBazuHrA69jkJ2u5SEz/bA9y3dGqj/vu5O2Sm2cSvnjZz7gDtp2wPf72QQvdUOArlLyrGQVkv9LwX7MzmQ4gfXlU8UCXFqkJ4JD+rP/MiJ2a7A7cOR6DlfSy2ddvnqH72te8Z9ByXUdiKOtWcP4e6ayybpPlKt8wCylIQ+L20QXxNJNfSNoHGcIk3iVSdjaA8ZJlq4HyXzDPyAaW7GQQZyioqBRi15vmVtD2vdZ0LRKzts1Hh0sGzsC+wiK72otXNBdZxZ5SRcLaE6V6iAJfDDIRGIvD55N4HMXBrAi5skuxj0J7VwaYAwN2fmPe8eZ9PM7ExuDi1EJB6cssafcmGHG3gd8MEfYQhhsv4/YLqELSWJ513hX5/9K35byD0Jy9DjhiC0JX9XmRXlHsLdh0zOjAsONRJ7rjyfvI2HWfcCa+olndn3TVzp0w4UeIFx76RYxQVlkSK9aW+/LqP4c2YX1hWnxrx7HQ/lpyvWfI3/ILGvmQW1hK/+hHeDbRLoi4HWEV1aq8KM0RwUgtwbo7fQUJNfA264Nt7m4HM5hQ9txqVr8393ethYHQLOCOZAzFSjZ1hNXyQI2Y8uoYrWcdYgovlKjh35CX8A4AiiBJzLcOoEBEs4eIMUkezbA7DKoXwbXdw5dUtbZE2W61Q1AYy5AJNX7k7GDcQhYQDl/NvrBTFaSNwDwsW68p0Ys5hU3aQ9dAKKPjc4+TMFx21N1/PFgVEv1VN6k48BLkjwfHYk7vueUTcrgq4CxXT222NiMwsx/X0GGwyMajcPw2w+EDXGYL2xz8Kh3c5tMHPq3/otZjM24Qorb3zTmYC5/Ic+z7Up1v26nX7tWH6n+EUCF6drNBcboQALewFMBam++uOVLHFxs8L+uZ096FquxEIIfJ5I5Rj7l5+LP4JWYpqAfurevPVH6x9Yy5ReQKt7CpYVo0eHQAJLIUx/xme1+P/1vserQpi+sb59zxcGDzmFI8vCcR/yMe+pmITSUxmOvexEZo85PuXQBK0atOwUZXjSuOklaiXgVitejC89d+e12XxyBrMtPeTA9r351I3nfbyRAIoDrhaS2f1JppktK8nGYQfx6+ls6EPUuUfUcNPR9xY53BwNaUOM15T9CduSCoAOl1SJZDkOyVuEPFYkD4WElcvOvGskPdfqchJxa++WBUOo4kEbjRQdojpiPn83PRBsfwkjHjvD8q/iQTRqfIKmuintjXLb6XhoVXi3p6SalQWx6jgXBHm+K/DTwqNM5mz8m8L/lclolMVL0dzcukbd74URwF2wRjzrSTzgVKmiEUUjjhrSUDV/dfNWy5WZlUboauAB3CQW70iEHftjovaNlixUZFWg6w7/VmbDCA1APDNUl6OdObrXd+VbU5y86jlVB7LN1WElHqy7XDvok47IRahqm/+Tvkc6CbvdFusHFZ5YgcA3ZhDPY/b/4smyOqgHaNtrZykrCEIM4PdMqSQ8M29XAyArnU3mfP6NRyCkkhlIeHvjNTmB2YRUs3w/6P9IuOf5zCsDwNHA/LX3Sc6vOWcUmePsrPe4VGE9h144T9cESuNtd/S3H1FBgnr4exwI+QLWrmvRS2Reqgz0eHeDUE+gH3UkCahyLRZUv4sqOMCLLX+Zmroz41USuh0j8POLGgMJN2DyNY9EqFnC8GIItBBU2AZS3LsBeIriMiBi3jyhmLUWLYCxE23QuLzZKK8MO6+dHHcAibPEpHd6UWVLkwODV/4MAXA976VZIEbCRyoGMPRG1+vXyT+NVDtn5F8v/+qUShJM50AhQ7sVaW4agVn6phOl1pvQmCzLuyN5uVyilhakulnyr+WaIa+TBjkKvwZEtEaGQ1hXlCBUQ8lGzvgRoSDT2ZabF+/equckoGvZn9QBv7s1zbkZYh1KrH9oucDGIT0vPh9ChJCrXEoHG8A4aS7/MIcQHw8Lk8PzCnCBXi1ovND/27xzGFmgI1H+5+PW0AjOZtK1gRq+VybNg5rWDgF2ehq5PjJm1QbI8TVTgX7xipz3XHoGgs1FrK9V2UYDMwBT+pWXIhbXMeXm1T2IEdbugrixdoy70BKY8PPblTjzSEdpUmkNL6h5u92pKGT6zGGwQRJteXBcXkBVAvwYO+gprfkXrl9olgBrPxOZE3cxWNdtpWC1wNlYavbuOxZScM/TmnzMCWr2zgEYhxocKWtsAAOp/hxNr8FpL/4Zqo+y0q9Gqs6Ybaz+Et1pCz0JpOlRKerAahfFthq1e87D5iK0FDNyweYNq6PYT90eSSPA8yx7SIBTXir1NtP9zOZ7Lct06ohBGpOYMoCN/1TqbXpz62H/oW8du1deqXkYMWMQa1HauC1iPVrovqvpqbvNedIUff9asT10mDf3shoTbKfzirJz/HxQzNWzPtSM0TP1RP8iTtis/nf4Y7YKMGijkxZTww5zzDgmhv4ZY7L4ngKPmRngQmDfAFvwuMmKOJBAm2cLOMKslpr7N1BfDx3kps3wZg2YINmtDPTqYlcun1plA9eQFvBUpj3xDj860pTzfGPRk+RxNfvPLxgh8Jm+V01ae4fdMQ/quvCagdfs0OleuP1anFcdXba/SZmUxTW9jFUXPgrRkZ371IAc6PKlixS0X8BGwSWLNHKtm7quvb6oIGtpze7mXxgqZF+Fb25AaiHyCYNurJpxSXbjoY1KnML+CKYsUAySIfNtaKf8z59yb9N9eYBS/0FazEjwWI5QkGpK6HfgjIitrS9sMpmrAp0iQlSpIZnHsjo/8UqQ7H71oOf4V5GzAvJd3/2hMLRVmwsvwfmk9t0ydPEVKq8a6FZR5caMx23bpo39CFqi3vwN2jsfdHcH6VQOeXlWTLTzc33af3El4p+p0mdvDThVuw1jGv7tOJRh8Gsp5CaZL0Q5ZAoi9ud3gDycpyNxyLsgXCEmEzdw27EYc4LUtCCobzLXUP1ynd+Bl4UoZDZZOWVZ5Wfm9Y72NzKVkotKOvyLtgev7u0MXsP8ZrvHqBhkGQ3OQQIdt2QTg3q8qDY6DfJKMdASGr6lGVoQbJwJfFcYBV0RX5HfqtFaxaKKEMbzvkcQFFCtqkuNStv7OFnOrruUiANFaWYGAZsPkExRLgFAcFT0Pd/ZIOfjs/6FZcOLb4vJWtHS15J11vjO+jUnLoSKKKXEDmx7i8zQ1AeOo5clt5+HKwaDvVoLto6PF+i6Bxl55vgshU4lPEJHdLUf+nmG2qwt2jmiP1BeC8eVRVto7qT+lCZgDSRi+Mtd82GIdhg82ZqI4NUJ4Ydz481/RmsZ1eI/ccZYOUFQHz5Hia9+ofCCT+yMzipwqznpLgn/ZfHPL8qBAXcteFL9spX3jS7MeVTkcwkY9NlOcCXt5ZqMBknIsgykd9LXI+UjmyAoNdK7E3JqeQcCqR+U0OukvDfgNx05GUoQVT1L3YlSyc746w9k387/0LLi9qRBnnySUbfEQlkHXEosTpDtwZmlZ7AlTu/D78vOZIPE1RvvrcN9XX3IlUZSgewGPtcItur3LODi9Qr6mLyH7j7xyzDiarS4UhRZr/adcw4uIU92LXlFySxMlNJ41P/ePsYDxqgrxhpkWuTjheiM6V8W/23FgEtlQ+C+f1lbUn07tTIxVifoTgVm5/J3iTmpov97ecbSfCdbbVllMU7AfYCDALPULoRLgS99sex2oSaOwnulPob0FyieikdV56n1AFYrcQT+JXZ7yXV9ZSzHKS+yRp1OwIsBKPmlx6OMIbb5S7yjCutXvZIMvWuY0fn0bXjlf4ztq2ARQdR2A69Btd8WrEZTwp22R/0vJlMEmfrXifzAXXbfC6GIlA+CNtopXCjY5CpqJBXf5bOP8CS1eDmZmwvZCR5looMDKyZDy+iNEuKO3Pm/C9iWgI1NGs7sHCpFX+Wfl16hAMIi/PZPArUd9Te8WAH4UqiBCyiFtlygWFxzQM4MuOKELoj5xCei62ZH3HryyQtUmCxN2BRt+/bHAFFonSXDPFWF3Y1/+zhgI1C5xYwyzyEL0qKIs8t7Pu3FbHsLHqp2JNPf3wVqzybImIvF2emqE32yjDhO1lOVJ5Zrz5u7Vk/+kcDU/sAzEbI4CGvH73UyO56xbXU4FM6DOo/a2+EiEZ6TjdMw29Zuocekgr0CumKXi0Oj1fRzrRlKD11fPeYOHuIeQyQdGkdOYeLDTacIP4NYj+zOGgvn7VmE8JIFUYMsNmEec/4sB+hLnl07tRQ8+7zk1lW+arDgYfUrLSkfeGABwLFw+N8F3b2qJ4BYImq32QSnhKriH7EIOlPSkxZ3STb1YDLFCByRgDoe5kvuZ+SHH72k/6m3xvBVVZbIkyLOHsZLreMpojxNUteDqYugEVN4ef3r20tpVK0NKZjIfUq1WiuPPSPqzUnbmvVThmlaCuf8eCuFLXiu7wkpbobAAp/Xqw0VzQgb2ngfc65ltC879goUWTIdWHBNAJq0xj++peCKRuLexqrGbl+qXql0/3lS7kbCvdZczL6JPm2xQFf9Q1SsYxTsTttb6p3WpJRjAZoxp4i2JAj1NMO4Ztry71Uof5vArXwPB9rdfNSDhi2hZTjvszeSGJcH7tArl2AsV/ZAIRnJX0vhuAo6NyBDtwdFBQJCRK8XsUgpob0dG8AQr81IPvr4RyXUzysga5vinhLFLFZEm1XhDoYY4hxRQ0KeSdUjQa3nWdTGRrCFUuVAd6BLFREazdMyejlixqIK8TrGnY+a9R2RPpGmNFHhzIKWPc+1G1q0yfhZSoz3LDVLrZl6tnqL5/QcsZiFZKeLbPUUE6TlTaAdg9JSkPO49s4qujnGk+S6EMpl60X33FtFEmIW8B8Id3Rbj1gSs0RRv45x42EmxBcnvbkoPyIieSSruVVTV0OSaT3xry79nzhqaldnZEMP/oge1NXuImba1oIclYvD3Utp2KfaJOS6Waw2vTq9tu11hbcZ8dLjgvTZQ+GEw+cf1nZvaJ3by9GNZ26FWo3V5GFMwHZ09W11aE6Jt3SNC0UO9avwoezPRn537emlimgW0e39OwM3xayyQrg/jfRneDtVXsYg1OBL+kKprdHsiNtn/5B/J3YuwAf03jwwXTpxeJSeVoMqBITyExC5sTqxcAfIQKWZegNOU6LUYn3Df1cQ96TtR9kHwbz+0TNRQeA11tBdgd2E1tdHkkjBgYKRk6OLGHSsec2Xp2HZ8fMP65yszDG0QRVRFXWThg2xW2QCjxm17LT2EGymyVAi6zQ6TRta7wQu+FLcLLNObAkybyhmbMXFOOzoOHfV4/eVPYhFsMIIrCgzmBMZqlOCbPDzxK0QCfJxPes7MigjKwQMRTaJK41ac6QiqM2YKVD9Wq4D7k5VPqPWOH4V4WjXVM6w0nggxeVfe/1oTJELAJS+EjntHSppdpUnbS8M2NgJ41amzbxAVAaouHArFFt/pHP7ADKxlZxiR9Y8yGntbv+icRnrrh1U1BExPdpbKIZUdVJjDYpuiYFvukhz3Ik6l1GO+BTNrpA9mHkr4qALaC253x9bJa+fxnVWBXQUPPUepeZF0Mw1F9eC9nOwNXKfexvjZcwo6XI6yMOBAhZpmv6tdz7Lp9paBEmxAly75C11iC/kXMhX+e+QreJ8W2tMS3aa5JedNO6va91q2zTs4X5h2uNqAMPXKUtEYYLXctGXzTpf16DMMafPZoWeLdxndg0awW0BNPoJYvVzmAOt4NeCxm8HpHVoxVN0qrt9RgVM29t75yOuEVDclOi0h+S4HlSAEX115w2L+44Y1dDVeBFjg5xUC1i0PGDaw4Q0sUQWPRKvJpvwxf3u2YTVZNBJSEAFRrXHC39GGUAKzobG6tExIxAs3wFIG+5170y8zGxuCSPlsPoGXn9DZoOhPQXiuNxhbpJvVyYv4p5MDi0SvkfOOV94WhVdOmQQF8auIRJLawBLEc+QGaHrabOyfyRLKfpcnaJMiSKcH3ua0jONrFTHIo0gJjV8XlIqgqKmfZE7UtxOFIIAOEwJ3fzz/wL8HNTTg60ZUOAuigSpwY6lhjoDBisFydSX201+cqOlbwfGzlWb1dH2438q67rJ6f5UPcH6OhQ53VGmFmN8aD4bgrONG32tpRUszPt6xPNA0dhkxeqJTD97Ke97aVOlqo0jB8gzHSFlUVoSlVnDZ2Pz/tifyTqy5iKO7TuW1YkFMxOin9nDYpFZngGCRjx2e0UKN4TfXQAfhKuSmzI3u/A27m90J8/cNU3/d22i4WCe3zti3V4XJPYeHH7rzOCFs2/6DrjrjS0t+ZVYlgqQLWdwnus528YoFYHuo6DvQMEQ6UemzNgncnPOyEWE/mrqOV4neHkCi0L9RsqtEMMiI3/L9+VeR6M8+ywFGMLfkEL5FartgPNUDWdp3DpQ2DWaFKXRj62XKmGg5jZPF+t/N7FE3rhiYF6XhkxxUUlMGim3gIzBifIpzRL2Hna/gcECIQXu1chLVJkBWIkS1dx1z1okJ2yY17wopGnLbTn4s2UE6YVR/9EAi5RtfnSBGUzcEK7RstnDrUfLBj0dW+mas0tiWV8pS3R2e06LhX9SW89Zm60hVx4VCWdYEKzfKMu03Hm3GnXqqHzzorjBiN3ceX7psDkOBObSc2GDtzZFtX99mHVbH/sx53m0ahmkISyC6R8RkPBnqyJ+xQNQeJr/YUI4mf+gGepAWhEHFk4Cbs+XeYhRhv2yWApcvMcV2gA6TfQZbg6Xa3BRN3/DibF227y1xh7GSzgBH8mV9soPw9sy1Ym5Eu9W20zk5TEhhKqU/xNdFxMgRGDStU1uUuSQYsIMlII64u9pGUnP5LA6wY7gK/tbbYOYX4zd6kmrs3iUYj14KhPSVoNjof9rLeo5RvL8z2js3Voq/xtRpMTy6DXGJUbTGViWA6FoFcw19Hei0SKWFJ+TxWQbaur7HJAr4Ta7+Nfc5FettKcdsW0d7qtJ3JjR8VPaf0SBQkguOl2exWVJwnknZHHDWMOiFdJUcSfSfqxGuuhwMwRGczu9gSkv2V8OKtBo7Eu3xUuOUneJR7FPIC/L3rUXg/1vrbSFVXHRSaFDHxe0VYOlckDZzGkMaon0dBr2zC2KABjNADgnR0wgSkImwNw+Ap8K8+X8yQGIFlJ9bCPM2TNFHluV5PHbLMdWudVUcF3zfZlIlWbx6DqSvtiTMrtiqash6Tse+iuFddhY2FggaSGzLBjullIEQd4WGjCe42L1iJ4IOLOfPHHy3AgbpcrWLsoeV7x85eVvOUvrjxiXVgdtfrRI/DgCUHRbSEOf39FQnEHnN7Cy68Fm89vOtPZKwdEoQwCvxwOPPeqWAzIOv2Caw7sg4QSvypYOhpUmLLUZHhy6Hj8nKXV585Ti6wy5n2t7e1NDwekXAsfu74vFDhBatL8pctc5BjNKoQbyYF+ZL6K3Tr5mrJ3+xn79aQncxGXmiSaRrh1t+JlMCrgOQ3dFW5VzVNYZUmcPbcFt2zlIErHJjto+MzFAoWql94pJGfbJMGqAXBbusxdb6/ZaCUdLPlfalf0ZIxiuZxmTuPV8dKV7THYYHjxPVywyoxxbcJYqDcEMd0wPGoPiYugZFHLjJwc+LTF7/FvjE924uc5MDSbCdnFdwIe+1VyGlRox46nCS0FWx55uZP8LC9LxO239IbcUDOBwte8WS+NgJIW7NJfXy4+UdlMm4fq24FlkQIpmHnA2twhw80viqPfNOEnVOkmW6L2i4klDh6V+zbu05fAo+mwq4D4WEd/knXgPJefuWqu5u+4DEwbLg5KWjCXi8VsGBjrjkYpdIkv3ZSYvzjlnOzQX7/2RepbBbIAe/s4M1RG1fvSym8I9DGyagvsupiJIvq/ATrmFBheZR4KOlzE/bEBGssz5Cx5Ccl3sG7YC064/ZzW2Gbqf30aSmu9e0RQIHngdx6V+f4rSkpfMbf0rhbZhBsa1a9iQzqg4YwQSoE8nbhLc3zt+LVKxdxu9JwKHKDWjkqIwFA3ui+zRO/wPTu+Ylw8gNGwXK3QS4Iuh2KqFR3PvFnVpqkXlL90nO5oZjhis1EYWrdZVBg64WowLik1DOTOnF2gymjWIFtsnCRhaginbId9J2ERPg+bqpU0NYJCJJnJtJkrZQ2oVeNUWRLD/zKxT7NU/YgDI98eH5ldeE8EuyC7k4LLzlm+Hw9YWAoxhMAuNr6Z1VH8I9GYy5kQJ3lEboHROSKKyi8e45NAI/ggwUGfkTp1OZqBtXdOI2HzV5V8xedEx99lPFed/6+NaehJPsJDnSRlhEhQMCxApUULhCz1mVwbEnxY89aGYfB9ZLzrStoLZ7jFIgCAI1dZ8KKyGrzrWqkwSdfcPgjQ2wik5pZQE2GJ04DyDe/tearU7vcXa1rC8rrf83H+Shvc/VP2tK9qdO/fMFh57MHFBWwqq/lmN/f/noj+/+tGg+cKXzxA4dZ8eZ1E+9USTWPpSG20+vtLja/pZK5O+wPmBMadzTbZzfNDqv8yp8zCb5WM15Q81fisFxPc7v5xk24B4OJwKKGq13e66L6p4Os6NAUnlLQGQQRIoKrDkda37qxtt5qnXZ8qlGDiNFF321pY1sVU3FxICNHTBY7L8B89XoIGJQKmHtLEcc2qBUAbxm+7Oa6+rp3vzjVz4EesQJP0R18ExK7hdGS0yDzO55rCtFngA7hE0NvSiMFFhLsB/TJhD7xGv60hDjIMENTxjUU33mtXh5UYmOG4QRXez4Mp1KigDgbZbxcs6vB1UXH0UIcBoRqhmtcyJvPUfhzRkB2uVEiHHaOlKfaCjnnt2fFd1p1iiCxbllh3//aZpNbjeZiOCKPXoPsK8068nV2dZAKtec2kejgvUt3AJAD9DYE3BSQTE/FBAuzZuKnBfMRBx/KEE9xC1oHGnGAnvf35U8X92xVmRbwACktt+qbj4v5UJErqKOiePXlGgbtEioaZ1pkm9bRsHCQQwUCGa0GwYEN6GAvrXjqHaEyYLI1CFR51u+bH+tVg9se8RAzJOs5qrEedJRM5GSEPevxAvp8wBxhcXFeX+V+DIAGk1Bh879ZM23maNPAOBEriO6KOyAleBFosP28EaTHJVocSI2M2wn41KhfEqtYqb0TUZ5g5a13Ooamrj41t3FgHmNLz8FYU1VhtBsiFRqzjZXah+T2+BRXUqJxzw0VR8H4pGDrOsvsgmWvg8pKKCEMvvU0Eb03FO2k/r4eCPo4wLBlvPMBFN0sNKDFPahe5niEKu0ezj+nlyovNyyZmuTTDaMZt07AVe0dZItaYVoTnKf8IBQCAwEiy8Jv+RYU1qwXa04hBj6f3DLHKlvh/Iv1jijOwcTeels7VaBoKb0rvDfHu5vKtNsWoTPUBGuwHLkqaArd5H69DWD0DXGXNaHXWgQoZbv1FPw5wfzpIwXId+7Jnrinb4RyEwKk91nZS9dTLas31GIu7fLVPny7pHT7dGXAEaBeDj75+ICWRL6WaUysaeft5G+12AO3rJbjT8s1WaZ0cZ0DYXfOBwS++ulrT7SN13HplH+eyjX2k4MD+oNqvr5Pr3DveB7Z5TrOKCqbln4ZCNS3C474FtMAaooDY88/rtl8QJT264VgcUihg+CrIajhNODd+vRmOPoPb75PntfOsLDA8zStpZu4z63VFEhBof/+VymplyuiiLnEE99TB2FL7dW0kCHUmTmKTWBF8aoFKs5dpML0iPAbPDbbgelzUOyb5YA3PMK75Z2kE7iVgbclYSnPljB00JeDSSndG6OkV5jwMd8qXC3sRSgM6EHLpZR851tonLHLoqf5FsKqY2Lap723nKCwUkuoAdhwGQTu2y35keTTapcIKwUD+JvRAIOC+w/HCX1j9C9obhEMRmIz7sPLgSjUr7S1+LH5DzhnCZJnS3y82KKFzBCeURjCi3kaKEUzPnUOP6miK9cdNAZtXWRupSA4oCF6oRZZUBBooFEBzFfLy+QQ/LBwvKaQXWljJu+eEB3mvjBUj64L8o2851y6f77LgvbwBR8fCmjWghU0hNcdRStzzccFuzfCDA+lFqMiKXRF5VGNh2YDFJLeX39RNCLFbYn8EVrhhGTVuEi76EVqklDJT6VPlfVkMc7CKNKnO3tkoP8LbiqhKfVtJ+mcJIxtwb8lnCfbzOYryJlYIK66LV+wFn0kMJUMx3UTcTPs0+lxLdIVa9kSHGWbn90GoJByC2FrhdXDRku2NOMu/opNMfkgFRCQvboeZM7aXP3CKtwmAnVlg9wwtDnlvU7fiZMUJlkQLd8HjKn5oAWU5mfWpdWyUFHk9tR6ofGopkNki4jZsK+c5LVSGaQ/bgYXhpOufKZ6fRPQhTSpbV5ss/jDcBW04tV0l23lUSr54QN+p0aw8U0B8XDTVwTlOfsOq11rIIFrikBI5Y8FGPYLwvItiY8utPI2CFhO5lhWbpL5OCO8OkmP/RXCP6Sig2GnYFEcVbgylSFnD24Htv7W06HWlUzajuC7Q6n8eWRuJyqBnHY34lFgn/Y98tO2lurSkjxvo1Lmf8BtrdzHHvmPrQjXfL+AhfVBIcaP8Ed6CXgHOee44uK4dgsYx9hQ8zlQZ5pk9Ol1fUNmXNvQlsPr1PNLURfpnK2f8POArmdgH4DFbXhfMTpW09mO+h+C5bkJXPebo/hI9UceEQXncKf4DiwexXKcqDazJrXvJDLhCa0a4zqmqP5Yjrm/EA4EkXtn3dSvphqS+rIDulM6SAuyUbZ/2uwPmc76Z6DsVrB0tMkEM+d389MUc3jbc9Umx5qd6LR50/LX/XfKaeXaiXnF616LAv+fLs6JfcnpJJSgSR/Wugc7rbt8daRnHPyGzKxUY9LEBcjw4hlKTFa78NXUPfEBYPB/VFha8jkLwcvjFUKO3ugNY493GTbGpKXRx99BJUXygZANOA/th7gsgU4TJCkEmn+dqlQDYogm2K73sxTn1Igg5RTlBMloHtrE9llzD0VYEcPVhkvxPnYNuz9YUstwt87nxOBW2K3k9P2SMYlQEkNs8jPUW3d8dxZIW2NI4AOQ4P0jQo/1f3RrUGnCGlhvPTr9FTF6EFDTfSLBzBBGJywCpkwiUy2BCoAASRS/gAAF3CFLY1gz9W6shntrFiNTPLqXykFD1cGwCGhPwemxATtHPcZGd1hm6OfqyCnFqn1GMQ6YtA4z07S/gmAa4Mz/zyOf54UrhkLbkGE7FF4b+QlLpAITAAVUXGKK1Qdf0uAngr3qMBdKTHSDT+k3t9II6duZ1H228zbGoC5QvufxUytNIQBXPAclkAAEsGCLzX17TfqDRTN11F03Cdfu8ejc+sRlDWS43zNBmChJq88wcNk/v8ZJsYhWiwfFSLHeUsfrDJKSfaIXGkg1ZnLRu0QSb6JlhvQPgDG92kaqL9t1AzlUV+B+7lwCSyXMBRRQbM9gDOwmH6jHAAAJ1MiAbYLAbQwuFv2VMF8nkeQ7RFgZbn9dcJY1Mu9SDp1oCPnq4wuhO/qiAP378dFLYdiki9E2b8DbkJWkG0xa2nsvyUaZNvuhT4dERJEAAZmh1HG0y332dzETRIhqB0xRgzaTkCa5sXA9oubUUCREpJBi62fb/PIlOA3vxDhccJcANOysuF78GMoMFT8AgbMJuQiAovR/DCjM7pxk3KvexuSAL505jrdu3lfXE+cfhb8aLbyy7LkLDu6PGmzYvt7ugAAAAAAAAAAAAAAAAA';


const getRemoteDataSignature = (value: unknown): string => {
  try { return JSON.stringify(value) ?? ''; } catch { return ''; }
};

function App() {
  // Breezier Days navigation/check-in fix v3
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const remoteDataSignatureRef = useRef('');
  // Keep the Breezier Days bird icon available even when the hosting project drops public assets.
  useEffect(() => {
    try {
      let link = document.querySelector('link[data-littlewise-favicon]') as HTMLLinkElement | null;
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; link.setAttribute('data-littlewise-favicon', 'true'); document.head.appendChild(link); }
      link.type = 'image/svg+xml';
      link.href = A_GOOD_WAY_ICON_DATA_URL;
      let apple = document.querySelector('link[data-littlewise-apple-icon]') as HTMLLinkElement | null;
      if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; apple.setAttribute('data-littlewise-apple-icon', 'true'); document.head.appendChild(apple); }
      apple.href = A_GOOD_WAY_ICON_DATA_URL;
      document.title = 'Breezier Days — practical help for everyday family life';
    } catch {}
  }, []);
  const { identity, schedulePush, syncState, syncError, syncPasscode, setSyncPasscode, clearSyncPasscode, remoteData } = useCloudSync();
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'health' | 'delete' | 'subscription' | null>(null);
  const [selectedChildForHelp, setSelectedChildForHelp] = useState<number | null>(() => {
    try {
      const saved = window.localStorage.getItem('littlewise-selected-child');
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  });
  const [children, setChildren] = useState<ChildProfile[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('parenting-app-children') || '[]');
      return Array.isArray(saved)
        ? saved.map((child: ChildProfile) => ({
            ...child,
            reminders: Array.isArray(child.reminders) ? child.reminders : [],
            savedHelp: Array.isArray(child.savedHelp) ? child.savedHelp : [],
            development: Array.isArray(child.development) ? child.development : [],
            traits: Array.isArray(child.traits) ? child.traits : [],
            aboutChild: child.aboutChild ?? { enjoys: '', whatWorks: '', workedBefore: '', makesHarder: '', anythingElse: '' },
            dailyLog: child.dailyLog ?? { date: new Date().toISOString().slice(0, 10), wakeTime: '', napTime: '', meals: '', mood: '', potty: '', note: '' },
            pickyEating: child.pickyEating ?? { safeFoods: '', learningFoods: '', avoidTextures: '', mealtimeNotes: '' },
          }))
        : [];
    } catch { return []; }
  });
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('littlewise-saved-ideas') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [savedFilter, setSavedFilter] = useState<'All' | SavedIdea['category']>('All');
  const [showChildForm, setShowChildForm] = useState(false);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [newChildNote, setNewChildNote] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);

  const [selectedAge, setSelectedAge] = useState<AgeId>('preschool');
  const [selectedStage, setSelectedStage] = useState<ParentingStageId>('preschool');
  const [homePersonChosen, setHomePersonChosen] = useState(false);
  const [pregnancyTodayFeeling, setPregnancyTodayFeeling] = useState('');
  const [selectedHelp, setSelectedHelp] = useState('activities');
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [anotherAdultPresent, setAnotherAdultPresent] = useState(false);
  const [activity, setActivity] = useState<Activity>(
    activities.find((item) => item.ages.includes('preschool'))!
  );
  const [showAll, setShowAll] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<QuickNeed | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [activitySelectionMessage, setActivitySelectionMessage] = useState('');
  const helpNowRef = useRef<HTMLElement | null>(null);
  const activityRef = useRef<HTMLElement | null>(null);
  const justTellMeRef = useRef<HTMLElement | null>(null);
  const helpSectionRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const planMyDayRef = useRef<HTMLDivElement | null>(null);
  const browseRef = useRef<HTMLElement | null>(null);
  const savedIdeasRef = useRef<HTMLElement | null>(null);
  const developmentRef = useRef<HTMLElement | null>(null);
  const toolsRef = useRef<HTMLElement | null>(null);
  const situationGridRef = useRef<HTMLDivElement | null>(null);
  const [activeNav, setActiveNav] = useState<'home' | 'help' | 'explore' | 'saved'>('home');
  const [justTellMeText, setJustTellMeText] = useState('');
  const [justTellMeResult, setJustTellMeResult] = useState<Guidance | null>(null);
  const [justTellMeTitle, setJustTellMeTitle] = useState('');
  const [justTellMeDeepDive, setJustTellMeDeepDive] = useState<DeepDive[]>([]);
  const [selectedDevTopic, setSelectedDevTopic] = useState<string | null>(null);
  const [justTellMeDevResult, setJustTellMeDevResult] = useState<DevelopmentGuidance | null>(null);
  const [planMyDayResult, setPlanMyDayResult] = useState<DayPlan | null>(null);
  const [dayEvents, setDayEvents] = useState<DayEvent[]>([]);
  const [dayEventInput, setDayEventInput] = useState('');
  const [dayEventTime, setDayEventTime] = useState('');
  const [dayEventPlan, setDayEventPlan] = useState<DayEventPlan | null>(null);
  const [savedDayPlans, setSavedDayPlans] = useState<SavedDayPlan[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('littlewise-saved-day-plans') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [dayPlanDayLabel, setDayPlanDayLabel] = useState('');
  const [dayPlanSelectedDay, setDayPlanSelectedDay] = useState(0);
  const [dayPlanIntent, setDayPlanIntent] = useState<'independent-play' | 'home-reset' | 'plan-meal' | 'rest' | 'accomplish' | 'nothing' | 'lighter' | null>(null);
  const [dayPlanAccomplish, setDayPlanAccomplish] = useState('');
  const [openedSavedDayPlan, setOpenedSavedDayPlan] = useState<SavedDayPlan | null>(null);
  const [refineContext, setRefineContext] = useState<RefineContextId | null>(null);
  const [refinedResult, setRefinedResult] = useState<Guidance | null>(null);
  // Entitlements are server-authoritative; browser storage never grants Premium.
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalFeature, setPremiumModalFeature] = useState<PremiumFeatureId | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [premiumUser, setPremiumUser] = useState<PremiumUser | null>(null);
  const premiumUserIdRef = useRef<string | undefined>(premiumUser?.id);
  premiumUserIdRef.current = premiumUser?.id;
  const [premiumAuthReady, setPremiumAuthReady] = useState(false);
  const [premiumAuthMode, setPremiumAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [premiumAuthEmail, setPremiumAuthEmail] = useState('');
  const [premiumAuthPassword, setPremiumAuthPassword] = useState('');
  const [premiumAuthMessage, setPremiumAuthMessage] = useState<string | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [premiumKitchenInput, setPremiumKitchenInput] = useState('');
  const [premiumKitchenIdeas, setPremiumKitchenIdeas] = useState<string[]>([]);
  const [premiumMealIdeas, setPremiumMealIdeas] = useState<MealIdea[]>([]);
  const [selectedMealIdea, setSelectedMealIdea] = useState<MealIdea | null>(null);
  const [pickyProfileDraft, setPickyProfileDraft] = useState<PickyEatingProfile>({ safeFoods: '', learningFoods: '', avoidTextures: '', mealtimeNotes: '' });
  const [savedMealFilter, setSavedMealFilter] = useState(false);
  const [dayRoutines, setDayRoutines] = useState<DayRoutineMemory[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('littlewise-day-routines') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [routineLabel, setRoutineLabel] = useState('');
  const [routineDays, setRoutineDays] = useState('');
  const [routineTime, setRoutineTime] = useState('');
  const [routineDuration, setRoutineDuration] = useState('');
  const [routinePrepMinutes, setRoutinePrepMinutes] = useState('');
  const [routineTravelMinutes, setRoutineTravelMinutes] = useState('');
  const [premiumChecking, setPremiumChecking] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [personalizedHelpUsage, setPersonalizedHelpUsage] = useState<number>(() => {
    try {
      const monthKey = new Date().toISOString().slice(0, 7);
      const storedMonth = window.localStorage.getItem('breezier-days-personalized-help-month');
      const storedCount = parseInt(window.localStorage.getItem('breezier-days-personalized-help-usage') || '0', 10);
      if (storedMonth !== monthKey) {
        window.localStorage.setItem('breezier-days-personalized-help-month', monthKey);
        window.localStorage.setItem('breezier-days-personalized-help-usage', '0');
        return 0;
      }
      return Number.isFinite(storedCount) ? Math.max(0, storedCount) : 0;
    } catch { return 0; }
  });

  type DayMood = 'good' | 'help' | '';
  const [dayMood, setDayMood] = useState<DayMood>(() => {
    try {
      const stored = window.localStorage.getItem('littlewise-day-mood');
      const storedDate = window.localStorage.getItem('littlewise-day-mood-date');
      const today = new Date().toDateString();
      if (stored && storedDate === today && (stored === 'good' || stored === 'help')) return stored as DayMood;
    } catch {}
    return '';
  });

  type EaseNeed = 'child' | 'schedule' | 'house' | 'meals' | 'overwhelmed' | 'other' | '';
  type EaseTime = '2' | '10' | '30' | 'longer' | '';
  const [easeNeed, setEaseNeed] = useState<EaseNeed>('');
  const [easeTime, setEaseTime] = useState<EaseTime>('');


  type LittleWin = {
    id: number;
    text: string;
    emoji: string;
    date: string;
  };
  const [littleWins, setLittleWins] = useState<LittleWin[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('littlewise-little-wins') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [showLittleWinToast, setShowLittleWinToast] = useState(false);
  const [littleWinToastText, setLittleWinToastText] = useState('');
  const [savedAnswerToast, setSavedAnswerToast] = useState(false);
  const [recentlySavedAnswer, setRecentlySavedAnswer] = useState<Set<string>>(new Set());
  const savedAnswerTimeoutRef = useRef<number | null>(null);

  const moodOptions: { id: DayMood; label: string; emoji: string }[] = [
    { id: 'good', label: 'Pretty good', emoji: '😌' },
    { id: 'help', label: 'I need help', emoji: '💡' },
  ];

  // Keep one main destination open at a time. This prevents stacked sections from
  // making the user hunt through the page after tapping a navigation action.
  const closeCompetingViews = () => {
    setShowLearning(false);
    setSelectedLearningActivity(null);
    setShowStory(false);
    setShowHomeReset(false);
    setShowTakingOver(false);
    setShowExploreHub(false);
  };

  const returnHome = () => {
    closeCompetingViews();
    setActiveNav('home');
    setSelectedHelp(null);
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setShowHandoff(false);
    setShowAboutChild(false);
    setHomeResetResult(null);
    setTakingOverPlan(null);
    setPlanMyDayResult(null);
    setJustTellMeResult(null);
    setJustTellMeDevResult(null);
    setRefinedResult(null);
    setReopenedSavedAnswer(null);
    setShowAll(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  // The check-in intentionally stays simple: two choices only.
  const openHelpNow = () => {
    closeCompetingViews();
    setActiveNav('help');
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setShowAll(false);
    setActivitySelectionMessage('');
    setSelectedHelp('help-now');

    const goToHelpNow = () => {
      const target = helpNowRef.current ?? document.querySelector('.help-now-section');
      if (target instanceof HTMLElement) {
        const top = target.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      }
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(goToHelpNow));
  };

  const selectTopPerson = (target: { type: 'child'; id: number } | { type: 'stage'; id: ParentingStageId }) => {
    pushNavHistory();
    closeCompetingViews();
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setShowAll(false);
    setActivitySelectionMessage('');

    if (target.type === 'child') {
      const child = children.find(c => c.id === target.id);
      if (!child) return;
      const ageId = getChildGuidanceAge(child.age);
      setSelectedChildId(child.id);
      setSelectedChildForHelp(child.id);
      setSelectedAge(ageId);
      setSelectedStage(ageId);
      setSelectedHelp('');
    } else if (target.id === 'expecting') {
      setSelectedChildId(null);
      setSelectedChildForHelp(null);
      setSelectedStage('expecting');
      setSelectedHelp('');
    } else {
      setSelectedChildId(null);
      setSelectedChildForHelp(null);
      setSelectedAge(target.id as AgeId);
      setSelectedStage(target.id);
      setSelectedHelp('');
    }

    setHomePersonChosen(true);
    window.requestAnimationFrame(() => {
      const targetEl = document.querySelector('.home-next-step');
      if (targetEl instanceof HTMLElement) {
        const navOffset = window.innerWidth >= 701 ? 88 : 12;
        const top = targetEl.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
      }
    });
  };

  const openEaseNextStep = () => {
    if (easeNeed === 'house') {
      openHomeReset();
      return;
    }
    if (easeNeed === 'meals') {
      selectHelp('mealtime');
      return;
    }
    if (easeNeed === 'schedule') {
      openDayPlanner();
      return;
    }
    openHelpNow();
  };

  const selectMood = (mood: DayMood) => {
    if (mood === 'help') {
      // Help is an action, not a mood to persist. Keep the check-in from
      // reopening in an inconsistent state on the next visit.
      setDayMood('');
      try {
        window.localStorage.removeItem('littlewise-day-mood');
        window.localStorage.removeItem('littlewise-day-mood-date');
      } catch {}
      openHelpNow();
      return;
    }
    if (mood === dayMood) {
      setDayMood('');
      try {
        window.localStorage.removeItem('littlewise-day-mood');
        window.localStorage.removeItem('littlewise-day-mood-date');
      } catch {}
      return;
    }
    setDayMood(mood);
    // A positive check-in should lead somewhere useful instead of appearing inert.
    // Keep it lightweight: show a small set of optional next steps without changing
    // the parent's main navigation or forcing a scroll.
    try {
      window.localStorage.setItem('littlewise-day-mood', mood);
      window.localStorage.setItem('littlewise-day-mood-date', new Date().toDateString());
    } catch {}
  };

  const littleWinPool: { text: string; emoji: string }[] = [
    { text: 'Survived the bedtime battle', emoji: '🌙' },
    { text: 'Worked through sibling conflict', emoji: '🤝' },
    { text: 'Tried a new transition strategy', emoji: '🔄' },
    { text: 'Got through a tough moment', emoji: '💛' },
    { text: 'Kept your cool when it was hard', emoji: '🧘' },
    { text: 'Connected instead of corrected', emoji: '🫶' },
    { text: 'Tried something new', emoji: '✨' },
    { text: 'Made it out the door', emoji: '🚪' },
    { text: 'Handled a meltdown with patience', emoji: '🌊' },
    { text: 'Asked for help when you needed it', emoji: '🤙' },
  ];

  const recordLittleWin = (win: { text: string; emoji: string }) => {
    const newWin: LittleWin = {
      id: Date.now(),
      text: win.text,
      emoji: win.emoji,
      date: new Date().toLocaleDateString(),
    };
    setLittleWins(current => [newWin, ...current].slice(0, 50));
    setLittleWinToastText(`${win.emoji} ${win.text}`);
    setShowLittleWinToast(true);
    window.setTimeout(() => setShowLittleWinToast(false), 3000);
  };

  const removeLittleWin = (winId: number) => {
    setLittleWins(current => current.filter(w => w.id !== winId));
  };

  const supportiveMessages = [
    "Parenting plot twist: Sometimes 'bad behavior' is really 'I have no idea how to handle this.'",
    "You're not behind. You're just in the middle of it.",
    "The fact that you're looking for a better way? That's already good parenting.",
    "Some days, keeping everyone safe and loved is the whole win.",
    "You don't have to get it right every time. Just keep showing up.",
    "Hard moments don't make you a bad parent. They make you a real one.",
    "The goal isn't perfect kids. It's kids who know they're loved, even on hard days.",
  ];
  const [supportiveMessage] = useState(() => {
    try {
      const stored = window.localStorage.getItem('littlewise-supportive-msg');
      const storedDate = window.localStorage.getItem('littlewise-supportive-date');
      const today = new Date().toDateString();
      if (stored && storedDate === today) return stored;
    } catch {}
    const msg = supportiveMessages[Math.floor(Math.random() * supportiveMessages.length)];
    try {
      window.localStorage.setItem('littlewise-supportive-msg', msg);
      window.localStorage.setItem('littlewise-supportive-date', new Date().toDateString());
    } catch {}
    return msg;
  });

  type NavSnapshot = {
    activeNav: 'home' | 'help' | 'explore' | 'saved';
    selectedHelp: string;
    selectedSituation: string | null;
    selectedDevTopic: string | null;
    selectedChildId: number | null;
    selectedChildForHelp: number | null;
    selectedAge: AgeId;
    selectedStage: ParentingStageId;
    showLearning: boolean;
    selectedLearningActivity: LearningActivity | null;
    showStory: boolean;
    showHandoff: boolean;
    showAboutChild: boolean;
    showHomeReset: boolean;
    homeResetResult: typeof homeResetResult;
    showTakingOver: boolean;
    showExploreHub: boolean;
    takingOverPlan: typeof takingOverPlan;
    planMyDayResult: typeof planMyDayResult;
    justTellMeResult: typeof justTellMeResult;
    justTellMeDevResult: typeof justTellMeDevResult;
    refinedResult: typeof refinedResult;
    reopenedSavedAnswer: SavedIdea | null;
    legalPage: 'privacy' | 'terms' | 'health' | 'delete' | 'subscription' | null;
    showAll: boolean;
    scrollY: number;
  };

  const navHistoryRef = useRef<NavSnapshot[]>([]);

  const pushNavHistory = () => {
    navHistoryRef.current.push({
      activeNav,
      selectedHelp,
      selectedSituation,
      selectedDevTopic,
      selectedChildId,
      selectedChildForHelp,
      selectedAge,
      selectedStage,
      showLearning,
      selectedLearningActivity,
      showStory,
      showHandoff,
      showAboutChild,
      showHomeReset,
      homeResetResult,
      showTakingOver,
      showExploreHub,
      takingOverPlan,
      planMyDayResult,
      justTellMeResult,
      justTellMeDevResult,
      refinedResult,
      reopenedSavedAnswer,
      legalPage,
      showAll,
      scrollY: window.scrollY,
    });
    if (navHistoryRef.current.length > 30) navHistoryRef.current.shift();
  };

  const goBack = () => {
    const prev = navHistoryRef.current.pop();
    if (!prev) {
      setActiveNav('home');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    setActiveNav(prev.activeNav);
    setSelectedHelp(prev.selectedHelp);
    setSelectedSituation(prev.selectedSituation);
    setSelectedDevTopic(prev.selectedDevTopic);
    setSelectedChildId(prev.selectedChildId);
    setSelectedChildForHelp(prev.selectedChildForHelp);
    setSelectedAge(prev.selectedAge);
    setSelectedStage(prev.selectedStage);
    setShowLearning(prev.showLearning);
    setSelectedLearningActivity(prev.selectedLearningActivity);
    setShowStory(prev.showStory);
    setShowHandoff(prev.showHandoff);
    setShowAboutChild(prev.showAboutChild);
    setShowHomeReset(prev.showHomeReset);
    setHomeResetResult(prev.homeResetResult);
    setShowTakingOver(prev.showTakingOver);
    setShowExploreHub(prev.showExploreHub);
    setTakingOverPlan(prev.takingOverPlan);
    setPlanMyDayResult(prev.planMyDayResult);
    setJustTellMeResult(prev.justTellMeResult);
    setJustTellMeDevResult(prev.justTellMeDevResult);
    setRefinedResult(prev.refinedResult);
    setReopenedSavedAnswer(prev.reopenedSavedAnswer);
    setLegalPage(prev.legalPage);
    setShowAll(prev.showAll);
    window.scrollTo({ top: prev.scrollY, behavior: 'auto' });
  };


  useEffect(() => {
    const modalOpen = showPremiumModal || legalPage !== null;
    if (modalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showPremiumModal, legalPage]);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    void getPremiumUser().then(user => {
      if (active && !authEventReceived) { setPremiumUser(user); setPremiumAuthReady(true); }
    }).catch(() => { if (active) setPremiumAuthReady(true); });
    const unsubscribe = onPremiumAuthChange(user => {
      authEventReceived = true;
      if (active) { setPremiumUser(user); setPremiumAuthReady(true); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    applyPremiumStatus(false);
    if (premiumUser) void refreshPremiumFromServer();
  }, [premiumUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('premium') === 'success') {
      // Keep the return marker until verification completes. Auth restoration
      // and React StrictMode can both rerun this effect before polling starts.
      if (!premiumAuthReady) return;
      if (premiumUser) {
        setPremiumChecking(true);
        setShowPremiumSuccess(true);
        let cancelled = false;
        let attempts = 0;
        const poll = async () => {
          if (cancelled) return;
          attempts += 1;
          // A redirect proves nothing. Only the webhook-written entitlement can
          // activate Premium, so this poll reads the authenticated backend status.
          const result = await checkPremiumStatus();
          const { isPremium: remote, currentPeriodEnd, cancelAtPeriodEnd: cancelFlag } = result;
          if (cancelled) return;
          if (remote) {
            applyPremiumStatus(remote, currentPeriodEnd, cancelFlag);
            params.delete('premium');
            window.history.replaceState({}, '', window.location.pathname + (params.size ? `?${params}` : '') + window.location.hash);
            setPremiumChecking(false);
            return;
          }
          if (attempts < 15) {
            setTimeout(poll, attempts < 3 ? 1500 : 3000);
          } else {
            setPremiumChecking(false);
            setCheckoutError(result.error || 'Your payment is still being verified. Use Restore Purchases to check again; you do not need to pay again.');
          }
        };
        setTimeout(poll, 1000);
        return () => { cancelled = true; };
      } else {
        setShowPremiumModal(true);
        setPremiumAuthMessage('Sign in to the account you used at checkout to verify Premium.');
      }
    } else if (params.get('premium') === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
      setCheckoutError('Checkout was cancelled. Your subscription was not started.');
    }
  }, [premiumAuthReady, premiumUser?.id]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (!premiumUser) return;
      checkPremiumStatus().then(({ isPremium: remote, currentPeriodEnd, cancelAtPeriodEnd: cancelFlag, error }) => {
        if (premiumUserIdRef.current !== premiumUser.id) return;
        // A failed request is not an authoritative loss of entitlement.
        if (error) return;
        setIsPremium(remote);
        setCancelAtPeriodEnd(cancelFlag);
        if (currentPeriodEnd) {
          setPremiumUntil(currentPeriodEnd);
        } else {
          setPremiumUntil(null);
        }
        if (remote && !isPremium) {
          setShowPremiumSuccess(true);
        }
      }).catch(() => {
        // Background refresh failures must not block interaction.
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [premiumUser?.id, isPremium]);

  const [weatherData, setWeatherData] = useState<{ temp: number; code: number; description: string; locationName: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherTime, setWeatherTime] = useState<5 | 15 | 20 | 30>(20);
  const [weatherEnergy, setWeatherEnergy] = useState<'high' | 'medium' | 'low'>('medium');
  const [weatherPreference, setWeatherPreference] = useState<'indoor' | 'outdoor' | 'either'>('either');
  const [weatherResult, setWeatherResult] = useState<Activity[] | null>(null);
  const [weatherResultMessage, setWeatherResultMessage] = useState('');
  const [weatherManualInput, setWeatherManualInput] = useState('');
  const [weatherManualMode, setWeatherManualMode] = useState(false);

  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [showTakingOver, setShowTakingOver] = useState(false);
  const [takingOverAge, setTakingOverAge] = useState<AgeId | 'multiple'>('toddler');
  const [takingOverTime, setTakingOverTime] = useState<string>('30 min');
  const [takingOverSituation, setTakingOverSituation] = useState<string>('');
  const [takingOverEnergy, setTakingOverEnergy] = useState<string>('');
  const [takingOverPlan, setTakingOverPlan] = useState<null | { rightNow: string; next: string; ifNotWorking: string; keepBusy: string; nextTransition: string }>(null);

  const [showLearning, setShowLearning] = useState(false);
  const [showExploreHub, setShowExploreHub] = useState(false);
  const [reopenedSavedAnswer, setReopenedSavedAnswer] = useState<SavedIdea | null>(null);
  const [learningAge, setLearningAge] = useState<AgeId>('preschool');
  const [learningCategory, setLearningCategory] = useState<LearningCategory | 'all'>('all');
  const [learningTime, setLearningTime] = useState<LearningTime | 'all'>('all');
  const [learningLocation, setLearningLocation] = useState<LearningLocation | 'all'>('all');
  const [learningEnergy, setLearningEnergy] = useState<LearningEnergy | 'all'>('all');
  const [learningPrep, setLearningPrep] = useState<LearningPrep | 'all'>('all');
  const [showLearningFilters, setShowLearningFilters] = useState(false);
  const [selectedLearningActivity, setSelectedLearningActivity] = useState<LearningActivity | null>(null);
  const [learningView, setLearningView] = useState<'activities' | 'plans'>('activities');
  const [currentLearningPlan, setCurrentLearningPlan] = useState<LearningPlan | null>(null);
  const [savedLearningPlans, setSavedLearningPlans] = useState<LearningPlan[]>([]);
  const [selectedPlanDay, setSelectedPlanDay] = useState<LearningPlanDay | null>(null);
  const weatherResultRef = useRef<HTMLDivElement | null>(null);
  const learningRef = useRef<HTMLElement | null>(null);
  const exploreHubRef = useRef<HTMLElement | null>(null);

  const [showStory, setShowStory] = useState(false);
  const emptyHandoff = {
    wakeTime: '',
    lastFeeding: '',
    lastNap: '',
    napSchedule: '',
    diaper: '',
    activities: '',
    unusual: '',
    notes: '',
  };

  const [showHandoff, setShowHandoff] = useState(false);
  const [handoff, setHandoff] = useState(() => {
    try {
      const saved = window.localStorage.getItem('littlewise-handoff');
      return saved ? { ...emptyHandoff, ...JSON.parse(saved) } : emptyHandoff;
    } catch {
      return emptyHandoff;
    }
  });
  const [caregiverFeeling, setCaregiverFeeling] = useState<string>('');
  const [showAboutChild, setShowAboutChild] = useState(false);
  const [sleepNeedsCheck, setSleepNeedsCheck] = useState<{
    active: boolean;
    step: number;
    answers: Record<string, 'yes' | 'no' | 'unsure' | undefined>;
    completed: boolean;
  }>({ active: false, step: 0, answers: {}, completed: false });
  const [showHomeReset, setShowHomeReset] = useState(false);
  const [homeResetArea, setHomeResetArea] = useState<string>('');
  const [homeResetTime, setHomeResetTime] = useState<number>(10);
  const [homeResetEnergy, setHomeResetEnergy] = useState<'high' | 'some' | 'exhausted'>('some');
  const [homeResetResult, setHomeResetResult] = useState<null | {
    title: string;
    emoji: string;
    startHere: string[];
    ifYouHaveMoreTime: string[];
    kidsCanHelp: { label: string; tasks: string[] }[];
    tips: string[];
  }>(null);
  const homeResetRef = useRef<HTMLElement | null>(null);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const matchingActivities = activities.filter((item) =>
    item.ages.includes(selectedAge)
  );

  const currentAge = ageGroups.find((age) => age.id === selectedAge);

  const visibleHelpOptions = selectedStage === 'expecting'
    ? expectingHelpOptions
    : selectedStage === 'newparent'
    ? newParentHelpOptions
    : helpOptions;

  const isParentingStageOnly = selectedStage === 'expecting' || selectedStage === 'newparent';

  const getSituations = (): Situation[] => {
    const filterByAge = (situations: Situation[]): Situation[] => {
      if (isParentingStageOnly) return situations;
      const filtered = situations.filter(s => !s.ages || s.ages.includes(selectedAge));
      return filtered.length > 0 ? filtered : situations;
    };
    switch (selectedHelp) {
      case 'expecting-prep':
      case 'expecting-needs':
      case 'expecting-pack':
      case 'expecting-feeding':
      case 'expecting-overwhelmed':
      case 'expecting-older-children':
        return expectingSituations[selectedHelp] || [];
      case 'feelings':
        return filterByAge(feelingsSituations);
      case 'potty':
        return filterByAge(pottySituations);
      case 'sleep':
        return filterByAge(sleepSituations);
      case 'feeding':
        return filterByAge(feedingSituations);
      case 'mealtime':
        return filterByAge([...mealtimeSituations, ...additionalMealSituations]);
      case 'siblings':
        return filterByAge(siblingSituations);
      case 'help-now':
        return allHelpNowSituations.filter(situation => {
          if (situation.id === 'nap-now' && (selectedAge === 'baby' || selectedAge === 'bigkid')) {
            return false;
          }
          if (!isParentingStageOnly && situation.ages && !situation.ages.includes(selectedAge)) {
            return false;
          }
          return true;
        });
      case 'everyday':
        return filterByAge(everydaySituations);
      case 'learning':
        return filterByAge(learningSituations);
            case 'development':
        return [];
      case 'health':
        return filterByAge(healthCareSituations);
      case 'newparent-care':
        return genericSituations('new parent care', [
          ['overwhelmed', 'I feel overwhelmed', '💛'],
          ['rest', 'I need a break', '☕'],
          ['help', 'I need help asking for help', '🤝'],
        ]);
      case 'newparent-leave':
        return everydaySituations.filter(item => ['leave', 'dressed'].includes(item.id));
      case 'newparent-crying':
        return allHelpNowSituations.filter(item => ['overwhelmed-now', 'losing-control-now', 'meltdown-now'].includes(item.id));
default:
        return [];
    }
  };

  const situationList = getSituations();

  const currentHelpOption = selectedHelp === 'help-now'
    ? { id: 'help-now', title: 'What Do I Do Now?', description: 'One situation. One next step.', emoji: '🚨' }
    : visibleHelpOptions.find((item) => item.id === selectedHelp);
  const currentSituation = situationList.find(
    (item) => item.id === selectedSituation
  );

  type QuickNeed = 'outside' | 'calm' | 'play' | 'get-things-done' | 'lowest-effort';

  const getActivityMaxMinutes = (time: string) => {
    const nums = time.match(/\d+/g)?.map(Number) ?? [];
    if (!nums.length) return 999;
    return nums.length > 1 ? nums[nums.length - 1] : nums[0];
  };

  const activityTimeFits = (item: Activity, minutes: number | null) => {
    if (minutes === null) return true;
    return getActivityMaxMinutes(item.time) <= (minutes === 30 ? 999 : minutes);
  };

  const chooseBestActivity = (pool: Activity[], minutes: number | null, need: QuickNeed | null) => {
    if (!pool.length) return null;
    const scored = pool.map((item) => {
      let score = 0;
      if (need && item.needs.includes(need)) score += 6;
      if (activityTimeFits(item, minutes)) score += 5;
      if (minutes !== null && Math.abs(getActivityMaxMinutes(item.time) - minutes) <= 5) score += 2;
      if (need === 'lowest-effort' && item.effort === 'Very low') score += 5;
      if (need === 'get-things-done' && item.effort !== 'Medium') score += 2;
      if (need === 'calm' && item.mess === 'None') score += 2;
      if (need === 'outside' && item.needs.includes('outside')) score += 2;
      return { item, score };
    }).sort((a,b) => b.score - a.score);
    const bestScore = scored[0].score;
    const top = scored.filter(x => x.score === bestScore).map(x => x.item);
    return pickDifferent(top);
  };

  const showPickedActivity = (nextActivity: Activity, message?: string) => {
    setActivity(nextActivity);
    setShowAll(false);
    setActivitySelectionMessage(message || `Picked for you: ${nextActivity.title}`);
    window.setTimeout(() => {
      activityRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 50);
  };

  const pickDifferent = (pool: Activity[]) => {
    if (!pool.length) return null;
    if (pool.length === 1) return pool[0];
    const withoutCurrent = pool.filter((item) => item.title !== activity.title);
    const source = withoutCurrent.length ? withoutCurrent : pool;
    return source[Math.floor(Math.random() * source.length)];
  };

  const chooseActivityForNeed = (need: QuickNeed) => {
    setSelectedHelp('activities');
    setSelectedSituation(null);
    setSelectedNeed(need);

    const candidates = matchingActivities.filter((item) => item.needs?.includes(need));
    const pool = candidates.length ? candidates : matchingActivities;
    const nextActivity = chooseBestActivity(pool, selectedTime, need);
    if (!nextActivity) {
      setActivitySelectionMessage('I could not find a matching idea yet. Try Browse all ideas.');
      return;
    }
    const needLabels: Record<QuickNeed, string> = {
      outside: 'outside', calm: 'something calm', play: 'a play idea',
      'get-things-done': 'something that lets you get things done',
      'lowest-effort': 'the easiest low-effort option',
    };
    showPickedActivity(nextActivity, `Got it — here is ${needLabels[need]}: ${nextActivity.title}`);
  };

  const chooseActivityForTime = (minutes: number | null) => {
    setSelectedTime(minutes);
    const needCandidates = selectedNeed
      ? matchingActivities.filter((item) => item.needs?.includes(selectedNeed))
      : matchingActivities;
    const pool = needCandidates.length ? needCandidates : matchingActivities;
    const nextActivity = chooseBestActivity(pool, minutes, selectedNeed);
    if (!nextActivity) {
      setActivitySelectionMessage('I could not find an exact time match yet. Browse all ideas to see everything available.');
      return;
    }
    const label = minutes === 30 ? '30+ minutes' : `${minutes} minutes`;
    showPickedActivity(nextActivity, `Great — here is an idea that fits about ${label}: ${nextActivity.title}`);
  };

  const chooseActivity = () => {
    if (!matchingActivities.length) return;
    const randomIndex = Math.floor(Math.random() * matchingActivities.length);
    setActivity(matchingActivities[randomIndex]);
    setShowAll(false);
    window.setTimeout(() => {
      activityRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  type WeatherCategory = 'hot' | 'rain' | 'cold' | 'pleasant';

  const weatherCodeToCategory = (code: number, tempC: number): WeatherCategory => {
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 95 && code <= 99) return 'rain';
    if (code === 71 || code === 73 || code === 75 || code === 77) return 'cold';
    if (code === 0 && tempC >= 28) return 'hot';
    if (code === 1 && tempC >= 28) return 'hot';
    if (tempC <= 5) return 'cold';
    if (tempC >= 28) return 'hot';
    return 'pleasant';
  };

  const weatherCodeToDescription = (code: number): string => {
    const map: Record<number, string> = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      66: 'Light freezing rain', 67: 'Heavy freezing rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      85: 'Slight snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
    };
    return map[code] ?? 'Unknown';
  };

  const fetchWeather = async (lat: number, lon: number): Promise<{ temp: number; code: number; description: string; locationName: string }> => {
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`);
    if (!weatherRes.ok) throw new Error('Weather service unavailable');
    const weatherJson = await weatherRes.json();
    const temp = Math.round(weatherJson.current?.temperature_2m ?? 0);
    const code = weatherJson.current?.weather_code ?? 0;

    let locationName = 'your area';
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`);
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        const r = geoJson?.results?.[0];
        if (r) {
          const parts = [r.name, r.admin1, r.country].filter(Boolean);
          if (parts.length) locationName = parts.slice(0, 2).join(', ');
        }
      }
    } catch { /* reverse geocoding is best-effort */ }

    return { temp, code, description: weatherCodeToDescription(code), locationName };
  };

  const requestWeatherLocation = () => {
    if (!navigator.geolocation) {
      setWeatherManualMode(true);
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    navigator.geolocation.getCurrentPosition(
    async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await fetchWeather(latitude, longitude);
          setWeatherData(data);
        } catch {
          setWeatherError('Could not load weather data. Please try again in a moment.');
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeatherLoading(false);
        setWeatherManualMode(true);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  };

  const fetchWeatherByLocation = async () => {
    const query = weatherManualInput.trim();
    if (!query) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=en&format=json`);
      if (!geoRes.ok) throw new Error('Geocoding service unavailable');
      const geoJson = await geoRes.json();
      const r = geoJson?.results?.[0];
      if (!r) {
        setWeatherError(`Could not find "${query}". Try a city name or ZIP code.`);
        return;
      }
      const lat = r.latitude;
      const lon = r.longitude;
      const parts = [r.name, r.admin1, r.country].filter(Boolean);
      const locationName = parts.length ? parts.slice(0, 2).join(', ') : query;
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`);
      if (!weatherRes.ok) throw new Error('Weather service unavailable');
      const weatherJson = await weatherRes.json();
      const temp = Math.round(weatherJson.current?.temperature_2m ?? 0);
      const code = weatherJson.current?.weather_code ?? 0;
      setWeatherData({ temp, code, description: weatherCodeToDescription(code), locationName });
      setWeatherManualMode(false);
    } catch {
      setWeatherError('Could not load weather data. Please try again in a moment.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const recommendWeatherActivities = () => {
    if (!weatherData) return;
    const category = weatherCodeToCategory(weatherData.code, weatherData.temp);
    const stageAge: AgeId = ['baby', 'toddler', 'preschool', 'bigkid'].includes(selectedStage as string)
      ? selectedStage as AgeId
      : selectedAge;

    let pool = activities.filter((a) => a.ages.includes(stageAge));

    const isOutdoor = (a: Activity) => a.needs.includes('outside');
    const isIndoor = (a: Activity) => !a.needs.includes('outside');

    const isWaterPlay = (a: Activity) => /water|sprinkler|puddle|ice|splash|balloon/i.test(a.title + a.description);

    if (category === 'rain' || category === 'cold') {
      pool = pool.filter(isIndoor);
    } else if (category === 'hot') {
      const waterAndLowEffort = pool.filter((a) => isWaterPlay(a) || isIndoor(a) || a.needs.includes('lowest-effort'));
      pool = waterAndLowEffort.length ? waterAndLowEffort : pool;
    } else {
      if (weatherPreference === 'indoor') pool = pool.filter(isIndoor);
      else if (weatherPreference === 'outdoor') pool = pool.filter(isOutdoor);
    }

    if (weatherEnergy === 'low') {
      const lowEffort = pool.filter((a) => a.effort === 'Very low' || a.needs.includes('lowest-effort'));
      if (lowEffort.length) pool = lowEffort;
    } else if (weatherEnergy === 'high') {
      const active = pool.filter((a) => a.needs.includes('play'));
      if (active.length) pool = active;
    }

    const timeFit = pool.filter((a) => {
      const max = getActivityMaxMinutes(a.time);
      return weatherTime === 30 ? max <= 35 : max <= weatherTime + 5;
    });
    if (timeFit.length) pool = timeFit;

    if (!pool.length) pool = activities.filter((a) => a.ages.includes(stageAge));

    const scored = pool.map((a) => {
      let score = 0;
      if (activityTimeFits(a, weatherTime)) score += 5;
      if (weatherEnergy === 'low' && (a.effort === 'Very low' || a.needs.includes('lowest-effort'))) score += 4;
      if (weatherEnergy === 'high' && a.needs.includes('play')) score += 4;
      if (weatherPreference === 'indoor' && isIndoor(a)) score += 3;
      if (weatherPreference === 'outdoor' && isOutdoor(a)) score += 3;
      if (category === 'pleasant' && isOutdoor(a)) score += 4;
      if (category === 'rain' && isIndoor(a)) score += 2;
      if (category === 'cold' && isIndoor(a)) score += 2;
      if (category === 'hot' && isWaterPlay(a)) score += 5;
      if (category === 'hot' && (isIndoor(a) || a.needs.includes('lowest-effort'))) score += 2;
      return { item: a, score };
    }).sort((a, b) => b.score - a.score);

    const topScore = scored[0]?.score ?? 0;
    const top = scored.filter((x) => x.score === topScore).map((x) => x.item);
    const shuffled = [...top].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    setWeatherResult(picked);

    const categoryLabels: Record<WeatherCategory, string> = {
      hot: 'hot weather',
      rain: 'rainy weather',
      cold: 'cold weather',
      pleasant: 'pleasant weather',
    };
    setWeatherResultMessage(`Based on ${categoryLabels[category]} (${weatherData.description}, ${weatherData.temp}°C) in ${weatherData.locationName}.`);

    window.setTimeout(() => {
      weatherResultRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const detectStage = (lower: string): AgeId | null => {
    if (/baby|infant|newborn/.test(lower)) return 'baby';
    if (/toddler|1 year|2 year/.test(lower)) return 'toddler';
    if (/preschool|pre-school|3 year|4 year|5 year/.test(lower)) return 'preschool';
    if (/big kid|school age|school-age|6 year|7 year|8 year|older kid/.test(lower)) return 'bigkid';
    return null;
  };

  const detectProblem = (lower: string): string | null => {
    if (/meltdown|melting down|tantrum|crying|screaming|freaking out|losing it|out of control/.test(lower)) return 'meltdown';
    if (/hit|hitting|kick|kicking|bite|biting|hurt|hurting/.test(lower)) return 'hitting';
    if (/fight|fighting|arguing|won.?t share|sharing/.test(lower)) return 'fighting';
    if (/sleep|nap|bedtime|won.?t sleep|wont sleep|night waking|nightmare/.test(lower)) return 'sleep';
    if (/picky|won.?t eat|not eating|refusing food|food|meal|lunch|snack|hungry|breakfast/.test(lower)) return 'food';
    if (/potty|toilet|accident|pee|poop|bathroom/.test(lower)) return 'potty';
    if (/fever|temperature|sick|illness|cough|cold|hot|not feeling well|feel sick|teething|teeth|tooth|under the weather/.test(lower)) return 'health';
    if (/jealous|new baby|sibling/.test(lower)) return 'jealous';
    if (/won.?t leave|leaving|leave the|playground|grandma|grandpa|park|go home|going home|transition|won.?t go/.test(lower)) return 'transition';
    if (/screen|tv|television|tablet|video|watching|watch tv|movie|ipad|youtube/.test(lower)) return 'screen';
    if (/won.?t listen|not listening|listen to me|cooperate|ignor|defy|defiance|won.?t do what|won.?t help/.test(lower)) return 'listening';
    if (/dressed|clothes|getting ready|leave the house|getting out/.test(lower)) return 'routine';
    if (/bored|nothing to do|need something to do|play|activity|entertain|occupy/.test(lower)) return 'bored';
    return null;
  };

  const detectConstraint = (lower: string): string | null => {
    if (/make dinner|cook|cooking|making dinner|making food|prepare dinner|need to cook/.test(lower)) return 'cook';
    if (/need to get (something|anything) done|get things done|need to work|need to finish|get something done/.test(lower)) return 'get-done';
    if (/no energy|exhausted|tired|burned out|burnt out|drained|depleted|can.?t do this/.test(lower)) return 'no-energy';
    if (/need an? (easy )?lunch|easy meal|quick meal|fast meal|5 min|five min/.test(lower)) return 'easy-meal';
    if (/need to (leave|go out|get out)|getting out the door|leaving the house/.test(lower)) return 'leave';
    return null;
  };

  const pickActivityForStage = (stage: AgeId, need: QuickNeed | null): Activity | null => {
    const pool = activities.filter((a) => a.ages.includes(stage));
    if (!pool.length) return null;
    if (need) {
      const needPool = pool.filter((a) => a.needs?.includes(need));
      if (needPool.length) return needPool[Math.floor(Math.random() * needPool.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const getJustTellMeGuidance = (text: string): { guidance: Guidance; deepDive: DeepDive[] } => {
    const lower = text.toLowerCase();
    const stage = detectStage(lower) ?? selectedAge;
    const problem = detectProblem(lower);
    const constraint = detectConstraint(lower);

    const stageLabel: Record<AgeId, string> = {
      baby: 'baby', toddler: 'toddler', preschool: 'preschooler', bigkid: 'school-age child', tween: 'tween',
    };

    // COMBINATION: meltdown + need to cook/make dinner
    if (problem === 'meltdown' && (constraint === 'cook' || constraint === 'get-done')) {
      const taskLabel = constraint === 'cook' ? 'make dinner' : 'get this done';
      const activitySuggestion = stage === 'baby'
        ? 'a safe spot nearby where you can see them, such as a play mat or bouncer'
        : 'one nearby activity they can do independently, such as stickers, a small toy bin, coloring, or a puzzle';
      return {
        guidance: {
          title: `${stageLabel[stage][0].toUpperCase()}${stageLabel[stage].slice(1)} meltdown + you need to ${taskLabel}`,
          emoji: '😤',
          doNow: `Get your ${stageLabel[stage]} somewhere safe and stay nearby while you give them a simple boundary and reduce talking. Then give them ${activitySuggestion} while you ${taskLabel}.`,
          sayThis: `I know you\'re upset. I\'m going to ${taskLabel}, and you can sit here with your ${stage === 'baby' ? 'toys' : 'stickers'} while I work. I\'ll check on you when I\'m done with this step.`,
          avoidThis: 'Avoid trying to reason through the entire meltdown or offering lots of choices while they are highly upset.',
          afterward: 'Once things are calm, reconnect briefly and move on. Dinner does not need to be perfect.',
        },
        deepDive: [
          { heading: 'Why this works', body: 'A meltdown is not a teachable moment. Your child\'s brain is flooded and cannot process logic, choices, or explanations. Safety, closeness, and reducing stimulation are what help most right now.' },
          { heading: 'The activity is a bridge, not a fix', body: 'The nearby activity is not meant to stop the meltdown — it gives your child something to do with their hands and body while their nervous system settles. Keep it simple and familiar.' },
        ],
      };
    }

    // COMBINATION: sleep + exhausted/no energy
    if (problem === 'sleep' && constraint === 'no-energy') {
      return {
        guidance: {
          title: `${stageLabel[stage][0].toUpperCase()}${stageLabel[stage].slice(1)} won\'t sleep + you\'re exhausted`,
          emoji: '😴',
          doNow: `Lower stimulation, return to the simplest version of the sleep routine, and keep your response calm and brief. If your ${stageLabel[stage]} is safe, it is okay to sit and breathe for a moment before responding again.`,
          sayThis: 'It is time to rest. I am here to help you settle.',
          avoidThis: 'Avoid adding a brand-new routine or endless negotiations tonight. You do not have the energy for a big plan and that is okay.',
          afterward: 'Tonight, do the minimum that keeps everyone safe and rested. Tomorrow, look at the whole daily sleep pattern rather than one difficult night.',
        },
        deepDive: [
          { heading: 'When you are running on empty', body: 'An exhausted parent cannot problem-solve sleep training at 2am. Tonight is about getting through. The bigger sleep pattern can be addressed during daylight when you have more capacity.' },
          { heading: 'If this is persistent', body: 'If sleep difficulty is ongoing, talk with your healthcare provider. Chronic sleep deprivation is a real health concern, not a personal failure.' },
        ],
      };
    }

    // COMBINATION: picky/food + easy meal
    if (problem === 'food' && (constraint === 'easy-meal' || constraint === 'cook')) {
      const mealIdeas: Record<AgeId, string> = {
        baby: 'a familiar ready-to-serve baby food or safe food that fits your baby\'s feeding stage',
        toddler: 'cheese quesadilla strips + fruit, toast + nut/seed butter, or yogurt + banana + oats',
        preschool: 'cheese quesadilla + berries, hummus + pita + cucumber, or a sunbutter sandwich + banana',
        bigkid: 'a sandwich or wrap + fruit + yogurt, or pasta salad + cheese + a crunchy side',
        tween: 'a build-your-own wrap or rice bowl with protein, vegetables, and fruit, letting your tween choose and prepare one part',
      };
      return {
        guidance: {
          title: `${stageLabel[stage][0].toUpperCase()}${stageLabel[stage].slice(1)} is picky + you need an easy meal`,
          emoji: '🥪',
          doNow: `Keep it simple: offer ${mealIdeas[stage]}. Include at least one food your child usually accepts and let them decide how much to eat from what is offered.`,
          sayThis: 'Here is your meal. You can choose what and how much to eat from what is here.',
          avoidThis: 'Avoid making a separate meal for each person or turning this meal into a negotiation.',
          afterward: 'Save this easy meal for next time. A simple, low-stress meal is a real meal.',
        },
        deepDive: [],
      };
    }

    // COMBINATION: fighting + need to get something done
    if (problem === 'fighting' && (constraint === 'get-done' || constraint === 'cook')) {
      return {
        guidance: {
          title: 'Kids are fighting + you need to get something done',
          emoji: '🥊',
          doNow: `Stop unsafe behavior, separate the children if needed, and set them up in two different spots with simple activities. Then start your task with frequent check-ins.`,
          sayThis: 'I will not let you hurt each other. You can play here, and your sibling can play over there. I am right in the kitchen and I will check on you.',
          avoidThis: 'Avoid trying to mediate the full conflict while you are also trying to cook or work. Safety first, resolution later.',
          afterward: 'Once your task is done and everyone is calm, help them name what happened and practice what to try next time.',
        },
        deepDive: [
          { heading: 'Separate and supervise', body: 'When children are fighting and you need to get something done, the goal is safety and separation, not a full conflict-resolution conversation. Two different spots with simple activities buys you 10–15 minutes.' },
        ],
      };
    }

    // COMBINATION: no energy + child needs something to do
    if (constraint === 'no-energy' && (problem === 'bored' || problem === 'meltdown' || !problem)) {
      const picked = pickActivityForStage(stage, 'lowest-effort');
      if (picked) {
        return {
          guidance: {
            title: `No energy + your ${stageLabel[stage]} needs something to do`,
            emoji: picked.emoji,
            doNow: `${picked.description} This takes about ${picked.time} and needs almost no effort from you.`,
            sayThis: 'Here is something you can do right here. I am going to sit nearby and rest for a minute.',
            avoidThis: 'Avoid feeling like you need to entertain or teach right now. An independent activity is enough.',
            afterward: 'When you have a little more energy, try one of the other activity ideas. For now, rest is part of good parenting too.',
          },
          deepDive: [],
        };
      }
    }

    // SINGLE PROBLEM: illness / not feeling well
    if (problem === 'health') {
      const isTeething = /teeth|tooth|teething/.test(lower);
      if (isTeething) {
        return {
          guidance: {
            title: 'Take it easy while they are teething', emoji: '🦷',
            doNow: 'Lower the bar for today. If your child is tired or uncomfortable, let them rest and keep the day quiet. Offer fluids appropriate for their age, familiar foods as tolerated, and simple comfort. Teething can disrupt sleep and make a child fussier.',
            sayThis: 'Your mouth is sore. We can slow down, cuddle, drink, and rest.',
            avoidThis: 'Do not feel pressure to keep the normal activity schedule. Do not assume fever or diarrhea is from teething; those symptoms can have another cause.',
            afterward: 'As your child feels better, return to the usual routine. If symptoms are significant, persistent, or your child seems ill, check with your pediatrician.',
            thenTry: 'For children old enough for it, a chilled (not rock-hard frozen) teether or clean cool washcloth and gentle gum massage can be soothing. Keep fluids easy to reach and let your child rest when tired.',
            contactParent: 'Call your pediatrician if you are concerned, if your child develops fever, significant diarrhea, worsening symptoms, or seems unusually unwell.'
          },
          deepDive: [],
        };
      }
      return {
        guidance: {
          title: 'Take it easy while they are not feeling well', emoji: '🛋️',
          doNow: 'Make today a lower-pressure day. Prioritize comfortable rest, fluids appropriate for your child, simple food as tolerated, and watching how they are breathing, drinking, waking, and acting. Let them sleep more when they are tired instead of trying to keep the usual pace.',
          sayThis: 'You do not have to keep up today. Let us rest and take care of what your body needs.',
          avoidThis: 'Do not force bed rest when your child is awake and comfortable, but do not push a normal activity schedule when they clearly feel unwell either.',
          afterward: 'Return to the usual routine gradually as they improve. If your child is getting worse or something feels off, contact their healthcare professional.',
          thenTry: 'Set up an easy recovery spot with fluids, a simple snack, a blanket, books, a quiet show, or a favorite comfort item. Keep the day intentionally small.',
          contactParent: 'Seek urgent medical care for severe breathing difficulty, inability to wake normally, or signs of severe dehydration.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: hitting
    if (problem === 'hitting') {
      return {
        guidance: {
          title: 'Stop the unsafe behavior first', emoji: '🛑',
          doNow: 'Block the hit or kick, create space, and keep your words short and calm.',
          sayThis: 'I will not let you hurt anyone. I will help you.',
          avoidThis: 'Avoid hitting back, threatening, or giving a long lecture during the moment.',
          afterward: 'Once everyone is calm, name the feeling and practice the safer replacement.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: jealous/sibling
    if (problem === 'jealous') {
      return {
        guidance: {
          title: 'Lead with connection', emoji: '💛',
          doNow: 'Acknowledge the feeling, protect everyone\'s safety, and give your older child a small predictable moment of focused attention.',
          sayThis: 'It is hard when the baby gets my attention. You still have a special place with me.',
          avoidThis: 'Avoid shaming jealousy or making the older child responsible for caring for the baby.',
          afterward: 'Look for a few small one-on-one moments today rather than trying to make everything feel equal.'
        },
        deepDive: allDeepDiveBySituation.jealous ?? [],
      };
    }

    // SINGLE PROBLEM: sleep (no constraint)
    if (problem === 'sleep') {
      return {
        guidance: {
          title: 'Make the next sleep step boring and simple', emoji: '😴',
          doNow: 'Lower stimulation, return to the usual routine, and keep your response calm and brief.',
          sayThis: 'It is time to rest. I am here to help you settle.',
          avoidThis: 'Avoid adding a brand-new routine or endless negotiations tonight.',
          afterward: 'If the problem keeps happening, look at the whole daily sleep pattern rather than one difficult night.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: food (no constraint)
    if (problem === 'food') {
      return {
        guidance: {
          title: 'Make the next food decision easier', emoji: '🍎',
          doNow: 'Offer a familiar food alongside the rest of the meal and let your child decide whether and how much to eat from what is offered.',
          sayThis: 'You can choose what and how much to eat from what is here.',
          avoidThis: 'Avoid turning this meal into a negotiation or making a separate meal every time food is refused.',
          afterward: 'Keep the next meal or snack predictable and try again without pressure.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: potty
    if (problem === 'potty') {
      return {
        guidance: {
          title: 'Keep the potty moment low-pressure', emoji: '🚽',
          doNow: 'Stay neutral, help your child get cleaned up if needed, and return to the normal bathroom routine.',
          sayThis: 'Accidents happen. We can clean up and try again.',
          avoidThis: 'Avoid shame, punishment, or turning the bathroom into a power struggle.',
          afterward: 'Look for patterns such as constipation, distraction, or long stretches between bathroom opportunities.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: fighting (no constraint)
    if (problem === 'fighting') {
      return {
        guidance: {
          title: 'Stop the fighting and keep everyone safe', emoji: '🥊',
          doNow: 'Separate if needed, stop hitting or grabbing, and help everyone calm down before solving the problem.',
          sayThis: 'I will not let you hurt each other. We can solve it when bodies are calm.',
          avoidThis: 'Avoid deciding who is the bad guy while everyone is upset.',
          afterward: 'Help each child name what they wanted and practice a safer response.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: transition (leaving a place)
    if (problem === 'transition') {
      return {
        guidance: {
          title: 'Help with a difficult transition', emoji: '🚪',
          doNow: `Give the goodbye a clear ending instead of repeatedly asking if they are ready to leave. Get close to your ${stageLabel[stage]} and say, "I know you want to stay. It is time to go now. Do you want to give one big hug or two little hugs before we leave?" Then follow through calmly.`,
          sayThis: 'I know you want to stay. It is time to go now. You can choose how we say goodbye.',
          avoidThis: 'Avoid repeating "are you ready?" or negotiating the leaving. A clear, kind boundary is easier for your child than endless asking.',
          afterward: 'Next time, give a 5-minute warning before the transition and create a predictable goodbye ritual. Tell me what your child does when you try to leave — crying, refusing, hiding, or a full meltdown — and I will help with that specific part.'
        },
        deepDive: [
          { heading: 'Why leaving is hard', body: 'Leaving someone they love or a place they enjoy can be genuinely hard. A predictable goodbye and a small choice can give your child some control without changing the boundary.' },
          { heading: 'What helps next time', body: 'A 5-minute warning, a consistent goodbye ritual, and a small choice about how to leave (not whether to leave) all reduce the power struggle over time.' },
        ],
      };
    }

    // SINGLE PROBLEM: screen-time transition
    if (problem === 'screen') {
      return {
        guidance: {
          title: 'Help with a screen-time transition', emoji: '📱',
          doNow: `Give one clear warning, then turn it off calmly and immediately offer the next activity. Say to your ${stageLabel[stage]}, "Screen time is finished. You can choose books or blocks next." Then hold the boundary even if there is a meltdown.`,
          sayThis: 'Screen time is finished. You can choose what to do next.',
          avoidThis: 'Avoid adding extra minutes because of a meltdown. The limit being consistent is what makes it easier over time.',
          afterward: 'Keep a consistent daily media window rather than negotiating each time. Tell me whether the struggle is mostly at turning it off or at avoiding it entirely, and I will tailor the next step.'
        },
        deepDive: [
          { heading: 'Why screens are hard to leave', body: 'Screens are designed to keep attention. Turning one off feels like a drop in stimulation, which is why children react strongly. A ready next activity and a consistent limit help their brain adjust.' },
          { heading: 'What builds easier transitions', body: 'A visible timer, a warning before the limit, and a ready next activity all help. The key is that the limit is predictable and consistent, not negotiated each time.' },
        ],
      };
    }

    // SINGLE PROBLEM: listening / cooperation
    if (problem === 'listening') {
      return {
        guidance: {
          title: 'Help with cooperation and listening', emoji: '👂',
          doNow: `Get close to your ${stageLabel[stage]}, get on their level, and give one clear, simple direction. Say it once, then wait. If your child does not respond, calmly follow through without repeating or escalating.`,
          sayThis: 'I need you to do this. I will help you if you need it.',
          avoidThis: 'Avoid calling instructions from across the room or repeating yourself many times. Proximity and one clear request work better than escalating words.',
          afterward: 'Notice and name it when your child does cooperate. Tell me what you are asking and what happens when you do, and I will help with that specific situation.'
        },
        deepDive: [
          { heading: 'Why connection first', body: 'When a child is not cooperating, getting close and connecting briefly before giving the direction helps their nervous system stay regulated. A child who feels connected is more able to cooperate.' },
          { heading: 'Why one clear request works', body: 'Repeating instructions trains a child to wait for the fifth or sixth repetition before responding. One clear request, delivered close and calmly, teaches them to listen the first time.' },
        ],
      };
    }

    // SINGLE PROBLEM: routine (dressed/leave)
    if (problem === 'routine') {
      return {
        guidance: {
          title: 'Give one clear next step', emoji: '🚪',
          doNow: `Connect first, then give your ${stageLabel[stage]} one clear expectation and a small choice when appropriate.`,
          sayThis: 'It is time to get ready. You can choose which part we do first.',
          avoidThis: 'Avoid turning the routine into a power struggle or a long negotiation.',
          afterward: 'Use predictable routines and transition warnings next time.'
        },
        deepDive: [],
      };
    }

    // SINGLE PROBLEM: bored (no constraint) — suggest an activity
    if (problem === 'bored') {
      const picked = pickActivityForStage(stage, null);
      if (picked) {
        return {
          guidance: {
            title: picked.title, emoji: picked.emoji,
            doNow: `${picked.description} This takes about ${picked.time}.`,
            sayThis: 'Let\'s do this one thing together.',
            avoidThis: 'Avoid feeling like you need to make it elaborate.',
            afterward: `This should take about ${picked.time.toLowerCase()}.`
          },
          deepDive: [],
        };
      }
    }

    // SMART FALLBACK: make a reasonable interpretation and help immediately
    return {
      guidance: {
        title: 'Start with connection, then hold the boundary', emoji: '💛',
        doNow: `Get close to your ${stageLabel[stage]} and give one clear, simple direction. Connect first — a brief touch or acknowledging word — then state what needs to happen. Say it once and wait. If your ${stageLabel[stage]} resists, hold the boundary calmly without repeating or escalating.`,
        sayThis: 'I hear you. Here is what we need to do right now. I will help you with it.',
        avoidThis: 'Avoid repeating the same instruction many times or turning it into a negotiation. One clear request, proximity, and a calm follow-through work better than escalating words.',
        afterward: 'Tell me a little more about what is happening — what your child is doing, what you have already tried, and what you need to happen next — and I will give you a more specific next step.'
      },
      deepDive: [
        { heading: 'Why connection first', body: 'When a child is not cooperating, getting close and connecting briefly before giving the direction helps their nervous system stay regulated. A child who feels connected is more able to cooperate.' },
        { heading: 'Why one clear request works', body: 'Repeating instructions trains a child to wait for the fifth or sixth repetition before responding. One clear request, delivered close and calmly, teaches them to listen the first time.' },
      ],
    };
  };

  const handleJustTellMe = () => {
    const text = justTellMeText.trim();
    if (!text) return;
    if (!tryUsePersonalizedHelp()) return;
    const lower = text.toLowerCase();
    const devTopicId = detectDevelopmentTopic(lower);
    if (devTopicId) {
      const topic = getDevelopmentTopic(devTopicId);
      if (topic) {
        const stage = detectStage(lower) ?? selectedAge;
        const devGuidance = topic.guidance[stage] ?? topic.guidance[selectedAge];
        setJustTellMeTitle(text);
        setJustTellMeResult(null);
        setJustTellMeDeepDive([]);
        setJustTellMeDevResult(devGuidance);
        window.setTimeout(() => {
          justTellMeRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 50);
        return;
      }
    }
    const { guidance: rawGuidance, deepDive } = getJustTellMeGuidance(text);
    const justTellMeTraits = isPremium ? (selectedHelpChild?.traits ?? []) : [];
    const guidance = personalizeGuidance(rawGuidance, justTellMeTraits);
    setJustTellMeTitle(text);
    setJustTellMeResult(guidance);
    setJustTellMeDeepDive(deepDive);
    setJustTellMeDevResult(null);
    window.setTimeout(() => {
      justTellMeRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 50);
  };

  const saveJustTellMeResult = () => {
    if (!justTellMeResult || !isPremium) return;
    const fullAnswer = {
      doNow: justTellMeResult.doNow,
      sayThis: justTellMeResult.sayThis,
      avoidThis: justTellMeResult.avoidThis,
      afterward: justTellMeResult.afterward,
      deepDive: justTellMeDeepDive,
    };
    saveIdea({
      title: justTellMeResult.title,
      category: 'Caregiver Help',
      emoji: justTellMeResult.emoji,
      description: justTellMeResult.doNow,
      meta: `Just tell me · ${justTellMeTitle}`,
      helpNowFull: fullAnswer,
    });
  };

  const saveJustTellMeDevResult = () => {
    if (!justTellMeDevResult || !isPremium) return;
    saveIdea({
      title: justTellMeDevResult.title,
      category: 'Development',
      emoji: justTellMeDevResult.emoji,
      description: justTellMeDevResult.whatYouCanDo,
      meta: `Development · ${justTellMeTitle}`,
    });
  };

  const changeAge = (ageId: AgeId) => {
    pushNavHistory();
    setSelectedAge(ageId);
    setSelectedStage(ageId);
    setSelectedSituation(null);
    setSelectedHelp('activities');
    const newActivities = activities.filter((item) => item.ages.includes(ageId));
    if (newActivities.length) setActivity(newActivities[0]);
    setShowAll(false);
    window.setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const changeStage = (stageId: ParentingStageId) => {
    pushNavHistory();
    setSelectedChildForHelp(null);
    setSelectedChildId(null);
    if (stageId === 'expecting' || stageId === 'newparent') {
      setSelectedStage(stageId);
      setSelectedSituation(null);
      setShowAll(false);
      setSelectedHelp(stageId === 'expecting' ? 'expecting-prep' : 'feeding');
      window.setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 100);
    } else {
      changeAge(stageId as AgeId);
    }
  };

  const scrollToActiveContent = (helpId?: string) => {
    // Navigation should feel like a screen change, not a scavenger hunt.
    // Wait for React to commit the selected content, then jump directly to it.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        let target: HTMLElement | null = null;
        if (helpId === 'help-now') {
          target = helpNowRef.current ?? document.querySelector('.help-now-section');
        } else if (helpId === 'activities') {
          target = activityRef.current;
        } else {
          target = contentRef.current;
        }
        if (!target) target = document.querySelector('.topic-section, .guidance-card, .activity-card') as HTMLElement | null;
        if (target) {
          const navOffset = window.innerWidth >= 701 ? 88 : 12;
          const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
          window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
        }
      });
    });
  };

  const openSituation = (situationId: string) => {
    if (!situationList.some((item) => item.id === situationId)) return;
    pushNavHistory();
    setSelectedSituation(situationId);
    setActiveNav('help');

    // A situation choice is an answer request, so land on the answer itself —
    // never back at the top of the games/situation list. Critical SOS guidance
    // gets its own, especially prominent target.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const selector = situationId === 'losing-control-now'
        ? '[data-breezier-days-sos-solution]'
        : '[data-breezier-days-solution]';
      const target = document.querySelector(selector) as HTMLElement | null;
      if (target) {
        const navOffset = window.innerWidth >= 701 ? 88 : 12;
        const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
      } else {
        scrollToActiveContent(selectedHelp);
      }
    }));
  };

  const openDevelopmentTopic = (topicId: string) => {
    closeCompetingViews();
    pushNavHistory();
    setSelectedDevTopic(topicId);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = contentRef.current ?? document.querySelector('.topic-section');
      if (target instanceof HTMLElement) {
        const navOffset = window.innerWidth >= 701 ? 88 : 12;
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - navOffset), left: 0, behavior: 'auto' });
      }
    }));
  };

  const selectHelp = (helpId: string) => {
    closeCompetingViews();
    // Don't create another history entry when a user taps the same destination again.
    if (helpId !== selectedHelp || selectedSituation !== null) pushNavHistory();
    setSelectedHelp(helpId);
    setSelectedSituation(null);
    setShowAll(false);
    setSelectedDevTopic(null);
    if (helpId !== 'activities') setActivitySelectionMessage('');

    if (helpId === 'help-now' || helpId === 'health' || helpId === 'development' || helpId === 'bullying' || helpId === 'feelings' || helpId === 'potty' || helpId === 'sleep' || helpId === 'siblings') {
      setActiveNav('help');
    } else if (helpId === 'activities' || helpId === 'mealtime') {
      setActiveNav('explore');
    }

    scrollToActiveContent(helpId);
  };

  const openExploreHub = () => {
    pushNavHistory();
    // Explore is a library of everything Breezier Days can do. It replaces the
    // older behavior of sending users straight into Learning, which made
    // many useful features hard to discover.
    closeCompetingViews();
    setSelectedHelp('');
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setActiveNav('explore');
    setShowExploreHub(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = exploreHubRef.current;
        if (target) {
          const navOffset = window.innerWidth >= 701 ? 88 : 12;
          const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
          window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
        }
      });
    });
  };

  const openDayPlanner = () => {
    closeCompetingViews();
    setActiveNav('explore');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.querySelector('.day-plan-section') as HTMLElement | null;
        if (target) {
          const navOffset = window.innerWidth >= 701 ? 88 : 12;
          const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
          window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
        }
      });
    });
  };

  const openTakingOver = () => {
    closeCompetingViews();
    setActiveNav('explore');
    setShowTakingOver(true);
  };

  const openLearning = () => {
    pushNavHistory();
    closeCompetingViews();
    setSelectedHelp('');
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setActiveNav('explore');
    setShowLearning(true);
    setShowLearningFilters(false);
    setSelectedLearningActivity(null);
    if (selectedHelpChild) {
      setLearningAge(getChildGuidanceAge(selectedHelpChild.age));
    } else {
      setLearningAge(selectedAge);
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      learningRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }));
  };


  const openMealSituation = (situationId: string) => {
    setShowPremiumModal(false);
    closeCompetingViews();
    setActiveNav('explore');
    setSelectedHelp('mealtime');
    setSelectedDevTopic(null);
    setSelectedSituation(situationId);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = document.querySelector('[data-breezier-days-solution]') as HTMLElement | null;
      if (target) {
        const navOffset = window.innerWidth >= 701 ? 88 : 12;
        const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
      } else {
        scrollToActiveContent('mealtime');
      }
    }));
  };

  const saveLearningActivity = (act: LearningActivity) => {
    const catLabel = learningCategories.find(c => c.id === act.category)?.label ?? act.category;
    saveIdea({
      title: act.title,
      category: 'Learning',
      emoji: act.emoji,
      description: act.learning,
      meta: `${catLabel} · ${act.time} · ${act.ages.join('/')}`,
    });
  };

  const generateLearningPlan = (templateId?: string) => {
    if (isFeatureLocked('learning-plans')) {
      unlockPremium('learning-plans');
      return;
    }
    const child = selectedHelpChild;
    const ageId = child ? getChildGuidanceAge(child.age) : learningAge;
    const traits = isPremium ? (child?.traits ?? []) : [];
    const plan = templateId
      ? buildLearningPlanFromTemplate(templateId, ageId, traits, child?.name, child?.id ?? null)
      : buildLearningPlan(ageId, traits, child?.name, child?.id ?? null);
    if (plan) {
      pushNavHistory();
      setCurrentLearningPlan(plan);
      setSelectedPlanDay(null);
    }
  };

  const saveLearningPlan = () => {
    if (!currentLearningPlan) return;
    setSavedLearningPlans(prev => [currentLearningPlan, ...prev.filter(p => p.id !== currentLearningPlan.id)]);
  };

  const deleteSavedLearningPlan = (planId: string) => {
    setSavedLearningPlans(prev => prev.filter(p => p.id !== planId));
  };

  const openSavedLearningPlan = (plan: LearningPlan) => {
    pushNavHistory();
    setCurrentLearningPlan(plan);
    setSelectedPlanDay(null);
  };

  const filteredLearningActivities = (() => {
    const filtered = learningActivities.filter((act) => {
      if (!act.ages.includes(learningAge)) return false;
      if (learningCategory !== 'all' && act.category !== learningCategory) return false;
      if (learningTime !== 'all' && act.time !== learningTime) return false;
      if (learningLocation !== 'all' && act.location !== learningLocation && act.location !== 'Both') return false;
      if (learningEnergy !== 'all' && act.energy !== learningEnergy) return false;
      if (learningPrep !== 'all' && act.prep !== learningPrep) return false;
      return true;
    });
    if (filtered.length > 0) return filtered;
    if (learningCategory !== 'all') {
      const categoryFallback = learningActivities.filter((act) => act.ages.includes(learningAge) && act.category === learningCategory);
      if (categoryFallback.length) return categoryFallback;
    }
    // Never leave the learning screen empty just because a combination of
    // filters is too narrow. Show the closest age-matched options instead.
    return learningActivities.filter((act) => act.ages.includes(learningAge)).slice(0, 12);
  })();

  // Always open the app at the top. Disable browser/URL scroll restoration so
  // Start every fresh app session at the top. Do not run a repeating scroll
  // loop here because that can fight legitimate in-app navigation.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    try { window.history.scrollRestoration = 'manual'; } catch {}
    try { html.style.scrollBehavior = 'auto'; } catch {}
    try { html.style.overflowAnchor = 'none'; } catch {}
    try { body.style.overflowAnchor = 'none'; } catch {}

    const resetTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      html.scrollTop = 0;
      body.scrollTop = 0;
    };

    resetTop();
    const timers = [0, 120].map(ms => window.setTimeout(resetTop, ms));
    const onPageShow = () => window.setTimeout(resetTop, 0);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener('pageshow', onPageShow);
      try { html.style.overflowAnchor = ''; body.style.overflowAnchor = ''; } catch {}
    };
  }, []);
  // Navigation scrolling is handled by the individual actions. There is no
  // global smooth-scroll effect so entering Help Now cannot compete with a
  // large React render.

  useEffect(() => {
    setSleepNeedsCheck({ active: false, step: 0, answers: {}, completed: false });
  }, [selectedSituation]);

  useEffect(() => {
    try {
      window.localStorage.setItem('parenting-app-children', JSON.stringify(children));
    } catch {}
    schedulePush();
  }, [children]);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-handoff', JSON.stringify(handoff));
    } catch {}
    schedulePush();
  }, [handoff]);

  useEffect(() => {
    if (!remoteData) return;
    const signature = getRemoteDataSignature(remoteData);
    if (signature && signature === remoteDataSignatureRef.current) return;
    if (signature) remoteDataSignatureRef.current = signature;

    if (Array.isArray(remoteData.children)) {
      const nextChildren = (remoteData.children as ChildProfile[]).map((child) => ({
        ...child,
        reminders: Array.isArray(child.reminders) ? child.reminders : [],
        savedHelp: Array.isArray(child.savedHelp) ? child.savedHelp : [],
        development: Array.isArray(child.development) ? child.development : [],
        traits: Array.isArray(child.traits) ? child.traits : [],
        aboutChild: child.aboutChild ?? { enjoys: '', whatWorks: '', workedBefore: '', makesHarder: '', anythingElse: '' },
        pickyEating: child.pickyEating ?? { safeFoods: '', learningFoods: '', avoidTextures: '', mealtimeNotes: '' },
      }));
      setChildren(prev => getRemoteDataSignature(prev) === getRemoteDataSignature(nextChildren) ? prev : nextChildren);
    }
    if (Array.isArray(remoteData.savedIdeas)) {
      const next = remoteData.savedIdeas as SavedIdea[];
      setSavedIdeas(prev => getRemoteDataSignature(prev) === getRemoteDataSignature(next) ? prev : next);
    }
    if (Array.isArray(remoteData.savedDayPlans)) {
      const next = remoteData.savedDayPlans as SavedDayPlan[];
      setSavedDayPlans(prev => getRemoteDataSignature(prev) === getRemoteDataSignature(next) ? prev : next);
    }
    if (Array.isArray(remoteData.savedLearningPlans)) {
      const next = remoteData.savedLearningPlans as LearningPlan[];
      setSavedLearningPlans(prev => getRemoteDataSignature(prev) === getRemoteDataSignature(next) ? prev : next);
    }
    if (typeof remoteData.personalizedHelpUsage === 'number') setPersonalizedHelpUsage(prev => Math.max(prev, remoteData.personalizedHelpUsage as number));
    if (typeof remoteData.selectedChildForHelp === 'number') setSelectedChildForHelp(prev => prev === remoteData.selectedChildForHelp ? prev : remoteData.selectedChildForHelp as number);

    const remoteHandoff = (remoteData as typeof remoteData & {
      handoff?: Partial<typeof emptyHandoff>;
    }).handoff;
    if (remoteHandoff && typeof remoteHandoff === 'object') {
      setHandoff(current => {
        const next = {
          ...current,
          ...Object.fromEntries(Object.entries(remoteHandoff).filter(([, value]) => value !== null && value !== undefined && value !== '')),
        };
        return getRemoteDataSignature(current) === getRemoteDataSignature(next) ? current : next;
      });
    }
  }, [remoteData]);

  // Recover from browser back/forward cache and retry sync when connectivity returns.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) { window.location.reload(); return; }
      if (navigator.onLine) schedulePush();
    };
    const handleOnline = () => schedulePush();
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [schedulePush]);

  // Surface unexpected async errors instead of leaving the app looking frozen.
  useEffect(() => {
    const handleError = () => setRuntimeError('Something went wrong. You can refresh Breezier Days without clearing your saved data.');
    const handleRejection = () => setRuntimeError('Something went wrong. You can refresh Breezier Days without clearing your saved data.');
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-saved-ideas', JSON.stringify(savedIdeas));
    } catch {}
    schedulePush();
  }, [savedIdeas]);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-saved-day-plans', JSON.stringify(savedDayPlans));
    } catch {}
    schedulePush();
  }, [savedDayPlans]);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-day-routines', JSON.stringify(dayRoutines));
    } catch {}
    schedulePush();
  }, [dayRoutines]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('littlewise-learning-plans');
      if (stored) setSavedLearningPlans(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-learning-plans', JSON.stringify(savedLearningPlans));
    } catch {}
    schedulePush();
  }, [savedLearningPlans]);

  useEffect(() => {
    try {
      window.localStorage.setItem('breezier-days-personalized-help-month', new Date().toISOString().slice(0, 7));
      window.localStorage.setItem('breezier-days-personalized-help-usage', String(personalizedHelpUsage));
    } catch {}
  }, [personalizedHelpUsage]);

  useEffect(() => {
    try {
      window.localStorage.setItem('littlewise-little-wins', JSON.stringify(littleWins));
    } catch {}
    schedulePush();
  }, [littleWins]);

  useEffect(() => {
    try {
      if (selectedChildForHelp !== null) {
        window.localStorage.setItem('littlewise-selected-child', String(selectedChildForHelp));
      } else {
        window.localStorage.removeItem('littlewise-selected-child');
      }
    } catch {}
    schedulePush();
  }, [selectedChildForHelp]);

  useEffect(() => {
    if (selectedChildForHelp !== null) {
      const child = children.find(c => c.id === selectedChildForHelp);
      if (child) {
        const ageId = getChildGuidanceAge(child.age);
        setSelectedAge(ageId);
        setSelectedStage(ageId);
        setLearningAge(ageId);
        const parentOnlyHelps = ['feeding', 'newparent-care', 'newparent-leave', 'newparent-crying'];
        if (parentOnlyHelps.includes(selectedHelp)) {
          setSelectedHelp('activities');
          setSelectedSituation(null);
        }
        if (currentLearningPlan && isPremium) {
          const traits = isPremium ? (child.traits ?? []) : [];
          setCurrentLearningPlan(buildLearningPlan(ageId, traits, child.name, child.id));
        }
      }
    }
  }, [selectedChildForHelp, children]);

  const unlockPremium = (_featureId?: PremiumFeatureId) => {
    setPremiumModalFeature(_featureId ?? null);
    setShowPremiumModal(true);
  };

  const activatePremium = async () => {
    setCheckoutError(null);
    setTermsAccepted(false);
    setShowCheckoutConfirm(true);
  };

  const applyPremiumStatus = (remote: boolean, currentPeriodEnd?: string | null, cancelAtPeriodEnd?: boolean) => {
    setIsPremium(remote);
    setCancelAtPeriodEnd(Boolean(cancelAtPeriodEnd));
    setPremiumUntil(currentPeriodEnd ?? null);
  };

  const refreshPremiumFromServer = async () => {
    if (!premiumUser) return { ok: false, isPremium: false };
    try {
      const result = await checkPremiumStatus();
      if (premiumUserIdRef.current !== premiumUser.id) return { ok: false, isPremium: false };
      if (result.error) return { ok: false, isPremium: false };
      applyPremiumStatus(result.isPremium, result.currentPeriodEnd, result.cancelAtPeriodEnd);
      return { ok: true, isPremium: result.isPremium };
    } catch { return { ok: false, isPremium: false }; }
  };

  const restorePurchases = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const result = await refreshPremiumFromServer();
      setCheckoutLoading(false);
      if (result.ok && result.isPremium) {
        setShowPremiumSuccess(true);
        return;
      }
      if (!result.ok) {
        setCheckoutError('We could not verify your Premium subscription right now. Please check your connection and try again.');
        return;
      }
      setCheckoutError('No active Premium subscription was found for this account. Sign in with the email address you used when subscribing.');
    } catch {
      setCheckoutLoading(false);
      setCheckoutError('Something went wrong. Please check your internet connection and try again.');
    }
  };

  const confirmCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { url, error } = await createCheckoutSession();
      setCheckoutLoading(false);
      if (error) {
        setCheckoutError(error);
        return;
      }
      if (!url) {
        setCheckoutError('Something went wrong creating your checkout session. Please try again.');
        return;
      }
      setShowCheckoutConfirm(false);
      setTermsAccepted(false);
      const win = window.open(url, '_blank');
      if (!win) {
        setCheckoutError('Your browser blocked the checkout window. Please allow popups for this site, or use this link: ' + url);
      }
    } catch {
      setCheckoutLoading(false);
      setCheckoutError('Something went wrong. Please check your internet connection and try again.');
    }
  };

  const manageSubscription = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { url, error } = await createPortalSession();
      setCheckoutLoading(false);
      if (error) {
        setCheckoutError(error);
        return;
      }
      if (!url) {
        setCheckoutError('Something went wrong opening the subscription manager. Please try again.');
        return;
      }
      const win = window.open(url, '_blank');
      if (!win) {
        setCheckoutError('Your browser blocked the subscription manager window. Please allow popups for this site, or use this link: ' + url);
        return;
      }
      const poll = window.setInterval(() => {
        if (win.closed) {
          window.clearInterval(poll);
          void refreshPremiumStatus();
        }
      }, 500);
    } catch {
      setCheckoutLoading(false);
      setCheckoutError('Something went wrong. Please check your internet connection and try again.');
    }
  };

  const refreshPremiumStatus = async () => {
    await refreshPremiumFromServer();
  };

  const submitPremiumAuth = async () => {
    const email = premiumAuthEmail.trim();
    if (!email || !premiumAuthPassword) {
      setPremiumAuthMessage('Enter your email address and password.');
      return;
    }
    setCheckoutLoading(true);
    setPremiumAuthMessage(null);
    const result = premiumAuthMode === 'sign-in'
      ? await signInToPremium(email, premiumAuthPassword)
      : await createPremiumAccount(email, premiumAuthPassword);
    setCheckoutLoading(false);
    if (result.error) { setPremiumAuthMessage(result.error); return; }
    if ('confirmationRequired' in result && result.confirmationRequired) {
      setPremiumAuthMode('sign-in');
      setPremiumAuthPassword('');
      setPremiumAuthMessage('Check your email and confirm your account, then sign in here.');
      return;
    }
    if (result.user) {
      setPremiumUser(result.user);
      setPremiumAuthPassword('');
      setPremiumAuthMessage(null);
    }
  };

  const isFeatureLocked = (featureId: PremiumFeatureId): boolean => {
    if (isPremium) return false;
    if (featureId === 'multi-child') return false;
    return true;
  };

  const checkSavedIdeaLimit = (): boolean => {
    if (isPremium) return true;
    if (savedIdeas.length < FREE_SAVED_IDEA_LIMIT) return true;
    unlockPremium('unlimited-saved');
    return false;
  };

  const tryUseHelpNow = (): boolean => true;

  const tryUsePersonalizedHelp = (): boolean => {
    if (isPremium) return true;
    if (personalizedHelpUsage >= FREE_PERSONALIZED_HELP_LIMIT) {
      unlockPremium('unlimited-help-now');
      return false;
    }
    setPersonalizedHelpUsage(count => count + 1);
    return true;
  };


  const addChild = () => {
    if (!childName.trim() || !childAge) return;
    const child: ChildProfile = { id: Date.now(), name: childName.trim(), age: childAge, notes: [], reminders: [], savedHelp: [], development: [], traits: [], aboutChild: { enjoys: '', whatWorks: '', workedBefore: '', makesHarder: '', anythingElse: '' }, dailyLog: { date: new Date().toISOString().slice(0, 10), wakeTime: '', napTime: '', meals: '', mood: '', potty: '', note: '' } };
    setChildren(current => [...current, child]);
    setSelectedChildId(child.id);
    setSelectedChildForHelp(child.id);
    const ageId = getChildGuidanceAge(childAge);
    setSelectedAge(ageId);
    setSelectedStage(ageId);
    setLearningAge(ageId);
    setChildName(''); setChildAge(''); setShowChildForm(false);
  };

  const addNote = () => {
    if (selectedChildId === null || !newChildNote.trim()) return;
    const note: ChildNote = { id: Date.now(), text: newChildNote.trim(), createdAt: new Date().toLocaleDateString() };
    setChildren(current => current.map(child =>
      child.id === selectedChildId ? { ...child, notes: [note, ...child.notes] } : child
    ));
    setNewChildNote('');
  };

  const deleteNote = (noteId: number) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId ? { ...child, notes: child.notes.filter(note => note.id !== noteId) } : child
    ));
  };

  const toggleTrait = (trait: TemperamentTrait) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child => {
      if (child.id !== selectedChildId) return child;
      const has = child.traits.includes(trait);
      if (trait === 'a-mix') {
        return { ...child, traits: has ? [] : ['a-mix'] };
      }
      const withoutMix = child.traits.filter(t => t !== 'a-mix');
      return { ...child, traits: has ? withoutMix.filter(t => t !== trait) : [...withoutMix, trait] };
    }));
  };

  const updateDailyLog = (field: keyof Omit<DailyChildLog, 'date'>, value: string) => {
    if (selectedChildId === null) return;
    const today = new Date().toISOString().slice(0, 10);
    setChildren(current => current.map(child => {
      if (child.id !== selectedChildId) return child;
      const existing = child.dailyLog ?? { date: today, wakeTime: '', napTime: '', meals: '', mood: '', potty: '', note: '' };
      const base = existing.date === today ? existing : { ...existing, date: today, wakeTime: '', napTime: '', meals: '', mood: '', potty: '', note: '' };
      return { ...child, dailyLog: { ...base, [field]: value } };
    }));
  };

  const updateAboutChild = (field: keyof AboutChild, value: string) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? { ...child, aboutChild: { ...child.aboutChild, [field]: value } }
        : child
    ));
  };

  const deleteChild = (id: number) => {
    setChildren(current => current.filter(child => child.id !== id));
    if (selectedChildId === id) setSelectedChildId(null);
    if (selectedChildForHelp === id) setSelectedChildForHelp(null);
  };

  const scrollToChildProfile = (childId: number) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    pushNavHistory();
    setSelectedChildId(childId);
    setSelectedChildForHelp(childId);
    const ageId = getChildGuidanceAge(child.age);
    setSelectedAge(ageId);
    setSelectedStage(ageId);
    setLearningAge(ageId);
    setShowChildSwitcher(false);
    const doScroll = () => {
      const el = toolsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - 16;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
    };
    window.setTimeout(doScroll, 120);
    window.setTimeout(doScroll, 350);
  };


  const selectedHelpChild = children.find((child) => child.id === selectedChildForHelp) ?? null;

  const effectiveGuidanceAge = selectedHelpChild
    ? getChildGuidanceAge(selectedHelpChild.age)
    : selectedAge;

  const childTraits = isPremium ? (selectedHelpChild?.traits ?? []) : [];
  const rawGuidance = currentSituation?.guidance?.[effectiveGuidanceAge];

  // Always provide complete, usable guidance. Some older situations only have
  // part of the Guidance shape, so never render an empty advice block.
  const baseGuidance: Guidance | null = currentSituation ? {
    title: rawGuidance?.title?.trim() || currentSituation.title,
    emoji: rawGuidance?.emoji || currentSituation.emoji,
    doNow: rawGuidance?.doNow?.trim() || 'Take the next safe, simple step and focus on what is happening right now.',
    sayThis: rawGuidance?.sayThis?.trim() || 'We can take this one step at a time.',
    avoidThis: rawGuidance?.avoidThis?.trim() || 'Avoid trying to solve everything at once.',
    afterward: rawGuidance?.afterward?.trim() || 'If the concern continues or you are unsure what to do, reach out to an appropriate healthcare or parenting professional.',
    thenTry: rawGuidance?.thenTry?.trim() || undefined,
    ifNotWorking: rawGuidance?.ifNotWorking?.trim() || undefined,
    keepBusy: rawGuidance?.keepBusy?.trim() || undefined,
    contactParent: rawGuidance?.contactParent?.trim() || undefined,
  } : null;

  const currentGuidance: Guidance | null = baseGuidance
    ? applyAboutChild(
        applyCaregiverFeeling(personalizeGuidance(baseGuidance, childTraits), caregiverFeeling),
        selectedHelpChild?.aboutChild,
      )
    : null;
  const currentDeepDive = currentSituation && currentGuidance
    ? (allDeepDiveBySituation[currentSituation.id] ?? fallbackDeepDive())
    : [];

  const currentPremiumHelp: PremiumHelpNow | null = currentSituation && currentGuidance
    ? (allPremiumHelpNowBySituation[currentSituation.id] ?? null)
    : null;

  const isSleepOrNapSituation = currentSituation?.id === 'sleep-now' || currentSituation?.id === 'nap-now';

  type SleepNeedQuestion = {
    id: string;
    label: string;
    yesHint: string;
    noHint?: string;
    ages?: AgeId[];
    napOnly?: boolean;
    sleepOnly?: boolean;
  };

  const sleepNeedQuestions: SleepNeedQuestion[] = [
    { id: 'hunger', label: 'Could they be hungry or thirsty?', yesHint: 'Offer a small snack or a drink of water, then try again. Hunger and thirst are common sleep blockers that are easy to overlook.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'diaper', label: 'Does their diaper need changing, or do they need the bathroom?', yesHint: 'Take care of that first. A wet diaper or a full bladder makes it nearly impossible to settle.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'temperature', label: 'Are they too hot, too cold, or physically uncomfortable?', yesHint: 'Adjust the room temperature, add or remove a layer, and check for anything scratchy or uncomfortable in their sleep space.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'illness', label: 'Are they showing signs of illness, pain, or teething?', yesHint: 'Address the discomfort first. Check for fever, congestion, or teething pain. If your child seems unwell, contact your healthcare professional before focusing on sleep.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'overstimulation', label: 'Have they had a lot of stimulation, screens, or excitement recently?', yesHint: 'Their nervous system needs time to wind down. Move to a dim, quiet space and allow at least 15 to 20 minutes of calm before trying again.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'overtired', label: 'Have they been awake longer than usual for their age?', yesHint: 'They may be overtired, which makes settling harder, not easier. Try moving the next sleep time 15 to 30 minutes earlier tomorrow.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'undertired', label: 'Could they not be tired enough yet?', yesHint: 'They may simply not be ready. Try again in 20 to 30 minutes rather than forcing it now.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
    { id: 'connection', label: 'Might they be seeking connection, reassurance, or comfort?', yesHint: 'A brief, calm moment of connection can help. Try a short cuddle, a quiet story, or a familiar comfort item. Keep it brief and boring so it does not turn into a long interaction.', ages: ['baby', 'toddler', 'preschool', 'bigkid'] },
  ];

  const getRelevantSleepQuestions = (): SleepNeedQuestion[] => {
    if (!currentSituation) return [];
    const isNap = currentSituation.id === 'nap-now';
    return sleepNeedQuestions.filter(q => {
      if (!q.ages?.includes(effectiveGuidanceAge)) return false;
      if (q.napOnly && !isNap) return false;
      if (q.sleepOnly && isNap) return false;
      return true;
    });
  };

  const relevantSleepQuestions = isSleepOrNapSituation ? getRelevantSleepQuestions() : [];
  const currentSleepQuestion = relevantSleepQuestions[sleepNeedsCheck.step];

  const handleSleepNeedAnswer = (answer: 'yes' | 'no' | 'unsure') => {
    if (!currentSleepQuestion) return;
    const newAnswers = { ...sleepNeedsCheck.answers, [currentSleepQuestion.id]: answer };
    const nextStep = sleepNeedsCheck.step + 1;
    if (nextStep >= relevantSleepQuestions.length) {
      setSleepNeedsCheck({ active: true, step: nextStep, answers: newAnswers, completed: true });
    } else {
      setSleepNeedsCheck({ active: true, step: nextStep, answers: newAnswers, completed: false });
    }
  };

  const sleepNeedsResult = (() => {
    if (!sleepNeedsCheck.completed) return null;
    const answers = sleepNeedsCheck.answers;
    const flagged: { label: string; hint: string }[] = [];
    for (const q of relevantSleepQuestions) {
      const a = answers[q.id];
      if (a === 'yes' || a === 'unsure') {
        flagged.push({ label: q.label, hint: q.yesHint });
      }
    }
    if (flagged.length > 0) {
      return {
        type: 'address' as const,
        items: flagged,
      };
    }
    return {
      type: 'ready' as const,
      isNap: currentSituation?.id === 'nap-now',
    };
  })();

  const currentDevTopic = selectedDevTopic ? getDevelopmentTopic(selectedDevTopic) : null;
  const currentDevGuidance: DevelopmentGuidance | null = currentDevTopic
    ? (currentDevTopic.guidance[effectiveGuidanceAge] ?? currentDevTopic.guidance[selectedAge])
    : null;


  const handleRefine = () => {
    if (!justTellMeResult || !refineContext) return;
    const contextNote = refineContextNotes[refineContext];
    const traits = isPremium ? (selectedHelpChild?.traits ?? []) : [];
    const traitTip = traits.length
      ? ' ' + traits.map(t => dayPlanTraitTips[t]).filter(Boolean).join(' ')
      : '';
    const refined: Guidance = {
      ...justTellMeResult,
      doNow: `${justTellMeResult.doNow}\n\nBecause they may be ${refineContextOptions.find(o => o.id === refineContext)?.label.toLowerCase()}: ${contextNote}${traitTip}`,
      afterward: `${justTellMeResult.afterward}\n\nNext step: Watch what shifts after you address the ${refineContext === 'not-sure' ? 'body first — food, rest, or a calm moment' : refineContextOptions.find(o => o.id === refineContext)?.label.toLowerCase()}. Adjust your response based on what changes.`,
    };
    setRefinedResult(refined);
  };

  const saveDayRoutine = () => {
    if (!isPremium || !routineLabel.trim()) return;
    const child = selectedHelpChild ?? children[0] ?? null;
    const meta: DayRoutineMemory = {
      id: Date.now(),
      label: routineLabel.trim(),
      days: routineDays.trim() || 'As needed',
      time: routineTime.trim() || 'Flexible',
      duration: routineDuration.trim() || '—',
      prepMinutes: routinePrepMinutes.trim() || '0',
      travelMinutes: routineTravelMinutes.trim() || '0',
      childId: child?.id ?? null,
      emoji: '📅',
    };
    setDayRoutines(prev => [meta, ...prev.filter(r => !(r.label.toLowerCase() === meta.label.toLowerCase() && r.childId === meta.childId))]);
    setRoutineLabel(''); setRoutineDays(''); setRoutineTime(''); setRoutineDuration(''); setRoutinePrepMinutes(''); setRoutineTravelMinutes('');
  };

  const deleteDayRoutine = (id: number) => setDayRoutines(prev => prev.filter(r => r.id !== id));

  const applyRoutineToDay = (routine: DayRoutineMemory) => {
    const eventType: DayEventType = routine.label.toLowerCase().includes('gym') ? 'gymnastics' : routine.label.toLowerCase().includes('school') || routine.label.toLowerCase().includes('preschool') ? 'preschool' : 'custom';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setDayEvents(prev => [...prev.filter(e => !(e.label.trim().toLowerCase() === routine.label.trim().toLowerCase() && (e.dayOffset ?? 0) === dayPlanSelectedDay)), { id, type: eventType, label: routine.label, time: routine.time, dayOffset: dayPlanSelectedDay }]);
  };

  const addDayEvent = (type: DayEventType) => {
    const meta = dayEventTypes.find(t => t.id === type)!;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const label = type === 'custom' ? (dayEventInput.trim() || 'Custom event') : meta.label;
    setDayEvents(prev => [...prev, { id, type, label, time: dayEventTime.trim(), dayOffset: dayPlanSelectedDay }]);
    setDayEventInput('');
    setDayEventTime('');
  };

  const removeDayEvent = (id: string) => {
    setDayEvents(prev => prev.filter(e => e.id !== id));
  };

  const routineAppliesToDay = (days: string, offset: number): boolean => {
  const normalized = days.trim().toLowerCase();
  if (!normalized || normalized === 'as needed' || normalized === 'flexible') return false;
  if (/(every\s*day|daily|each\s*day)/i.test(normalized)) return true;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const full = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const short = full.slice(0, 3);
  if (/weekdays?/i.test(normalized)) return !['saturday', 'sunday'].includes(full);
  if (/weekends?/i.test(normalized)) return ['saturday', 'sunday'].includes(full);
  return normalized.split(/[,/&]+/).some(token => {
    const t = token.trim().replace(/\.$/, '');
    return t === full || t === short || full.startsWith(t) || t.startsWith(short) && t.length <= 4;
  });
};

const parseRoutineDurationMinutes = (value: string): number => {
  const text = value.trim().toLowerCase();
  if (!text) return 60;
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);
  if (hourMatch) return Math.max(15, Math.round(parseFloat(hourMatch[1]) * 60));
  const minuteMatch = text.match(/(\d+)\s*(?:minutes?|mins?)/);
  if (minuteMatch) return Math.max(15, parseInt(minuteMatch[1], 10));
  const number = parseInt(text, 10);
  return Number.isFinite(number) ? Math.max(15, number) : 60;
};

const routineLooksLikeRest = (label: string): boolean =>
  /\b(nap|sleep|quiet\s*time|rest\s*time|quiet\s*rest)\b/i.test(label);

const getDayLabel = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDayLabelFull = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (offset === 0) return `Today (${weekday}, ${monthDay})`;
    if (offset === 1) return `Tomorrow (${weekday}, ${monthDay})`;
    return `${weekday}, ${monthDay}`;
  };

  const buildDayEventPlan = () => {
    const child = selectedHelpChild ?? children[0];
    const ageId = child ? getChildGuidanceAge(child.age) : selectedAge;
    const traits = child?.traits ?? [];

    // Recurring routines are part of the family's real schedule, not optional filler.
    // Pull matching routines into the selected day automatically so parents never have
    // to re-enter preschool, gymnastics, nap/quiet time, commute, etc.
    const recurringEvents: DayEvent[] = dayRoutines
      .filter(r => (r.childId === null || r.childId === child?.id) && routineAppliesToDay(r.days, dayPlanSelectedDay))
      .map(r => ({
        id: `routine-${r.id}-${dayPlanSelectedDay}`,
        type: r.label.toLowerCase().includes('gym') ? 'gymnastics' as DayEventType
          : r.label.toLowerCase().includes('school') || r.label.toLowerCase().includes('preschool') ? 'preschool' as DayEventType
          : routineLooksLikeRest(r.label) ? 'custom' as DayEventType
          : 'custom' as DayEventType,
        label: r.label + (routineLooksLikeRest(r.label) ? ' · protected' : ''),
        time: r.time,
      }));

    const manualEvents = dayEvents.filter(e =>
      !e.id.startsWith('routine-') && (e.dayOffset ?? 0) === dayPlanSelectedDay
    );
    const combinedEvents = [...manualEvents];
    for (const recurring of recurringEvents) {
      const duplicate = combinedEvents.some(e =>
        e.label.trim().toLowerCase() === recurring.label.replace(' · protected', '').trim().toLowerCase() &&
        e.time.trim().toLowerCase() === recurring.time.trim().toLowerCase()
      );
      if (!duplicate) combinedEvents.push(recurring);
    }

    const flexibleRoutineEvents = combinedEvents.filter(event => {
      const routine = dayRoutines.find(r => event.id.startsWith(`routine-${r.id}-`));
      return routine && /^(flexible|as needed|whenever|when needed)$/i.test(routine.time.trim());
    });
    const timedEvents = combinedEvents.filter(event => !flexibleRoutineEvents.includes(event));
    const eventsWithTimes = timedEvents
      .map(event => {
        const routine = dayRoutines.find(r => event.id.startsWith(`routine-${r.id}-`));
        const parsed = parseTimeRange(event.time);
        const fallback = parsed ?? defaultEventTimes[event.type];
        const duration = routine ? parseRoutineDurationMinutes(routine.duration) : fallback.end - fallback.start;
        const prep = routine ? parseInt(routine.prepMinutes || '0', 10) || 0 : 0;
        const travel = routine ? parseInt(routine.travelMinutes || '0', 10) || 0 : 0;
        const protectedStart = routine ? Math.max(0, fallback.start - prep - travel) : fallback.start;
        return { event, start: protectedStart, end: Math.max(fallback.end, fallback.start + duration), routine };
      })
      .sort((a, b) => a.start - b.start);

    const fillerDefaults: Record<string, { start: number; duration: number }> = {
      midmorning: { start: 9 * 60, duration: 150 },
      lunch: { start: 11 * 60 + 30, duration: 60 },
      nap: { start: 12 * 60 + 30, duration: 120 },
      afternoon: { start: 15 * 60, duration: 90 },
      dinner: { start: 17 * 60, duration: 60 },
      evening: { start: 18 * 60 + 30, duration: 90 },
    };

    const suggestions: DayEventSuggestion[] = [];
    let currentTime = 7 * 60;
    const addedFillers = new Set<string>();

    // Flexible recurring routines are real commitments, but they are intentionally
    // not assigned an invented clock time. Show them as a flexible anchor instead.
    if (flexibleRoutineEvents.length) {
      flexibleRoutineEvents.forEach(event => {
        const routine = dayRoutines.find(r => event.id.startsWith(`routine-${r.id}-`));
        const durationText = routine?.duration && routine.duration !== '—' ? ` · about ${routine.duration}` : '';
        suggestions.push({
          phase: routineLooksLikeRest(event.label) ? 'nap' : 'afternoon',
          label: event.label.replace(' · protected', '') + ' · flexible',
          emoji: routine?.emoji ?? '📅',
          items: [
            'This routine is flexible, so Breezier Days will not invent a start time for it.',
            routineLooksLikeRest(event.label)
              ? 'Protect the need for rest while letting the exact timing follow your child and the day.'
              : 'Fit it into the day when it naturally makes sense, without crowding out family time.',
          ],
          timeRange: `Flexible today${durationText}`,
        });
      });
    }

    const addSuggestion = (phase: DayEventSuggestion['phase'], label: string, emoji: string, items: string[], start: number, end: number) => {
      if (end <= start) return;
      suggestions.push({ phase, label, emoji, items, timeRange: formatTimeRange(start, end) });
    };

    const addParentConnectionBlock = (start: number, end: number) => {
      if (end - start < 20) return;
      const blockEnd = Math.min(end, start + 60);
      addSuggestion('morning', 'Protected connection time', '💛', [
        'Use this as child time, not catch-up time: get outside, read together, cook together, or simply follow their play.',
        'Keep it ordinary. Breezier Days is prioritizing time together over adding another activity or purchase.',
      ], start, blockEnd);
      currentTime = Math.max(currentTime, blockEnd);
    };

    const addParentWorkBlock = (start: number, end: number, reason: string) => {
      if (end - start < 30) return;
      addSuggestion('afternoon', 'Parent work / life-admin block', '💻', [
        `Use this protected block for work or essential life admin while ${reason}.`,
        'Keep the task bounded to this window. When the block ends, switch back to the kids rather than letting work spread across family time.',
      ], start, end);
    };

    const tryAddFiller = (fillerId: string, maxTime: number): boolean => {
      if (addedFillers.has(fillerId)) return false;
      const def = fillerDefaults[fillerId];
      const start = Math.max(def.start, currentTime);
      if (start >= maxTime) return false;
      const duration = Math.min(def.duration, maxTime - start);
      if (duration < 30) return false;
      const end = start + duration;
      const filler = dayFillerContent[fillerId][ageId];
      suggestions.push({ phase: fillerId as DayEventSuggestion['phase'], label: filler.label, emoji: filler.emoji, items: filler.items, timeRange: formatTimeRange(start, end) });
      currentTime = end;
      addedFillers.add(fillerId);
      return true;
    };

    const firstEventStart = eventsWithTimes.length > 0 ? eventsWithTimes[0].start : 12 * 60;
    const intentLabel = dayPlanIntent === 'independent-play' ? 'independent play' : dayPlanIntent === 'home-reset' ? 'a Home Reset' : dayPlanIntent === 'plan-meal' ? 'planning a meal' : dayPlanIntent === 'rest' ? 'rest for you' : dayPlanIntent === 'accomplish' ? (dayPlanAccomplish.trim() || 'one thing you want to accomplish') : dayPlanIntent === 'nothing' ? 'nothing in particular' : dayPlanIntent === 'lighter' ? 'making the day lighter' : null;
    if (dayPlanIntent === 'independent-play') {
      addSuggestion('morning', 'Let them play', '🧸', [
        'If your child is safe and happily engaged, you do not need to step in or create an activity. Let the play keep going.',
        'You can stay nearby without directing it. Independent play is real family time, too. Nothing needs to be added just because the moment is quiet.',
      ], currentTime, currentTime + 45);
      currentTime += 45;
    } else if (dayPlanIntent === 'home-reset') {
      addSuggestion('morning', 'Home Reset', '🏠', [
        'If your child is safely and happily playing, use this window for one small home reset if that would make the rest of your day feel easier.',
        'Pick one area and stop when the window ends. This is an option, not a new list of chores. If the house can wait, let it wait.',
      ], currentTime, currentTime + 15);
      currentTime += 15;
    } else if (dayPlanIntent === 'plan-meal') {
      addSuggestion('morning', 'Plan a Meal', '🍽️', [
        'Use this quiet window to figure out one meal without interrupting your child’s independent play.',
        'Start with what you already have when possible. The goal is less mental load, not another project.',
      ], currentTime, currentTime + 15);
      currentTime += 15;
    } else if (dayPlanIntent === 'rest') {
      addSuggestion('morning', 'A little time to rest', '☕', [
        'If your child is safely playing, resting is allowed. Sit down, have a drink, breathe, or simply do nothing for a few minutes.',
        'This is not a missed opportunity to be productive. You are allowed to recharge.',
      ], currentTime, currentTime + 30);
      currentTime += 30;
    } else if (dayPlanIntent === 'accomplish' && dayPlanAccomplish.trim()) {
      addSuggestion('afternoon', 'One thing you want to accomplish', '🎯', [
        `Focus on: ${dayPlanAccomplish.trim()}. Keep it small enough to finish or make meaningful progress in one protected window.`,
        'If the kids are awake and need you, pause it. Breezier Days should help you make room for life — not make you choose work over your children. You do not need to fill every open minute with a task.',
      ], currentTime, currentTime + 45);
      currentTime += 45;
    } else if (dayPlanIntent === 'nothing') {
      addSuggestion('morning', 'Nothing planned', '🌿', [
        'Leave this time open. Your child can play, you can sit with them, or you can simply see where the day goes.',
        'A day does not need to be filled to be a good day.',
      ], currentTime, currentTime + 45);
      currentTime += 45;
    } else if (dayPlanIntent === 'lighter') {
      addSuggestion('morning', 'Make today lighter', '🌿', [
        'Keep the commitments that truly matter and let the rest breathe. You do not need to replace anything you remove.',
        'If your child is happily playing, leave that time open. Simple meals, unfinished chores, and ordinary afternoons are allowed.',
      ], currentTime, currentTime + 30);
      currentTime += 30;
    }
    const morningEnd = Math.min(8 * 60 + 30, Math.max(currentTime, firstEventStart - 30));
    if (morningEnd > currentTime) {
      addParentConnectionBlock(currentTime, morningEnd);
      if (currentTime < morningEnd) currentTime = morningEnd;
    }

    for (const ewt of eventsWithTimes) {
      const data = dayEventSuggestionsByType[ewt.event.type];
      const beforeBlockStart = ewt.start - 30;

      if (beforeBlockStart > currentTime) {
        // If the gap is created by a childcare block, give the parent useful work time;
        // otherwise preserve it for connection/free play instead of filling it with chores.
        const isChildcare = /preschool|school|grandma|babysitter|childcare/i.test(ewt.event.label);
        if (isChildcare && beforeBlockStart - currentTime >= 30) {
          addParentWorkBlock(currentTime, beforeBlockStart, 'your child is in care');
          currentTime = beforeBlockStart;
        } else {
          tryAddFiller('midmorning', beforeBlockStart);
          tryAddFiller('lunch', beforeBlockStart);
          if (currentTime < beforeBlockStart) {
            const filler = dayFillerContent.morning[ageId];
            const ordinaryMomentItems = [
              ...filler.items,
              'Nothing special is required here. If everyone is doing well, let the ordinary moment stay ordinary.',
              'Try one tiny connection if it feels natural — sit nearby, share a snack, step outside, or notice what your child is doing. Otherwise, leave the space alone.'
            ];
            addSuggestion('morning', 'Open family time', '🌿', ordinaryMomentItems, currentTime, beforeBlockStart);
            currentTime = beforeBlockStart;
          }
        }
      }

      // Recurring nap/quiet-time blocks are hard constraints. Never place a family
      // activity, work block, or generic filler inside them.
      if (ewt.routine && routineLooksLikeRest(ewt.event.label)) {
        if (currentTime < ewt.start) {
          addParentWorkBlock(currentTime, ewt.start, 'your child is still settling into the next protected routine');
        }
        currentTime = Math.max(currentTime, ewt.start);
        addSuggestion('during', ewt.event.label, '😴', [
          'Treat this as protected rest/quiet time. Do not schedule another child activity inside it.',
          'If your child sleeps, this is an appropriate window for focused work, a necessary task, or genuine rest — not a requirement to be productive.',
        ], ewt.start, ewt.end);
        currentTime = ewt.end;
        continue;
      }

      const actualBeforeStart = Math.max(beforeBlockStart, currentTime);
      if (actualBeforeStart < ewt.start) {
        addSuggestion('before', `Before: ${ewt.event.label}`, '🌅', data.before, actualBeforeStart, ewt.start);
      }
      currentTime = Math.max(currentTime, ewt.start);
      addSuggestion('during', ewt.event.label, '⭐', data.during, ewt.start, ewt.end);
      currentTime = ewt.end;

      const afterEnd = ewt.end + 60;
      if (afterEnd > currentTime) {
        addSuggestion('after', `After: ${ewt.event.label}`, '🌤️', data.after, ewt.end, afterEnd);
        currentTime = afterEnd;
      }
    }

    // Explicit nap/quiet routines win over the generic nap filler. When the parent
    // asks to make the day lighter, do not refill open space with extra activities.
    const hasProtectedRest = eventsWithTimes.some(e => e.routine && routineLooksLikeRest(e.event.label));
    if (!dayPlanIntent || dayPlanIntent !== 'lighter') {
      if (!hasProtectedRest) tryAddFiller('nap', 16 * 60);
      tryAddFiller('midmorning', 12 * 60);
      tryAddFiller('lunch', 14 * 60);
      tryAddFiller('afternoon', 18 * 60);
      tryAddFiller('dinner', 19 * 60);
    } else {
      // Preserve only the most useful meal anchor; everything else stays open.
      tryAddFiller('lunch', 14 * 60);
      tryAddFiller('dinner', 19 * 60);
    }

    // Working-parent principle: if the child is in a recurring care block or protected
    // nap, concentrate work there. Outside those windows, prefer connection/free play.
    const careBlocks = eventsWithTimes.filter(e => /preschool|school|grandma|babysitter|childcare/i.test(e.event.label));
    if (careBlocks.length === 0 && !hasProtectedRest) {
      const workReminder = 'If you need to work today, protect your existing childcare/nap windows rather than carving work out of family time.';
      suggestions.push({ phase: 'evening', label: 'Working-parent note', emoji: '💛', items: [workReminder, 'When the kids are awake and available, let that time be family time whenever you can.'], timeRange: 'Flexible' });
    }

    if (!addedFillers.has('evening')) {
      const def = fillerDefaults.evening;
      const start = Math.max(def.start, currentTime);
      const end = start + def.duration;
      const filler = dayFillerContent.evening[ageId];
      const eveningItems = [...filler.items, 'No extra activity is needed tonight. If the family is tired, a simple meal, a little connection, and an early wind-down are enough.'];
      suggestions.push({ phase: 'evening', label: filler.label, emoji: filler.emoji, items: eveningItems, timeRange: formatTimeRange(start, end) });
    }

    const traitTips = traits.length ? traits.map(t => dayPlanTraitTips[t]).filter(Boolean) : [];
    traitTips.push(dayEventAgeAdjust[ageId]);
    if (dayPlanIntent === 'lighter') {
      traitTips.push('Make room for enough: keep real commitments, leave some time unfilled, and do not feel pressure to replace what you skip.');
    } else if (combinedEvents.length <= 2) {
      traitTips.push('You may already have enough planned. Open time is useful too — if everyone is doing well, there is no need to add another activity.');
    }
    traitTips.push('Breezier Days protects real family time: recurring routines and rest come first, then it uses genuine gaps for focused parent work or simple connection — not a list of chores.');

    const childName = child?.name ?? 'your child';
    const childAgeLabel = child?.age ?? ageGroups.find(a => a.id === ageId)?.label ?? '';
    const eventCount = combinedEvents.length;
    const recurringCount = recurringEvents.length;
    const dayName = getDayLabel(dayPlanSelectedDay);
    const intro = dayPlanIntent === 'lighter'
      ? `Let's make ${dayName} lighter. Your real commitments stay protected, but open time stays open — you do not need to fill it with another activity.`
      : eventCount === 0
        ? `Here is a flexible day plan for ${childName} (${childAgeLabel}) for ${dayName}. It protects family time and avoids turning your day into a productivity checklist.`
        : `Here is a plan for ${childName} (${childAgeLabel}) for ${dayName}, built around ${eventCount === 1 ? 'the 1 event' : `your ${eventCount} events`}${recurringCount ? `, including ${recurringCount} recurring routine${recurringCount === 1 ? '' : 's'}` : ''}. Recurring routines and rest blocks are treated as real commitments, then the remaining time is shaped around your family. `;

    setDayEvents(prev => [
      ...prev.filter(e => (e.dayOffset ?? 0) !== dayPlanSelectedDay),
      ...combinedEvents.map(e => ({ ...e, dayOffset: dayPlanSelectedDay })),
    ]);
    setDayEventPlan({ events: combinedEvents.map(e => ({ ...e, dayOffset: dayPlanSelectedDay })), suggestions, traitTips, intro });
    setOpenedSavedDayPlan(null);
    window.setTimeout(() => planMyDayRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 100);
  };

  const saveDayPlan = () => {
    if (!dayEventPlan) return;
    const child = selectedHelpChild ?? children[0] ?? null;
    const dayLabel = dayPlanDayLabel.trim() || getDayLabelFull(dayPlanSelectedDay);
    const saved: SavedDayPlan = {
      id: Date.now(),
      dayLabel,
      savedAt: new Date().toISOString(),
      events: dayEventPlan.events,
      plan: dayEventPlan,
      childId: child?.id ?? null,
      childName: child?.name ?? 'your child',
      childAge: child?.age ?? '',
      traits: child?.traits ?? [],
    };
    setSavedDayPlans(prev => [saved, ...prev]);
  };

  const deleteSavedDayPlan = (id: number) => {
    setSavedDayPlans(prev => prev.filter(p => p.id !== id));
    if (openedSavedDayPlan?.id === id) {
      setOpenedSavedDayPlan(null);
      setDayEventPlan(null);
    }
  };

  const openSavedDayPlan = (plan: SavedDayPlan) => {
    setOpenedSavedDayPlan(plan);
    setDayEvents(plan.events);
    setDayEventPlan(plan.plan);
    setDayPlanDayLabel(plan.dayLabel);
    setDayPlanSelectedDay(0);
    if (plan.childId !== null) {
      const child = children.find(c => c.id === plan.childId);
      if (child) {
        pushNavHistory();
        setSelectedChildForHelp(child.id);
        setSelectedAge(getChildGuidanceAge(child.age));
      }
    }
    window.setTimeout(() => {
      planMyDayRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const reuseSavedDayPlan = (plan: SavedDayPlan) => {
    setDayEvents(plan.events);
    setDayEventPlan(null);
    setOpenedSavedDayPlan(null);
    setDayPlanDayLabel('');
    setDayPlanSelectedDay(0);
    if (plan.childId !== null) {
      const child = children.find(c => c.id === plan.childId);
      if (child) {
        pushNavHistory();
        setSelectedChildForHelp(child.id);
        setSelectedAge(getChildGuidanceAge(child.age));
      }
    }
    window.setTimeout(() => {
      planMyDayRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const makeDayPlanEasier = () => {
    if (!dayEventPlan) return;
    const easierSuggestions = dayEventPlan.suggestions.map(sug => ({
      ...sug,
      items: sug.items.slice(0, 1),
    }));
    setDayEventPlan({
      ...dayEventPlan,
      suggestions: easierSuggestions,
      intro: dayEventPlan.intro + ' This is the simpler version — just the one most important thing in each section.',
    });
  };

  const makeDayPlanMoreSpecific = () => {
    if (!dayEventPlan) return;
    const child = selectedHelpChild ?? children[0] ?? null;
    const ageId = child ? getChildGuidanceAge(child.age) : selectedAge;
    const ageNote = dayEventAgeAdjust[ageId];
    const traits = child?.traits ?? [];
    const traitNotes = traits.map(t => dayEventTraitTips[t]).filter(Boolean);
    setDayEventPlan({
      ...dayEventPlan,
      traitTips: [...traitNotes, ageNote, ...dayEventPlan.traitTips],
      intro: dayEventPlan.intro + ' Added more specific tips based on your child\'s age and temperament.',
    });
  };

  const editDayPlan = () => {
    setDayEventPlan(null);
    setOpenedSavedDayPlan(null);
    window.setTimeout(() => {
      planMyDayRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const startNewDayPlan = () => {
    setDayEvents([]);
    setDayEventPlan(null);
    setOpenedSavedDayPlan(null);
    setDayPlanDayLabel('');
    setDayPlanSelectedDay(0);
    window.setTimeout(() => {
      planMyDayRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const takingOverSituations: { id: string; label: string }[] = [
    { id: 'bored', label: "They're bored" },
    { id: 'fighting', label: "They're fighting" },
    { id: 'meltdown', label: 'Someone is melting down' },
    { id: 'burn-energy', label: 'They need to burn energy' },
    { id: 'quiet', label: 'They need a quiet activity' },
    { id: 'lunch', label: "It's lunchtime" },
    { id: 'snack', label: "It's snack time" },
    { id: 'bedtime', label: "It's almost bedtime" },
    { id: 'leaving', label: 'We need to leave soon' },
    { id: 'baby-crying', label: 'Baby is crying' },
    { id: 'wont-listen', label: "Someone won't listen" },
    { id: 'independent', label: 'I need something they can do independently' },
    { id: 'one-on-one', label: 'I want some one-on-one time' },
    { id: 'just-a-plan', label: 'I just need a plan' },
  ];

  const buildTakingOverPlan = () => {
    const ageId = takingOverAge === 'multiple' ? 'toddler' : takingOverAge;
    const situationMap: Record<string, string> = {
      bored: 'bored-now',
      fighting: 'kids-fighting',
      meltdown: 'meltdown-now',
      'burn-energy': 'burn-energy',
      quiet: 'quiet-activity',
      lunch: 'lunch-now',
      snack: 'snack-now',
      bedtime: 'bedtime-now',
      leaving: 'leaving-now',
      'baby-crying': 'baby-crying',
      'wont-listen': 'wont-listen',
      independent: 'independent-now',
      'one-on-one': 'occupied-now',
      'just-a-plan': 'next-hour',
    };
    const situationId = situationMap[takingOverSituation] || 'next-hour';
    const situation = allHelpNowSituations.find(s => s.id === situationId);
    const guidance = situation?.guidance?.[ageId];
    if (!guidance) { setTakingOverPlan(null); return; }

    const timeLabel = takingOverTime === 'all' ? 'the whole afternoon' : takingOverTime;
    const energyPrefix = takingOverEnergy === 'exhausted'
      ? 'You are exhausted. Keep it simple and low-energy. '
      : takingOverEnergy === 'some'
      ? 'You have some energy. A mix of calm and active works well. '
      : 'You have energy. Make the most of it. ';

    setTakingOverPlan({
      rightNow: `${energyPrefix}${guidance.doNow}`,
      next: guidance.thenTry || guidance.afterward || 'Follow the family routine and keep the next transition in mind.',
      ifNotWorking: guidance.ifNotWorking || 'If things are not working, check hunger, tiredness, or overstimulation. A snack, a change of scenery, or a quiet break can help.',
      keepBusy: guidance.keepBusy || 'Set up a simple activity station with a few safe toys or materials within view.',
      nextTransition: `Plan for ${timeLabel}. Watch for the next natural transition: meal, nap, rest, or leaving. Give a 5-minute warning before any change.`,
    });
  };

  const homeResetAreas: { id: string; label: string; emoji: string }[] = [
    { id: 'quick', label: 'Quick Home Reset', emoji: '🧹' },
    { id: 'toys', label: 'Toy Clutter', emoji: '🧸' },
    { id: 'clothes', label: "Kids' Clothes", emoji: '👕' },
    { id: 'laundry', label: 'Laundry', emoji: '🧺' },
    { id: 'kitchen', label: 'Kitchen Reset', emoji: '🍽️' },
    { id: 'living', label: 'Living Room Reset', emoji: '🛋️' },
    { id: 'playroom', label: 'Playroom Reset', emoji: '🧸' },
    { id: 'entry', label: 'Entryway / Drop Zone', emoji: '🚪' },
    { id: 'declutter', label: 'Decluttering', emoji: '📦' },
    { id: 'whole', label: 'Whole-House Reset', emoji: '🏠' },
  ];

  const homeResetTimeOptions = [5, 10, 15, 30, 60];

  const homeResetData: Record<string, {
    title: string;
    emoji: string;
    startHere: string[];
    ifYouHaveMoreTime: string[];
    kidsCanHelp: { label: string; tasks: string[] }[];
    tips: string[];
  }> = {
    quick: {
      title: 'Quick Home Reset',
      emoji: '🧹',
      startHere: [
        'Put all toys into one basket or bin.',
        'Clear the kitchen counter — put away anything that does not belong.',
        'Start one load of laundry.',
      ],
      ifYouHaveMoreTime: [
        'Wipe down the kitchen table and counters.',
        'Put shoes and bags in their spots by the door.',
        'Run or unload the dishwasher.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put toys in a basket', 'Put clothes in a hamper'] },
        { label: 'Preschoolers', tasks: ['Sort toys by type', 'Wipe the table with a damp cloth'] },
        { label: 'School-age', tasks: ['Tidy their own space', 'Put away clean dishes'] },
      ],
      tips: ['Focus on small wins. You do not need to finish everything.', 'Set a timer for your chosen time and stop when it goes off.'],
    },
    toys: {
      title: 'Toy Clutter',
      emoji: '🧸',
      startHere: [
        'Grab one basket and put all loose toys into it.',
        'Put away the 5 biggest items first.',
        'Clear the floor so you can walk through the room.',
      ],
      ifYouHaveMoreTime: [
        'Sort toys into keep, donate, and throw-away piles.',
        'Rotate toys — put some away in a closet and swap them out later.',
        'Label bins or baskets so everything has a home.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put blocks in a bin', 'Place stuffed animals in a basket'] },
        { label: 'Preschoolers', tasks: ['Sort toys by type', 'Choose 2 toys to put away'] },
        { label: 'School-age', tasks: ['Decide which toys to donate', 'Organize a shelf or bin'] },
      ],
      tips: ['Fewer visible toys means less mess and more focused play.', 'Toy rotation keeps things fresh without buying new toys.'],
    },
    clothes: {
      title: "Kids' Clothes",
      emoji: '👕',
      startHere: [
        'Put all dirty clothes in the hamper.',
        'Put away clean clothes that are sitting out.',
        'Clear the floor of any clothing.',
      ],
      ifYouHaveMoreTime: [
        'Check for clothes that no longer fit and set them aside.',
        'Sort outgrown clothes into keep, donate, or store for a younger sibling.',
        'Organize drawers by type — shirts, pants, pajamas.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put socks in a basket', 'Place dirty clothes in the hamper'] },
        { label: 'Preschoolers', tasks: ['Match socks', 'Put shirts in a drawer with help'] },
        { label: 'School-age', tasks: ['Fold and put away their own clothes', 'Sort outgrown items'] },
      ],
      tips: ['A labeled hamper in every bedroom makes this easier.', 'Keep a donate bag in the closet for outgrown clothes.'],
    },
    laundry: {
      title: 'Laundry',
      emoji: '🧺',
      startHere: [
        'Start one load of laundry.',
        'Clear the floor — put all dirty clothes in the hamper.',
        'If the dryer has clothes, fold or hang them.',
      ],
      ifYouHaveMoreTime: [
        'Put away any clean, folded clothes.',
        'Sort laundry by person so putting away is faster.',
        'Wipe down the washer and dryer tops.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put clothes in the hamper', 'Hand you socks to sort'] },
        { label: 'Preschoolers', tasks: ['Match socks', 'Put their own clothes in a pile'] },
        { label: 'School-age', tasks: ['Fold simple items', 'Put their clothes in their drawer'] },
      ],
      tips: ['One load a day keeps the mountain away.', 'Set a laundry basket in every bedroom.'],
    },
    kitchen: {
      title: 'Kitchen Reset',
      emoji: '🍽️',
      startHere: [
        'Clear the counter — put away anything that does not belong.',
        'Start or unload the dishwasher.',
        'Wipe down the table and counters.',
      ],
      ifYouHaveMoreTime: [
        'Clean the stovetop.',
        'Wipe the outside of the fridge and microwave.',
        'Sweep the floor.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put unbreakables on the counter', 'Wipe the table with a damp cloth'] },
        { label: 'Preschoolers', tasks: ['Put napkins on the table', 'Sort silverware (safe items only)'] },
        { label: 'School-age', tasks: ['Unload the dishwasher (safe items)', 'Wipe counters'] },
      ],
      tips: ['A clear counter makes the whole kitchen feel cleaner.', 'Run the dishwasher at night and unload in the morning.'],
    },
    living: {
      title: 'Living Room Reset',
      emoji: '🛋️',
      startHere: [
        'Put all toys in a basket or bin.',
        'Fold blankets and arrange pillows.',
        'Clear flat surfaces — put away anything that does not belong.',
      ],
      ifYouHaveMoreTime: [
        'Dust shelves and tables.',
        'Vacuum or sweep the floor.',
        'Organize books and magazines.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put toys in a basket', 'Place pillows on the couch'] },
        { label: 'Preschoolers', tasks: ['Stack books', 'Put items in their spot'] },
        { label: 'School-age', tasks: ['Vacuum or sweep', 'Dust surfaces'] },
      ],
      tips: ['A basket in the living room catches toy clutter fast.', 'Reset at the end of the day so the room feels calm in the morning.'],
    },
    playroom: {
      title: 'Playroom Reset',
      emoji: '🧸',
      startHere: [
        'Put all loose toys into bins.',
        'Clear the floor so there is room to play.',
        'Put away the 5 biggest items.',
      ],
      ifYouHaveMoreTime: [
        'Sort and label bins by toy type.',
        'Rotate toys — store some and swap later.',
        'Wipe down tables and surfaces.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put blocks in a bin', 'Place stuffed animals in a basket'] },
        { label: 'Preschoolers', tasks: ['Sort toys by type', 'Help label bins with pictures'] },
        { label: 'School-age', tasks: ['Organize a shelf', 'Decide which toys to donate'] },
      ],
      tips: ['Labeled bins make cleanup faster for everyone.', 'Fewer toys out at once means less mess and better play.'],
    },
    entry: {
      title: 'Entryway / Drop Zone',
      emoji: '🚪',
      startHere: [
        'Put shoes in their spot.',
        'Hang up bags and coats.',
        'Clear the surface — put away keys, mail, and clutter.',
      ],
      ifYouHaveMoreTime: [
        'Sort mail into keep, shred, and recycle.',
        'Wipe the entry surface.',
        'Add a basket for each person\'s things.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put shoes in a spot', 'Place a bag on a hook'] },
        { label: 'Preschoolers', tasks: ['Hang up their coat', 'Put their shoes in a row'] },
        { label: 'School-age', tasks: ['Sort mail', 'Organize their own bag and shoes'] },
      ],
      tips: ['A hook and basket for each person keeps the entry clear.', 'Reset the entry every evening so the morning starts calm.'],
    },
    declutter: {
      title: 'Decluttering',
      emoji: '📦',
      startHere: [
        'Pick one small area — one shelf, one drawer, or one basket.',
        'Sort items into four piles: keep, donate, throw away, and belongs somewhere else.',
        'Put away the keep pile. Put the donate pile in a bag by the door.',
      ],
      ifYouHaveMoreTime: [
        'Take the donate bag to the car.',
        'Throw away the trash pile.',
        'Put items that belong somewhere else in their correct rooms.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Hand you items to sort', 'Put toys in a keep or donate pile'] },
        { label: 'Preschoolers', tasks: ['Choose 2 toys to donate', 'Put items in the right pile'] },
        { label: 'School-age', tasks: ['Decide what to keep or donate', 'Fill a donate bag'] },
      ],
      tips: ['Start small — one basket or one shelf is enough.', 'Keep a donate bag by the door so it actually leaves the house.'],
    },
    whole: {
      title: 'Whole-House Reset',
      emoji: '🏠',
      startHere: [
        'Clear the kitchen counter.',
        'Put all toys into baskets.',
        'Start one load of laundry.',
      ],
      ifYouHaveMoreTime: [
        'Reset the living room — pillows, blankets, and flat surfaces.',
        'Clear the entryway.',
        'Wipe down the bathroom sink and mirror.',
      ],
      kidsCanHelp: [
        { label: 'Toddlers', tasks: ['Put toys in a basket', 'Put clothes in the hamper'] },
        { label: 'Preschoolers', tasks: ['Wipe the table', 'Sort toys'] },
        { label: 'School-age', tasks: ['Tidy their room', 'Help with the kitchen or living room'] },
      ],
      tips: ['Focus on the three most visible areas first.', 'A whole-house reset is about progress, not perfection.'],
    },
  };

  const buildHomeResetPlan = () => {
    if (!homeResetArea) return;
    const data = homeResetData[homeResetArea];
    if (!data) return;

    const energyNote = homeResetEnergy === 'exhausted'
      ? 'You are exhausted. Do only the first task. That is enough.'
      : homeResetEnergy === 'some'
      ? 'You have some energy. Do the first three tasks and stop.'
      : 'You have energy. Do the first three tasks, then keep going if you want.';

    const timeNote = homeResetTime <= 5
      ? 'Focus on one small win. Stop after 5 minutes.'
      : homeResetTime <= 10
      ? 'Focus on the first three tasks. Stop after 10 minutes.'
      : homeResetTime <= 15
      ? 'You have 15 minutes. Do the first three, then start on the extras.'
      : homeResetTime <= 30
      ? 'You have 30 minutes. Do the first three, then work through the extras.'
      : 'You have an hour. Take your time and work through everything.';

    setHomeResetResult({
      title: data.title,
      emoji: data.emoji,
      startHere: data.startHere,
      ifYouHaveMoreTime: data.ifYouHaveMoreTime,
      kidsCanHelp: data.kidsCanHelp,
      tips: [energyNote, timeNote, ...data.tips],
    });
  };

  const saveHomeResetRoutine = () => {
    if (!homeResetResult || !isPremium) return;
    saveIdea({
      title: homeResetResult.title,
      category: 'Home Reset',
      emoji: homeResetResult.emoji,
      description: homeResetResult.startHere.join(' '),
      meta: `Home Reset · ${homeResetTime} min`,
    });
  };

  const openHomeReset = () => {
    pushNavHistory();
    closeCompetingViews();
    setSelectedHelp('');
    setSelectedSituation(null);
    setSelectedDevTopic(null);
    setActiveNav('home');
    setShowHomeReset(true);
    setHomeResetResult(null);
    setHomeResetArea('');
    window.setTimeout(() => {
      homeResetRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 100);
  };

  const addReminder = () => {
    if (isFeatureLocked('real-reminders')) {
      unlockPremium('real-reminders');
      return;
    }
    if (selectedChildId === null || !newReminderTitle.trim()) return;

    if (editingReminderId !== null) {
      setChildren(current => current.map(child =>
        child.id === selectedChildId
          ? {
              ...child,
              reminders: (child.reminders || []).map(r =>
                r.id === editingReminderId
                  ? { ...r, title: newReminderTitle.trim(), notified: false }
                  : r
              )
            }
          : child
      ));
      setEditingReminderId(null);
    } else {
      const reminder: ChildReminder = {
        id: Date.now(),
        title: newReminderTitle.trim(),
        notified: false,
      };

      setChildren(current => current.map(child =>
        child.id === selectedChildId
          ? { ...child, reminders: [...(child.reminders || []), reminder] }
          : child
      ));
    }

    setNewReminderTitle('');
  };

  const startEditReminder = (reminder: ChildReminder) => {
    if (isFeatureLocked('real-reminders')) {
      unlockPremium('real-reminders');
      return;
    }
    setEditingReminderId(reminder.id);
    setNewReminderTitle(reminder.title);
  };

  const cancelEditReminder = () => {
    setEditingReminderId(null);
    setNewReminderTitle('');
  };

  const deleteReminder = (reminderId: number) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? { ...child, reminders: (child.reminders || []).filter(reminder => reminder.id !== reminderId) }
        : child
    ));
  };

  const toggleReminderComplete = (reminderId: number) => {
    if (isFeatureLocked('real-reminders')) {
      unlockPremium('real-reminders');
      return;
    }
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? {
            ...child,
            reminders: (child.reminders || []).map(reminder =>
              reminder.id === reminderId ? { ...reminder, notified: !reminder.notified } : reminder
            )
          }
        : child
    ));
  };


  const getSelectedPickyProfile = (): PickyEatingProfile => selectedHelpChild?.pickyEating ?? { safeFoods: '', learningFoods: '', avoidTextures: '', mealtimeNotes: '' };

  const generateEasyMeals = () => {
    if (!isPremium) { unlockPremium('food-on-hand'); return; }
    const text = premiumKitchenInput.toLowerCase();
    const profile = getSelectedPickyProfile();
    const has = (...words: string[]) => words.some(w => text.includes(w));
    const meals: MealIdea[] = [];

    if (has('chicken thigh', 'chicken thighs', 'thighs')) {
      meals.push({ id: 'slow-chicken-thighs', title: 'Slow-Cooker Chicken Thighs', emoji: '🍗', prepMinutes: 10, method: 'Crockpot', ingredients: ['Chicken thighs', 'Salt + pepper', 'Garlic powder or Italian seasoning', 'Optional: potatoes, carrots, or frozen vegetables'], steps: ['Add chicken thighs to the slow cooker and season.', 'Add potatoes/carrots if using.', 'Cook on low until the chicken is cooked through and tender.', 'Shred or serve whole with a familiar side.'], kidTip: 'For a cautious eater, serve the chicken separately with one food they already reliably eat.', pickyFit: profile.safeFoods.trim() ? `Good fit because you can pair it with a safe food: ${profile.safeFoods.split(',')[0].trim()}.` : 'Keep one familiar food on the plate alongside the chicken.' });
    }
    if (has('chicken', 'turkey', 'ham', 'beef', 'meatballs')) {
      meals.push({ id: 'easy-quesadilla', title: 'Easy Protein Quesadilla', emoji: '🌮', prepMinutes: 10, method: 'Skillet', ingredients: [has('chicken') ? 'Cooked chicken' : 'Your cooked protein', 'Tortilla', 'Cheese'], steps: ['Put protein and cheese on half the tortilla.', 'Fold and cook in a skillet until warm and crisp.', 'Cut into small strips or triangles.'], kidTip: 'Serve the filling lightly or keep some plain cheese pieces if that is more familiar.', pickyFit: 'A familiar tortilla and melted cheese can make the new protein feel less intimidating.' });
    }
    if (has('pasta', 'rice', 'potato', 'potatoes', 'bread', 'tortilla', 'cheese', 'yogurt', 'fruit')) {
      meals.push({ id: 'simple-bowl', title: 'Build-a-Plate Dinner', emoji: '🍽️', prepMinutes: 8, method: 'No-fuss plate', ingredients: ['One carb you have', 'One protein or dairy food', 'One fruit or vegetable'], steps: ['Choose one familiar base.', 'Add a protein or dairy food.', 'Add a fruit or vegetable you already have.', 'Serve the components separately if that makes eating easier.'], kidTip: 'Nothing has to be mixed together. Separate foods are often easier for selective eaters.', pickyFit: 'This lets the child interact with each food without requiring a bite of the new one.' });
    }
    if (!meals.length) {
      meals.push({ id: 'simple-plate', title: 'Simple Dinner Plate', emoji: '🥣', prepMinutes: 10, method: 'No-fuss plate', ingredients: ['One protein you have', 'One familiar carb', 'One fruit or vegetable'], steps: ['Pick one thing your child reliably eats.', 'Add a protein and produce if available.', 'Keep everything separate and serve a small amount of anything new.'], kidTip: 'You do not need a new recipe tonight — use what is already working.', pickyFit: profile.safeFoods.trim() ? `Start with a safe food: ${profile.safeFoods.split(',')[0].trim()}.` : 'Use one reliable food as the anchor of the meal.' });
    }
    setPremiumMealIdeas(meals.slice(0, 3));
    setSelectedMealIdea(null);
  };

  const saveMealIdea = (meal: MealIdea) => {
    if (!isPremium) { unlockPremium('unlimited-saved'); return; }
    saveIdea({
      title: meal.title, category: 'Meal', emoji: meal.emoji,
      description: meal.steps[0],
      meta: `${meal.method} · ${meal.prepMinutes} min prep`,
      meal,
    });
    setSelectedMealIdea(meal);
  };

  const openSavedMeal = (item: SavedIdea) => {
    if (item.meal) {
      setSelectedMealIdea(item.meal);
      setPremiumModalFeature('food-on-hand');
      setPremiumKitchenIdeas([]);
      setShowPremiumModal(true);
    }
  };

  const savePickyProfile = () => {
    if (!isPremium || selectedChildForHelp === null) return;
    setChildren(current => current.map(child => child.id === selectedChildForHelp ? { ...child, pickyEating: pickyProfileDraft } : child));
  };

  const loadPickyProfile = () => setPickyProfileDraft(getSelectedPickyProfile());

  const saveIdea = (idea: Omit<SavedIdea, 'id' | 'savedAt'>) => {
    if (!checkSavedIdeaLimit()) return;
    const dedupeKey = `${idea.title}::${idea.category}`;
    setSavedIdeas(current => [
      { ...idea, id: Date.now(), savedAt: new Date().toLocaleDateString() },
      ...current.filter(item => !(item.title === idea.title && item.category === idea.category)),
    ]);
    setRecentlySavedAnswer(prev => new Set(prev).add(dedupeKey));
    setSavedAnswerToast(true);
    if (savedAnswerTimeoutRef.current) window.clearTimeout(savedAnswerTimeoutRef.current);
    savedAnswerTimeoutRef.current = window.setTimeout(() => {
      setSavedAnswerToast(false);
      setRecentlySavedAnswer(prev => {
        const next = new Set(prev);
        next.delete(dedupeKey);
        return next;
      });
    }, 2500);
  };

  const removeSavedIdea = (savedId: number) => {
    setSavedIdeas(current => current.filter(item => item.id !== savedId));
  };

  const saveCurrentHelp = () => {
    if (!currentGuidance || !isPremium) return;
    const helpCategory: SavedIdea['category'] = selectedHelp === 'mealtime' ? 'Meal' : 'Caregiver Help';
    const childId = selectedHelpChild ? selectedHelpChild.id : (selectedChildId !== null ? selectedChildId : null);
    const ageLabel = selectedHelpChild ? selectedHelpChild.age : (currentAge?.label ?? selectedAge);
    const fullAnswer = {
      doNow: currentGuidance.doNow,
      sayThis: currentGuidance.sayThis,
      thenTry: currentGuidance.thenTry,
      ifNotWorking: currentGuidance.ifNotWorking,
      keepBusy: currentGuidance.keepBusy,
      contactParent: currentGuidance.contactParent,
      avoidThis: currentGuidance.avoidThis,
      afterward: currentGuidance.afterward,
      deepDive: currentDeepDive,
    };
    const metaParts = [helpCategory === 'Meal' ? 'Meal idea' : 'Practical next step'];
    if (currentSituation) metaParts.push(currentSituation.title);
    metaParts.push(ageLabel);
    saveIdea({
      title: currentGuidance.title,
      category: helpCategory,
      emoji: currentGuidance.emoji || currentSituation?.emoji || '💛',
      description: currentGuidance.doNow,
      meta: metaParts.join(' · '),
      helpNowId: currentSituation?.id,
      helpNowAge: effectiveGuidanceAge,
      helpNowChildId: childId,
      helpNowFull: fullAnswer,
    });

    if (childId !== null) {
      const saved: SavedHelp = { id: Date.now(), title: currentGuidance.title, category: selectedHelp || 'Help', savedAt: new Date().toLocaleDateString() };
      setChildren(current => current.map(child => child.id === childId ? { ...child, savedHelp: [ ...(child.savedHelp || []).filter(item => item.title !== saved.title), saved ] } : child));
    }
  };

  const saveCurrentActivity = () => {
    saveIdea({ title: activity.title, category: 'Activity', emoji: activity.emoji, description: activity.description, meta: `${activity.time} · ${activity.category}` });
  };

  const saveDevelopmentHelp = () => {
    if (!currentDevGuidance) return;
    saveIdea({
      title: currentDevGuidance.title,
      category: 'Development',
      emoji: currentDevGuidance.emoji,
      description: currentDevGuidance.whatYouCanDo,
      meta: 'Development & Milestones',
    });
    if (selectedChildId !== null) {
      const saved: SavedHelp = { id: Date.now(), title: currentDevGuidance.title, category: 'Development', savedAt: new Date().toLocaleDateString() };
      setChildren(current => current.map(child => child.id === selectedChildId ? { ...child, savedHelp: [ ...(child.savedHelp || []).filter(item => item.title !== saved.title), saved ] } : child));
    }
  };


  const removeSavedHelp = (savedId: number) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? { ...child, savedHelp: (child.savedHelp || []).filter(item => item.id !== savedId) }
        : child
    ));
  };


  const developmentActivitiesByAge: Record<string, Omit<DevelopmentActivity, 'id' | 'completed'>[]> = {
    baby: [
      { title: 'Talk and respond', area: '💬 Communication', description: 'Talk, sing, and respond to your baby\'s sounds and expressions.' },
      { title: 'Tummy-time play', area: '🏃 Physical', description: 'Offer supervised floor time with a favorite toy just within reach.' },
      { title: 'Copy my face', area: '💛 Social & Emotional', description: 'Make simple facial expressions and pause so your baby can watch and respond.' },
      { title: 'Find the toy', area: '🧩 Thinking', description: 'Partly hide a favorite toy and let your baby look for it.' },
    ],
    toddler: [
      { title: 'Name and find', area: '💬 Communication', description: 'Name familiar objects and ask your child to find or point to them.' },
      { title: 'Mini obstacle course', area: '🏃 Physical', description: 'Use pillows or safe household objects to make a simple movement course.' },
      { title: 'Practice taking turns', area: '💛 Social & Emotional', description: 'Take turns rolling a ball or adding pieces to a simple activity.' },
      { title: 'Sort by color', area: '🧩 Thinking', description: 'Sort safe everyday objects into simple color groups together.' },
    ],
    preschool: [
      { title: 'Tell a silly story', area: '💬 Communication', description: 'Take turns adding one sentence at a time to a made-up story.' },
      { title: 'Balance challenge', area: '🏃 Physical', description: 'Try walking along a safe line or stepping between floor markers.' },
      { title: 'Feelings practice', area: '💛 Social & Emotional', description: 'Name feelings in books or everyday situations and talk about what might help.' },
      { title: 'Pattern play', area: '🧩 Thinking', description: 'Make a simple pattern with blocks, toys, or other safe objects.' },
    ],
    bigkid: [
      { title: 'Ask a why question', area: '💬 Communication', description: 'Pick something interesting and explore it together with open-ended questions.' },
      { title: 'Active challenge', area: '🏃 Physical', description: 'Choose a safe movement challenge such as jumping, throwing, or balancing.' },
      { title: 'Problem-solving together', area: '💛 Social & Emotional', description: 'Talk through a small everyday conflict and brainstorm possible solutions.' },
      { title: 'Build and explain', area: '🧩 Thinking', description: 'Build something with blocks or household materials and ask your child to explain the plan.' },
    ],
    tween: [
      { title: 'Explain your thinking', area: '💬 Communication', description: 'Ask your child to explain how they reached an answer, made a choice, or solved a problem.' },
      { title: 'Independent movement', area: '🏃 Physical', description: 'Let your child choose a physical activity they enjoy — walking, biking, sports, stretching, or outdoor play.' },
      { title: 'Talk through a real problem', area: '💛 Social & Emotional', description: 'Use an everyday conflict to practice perspective-taking, boundaries, repair, and choosing what to try next.' },
      { title: 'Learn something by choice', area: '🧩 Thinking', description: 'Let your child choose a question or topic and spend a few minutes researching, building, reading, or experimenting with it.' },
    ],
  };

  const developmentAge = selectedHelpChild
    ? getChildGuidanceAge(selectedHelpChild.age)
    : null;

  const developmentSuggestions = developmentAge
    ? developmentActivitiesByAge[developmentAge]
    : [];

  const addDevelopmentActivity = (activity: Omit<DevelopmentActivity, 'id' | 'completed'>) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? {
            ...child,
            development: [
              ...(child.development || []),
              { ...activity, id: Date.now(), completed: false }
            ]
          }
        : child
    ));
  };

  const toggleDevelopmentActivity = (activityId: number) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? {
            ...child,
            development: (child.development || []).map(activity =>
              activity.id === activityId
                ? { ...activity, completed: !activity.completed }
                : activity
            )
          }
        : child
    ));
  };

  const removeDevelopmentActivity = (activityId: number) => {
    if (selectedChildId === null) return;
    setChildren(current => current.map(child =>
      child.id === selectedChildId
        ? {
            ...child,
            development: (child.development || []).filter(activity => activity.id !== activityId)
          }
        : child
    ));
  };


  const legalContent = {
    privacy: {
      title: 'Privacy Policy',
      body: (
        <>
          <p><strong>Last updated: August 26, 2026</strong></p>
          <p>
            Breezier Days is designed for adults who are parents or caregivers. It is not directed
            to children, does not provide child accounts, and should be used by an adult.
          </p>
          <h3>Information stored by the current app</h3>
          <p>
            Breezier Days stores child profile information, notes, saved ideas,
            development activities, and parenting tools in browser storage on your device. The app
            does not include an analytics SDK, advertising SDK, or third-party database connection
            for these fields. Payment processing is handled securely by Stripe.
          </p>
          <p>
            Because the app runs as a website, the hosting provider and browser may still process
            ordinary technical information needed to deliver the site, such as network requests,
            IP addresses, device/browser information, or security logs. Review the final hosting
            provider's privacy practices before launch and update this policy if the production
            architecture adds analytics, accounts, cloud storage, payments, advertising, or other
            third-party services.
          </p>
          <h3>Children's information</h3>
          <p>
            Breezier Days is intended for parents and caregivers to enter information about their
            own children or children they care for. Do not allow a child to create an account,
            submit information directly, or use the service independently. If the production
            service ever collects personal information directly from children under 13, separate
            children's privacy and parental-consent requirements may apply.
          </p>
          <h3>Health and sensitive information</h3>
          <p>
            Do not enter diagnoses, medical records, detailed medical histories, Social Security
            numbers, insurance numbers, or other highly sensitive information into notes. The
            current app is designed to minimize collection of sensitive information and provides
            general educational information rather than medical care.
          </p>
          <h3>How we use and share information</h3>
          <p>
            Breezier Days uses locally stored information to provide the features you
            request, such as personalized guidance, saved ideas, development tracking, and parenting tools.
            Breezier Days does not sell or share these stored child-profile fields for
            advertising. Any future use of analytics, advertising, cloud storage, or other
            third-party services will be disclosed before those services are enabled.
          </p>
          <h3>Deletion</h3>
          <p>
            You can delete child data from the app, and the current deletion control removes the
            child-profile data stored by Breezier Days in this browser. You can also clear this site's
            browser storage. Saved Ideas are stored separately and can be managed in the app.
          </p>
          <p className="legal-note">
            This policy is for informational purposes and is not legal advice. Have a
            qualified privacy attorney review the final privacy policy and data map for the states
            and countries where Breezier Days is offered, especially if the service adds
            accounts, cloud storage, analytics, advertising, payments, or direct collection from children.
          </p>
        </>
      )
    },
    terms: {
      title: 'Terms of Use',
      body: (
        <>
          <p><strong>Last updated: August 26, 2026</strong></p>
          <h3>For parents and caregivers</h3>
          <p>
            Breezier Days is intended for adults who are parents or caregivers. It provides general
            parenting education, ideas, planning tools, and organization features. It is not directed
            to children and is not intended for independent use by children.
          </p>
          <h3>Not medical advice</h3>
          <p>
            Information in the app is not a diagnosis, medical advice, treatment plan,
            or substitute for a pediatrician or other qualified healthcare professional.
          </p>
          <h3>Emergencies</h3>
          <p>
            If a child has severe trouble breathing, is unresponsive, has a seizure,
            or you believe there is an immediate danger, call 911 or seek emergency care.
          </p>
          <h3>Your responsibility</h3>
          <p>
            You are responsible for deciding when professional medical, emergency,
            developmental, educational, or other services are appropriate.
          </p>
          <h3>Use of the service</h3>
          <p>
            You are responsible for how you use the information in the app and for deciding when
            professional medical, emergency, developmental, educational, or other services are appropriate.
          </p>
          <h3>Service status</h3>
          <p>
            Features may change over time. Reminder notifications depend on browser and device
            capabilities and are not guaranteed emergency alerts. Nothing in the app creates a
            doctor-patient relationship or other professional relationship.
          </p>
          <p className="legal-note">
            These terms should be reviewed by a qualified attorney
            periodically to ensure they remain current.
          </p>
        </>
      )
    },
    health: {
      title: 'Health Information Disclaimer',
      body: (
        <>
          <p>
            <strong>Breezier Days provides general educational information only.</strong>
          </p>
          <p>
            The app does not diagnose, treat, or prevent disease and does not replace
            your child's pediatrician or another qualified healthcare professional.
          </p>
          <p>
            Health information can be incomplete or inappropriate for a particular child.
            When you are concerned about your child\'s health, contact a qualified
            healthcare professional.
          </p>
          <p>
            For severe trouble breathing, unresponsiveness, seizure, or another
            life-threatening emergency, call 911 or seek emergency care.
          </p>
        </>
      )
    },
    delete: {
      title: 'Delete My Child Data',
      body: (
        <>
          <p>
            Breezier Days stores child profiles, notes, saved help,
            development activities, and reminders in this browser.
          </p>
          <p>
            To remove a child\'s information, open that child\'s profile and use the available delete
            controls. You can also clear this site's browser storage. Breezier Days does not
            maintain a separate server-side child profile database.
          </p>
          <button
            type="button"
            className="legal-danger-button"
            onClick={() => {
              window.localStorage.removeItem('parenting-app-children');
              window.localStorage.removeItem('littlewise-saved-ideas');
              setChildren([]);
              setSavedIdeas([]);
              setSelectedChildId(null);
              setSelectedChildForHelp(null);
              setLegalPage(null);
            }}
          >
            Delete all locally stored Breezier Days data from this browser
          </button>
          <p className="legal-note">
            This deletes the locally stored child data and Saved Ideas from this
            browser. It does not delete information that may be stored on a server
            or with third-party services.
          </p>
        </>
      )
    },
    subscription: {
      title: 'Subscription Information',
      body: (
        <div>
          <h3>Breezier Days Premium</h3>
          <p><strong>Price:</strong> $4.99 per month, billed monthly.</p>
          <p><strong>What's included:</strong> Unlimited What Do I Do Now? Answers, full game plans, Deeper Behavior Solutions, Plan My Day, Time-Based Recommendations, What Can I Make With What I Have?, Picky Eating Help, Preschool Lunch Ideas, Unlimited Saved Ideas, Real Tools, Advanced Personalized Activities, Weather-Smart Activities, Personalized Learning Activities, Personalized Learning Plans, and Personalized Home Reset Plans.</p>
          <p><strong>Free trial:</strong> No free trial is available at this time. You can preview Premium features at no cost within the app.</p>
          <p><strong>Payment:</strong> Payment is processed securely by Stripe. You can pay by card through Stripe's secure checkout. Your card information is never stored by Breezier Days.</p>
          <p><strong>Renewal:</strong> Your subscription automatically renews each month unless you cancel before the renewal date.</p>
          <p><strong>Cancellation:</strong> You can cancel at any time by tapping the ✦ Premium badge at the top of the page, then tapping "Manage Subscription" or "Cancel Premium." After cancellation, you will keep access to Premium features until the end of your current billing period.</p>
          <p><strong>Refunds:</strong> Refunds are handled on a case-by-case basis. If you believe you were charged in error, contact us through the app's help or feedback option.</p>
          <p><strong>Changes to Premium:</strong> We may update Premium features over time. We will notify you of any material changes to the service or pricing before they take effect.</p>
          <p><strong>Contact:</strong> If you have questions about Premium or your subscription, reach out through the app's help or feedback option.</p>
          <p className="legal-note" style={{ marginTop: 16 }}>
            This information is provided for transparency. Breezier Days Premium is billed monthly via Stripe.
          </p>
        </div>
      )
    }
  };


  return (
    <>
      {showPremiumModal && (
        <div className="legal-overlay" role="dialog" aria-modal="true" aria-label="Unlock Breezier Days Premium">
          <div className="legal-modal premium-modal premium-modal-v2">
            <div className="legal-modal-header premium-modal-header-v2">
              <div className="premium-modal-badge">✦</div>
              <h2>Breezier Days Premium</h2>
              <button type="button" onClick={() => setShowPremiumModal(false)} aria-label="Close">×</button>
            </div>
            <div className="legal-modal-body premium-modal-body">
              {premiumModalFeature && (() => {
                const feat = premiumFeatures.find(f => f.id === premiumModalFeature);
                if (!feat) return null;
                return (
                  <div className="premium-feature-highlight">
                    <span className="premium-feature-emoji">{feat.emoji}</span>
                    <div>
                      <strong>{feat.title}</strong>
                      <p>{feat.description}</p>
                    </div>
                  </div>
                );
              })()}
              <p className="premium-intro">
                Unlock everything in Breezier Days and get the full experience tailored to your family and the children in your care.
              </p>

              <div className="premium-support-banner">
                <div className="premium-support-icon">💛</div>
                <div className="premium-support-text">
                  <strong>More support for the moments that feel hard.</strong>
                  <p>Premium gives you deeper guidance, practical ideas, and a little extra support when you need another option, some reassurance, or help figuring out what to try next. You're not in this alone.</p>
                </div>
              </div>

              <div className="premium-cta-area">
                {!premiumAuthReady ? (
                  <p style={{ color: '#68716a' }}>Checking your Premium account…</p>
                ) : !premiumUser ? (
                  <div style={{ padding: 16, borderRadius: 16, background: '#f7f3ec', textAlign: 'left' }}>
                    <strong style={{ color: '#26342c' }}>Create an account or sign in to continue</strong>
                    <p style={{ margin: '7px 0 12px', color: '#68716a', fontSize: 13, lineHeight: 1.5 }}>
                      Premium is connected to your email account, so you can restore it securely on any device.
                    </p>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Email address</label>
                    <input type="email" autoComplete="email" value={premiumAuthEmail} onChange={e => setPremiumAuthEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 11px', borderRadius: 10, border: '1px solid rgba(73,100,85,.18)', marginBottom: 9 }} />
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Password</label>
                    <input type="password" autoComplete={premiumAuthMode === 'sign-in' ? 'current-password' : 'new-password'} value={premiumAuthPassword} onChange={e => setPremiumAuthPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submitPremiumAuth(); }} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 11px', borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                    <button type="button" className="premium-activate-button" onClick={() => void submitPremiumAuth()} disabled={checkoutLoading} style={{ width: '100%', marginTop: 12 }}>
                      {checkoutLoading ? 'Please wait…' : premiumAuthMode === 'sign-in' ? 'Sign in to Premium' : 'Create Premium account'}
                    </button>
                    {premiumAuthMessage && <p style={{ color: '#c0392b', fontSize: 13, margin: '9px 0 0', fontWeight: 600 }}>{premiumAuthMessage}</p>}
                    <button type="button" className="premium-maybe-later" onClick={() => { setPremiumAuthMode(mode => mode === 'sign-in' ? 'sign-up' : 'sign-in'); setPremiumAuthMessage(null); }}>
                      {premiumAuthMode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
                    </button>
                  </div>
                ) : isPremium && !premiumModalFeature ? (
                  <div className="premium-member-panel">
                    <div className="premium-member-icon">✓</div>
                    <div className="premium-member-copy">
                      <strong>You’re all set.</strong>
                      <p>Your Breezier Days Premium is active, so all your Premium tools are ready whenever you need them.</p>
                      {cancelAtPeriodEnd && premiumUntil ? (
                        <p className="premium-member-note">Your Premium will stay with you through {new Date(premiumUntil).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
                      ) : (
                        <p className="premium-member-note">Need to make a change? You can manage your subscription anytime.</p>
                      )}
                      <button type="button" className="premium-activate-button" style={{ marginTop: 10 }} onClick={manageSubscription} disabled={checkoutLoading}>
                        {checkoutLoading ? 'Opening your subscription…' : 'Manage Subscription →'}
                      </button>
                      {checkoutError && (
                        <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8, fontWeight: 600 }}>{checkoutError}</p>
                      )}
                    </div>
                  </div>
                ) : isPremium && premiumModalFeature ? (
                  <div className="premium-feature-unlocked-panel">
                    {premiumModalFeature === 'food-on-hand' && (
                      <div style={{ color: '#26342c' }}>
                        <p style={{ fontWeight: 800, color: '#496455', margin: '0 0 8px' }}>✓ Premium unlocked</p>
                        <h3 style={{ margin: '0 0 8px' }}>🥘 What Can I Make With What I Have?</h3>
                        <p style={{ color: '#68716a', lineHeight: 1.5, fontSize: 14 }}>Tell Breezier Days what is actually in your kitchen. You will get up to 3 easy meals — not a giant recipe list — with picky-eating context when you have it.</p>
                        <textarea value={premiumKitchenInput} onChange={e => setPremiumKitchenInput(e.target.value)} placeholder="Example: chicken thighs, potatoes, carrots, cheese" rows={3} style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid rgba(73,100,85,.2)', fontFamily: 'inherit', resize: 'vertical' }} />
                        <button type="button" className="premium-activate-button" style={{ marginTop: 10 }} onClick={generateEasyMeals}>✨ Give Me 2–3 Easy Ideas</button>

                        {premiumMealIdeas.length > 0 && (
                          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                            {premiumMealIdeas.map(meal => {
                              const saved = savedIdeas.some(i => i.category === 'Meal' && i.meal?.id === meal.id);
                              return (
                                <div key={meal.id} style={{ padding: 14, borderRadius: 16, background: '#f7f3ec', border: '1px solid rgba(73,100,85,.12)', textAlign: 'left' }}>
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 25 }}>{meal.emoji}</span>
                                    <div style={{ flex: 1 }}><strong>{meal.title}</strong><div style={{ fontSize: 12, color: '#68716a', marginTop: 3 }}>{meal.method} · {meal.prepMinutes} min prep</div></div>
                                  </div>
                                  <p style={{ fontSize: 13, lineHeight: 1.45, margin: '9px 0' }}>{meal.ingredients.join(' · ')}</p>
                                  <button type="button" className="secondary-button" onClick={() => setSelectedMealIdea(selectedMealIdea?.id === meal.id ? null : meal)}>{selectedMealIdea?.id === meal.id ? 'Hide details' : 'Show easy steps'}</button>
                                  <button type="button" className="save-help-button" style={{ marginLeft: 8 }} disabled={saved} onClick={() => saveMealIdea(meal)}>{saved ? '✓ Saved' : '❤️ Save meal'}</button>
                                  {selectedMealIdea?.id === meal.id && (
                                    <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>
                                      <ol style={{ paddingLeft: 20 }}>{meal.steps.map(step => <li key={step} style={{ marginBottom: 5 }}>{step}</li>)}</ol>
                                      {meal.kidTip && <p><strong>Kid tip:</strong> {meal.kidTip}</p>}
                                      {meal.pickyFit && <p><strong>Picky-eating fit:</strong> {meal.pickyFit}</p>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(73,100,85,.12)' }}>
                          <h4 style={{ margin: '0 0 6px' }}>❤️ My easy meals</h4>
                          <p style={{ fontSize: 13, color: '#68716a', marginTop: 0 }}>Save the meals you actually make. Breezier Days can keep them handy instead of making you start over.</p>
                          {savedIdeas.filter(i => i.category === 'Meal' && i.meal).slice(0, 5).map(item => (
                            <button key={item.id} type="button" onClick={() => openSavedMeal(item)} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 7, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(73,100,85,.12)', background: '#fff', color: '#26342c', cursor: 'pointer' }}>
                              {item.emoji} <strong>{item.title}</strong><span style={{ color: '#68716a', fontSize: 12 }}> · {item.meta}</span>
                            </button>
                          ))}
                          {savedIdeas.filter(i => i.category === 'Meal' && i.meal).length === 0 && <p style={{ fontSize: 12, color: '#68716a' }}>Nothing saved yet. When something works, save it.</p>}
                        </div>
                      </div>
                    )}

                    {premiumModalFeature === 'picky-eating' && (
                      <div style={{ color: '#26342c' }}>
                        <p style={{ fontWeight: 800, color: '#496455', margin: '0 0 8px' }}>✓ Premium unlocked</p>
                        <h3 style={{ margin: '0 0 8px' }}>🥦 Picky Eating Help</h3>
                        <p style={{ color: '#68716a', lineHeight: 1.5, fontSize: 14 }}>A deeper plan that helps you understand what is making food hard, what to do tonight, what to practice over time, and what to save for future meals.</p>

                        <div className="premium-help-now-section"><h4>Start here tonight</h4><p>Serve one food your child reliably eats alongside the family meal. Let your child decide whether and how much to eat. Do not make trying the new food the price of getting the safe food.</p></div>
                        <div className="premium-help-now-section"><h4>Think in steps, not bites</h4><p>Seeing → having it nearby → touching → smelling → licking → tasting → eating are all possible steps. A child does not have to jump straight from refusing a food to eating a serving.</p></div>
                        <div className="premium-help-now-section"><h4>Look for the reason</h4><ul><li>Texture, temperature, smell, mixed foods, or foods touching</li><li>Hunger, tiredness, overstimulation, or a rushed meal</li><li>Need for control or independence</li><li>A previous unpleasant experience with a food</li><li>Difficulty chewing, swallowing, or managing certain textures</li></ul></div>
                        <div className="premium-help-now-section"><h4>When a meal goes sideways</h4><p>Skip bargaining, bribing, forcing, and making a separate restaurant-style meal. Try: “You do not have to eat it. It can stay on your plate.” If they are hungry later, return to the next predictable meal or snack.</p></div>
                        <div className="premium-help-now-section"><h4>What progress can look like</h4><p>Progress may be tolerating a food on the plate, letting it touch another food, helping prepare it, or taking one tiny taste. Repeated low-pressure exposure matters more than getting a bite tonight.</p></div>
                        <div className="premium-help-now-section"><h4>When to look deeper</h4><p>If eating is extremely restricted, meals cause significant distress, there is frequent gagging or choking, swallowing difficulty, strong food-related anxiety, or concerns about growth or nutrition, involve your child's pediatrician or a feeding specialist.</p></div>

                        {selectedHelpChild && (
                          <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: '#f7f3ec', textAlign: 'left' }}>
                            <h4 style={{ marginTop: 0 }}>💛 Remember what works for {selectedHelpChild.name}</h4>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Foods they reliably eat</label>
                            <input value={pickyProfileDraft.safeFoods} onChange={e => setPickyProfileDraft(p => ({ ...p, safeFoods: e.target.value }))} placeholder="Chicken nuggets, strawberries, crackers" style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)', marginBottom: 9 }} />
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Foods they are learning</label>
                            <input value={pickyProfileDraft.learningFoods} onChange={e => setPickyProfileDraft(p => ({ ...p, learningFoods: e.target.value }))} placeholder="Shredded chicken, roasted potatoes" style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)', marginBottom: 9 }} />
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Textures or food situations they avoid</label>
                            <input value={pickyProfileDraft.avoidTextures} onChange={e => setPickyProfileDraft(p => ({ ...p, avoidTextures: e.target.value }))} placeholder="Mixed foods, sauces, mushy textures" style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)', marginBottom: 9 }} />
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Anything else that helps</label>
                            <textarea value={pickyProfileDraft.mealtimeNotes} onChange={e => setPickyProfileDraft(p => ({ ...p, mealtimeNotes: e.target.value }))} placeholder="Separate foods, small portions, eating earlier, sitting beside parent…" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)', resize: 'vertical' }} />
                            <button type="button" className="save-help-button" style={{ marginTop: 10 }} onClick={savePickyProfile}>❤️ Save this child's food profile</button>
                          </div>
                        )}
                        <button type="button" className="premium-activate-button" onClick={() => openMealSituation('picky')}>Open Picky Eating Help →</button>
                      </div>
                    )}

                    {premiumModalFeature === 'preschool-lunch' && (
                      <div style={{ color: '#26342c' }}>
                        <p style={{ fontWeight: 800, color: '#496455', margin: '0 0 8px' }}>✓ Premium unlocked</p>
                        <h3 style={{ margin: '0 0 8px' }}>🥪 Preschool Lunch Ideas</h3>
                        <p style={{ color: '#68716a', lineHeight: 1.5, fontSize: 14 }}>A practical lunch system for preschool days — familiar foods, simple prep, enough variety, and realistic backup options.</p>
                        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                          <div className="premium-help-now-section"><h4>The easy lunch formula</h4><p>Pick <strong>1 familiar main + 1 protein/dairy food + 1 fruit or vegetable + 1 easy extra</strong>. You do not need every category every single day to make a good lunch.</p></div>
                          <div className="premium-help-now-section"><h4>8 lunch combinations to rotate</h4><ul><li>Turkey + cheese roll-ups + crackers + berries</li><li>Sunbutter sandwich + banana + yogurt</li><li>Mini pasta + peas + fruit + cheese cubes</li><li>Hummus + pita + cucumber + strawberries</li><li>Cheese quesadilla strips + avocado + berries</li><li>Chicken pieces + rice + fruit + yogurt</li><li>Hard-boiled egg + toast strips + melon + cheese</li><li>Leftover meatballs + pasta + fruit + a familiar crunchy side</li></ul></div>
                          <div className="premium-help-now-section"><h4>If your preschooler is picky</h4><p>Keep one reliable food in the lunchbox. Do not make the lunch more adventurous just because they have refused something lately. Rotate one small change at a time and let familiar foods carry the meal.</p></div>
                          <div className="premium-help-now-section"><h4>Make mornings easier</h4><p>Choose 3–5 lunches your child generally eats and repeat them. Prep fruit, cheese, or sandwich components ahead when it helps. A boring lunch that gets eaten is more useful than an impressive lunch that comes home untouched.</p></div>
                          <div className="premium-help-now-section"><h4>Before you pack</h4><p>Follow your preschool's allergy policy and any rules about refrigeration, choking hazards, and foods they do not allow.</p></div>
                        </div>
                        <button type="button" className="premium-activate-button" onClick={() => openMealSituation('preschool-lunch')}>Open Lunch Ideas →</button>
                      </div>
                    )}

                    {!['food-on-hand', 'picky-eating', 'preschool-lunch'].includes(premiumModalFeature) && (
                      <>
                        <p style={{ fontWeight: 800, color: '#496455', margin: '0 0 8px' }}>✓ Premium unlocked</p>
                        <p style={{ color: '#68716a', lineHeight: 1.5, fontSize: 14 }}>This Premium feature is active and available to you.</p>
                        <button type="button" className="premium-activate-button" onClick={() => setShowPremiumModal(false)}>
                          Continue →
                        </button>
                      </>
                    )}

                    <button type="button" className="premium-maybe-later" onClick={() => setShowPremiumModal(false)} style={{ marginTop: 8 }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="premium-price-card">
                      <span className="premium-price-amount">$4.99</span>
                      <span className="premium-price-period">/ month</span>
                    </div>
                    <p className="premium-price-note">
                      Deeper guidance, practical ideas, and real support — for the everyday moments and the hard ones.
                    </p>
                    <button type="button" className="premium-activate-button" onClick={activatePremium} disabled={checkoutLoading}>
                      {checkoutLoading ? 'Redirecting to checkout…' : '✨ Subscribe to Premium'}
                    </button>
                    {checkoutError && (
                      <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8, fontWeight: 600 }}>{checkoutError}</p>
                    )}
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: '#f7f3ec', textAlign: 'left' }}>
                      <strong style={{ display: 'block', marginBottom: 6, color: '#26342c' }}>Already have Premium?</strong>
                      <p style={{ margin: '0 0 9px', color: '#68716a', fontSize: 12, lineHeight: 1.5 }}>
                        Sign in with the email address you used to subscribe. Your Premium status is then restored from your secure account.
                      </p>
                    </div>

                    <button type="button" className="premium-maybe-later" onClick={restorePurchases} disabled={checkoutLoading} style={{ marginTop: 8 }}>
                      {checkoutLoading ? 'Checking…' : 'Restore Purchases'}
                    </button>
                    <button type="button" className="premium-maybe-later" onClick={() => setShowPremiumModal(false)}>
                      Maybe later
                    </button>
                  </>
                )}
              </div>

              {isPremium && (
                <div style={{ marginTop: 16, padding: '16px 18px', background: '#f8f5ef', borderRadius: 16, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px', color: '#496455', fontWeight: 700, fontSize: 14 }}>
                    Need to make a change?
                  </p>
                  <p style={{ margin: '0 0 12px', color: '#68716a', fontSize: 13, lineHeight: 1.5 }}>
                    You can update your payment details or cancel anytime.
                  </p>
                  <button type="button" className="premium-activate-button" onClick={manageSubscription} disabled={checkoutLoading}>
                    {checkoutLoading ? 'Opening your subscription…' : 'Manage Subscription →'}
                  </button>
                  {checkoutError && (
                    <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8, fontWeight: 600 }}>{checkoutError}</p>
                  )}
                </div>
              )}

              <div className="premium-preview-section">
                <h3 className="premium-preview-heading">See Premium in Action</h3>
                <p className="premium-preview-subtitle">A peek at the deeper guidance Premium unlocks.</p>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">😤</span>
                    <div>
                      <strong>"My 3-year-old keeps melting down when I say no."</strong>
                      <small>Preschooler · Feelings &amp; Behavior</small>
                    </div>
                  </div>
                  <div className="premium-preview-comparison">
                    <div className="premium-preview-free">
                      <span className="premium-preview-tag">Free</span>
                      <p>Acknowledge the feeling, stay calm, and hold the boundary. Try redirecting to another choice.</p>
                    </div>
                    <div className="premium-preview-paid">
                      <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                      <p><strong>Try right now:</strong> Get low so you're eye-level and say, "You really wanted that. It's hard when I say no." Wait three seconds before saying anything else — the pause helps the feeling land.</p>
                      <p><strong>Why it works:</strong> At 3, the brain's emotional center fires before logic can. Naming the want out loud helps your child feel seen, which lowers the alarm. The pause gives their nervous system a moment to settle.</p>
                      <p><strong>Next step:</strong> Offer a small, real choice within the boundary — "We're not buying that today. Do you want to carry the keys or hold the banana?"</p>
                    </div>
                  </div>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">😴</span>
                    <div>
                      <strong>"My 1-year-old won't nap."</strong>
                      <small>Toddler · Sleep</small>
                    </div>
                  </div>
                  <div className="premium-preview-comparison">
                    <div className="premium-preview-free">
                      <span className="premium-preview-tag">Free</span>
                      <p>Check the wake window — around 3–4 hours at this age. Try a darker, quieter room and a short wind-down.</p>
                    </div>
                    <div className="premium-preview-paid">
                      <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                      <p><strong>Try right now:</strong> Move nap 15 minutes earlier and dim the lights 10 minutes before. Say softly, "Time to rest your body. I'm right here."</p>
                      <p><strong>Why it works:</strong> A 1-year-old who fights sleep is often already overtired — their body produces cortisol to stay awake, which makes settling harder. Shifting earlier catches the window before that kicks in.</p>
                      <p><strong>Next step:</strong> Keep a 3-day log of wake time, nap attempt, and mood. A pattern usually surfaces by day 3.</p>
                    </div>
                  </div>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">🧸</span>
                    <div>
                      <strong>"My kids keep fighting over a toy."</strong>
                      <small>Multiple kids · Feelings &amp; Behavior</small>
                    </div>
                  </div>
                  <div className="premium-preview-comparison">
                    <div className="premium-preview-free">
                      <span className="premium-preview-tag">Free</span>
                      <p>Acknowledge both children's feelings. You can set a timer or offer a different toy to one child.</p>
                    </div>
                    <div className="premium-preview-paid">
                      <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                      <p><strong>Try right now:</strong> Put a hand on the toy and say, "You both want this. I'm going to hold it while we figure it out." Then narrate: "Sam, you had it first. Mia, you really want a turn."</p>
                      <p><strong>Why it works:</strong> Putting a calm adult hand on the object stops the tug-of-war without picking a side. Naming each child's want out loud helps them feel heard — which lowers the heat enough to problem-solve.</p>
                      <p><strong>Next step:</strong> Ask, "How can we make this fair?" Even a 3-year-old can suggest a timer or a trade. You're teaching the skill, not just solving this one fight.</p>
                    </div>
                  </div>
                </div>

                <h4 className="premium-preview-subheading">More of what Premium unlocks</h4>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">📅</span>
                    <div>
                      <strong>"Build a calmer day for my 3-year-old."</strong>
                      <small>Personalized Daily Plans</small>
                    </div>
                  </div>
                  <div className="premium-preview-paid">
                    <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                    <p><strong>A day built around your child:</strong></p>
                    <ul className="premium-preview-plan">
                      <li><strong>Morning:</strong> 10-minute connection activity before getting dressed</li>
                      <li><strong>Before lunch:</strong> active play to help with energy</li>
                      <li><strong>Quiet time:</strong> a simple transition routine</li>
                      <li><strong>Afternoon:</strong> one independence-building activity</li>
                      <li><strong>Tonight:</strong> a short wind-down routine</li>
                    </ul>
                    <p><strong>Why these:</strong> Your 3-year-old tends to resist transitions and carries big feelings into the morning. Starting with connection fills their cup before demands begin. Active play before lunch gives the energy somewhere to go. The rest of the day weaves in small moments of independence and calm — so the hard moments don't stack up.</p>
                  </div>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">🎯</span>
                    <div>
                      <strong>"My toddler is melting down and I need to make dinner."</strong>
                      <small>Make This More Specific</small>
                    </div>
                  </div>
                  <div className="premium-preview-paid">
                    <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                    <p><strong>After the first answer, tap "Make This More Specific."</strong> Tell Breezier Days what else is going on — "They're tired" or "They want something they can't have" — and the advice gets sharper, not just longer.</p>
                    <p><strong>Refined for a tired child:</strong> Move the next step earlier, keep it physical and low-demand, and protect a rest or quiet moment soon. Tiredness lowers impulse control — the strategy shifts from "hold the boundary" to "meet the body first."</p>
                  </div>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">✋</span>
                    <div>
                      <strong>"My 4-year-old keeps hitting when she's frustrated."</strong>
                      <small>Deeper Behavior Solutions</small>
                    </div>
                  </div>
                  <div className="premium-preview-paid">
                    <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                    <p><strong>What might be driving it:</strong> At 4, big feelings still move faster than words. Hitting is often a release when frustration overwhelms — not a sign she doesn't care about others. She needs a way to let the feeling out safely.</p>
                    <p><strong>In the moment:</strong> Get between her and the other child, low and calm. Say, "I won't let you hit. Hitting hurts." Then offer the feeling an outlet: "You can stomp your feet or squeeze this pillow. I'm right here."</p>
                    <p><strong>Practice after:</strong> When things are calm, play "frustration practice" — pretend a toy won't work and model saying, "Ugh, this is so frustrating!" out loud. You're teaching her the words her body needs before the next wave hits.</p>
                  </div>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">🌱</span>
                    <div>
                      <strong>"My child is sensitive and slow to warm up."</strong>
                      <small>Guidance That Remembers Your Child</small>
                    </div>
                  </div>
                  <div className="premium-preview-comparison">
                    <div className="premium-preview-paid">
                      <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                      <p><strong>For your sensitive, slow-to-warm child:</strong> Don't push a greeting. Sit nearby and let them watch first. Say, "You can take your time. I'm here when you're ready." New people and places are a lot — the watching <em>is</em> the joining.</p>
                    </div>
                    <div className="premium-preview-free">
                      <span className="premium-preview-tag">How it differs</span>
                      <p>For an easygoing child, we might suggest a gentle nudge in — "Want to go say hi?" — because they usually warm up quickly and enjoy the entry.</p>
                    </div>
                  </div>
                  <p className="premium-preview-remember"><strong>Why it matters:</strong> Premium remembers your child's traits and age, so the guidance fits who they actually are — not a one-size-fits-all answer.</p>
                </div>

                <div className="premium-preview-example">
                  <div className="premium-preview-situation">
                    <span className="premium-preview-emoji">🧒</span>
                    <div>
                      <strong>"My child is sensitive, very active, and slow to warm up."</strong>
                      <small>Growing With Your Child</small>
                    </div>
                  </div>
                  <div className="premium-preview-paid">
                    <span className="premium-preview-tag premium-preview-tag-premium">Premium</span>
                    <p><strong>For your 2-year-old right now:</strong> Sensitive <em>plus</em> very active is a real combination. New places can feel like a lot, and the big energy has nowhere to go yet. Start with 15 minutes of rough-and-tumble play before you ask them to settle — it meets the energy first. Then give a clear, simple heads-up: "We're going somewhere new. You can stay close to me until you're ready."</p>
                    <p><strong>At 4, the same child:</strong> We'd shift to a quick "plan" together — "What's our job at the party? Say hi to one person?" — because a slow-to-warm 4-year-old can handle a small, concrete step if they choose it themselves.</p>
                    <p><strong>Why it's different:</strong> Breezier Days remembers that your child is sensitive, active, and slow to warm — and adjusts as they grow. The advice for your 2-year-old isn't the same advice we'd give at 4, because your child isn't the same either.</p>
                  </div>
                </div>
              </div>

              <div className="premium-feature-list">
                {premiumFeatures.filter(f => !(f as { free?: boolean }).free).map(feat => (
                  <div className="premium-feature-item" key={feat.id}>
                    <span className="premium-feature-item-emoji">{feat.emoji}</span>
                    <div>
                      <strong>{feat.title}</strong>
                      <small>{feat.description}</small>
                    </div>
                  </div>
                ))}
              </div>

              <p className="legal-note" style={{ marginTop: 16 }}>
                Payment is processed securely by Stripe. Your subscription automatically renews each month
                unless you cancel before the renewal date. You can manage or cancel anytime.
              </p>
              <p style={{ marginTop: 10, fontSize: 12 }}>
                <button type="button" onClick={() => { setShowPremiumModal(false); setLegalPage('subscription'); }} style={{ border: 0, background: 'transparent', color: '#496455', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Subscription Information
                </button>
                {' · '}
                <button type="button" onClick={() => { setShowPremiumModal(false); setLegalPage('terms'); }} style={{ border: 0, background: 'transparent', color: '#496455', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Terms of Use
                </button>
                {' · '}
                <button type="button" onClick={() => { setShowPremiumModal(false); setLegalPage('privacy'); }} style={{ border: 0, background: 'transparent', color: '#496455', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {showPremiumSuccess && (
        <div className="legal-overlay" role="dialog" aria-modal="true" aria-label="Payment successful">
          <div className="legal-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div className="legal-modal-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', margin: '0 0 12px' }}>
                {premiumChecking ? 'Checking your subscription' : isPremium ? 'Premium is active' : 'Subscription status'}
              </h2>
              {premiumChecking ? (
                <>
                  <p style={{ fontSize: 15, color: 'rgba(32,52,81,0.7)', marginBottom: 20 }}>
                    Activating your Premium features…
                  </p>
                  <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #e0e0e0', borderTopColor: 'var(--soft-pink)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : isPremium ? (
                <>
                  <p style={{ fontSize: 15, color: 'rgba(32,52,81,0.7)', marginBottom: 24 }}>
                    You're now a Breezier Days Premium member! All features are unlocked and ready to use.
                  </p>
                  <button
                    type="button"
                    className="premium-activate-button"
                    onClick={() => setShowPremiumSuccess(false)}
                    style={{ minWidth: 180 }}
                  >
                    Start Using Premium
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 15, color: 'rgba(32,52,81,0.7)', marginBottom: 8 }}>
                    Your payment went through. We're confirming your subscription — this can take a few seconds.
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(32,52,81,0.55)', marginBottom: 24 }}>
                    If Premium doesn't appear shortly, refresh the page or tap "Restore Purchases."
                  </p>
                  <button
                    type="button"
                    className="premium-activate-button"
                    onClick={() => window.location.reload()}
                    style={{ minWidth: 180 }}
                  >
                    Refresh Page
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCheckoutConfirm && (
        <div className="legal-overlay" role="dialog" aria-modal="true" aria-label="Confirm your subscription">
          <div className="legal-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div className="legal-modal-header">
              <h2>Confirm Your Subscription</h2>
              <button type="button" onClick={() => { if (!checkoutLoading) setShowCheckoutConfirm(false); }} aria-label="Close" disabled={checkoutLoading}>×</button>
            </div>
            <div className="legal-modal-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✦</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
                Breezier Days Premium
              </p>
              <p style={{ fontSize: 15, color: 'rgba(32,52,81,0.7)', marginBottom: 20 }}>
                You're about to subscribe to Breezier Days Premium for <strong>$4.99/month</strong>. You'll be taken to Stripe's secure checkout to enter your payment details.
              </p>
              <div style={{ background: '#f7f3ec', borderRadius: 14, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 13, color: 'rgba(32,52,81,0.65)', margin: 0, lineHeight: 1.5 }}>
                  Your subscription is linked to this device. You can cancel anytime by tapping the ✦ Premium badge at the top of the page, then tapping "Manage Subscription" or "Cancel Premium."
                </p>
              </div>
              <div style={{ background: '#fff5f0', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'left', border: '1px solid rgba(233,120,145,0.15)' }}>
                <p style={{ fontSize: 13, color: 'rgba(32,52,81,0.7)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Cancellation &amp; Refunds:</strong> You can cancel your subscription at any time. Cancellations take effect at the end of your current billing period — you'll keep access until then. All payments are non-refundable, including for partial billing periods.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--soft-pink)' }}
                />
                <span style={{ fontSize: 13, color: 'rgba(32,52,81,0.75)', lineHeight: 1.5 }}>
                  I understand and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowCheckoutConfirm(false); pushNavHistory(); setLegalPage('terms'); }}
                    style={{ border: 0, background: 'transparent', color: 'var(--soft-pink)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}
                  >
                    Terms of Use
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowCheckoutConfirm(false); pushNavHistory(); setLegalPage('subscription'); }}
                    style={{ border: 0, background: 'transparent', color: 'var(--soft-pink)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}
                  >
                    Subscription Information
                  </button>
                  , including that payments are non-refundable and I can cancel anytime.
                </span>
              </label>
              {checkoutError && (
                <p style={{ color: '#c0392b', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{checkoutError}</p>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="premium-activate-button"
                  onClick={confirmCheckout}
                  disabled={checkoutLoading || !termsAccepted}
                  style={{ minWidth: 160, opacity: termsAccepted && !checkoutLoading ? 1 : 0.5 }}
                >
                  {checkoutLoading ? 'Processing…' : 'Continue to Checkout'}
                </button>
                <button
                  type="button"
                  className="premium-maybe-later"
                  onClick={() => { if (!checkoutLoading) setShowCheckoutConfirm(false); }}
                  disabled={checkoutLoading}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {legalPage && (
        <div className="legal-overlay" role="dialog" aria-modal="true" aria-label={legalContent[legalPage].title} onClick={(e) => { if (e.target === e.currentTarget) setLegalPage(null); }}>
          <div className="legal-modal">
            <div className="legal-modal-header">
              <h2>{legalContent[legalPage].title}</h2>
              <button type="button" onClick={() => setLegalPage(null)} aria-label="Close" className="legal-close-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>
              </button>
            </div>
            <div className="legal-modal-body">
              {legalContent[legalPage].body}
            </div>
          </div>
        </div>
      )}



          <style>{`
      :root {
        --navy: #203451;
        --soft-pink: #e97891;
        --cream: #fffaf7;
        --card: #ffffff;
        --sage: #9bcab6;
        --lavender: #c8b7e8;
        --peach: #f5c98f;
        --sky: #b9dced;
        --border: rgba(32, 52, 81, 0.08);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--cream);
        color: var(--navy);
      }

      .app-shell {
        min-height: 100vh;
        background:
          linear-gradient(180deg, #fffdfb 0%, #fffaf7 55%, #fff8f5 100%);
      }

      .app-container {
        max-width: 980px;
        margin: 0 auto;
        padding: 28px 20px 40px;
      }

      header {
        text-align: center;
        padding: 20px 10px 26px;
      }

      header h1 {
        margin: 0;
        color: var(--navy);
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(34px, 6vw, 54px);
        line-height: 1.05;
        letter-spacing: -0.02em;
      }

      .child-profiles,
      .guidance-card,
      .topic-card,
      .hero-card {
        background: rgba(255,255,255,0.96);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 8px 28px rgba(32,52,81,0.07);
      }

      .child-profiles {
        margin: 12px 0 22px;
        padding: 24px;
        scroll-margin-top: 20px;
      }

      .child-profiles-heading h2 {
        color: var(--navy);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
      }

      .child-profiles-heading span,
      .eyebrow {
        color: var(--soft-pink);
        font-weight: 800;
      }

      .child-card {
        border: 1px solid var(--border);
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 4px 14px rgba(32,52,81,0.045);
      }

      .child-card.selected {
        border-color: var(--soft-pink);
        box-shadow: 0 0 0 2px rgba(233,120,145,0.12);
      }

      .add-child,
      .save-note {
        background: var(--soft-pink);
        color: #fff;
        border-radius: 14px;
        padding: 11px 16px;
        font-weight: 800;
        box-shadow: 0 5px 14px rgba(233,120,145,0.18);
      }

      .child-profile {
        border-radius: 20px;
        border: 1px solid var(--border);
        box-shadow: 0 4px 14px rgba(32,52,81,0.045);
      }
      .child-profile textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 80px;
        resize: vertical;
        padding: 14px 16px;
        border: 1px solid rgba(95, 105, 94, 0.15);
        border-radius: 14px;
        background: #faf7f1;
        color: #2d2d2d;
        font: inherit;
        font-size: 15px;
        line-height: 1.5;
        box-shadow: 0 1px 4px rgba(60, 65, 55, 0.04);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .child-profile textarea::placeholder {
        color: #a8a39b;
        opacity: 1;
      }
      .child-profile textarea:focus {
        outline: none;
        border-color: rgba(73, 100, 85, 0.35);
        box-shadow: 0 2px 10px rgba(60, 65, 55, 0.08);
      }

      .child-form input {
        width: 100%;
        box-sizing: border-box;
        padding: 14px 16px;
        border: 1px solid rgba(95, 105, 94, 0.15);
        border-radius: 14px;
        background: #faf7f1;
        color: #2d2d2d;
        font: inherit;
        font-size: 15px;
        line-height: 1.5;
        box-shadow: 0 1px 4px rgba(60, 65, 55, 0.04);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .child-form input::placeholder {
        color: #a8a39b;
        opacity: 1;
      }
      .child-form input:focus {
        outline: none;
        border-color: rgba(73, 100, 85, 0.35);
        box-shadow: 0 2px 10px rgba(60, 65, 55, 0.08);
      }

      .help-now-card,
      .topic-section {
        background: rgba(255,255,255,0.96);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 8px 28px rgba(32,52,81,0.07);
      }

      .topic-choice {
        border: 1px solid var(--border);
        border-radius: 20px;
        background: #fff;
        color: var(--navy);
        box-shadow: 0 4px 14px rgba(32,52,81,0.045);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }

      .topic-choice:hover {
        transform: translateY(-2px);
        border-color: rgba(233,120,145,0.35);
        box-shadow: 0 8px 20px rgba(32,52,81,0.08);
      }

      .topic-choice > span:first-child,
      .topic-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: #fde2e8;
      }

      .topic-choice:nth-child(2n) > span:first-child { background: #e9f4ee; }
      .topic-choice:nth-child(3n) > span:first-child { background: #eee8f8; }
      .topic-choice:nth-child(4n) > span:first-child { background: #e5f2f8; }

      .guidance-card {
        padding: 24px;
      }

      .remember-box {
        border-radius: 18px;
        border: 1px solid rgba(233,120,145,0.15);
        background: #fff5f7;
      }

      footer {
        text-align: center;
        color: rgba(32,52,81,0.58);
        padding: 26px 10px;
      }

      /* Remove the old decorative upper-left shape completely. */
      .background-shape,
      .shape-one {
        display: none !important;
      }

      .common-problems-section {
        margin-top: 20px;
        padding: 28px 24px;
        background: #fffdf9;
        border-radius: 28px;
        box-shadow: 0 16px 40px rgba(60,65,55,.06);
      }
      .common-problems-section .help-grid {
        margin-top: 16px;
      }
      .premium-features-section {
        margin-top: 20px;
        padding: 24px 20px;
        background: #f7f3ec;
        border-radius: 28px;
        border: 1px solid rgba(95,105,94,.10);
      }
      .premium-features-section .stage-section,
      .premium-features-section .day-plan-section,
      .premium-features-section .weather-smart-section,
      .premium-features-section .just-tell-me-section,
      .premium-features-section .home-reset-section {
        margin-top: 16px;
        padding: 22px 18px;
        background: #fffdf9;
        border-radius: 22px;
        box-shadow: 0 8px 24px rgba(60,65,55,.05);
      }
      .premium-features-section .section-heading h2 {
        font-size: 20px;
      }
      .mood-response-card {
        margin-top: 14px;
        padding: 16px 18px;
        border: 1px solid rgba(73,100,85,.14);
        border-radius: 18px;
        background: rgba(255,255,255,.78);
        box-shadow: 0 8px 24px rgba(32,52,81,.06);
      }
      .mood-response-copy strong { color: var(--navy); }
      .mood-response-copy p { margin: 5px 0 12px; color: var(--muted); }
      .mood-response-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .mood-response-actions .secondary-button { padding: 9px 12px; font-size: 13px; }

      @media (max-width: 760px) {
        .explore-hub { padding: 22px 16px; }
        .explore-hub-section-label { margin: 22px 0 10px; font-size: 11px; letter-spacing: .12em; font-weight: 800; color: #667067; }
      .explore-hub-grid-primary { margin-bottom: 4px; }
      .explore-hub-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .common-problems-section { padding: 22px 16px; border-radius: 22px; }
        .premium-features-section { padding: 18px 14px; border-radius: 22px; }
        .premium-features-section .stage-section,
        .premium-features-section .day-plan-section,
        .premium-features-section .weather-smart-section,
        .premium-features-section .just-tell-me-section,
        .premium-features-section .home-reset-section { padding: 18px 14px; border-radius: 18px; }
        .help-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        .help-button { padding: 12px 10px; min-height: 64px; }
        .help-button strong { font-size: 13px; }
        .help-button small { font-size: 11px; }
      }

      .mobile-bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 200;
        margin-top: 0;
        margin-bottom: 0;
        background: #fff;
        border-top: 1px solid rgba(32,52,81,.10);
        box-shadow: 0 -4px 20px rgba(32,52,81,.06);
        padding: 6px 4px;
        padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
        justify-content: space-around;
        align-items: stretch;
      }
      .mobile-bottom-nav button {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        border: 0;
        background: transparent;
        color: #8b938d;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        padding: 6px 4px;
        border-radius: 12px;
        flex: 1;
        min-width: 0;
        transition: .15s ease;
      }
      .mobile-bottom-nav button.active {
        color: #496455;
        background: #f0f5ef;
      }
      .mobile-bottom-nav .nav-icon {
        font-size: 20px;
        line-height: 1;
      }
      .mobile-bottom-nav .nav-label {
        font-size: 9px;
        line-height: 1.2;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      html, body { scroll-behavior: auto !important; }
      @media (min-width: 701px) {
        section[id], section[class*='-section'], .guidance-card, .common-problems-section {
          scroll-margin-top: 90px;
        }
      }

      .desktop-main-nav {
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 0;
        padding: 8px;
        background: rgba(255,255,255,.96);
        border: 1px solid rgba(32,52,81,.10);
        border-radius: 18px;
        box-shadow: 0 6px 20px rgba(32,52,81,.08);
        width: min(1100px, calc(100% - 32px));
        box-sizing: border-box;
        position: fixed !important;
        top: 12px !important;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        isolation: isolate;
      }
      /* The desktop nav is navigation only: never render a second bird/logo here. */
      .desktop-main-nav::before,
      .desktop-main-nav::after {
        content: none !important;
        display: none !important;
      }
      .desktop-main-nav img,
      .desktop-main-nav .bird-logo {
        display: none !important;
      }
      .desktop-main-nav button {
        border: 0;
        background: transparent;
        color: #68736c;
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        padding: 9px 16px;
        border-radius: 12px;
      }
      .desktop-main-nav button.active {
        color: #496455;
        background: #f0f5ef;
      }
      /* Desktop navigation is always visible on desktop. Mobile gets the bottom bar. */
      @media (max-width: 700px) {
        .desktop-main-nav { display: none !important; }
        .mobile-bottom-nav { display: flex !important; }
      }
      @media (min-width: 701px) {
        .app-container { max-width: 1180px; padding: 108px 28px 60px; }
        header {
          max-width: 940px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          text-align: left;
          padding: 18px 10px 34px;
        }
        header > div:last-child { max-width: 760px; }
        header h1 { font-size: clamp(42px, 4.4vw, 58px); line-height: 1.05; margin: 0 0 4px; }
        header .eyebrow { margin-bottom: 5px; }
        header > div:last-child > p { max-width: 720px; }
        .desktop-main-nav {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: fixed !important;
          top: 12px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2000 !important;
        }
        .mobile-bottom-nav { display: none !important; }
        .littlewise-philosophy { margin-top: 56px !important; }
      }
      @media (max-width: 700px) {
        @media (max-width: 380px) {
          .mobile-bottom-nav .nav-label {
            font-size: 8px;
          }
        }

      }

      @media (max-width: 640px) {
        .app-container { padding: 18px 14px 30px; }
        .child-profiles, .guidance-card, .help-now-card, .topic-section {
          border-radius: 22px;
          padding: 18px;
        }
        header h1 { font-size: 38px; }
      }

      .route-fallback { margin-top: 24px; padding: 30px; text-align: center; background: rgba(255,255,255,.96); border: 1px solid var(--border); border-radius: 28px; box-shadow: 0 8px 28px rgba(32,52,81,.06); }
      .route-fallback-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
      .route-fallback-actions button { min-width: 180px; }
      @media (max-width: 700px) { .route-fallback { padding: 22px 16px; border-radius: 22px; } .route-fallback-actions { flex-direction: column; } .route-fallback-actions button { width: 100%; } }

      .helping-child-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 10px 0 14px;
        padding: 9px 12px;
        border-radius: 999px;
        background: #fde9ee;
        color: #203451;
        font-size: 13px;
        font-weight: 700;
      }
      .helping-child-chip button {
        border: 0;
        background: transparent;
        color: #c45d76;
        font-weight: 800;
        cursor: pointer;
      }
      .choose-child-prompt {
        margin: 0 0 16px;
        padding: 15px;
        border-radius: 18px;
        background: #f6f0fb;
      }
      .choose-child-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .choose-child-buttons button {
        border: 1px solid rgba(32,52,81,.10);
        background: #fff;
        border-radius: 999px;
        padding: 9px 12px;
        color: #203451;
        font-weight: 700;
        cursor: pointer;
      }
      .personalized-guidance-label {
        margin: 5px 0 0;
        color: #c45d76;
        font-size: 13px;
        font-weight: 800;
      }
      .saved-help-preview {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin: 14px 0;
        padding: 12px 14px;
        border-radius: 15px;
        background: #fff5f7;
        color: #203451;
      }
      .saved-help-preview span {
        font-size: 12px;
        opacity: .65;
      }

      .temperament-area {
        margin: 16px 0;
        padding: 16px;
        border-radius: 16px;
        background: #f7f3ec;
        border: 1px solid rgba(95,105,94,.10);
      }
      .temperament-heading h4 {
        margin: 0;
        font-size: 15px;
        color: #35443b;
      }
      .temperament-heading p {
        margin: 4px 0 0;
        font-size: 12px;
        opacity: .62;
        line-height: 1.45;
      }
      .temperament-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .temperament-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 13px;
        border: 1px solid rgba(95,105,94,.15);
        border-radius: 999px;
        background: #fffdf9;
        color: #35443b;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: .18s ease;
      }
      .temperament-chip:hover {
        border-color: rgba(73,100,85,.30);
        transform: translateY(-1px);
      }
      .temperament-chip.selected {
        background: #496455;
        color: #fffdf9;
        border-color: #496455;
      }
      .temperament-chip-emoji {
        font-size: 15px;
      }

      .reminders-area {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(95,105,94,.10);
      }
      .tools-examples {
        margin: 14px 0 4px;
      }
      .tools-examples small {
        font-size: 12px;
        opacity: .62;
        font-weight: 700;
      }
      .tools-example-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 8px;
      }
      .tools-example-chips span {
        padding: 7px 12px;
        border-radius: 999px;
        background: #f4f0e8;
        border: 1px solid rgba(95,105,94,.10);
        font-size: 12px;
        font-weight: 600;
        color: #35443b;
      }
      .reminders-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .reminders-heading h4 { margin: 0; }
      .reminders-heading p {
        margin: 4px 0 0;
        font-size: 12px;
        opacity: .62;
      }
      .notification-button {
        border: 1px solid rgba(233,120,145,.25);
        background: #fff5f7;
        color: #c45d76;
        border-radius: 10px;
        padding: 8px 10px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }
      .notification-warning {
        margin: 10px 0;
        padding: 9px 11px;
        border-radius: 11px;
        background: #fff8ed;
        font-size: 12px;
        opacity: .72;
      }
      .reminder-form {
        display: grid;
        gap: 9px;
        margin-top: 13px;
      }
      .reminder-form input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 11px;
        border: 1px solid rgba(95,105,94,.15);
        border-radius: 10px;
        background: #faf7f1;
        color: #2d2d2d;
        font: inherit;
      }
      .reminder-date-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }
      .reminder-date-row label {
        display: grid;
        gap: 5px;
        font-size: 12px;
        font-weight: 700;
      }
      .saved-reminders {
        display: grid;
        gap: 8px;
        margin-top: 13px;
      }
      .saved-reminder {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        padding: 11px;
        border-radius: 12px;
        background: #faf7f1;
        border: 1px solid rgba(95,105,94,.10);
      }
      .saved-reminder.completed {
        opacity: .55;
        text-decoration: line-through;
      }
      .saved-reminder > div:first-child {
        display: grid;
        gap: 3px;
      }
      .saved-reminder small { opacity: .6; }
      .reminder-actions {
        display: flex;
        gap: 3px;
      }
      .reminder-actions button {
        border: 0;
        background: transparent;
        color: #35443b;
        cursor: pointer;
        font-size: 18px;
        padding: 5px;
      }
      .reminder-form-buttons {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .cancel-edit-button {
        border: 1px solid rgba(95,105,94,.18);
        background: transparent;
        color: #35443b;
        border-radius: 14px;
        padding: 11px 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .save-help-button {
        margin: 4px 0 12px;
        border: 1px solid rgba(233,120,145,.25);
        background: #fff5f7;
        color: #c45d76;
        border-radius: 12px;
        padding: 9px 13px;
        font-weight: 800;
        cursor: pointer;
      }
      .save-help-button.save-help-locked {
        border-color: rgba(73,100,85,.25);
        background: #f0f5ef;
        color: #496455;
      }
      .save-help-button.save-help-locked:hover {
        background: #496455;
        color: #fff;
      }
      .saved-idea-card.saved-idea-clickable {
        cursor: pointer;
        transition: .2s ease;
      }
      .saved-idea-card.saved-idea-clickable:hover {
        box-shadow: 0 8px 24px rgba(73,100,85,.14);
        border-color: rgba(73,100,85,.25);
      }
      .saved-idea-reopen {
        display: block;
        margin-top: 4px;
        color: #496455;
        font-size: 12px;
        font-weight: 700;
      }
      .saved-help-area {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(32,52,81,.08);
      }
      .saved-help-heading h4 { margin: 0; }
      .saved-help-heading p {
        margin: 4px 0 0;
        font-size: 12px;
        opacity: .62;
      }
      .empty-saved-help {
        margin: 12px 0 0;
        padding: 11px;
        border-radius: 12px;
        background: #fff8fa;
        font-size: 12px;
        opacity: .7;
      }
      .saved-help-list {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }
      .saved-help-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 11px;
        border-radius: 12px;
        background: #faf7f1;
        border: 1px solid rgba(95,105,94,.10);
      }
      .saved-help-item div {
        display: grid;
        gap: 3px;
      }
      .saved-help-item small {
        opacity: .55;
      }
      .saved-help-item button {
        border: 0;
        background: transparent;
        cursor: pointer;
        font-size: 19px;
        opacity: .5;
      }

      .development-section {
        margin: 18px 0 22px;
        padding: 24px;
        background: rgba(255,255,255,.96);
        border: 1px solid rgba(32,52,81,.08);
        border-radius: 28px;
        box-shadow: 0 8px 28px rgba(32,52,81,.07);
      }
      .development-kicker {
        color: #6b8e78;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .development-heading h2 {
        margin: 4px 0;
        color: #203451;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
      }
      .development-heading p {
        margin: 0;
        opacity: .68;
      }
      .development-child-banner {
        margin-top: 15px;
        display: inline-block;
        padding: 9px 13px;
        border-radius: 999px;
        background: #e9f4ee;
        color: #315542;
        font-size: 13px;
        font-weight: 700;
      }
      .development-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 12px;
        margin-top: 15px;
      }
      .development-card {
        padding: 16px;
        border-radius: 20px;
        background: #fff;
        border: 1px solid rgba(32,52,81,.08);
        box-shadow: 0 4px 14px rgba(32,52,81,.045);
      }
      .development-card.completed {
        background: #f0f8f3;
        border-color: rgba(107,142,120,.25);
      }
      .development-area {
        font-size: 12px;
        font-weight: 800;
        opacity: .7;
      }
      .development-card h3 {
        margin: 7px 0 5px;
        color: #203451;
      }
      .development-card p {
        margin: 0 0 12px;
        font-size: 13px;
        line-height: 1.45;
        opacity: .72;
      }
      .development-card button {
        border: 0;
        border-radius: 11px;
        padding: 9px 12px;
        background: #e97891;
        color: #fff;
        font-weight: 800;
        cursor: pointer;
      }
      .development-card.completed button {
        background: #6b8e78;
      }
      .development-empty {
        display: grid;
        gap: 4px;
        margin-top: 15px;
        padding: 14px;
        border-radius: 15px;
        background: #f7f4fb;
      }
      .development-empty span {
        font-size: 12px;
        opacity: .62;
      }
      .development-progress {
        margin-top: 15px;
        padding: 15px;
        border-radius: 18px;
        background: #fff5f7;
      }
      .development-progress > span {
        margin-left: 8px;
        font-size: 12px;
        opacity: .6;
      }
      .development-saved-list {
        display: grid;
        gap: 7px;
        margin-top: 10px;
      }
      .development-saved-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 9px 10px;
        border-radius: 10px;
        background: #fff;
        font-size: 13px;
      }
      .development-saved-item.done {
        opacity: .6;
      }
      .development-saved-item button {
        border: 0;
        background: transparent;
        cursor: pointer;
        opacity: .45;
        font-size: 18px;
      }
      @media (max-width: 640px) {
        .development-grid { grid-template-columns: 1fr; }
      }

      .legal-links {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px 14px;
        margin-top: 16px;
      }
      .sync-section {
        margin-top: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .sync-form-row {
        display: flex;
        gap: 8px;
        max-width: 420px;
        width: 100%;
      }
      .sync-email-input {
        flex: 1;
        border: 1px solid rgba(73,100,85,.2);
        border-radius: 999px;
        padding: 8px 16px;
        font-size: 13px;
        color: #26342c;
        background: #fff;
        font-family: inherit;
        outline: none;
        transition: .2s ease;
      }
      .sync-email-input:focus {
        border-color: #496455;
        box-shadow: 0 0 0 2px rgba(73,100,85,.1);
      }
      .sync-send-btn {
        border: 0;
        border-radius: 999px;
        padding: 8px 18px;
        background: #496455;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: .2s ease;
      }
      .sync-send-btn:hover { background: #5a7565; }
      .sync-send-btn:disabled { opacity: .5; cursor: default; }
      .sync-status-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: #496455;
      }
      .sync-status-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .sync-status-dot.synced { background: #496455; }
      .sync-status-dot.pending { background: #c9a84c; animation: sync-pulse 1.4s ease-in-out infinite; }
      @keyframes sync-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      .sync-status-text { font-weight: 600; }
      .sync-signout-btn {
        border: 1px solid rgba(73,100,85,.25);
        background: transparent;
        color: #496455;
        border-radius: 999px;
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: .2s ease;
      }
      .sync-signout-btn:hover { background: rgba(73,100,85,.08); }
      .sync-verification-pending {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: #6d5542;
        max-width: 420px;
        text-align: center;
      }
      .sync-otp-row {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        max-width: 420px;
        width: 100%;
      }
      .sync-otp-hint {
        font-size: 13px;
        color: #6d5542;
        text-align: center;
      }
      .sync-otp-inputs {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
      }
      .sync-otp-input {
        border: 1px solid rgba(73,100,85,.2);
        border-radius: 12px;
        padding: 8px 14px;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: .3em;
        text-align: center;
        width: 130px;
        color: #26342c;
        background: #fff;
        font-family: inherit;
        outline: none;
        transition: .2s ease;
      }
      .sync-otp-input:focus {
        border-color: #496455;
        box-shadow: 0 0 0 2px rgba(73,100,85,.1);
      }
      .sync-cancel-btn {
        border: 1px solid rgba(73,100,85,.2);
        background: transparent;
        color: #68716a;
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: .2s ease;
      }
      .sync-cancel-btn:hover { background: rgba(73,100,85,.06); }
      .sync-error-text {
        font-size: 12px;
        color: #c95d6f;
        margin: 0;
      }
      .legal-links button {
        border: 0;
        background: transparent;
        color: #203451;
        text-decoration: underline;
        text-underline-offset: 3px;
        opacity: .65;
        cursor: pointer;
        font-size: 12px;
      }
      .dev-panel {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 14px;
        background: #1a1f2e;
        color: #e8e8e8;
        border: 1px solid rgba(255,255,255,.08);
        max-width: 360px;
      }
      .dev-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .dev-panel-header strong {
        font-size: 13px;
        color: #7fdbca;
        letter-spacing: .03em;
      }
      .dev-close {
        border: 0;
        background: rgba(255,255,255,.08);
        color: #ccc;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
      }
      .dev-close:hover { background: rgba(255,255,255,.15); }
      .dev-panel-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .dev-panel-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        color: #b0b0b0;
      }
      .dev-toggle-btn {
        border: 1px solid rgba(127,219,202,.3);
        background: rgba(127,219,202,.08);
        color: #7fdbca;
        border-radius: 8px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: .15s ease;
        white-space: nowrap;
      }
      .dev-toggle-btn:hover {
        background: rgba(127,219,202,.18);
        border-color: rgba(127,219,202,.5);
      }
      .legal-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(24,37,55,.48);
      }
      .legal-modal {
        width: min(720px, 100%);
        max-height: min(82vh, 760px);
        overflow: hidden;
        background: #fff;
        border-radius: 24px;
        box-shadow: 0 22px 70px rgba(0,0,0,.22);
        display: flex;
        flex-direction: column;
      }
      .legal-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 18px 20px;
        border-bottom: 1px solid rgba(32,52,81,.08);
        flex-shrink: 0;
      }
      .legal-modal-header h2 {
        margin: 0;
        color: #203451;
        font-family: Georgia, "Times New Roman", serif;
      }
      .legal-modal-header button.legal-close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: #f0eef4;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        cursor: pointer;
        color: #4a3f5c;
        transition: background .18s ease, color .18s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .legal-modal-header button.legal-close-btn:hover,
      .legal-modal-header button.legal-close-btn:active {
        background: #e0dce8;
        color: #2d2340;
      }
      .legal-modal-body {
        padding: 20px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        flex: 1;
        min-height: 0;
        line-height: 1.55;
        color: #203451;
      }
      .legal-modal-body h3 { margin: 20px 0 6px; }
      .legal-modal-body p { margin: 9px 0; }
      .legal-note {
        padding: 12px;
        border-radius: 12px;
        background: #fff8ed;
        font-size: 12px;
        opacity: .78;
      }
      .legal-danger-button {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        background: #c95d6f;
        color: white;
        font-weight: 800;
        cursor: pointer;
      }

      .premium-badge-header {
        display: inline-block;
        margin-top: 6px;
        padding: 3px 12px;
        border-radius: 999px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .05em;
      }
      .premium-unlock-link {
        display: inline-block;
        margin-top: 6px;
        border: 1px solid rgba(73,100,85,.25);
        background: transparent;
        color: #496455;
        font-size: 12px;
        font-weight: 800;
        border-radius: 999px;
        padding: 4px 14px;
        cursor: pointer;
        transition: .2s ease;
      }
      .premium-unlock-link:hover {
        background: #496455;
        color: #fff;
      }
      .story-link {
        display: inline-block;
        margin-top: 6px;
        margin-left: 8px;
        border: 0;
        background: transparent;
        color: #98765b;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        opacity: 0.72;
        transition: .2s ease;
      }
      .story-link:hover {
        opacity: 1;
        color: #6d5542;
      }
      .handoff-section {
        margin: 16px 0 8px;
      }
      .handoff-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        border: 1px solid rgba(73,100,85,.18);
        background: linear-gradient(135deg, #f7f3ec, #f0f5ef);
        border-radius: 16px;
        padding: 14px 16px;
        cursor: pointer;
        text-align: left;
        transition: .2s ease;
      }
      .handoff-toggle:hover {
        border-color: rgba(73,100,85,.35);
      }
      .handoff-toggle-icon {
        font-size: 22px;
        flex: 0 0 auto;
      }
      .handoff-toggle-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .handoff-toggle-text strong {
        font-size: 14px;
        color: #26342c;
        font-weight: 800;
      }
      .handoff-toggle-text small {
        font-size: 12px;
        color: #68716a;
      }
      .handoff-toggle-arrow {
        font-size: 11px;
        color: #8b938d;
      }
      .handoff-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 16px;
        margin-top: 10px;
        border-radius: 16px;
        background: #f8f5ef;
        border: 1px solid rgba(95,105,94,.10);
      }
      .handoff-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .handoff-field-full {
        grid-column: 1 / -1;
      }
      .handoff-field label {
        font-size: 11px;
        font-weight: 800;
        color: #6d5542;
        letter-spacing: .04em;
      }
      .handoff-field input,
      .handoff-field textarea {
        border: 1px solid rgba(95,105,94,.18);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 14px;
        color: #26342c;
        background: #fff;
        font-family: inherit;
        resize: vertical;
      }
      .handoff-field input::placeholder,
      .handoff-field textarea::placeholder {
        color: #b0b6b2;
        font-size: 13px;
      }
      .handoff-field input:focus,
      .handoff-field textarea:focus {
        outline: none;
        border-color: #496455;
        box-shadow: 0 0 0 2px rgba(73,100,85,.12);
      }
      .handoff-done {
        grid-column: 1 / -1;
        border: 0;
        border-radius: 12px;
        padding: 10px;
        background: #496455;
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        transition: .2s ease;
      }
      .handoff-done:hover {
        background: #5a7565;
      }
      .handoff-summary {
        margin-top: 10px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.10);
      }
      .handoff-summary-label {
        font-size: 12px;
        font-weight: 800;
        color: #496455;
        margin: 0 0 6px;
      }
      .handoff-summary ul,
      .handoff-context-banner ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .handoff-summary li,
      .handoff-context-banner li {
        font-size: 13px;
        color: #4a524a;
        line-height: 1.45;
      }
      .handoff-summary li strong,
      .handoff-context-banner li strong {
        color: #6d5542;
        font-weight: 700;
      }
      .handoff-context-banner {
        margin-top: 10px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.10);
      }
      .handoff-context-label {
        font-size: 12px;
        font-weight: 800;
        color: #496455;
        margin: 0 0 6px;
      }
      @media (max-width: 480px) {
        .handoff-fields {
          grid-template-columns: 1fr;
        }
      }
      .feeling-section {
        margin: 14px 0 10px;
      }
      .about-child-fields .handoff-field-full input,
      .about-child-fields .handoff-field-full textarea {
        width: 100%;
      }
      .feeling-prompt {
        font-size: 13px;
        font-weight: 800;
        color: #6d5542;
        margin: 0 0 8px;
      }
      .feeling-choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .feeling-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(73,100,85,.18);
        background: #fff;
        border-radius: 20px;
        padding: 7px 12px;
        font-size: 13px;
        color: #4a524a;
        font-weight: 600;
        cursor: pointer;
        transition: .2s ease;
        font-family: inherit;
      }
      .feeling-chip:hover {
        border-color: rgba(73,100,85,.35);
        background: #f8f5ef;
      }
      .feeling-chip-selected {
        background: #496455;
        color: #fff;
        border-color: #496455;
      }
      .feeling-chip-selected:hover {
        background: #5a7565;
      }
      .feeling-chip-emoji {
        font-size: 15px;
      }
      .feeling-clear {
        margin-top: 8px;
        border: 0;
        background: transparent;
        color: #8b938d;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
      }
      .feeling-clear:hover {
        color: #6d5542;
      }
      .feeling-response {
        margin: 12px 0 0;
        padding: 12px 16px;
        border-radius: 14px;
        background: #f7f3ec;
        border: 1px solid rgba(233,120,145,0.12);
        color: #5a4a3e;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 500;
        animation: feeling-fade-in 0.3s ease;
      }
      @keyframes feeling-fade-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .littlewise-philosophy {
        max-width: 820px;
        margin: 42px auto 22px;
        padding: 22px 20px;
        border-radius: 22px;
        background: linear-gradient(135deg, #f7f3ec, #f0f5ef);
        border: 1px solid rgba(73,100,85,.10);
        text-align: center;
      }
      .littlewise-philosophy-kicker {
        color: #98765b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        margin-bottom: 7px;
      }
      .littlewise-philosophy h2 {
        margin: 0 0 8px;
        font-family: Georgia, serif;
        color: #26342c;
        font-size: 30px;
        font-weight: 500;
      }
      .littlewise-philosophy p {
        max-width: 700px;
        margin: 0 auto;
        color: #59645c;
        font-size: 15px;
        line-height: 1.6;
      }
      .littlewise-philosophy-points { display: none; }
      .littlewise-philosophy-points span { display: none; }
      .little-wins-compact {
        max-width: 820px;
        margin: 18px auto 28px;
      }
      .little-wins-compact details {
        border: 1px solid rgba(73,100,85,.10);
        border-radius: 18px;
        background: rgba(255,255,255,.66);
        overflow: hidden;
      }
      .little-wins-compact summary {
        list-style: none;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        cursor: pointer;
      }
      .little-wins-compact summary::-webkit-details-marker { display: none; }
      .little-wins-compact summary > span:first-child {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: #f8edf0;
        flex: 0 0 auto;
      }
      .little-wins-compact summary strong {
        display: block;
        color: #2f3d34;
        font-size: 14px;
        letter-spacing: .01em;
      }
      .little-wins-compact summary small {
        display: block;
        margin-top: 2px;
        color: #68716a;
        font-size: 12px;
      }
      .little-wins-compact summary::after {
        content: '→';
        margin-left: auto;
        color: #6d7b72;
        font-size: 18px;
      }
      .little-wins-compact details[open] summary::after { content: '↓'; }
      .little-wins-compact details > :not(summary) {
        padding-left: 16px;
        padding-right: 16px;
      }
      .story-page {
        max-width: 960px;
        margin: 0 auto;
        padding: 20px 16px 60px;
        text-align: center;
      }
      .story-page .back-button {
        margin-bottom: 20px;
        display: inline-block;
        position: sticky;
        top: 12px;
        z-index: 20;
        background: rgba(255,253,249,.96);
        box-shadow: 0 6px 18px rgba(60,65,55,.10);
      }
      .learning-filter-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 12px 0 14px;
        padding: 12px 16px;
        border: 1px solid rgba(73,100,85,.14);
        border-radius: 14px;
        background: #f7f3ec;
        color: #496455;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .learning-filter-toggle span { font-size: 11px; }
      .sos-solution-card {
        margin: 8px 0 20px;
        padding: 24px;
        border-radius: 22px;
        background: linear-gradient(135deg, #fff8f0, #fdf0ee);
        border: 2px solid rgba(192,88,74,.22);
        box-shadow: 0 12px 28px rgba(90,74,58,.08);
      }
      .sos-solution-eyebrow {
        color: #b04d40;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .12em;
        margin-bottom: 6px;
      }
      .sos-solution-card h3 {
        margin: 0 0 10px;
        color: #5a3c35;
        font-family: Georgia, serif;
        font-size: 26px;
      }
      .sos-solution-main { margin: 0 0 14px; color: #5a4a3a; line-height: 1.7; font-weight: 650; white-space: pre-line; }
      .sos-solution-say { margin: 0 0 12px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,.72); color: #5a4a3a; line-height: 1.55; }
      .sos-solution-note { margin: 0; color: #7a6658; font-size: 13px; line-height: 1.6; }
      .story-photo-placeholder {
        width: 100%;
        max-width: 280px;
        margin: 0 auto 28px;
        aspect-ratio: 1;
        border-radius: 24px;
        background: linear-gradient(135deg, #f7f3ec, #f0f5ef);
        border: 1px solid rgba(73,100,85,.12);
        display: grid;
        place-items: center;
      }
      .story-photo-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: #8b938d;
      }
      .story-photo-emoji {
        font-size: 48px;
      }
      .story-photo-inner small {
        font-size: 13px;
        font-weight: 600;
      }
      .story-header {
        margin-bottom: 32px;
      }
      .story-header .eyebrow {
        color: #98765b;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .12em;
        margin: 0 0 8px;
      }
      .story-title {
        font-family: Georgia, serif;
        color: #26342c;
        font-size: 32px;
        margin: 0 0 6px;
        font-weight: 500;
      }
      .story-subtitle {
        color: #68716a;
        font-size: 16px;
        font-weight: 600;
        font-style: italic;
      }
      .story-main {
        display: grid;
        grid-template-columns: minmax(280px, 360px) minmax(0, 560px);
        gap: 40px;
        align-items: start;
        justify-content: center;
        text-align: left;
      }
      .story-founder-photo {
        width: 100%;
        aspect-ratio: 4 / 5;
        object-fit: cover;
        object-position: center center;
        border-radius: 32px;
        border: 8px solid rgba(255, 253, 249, 0.85);
        box-shadow: 0 20px 45px rgba(60, 65, 55, 0.16);
        background: #f7f3ec;
      }
      .story-content {
        text-align: left;
        max-width: 560px;
        margin: 0;
      }
      .story-content p {
        font-size: 16px;
        line-height: 1.75;
        color: #203451;
        margin: 0 0 18px;
      }
      @media (max-width: 760px) {
        .story-main {
          display: flex;
          flex-direction: column;
          gap: 28px;
          align-items: center;
        }
        .story-founder-photo {
          width: min(100%, 360px);
          aspect-ratio: 4 / 5;
        }
        .story-content { width: 100%; }
        .story-content p { font-size: 15px; line-height: 1.7; }
      }
      .story-placeholder-text {
        color: #8b938d;
        font-size: 15px;
        line-height: 1.6;
        text-align: center;
        padding: 40px 0;
      }
      .story-signature {
        margin-top: 48px;
        text-align: center;
      }
      .story-signature p {
        color: #26342c;
        font-family: Georgia, serif;
        font-size: 18px;
        line-height: 1.5;
      }
      .story-signature p:last-child {
        color: #68716a;
        font-size: 14px;
        font-weight: 600;
      }
      .premium-modal { max-width: 600px; }
      .premium-modal-v2 {
        max-width: 580px;
        overflow: hidden;
      }
      .premium-modal-header-v2 {
        display: flex;
        align-items: center;
        gap: 10px;
        position: relative;
        padding: 28px 24px 20px;
        background: linear-gradient(135deg, #f7f3ec, #f0f5ef);
        border-bottom: 1px solid rgba(73,100,85,.10);
        flex-shrink: 0;
      }
      .premium-modal-header-v2 h2 {
        margin: 0;
        font-family: Georgia, serif;
        color: #26342c;
        font-size: 24px;
        flex: 1;
      }
      .premium-modal-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 20px;
        font-weight: 800;
        box-shadow: 0 4px 14px rgba(73,100,85,.18);
      }
      .premium-modal-header-v2 button {
        position: absolute;
        top: 16px;
        right: 16px;
      }
      .premium-price-card {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 4px;
        margin-bottom: 10px;
      }
      .premium-price-amount {
        font-size: 36px;
        font-weight: 800;
        color: #26342c;
        font-family: Georgia, serif;
      }
      .premium-price-period {
        font-size: 16px;
        color: #68716a;
        font-weight: 600;
      }
      .premium-coming-soon {
        margin: 12px 0 0;
        padding: 10px 16px;
        border-radius: 12px;
        background: #fef9f0;
        border: 1px solid rgba(245,201,143,.35);
        color: #8a6d3b;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.45;
        text-align: center;
      }
      .premium-member-panel {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        text-align: left;
        padding: 18px;
        border-radius: 20px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.12);
        margin-bottom: 18px;
      }
      .premium-member-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #496455;
        color: #fff;
        font-weight: 900;
        font-size: 20px;
      }
      .premium-member-copy { flex: 1; }
      .premium-member-copy strong { display: block; color: #26342c; font-size: 18px; margin-bottom: 5px; }
      .premium-member-copy p { margin: 0; color: #68716a; line-height: 1.5; font-size: 14px; }
      .premium-member-copy .premium-member-note { margin-top: 8px; color: #496455; font-weight: 700; font-size: 13px; }
      .premium-modal-body { text-align: center; padding: 24px; }
      .premium-feature-highlight {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px;
        border-radius: 18px;
        background: #f0f5ef;
        margin-bottom: 18px;
        text-align: left;
      }
      .premium-feature-highlight .premium-feature-emoji { font-size: 32px; flex: 0 0 auto; }
      .premium-feature-highlight strong { display: block; color: #26342c; font-size: 16px; margin-bottom: 4px; }
      .premium-feature-highlight p { margin: 0; color: #68716a; font-size: 13px; line-height: 1.5; }
      .premium-intro { color: #68716a; font-size: 14px; line-height: 1.55; margin-bottom: 18px; }
      .premium-support-banner {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 20px;
        border-radius: 18px;
        background: linear-gradient(135deg, #fef9f0, #fff5f7);
        border: 1px solid rgba(233,120,145,.18);
        margin-bottom: 22px;
        text-align: left;
      }
      .premium-support-icon {
        font-size: 28px;
        flex: 0 0 auto;
        line-height: 1;
      }
      .premium-support-text strong {
        display: block;
        color: #6d5542;
        font-size: 15px;
        font-family: Georgia, serif;
        margin-bottom: 6px;
      }
      .premium-support-text p {
        margin: 0;
        color: #8a6d5b;
        font-size: 13px;
        line-height: 1.55;
      }
      .premium-feature-list {
        display: grid;
        gap: 10px;
        text-align: left;
        margin-bottom: 22px;
      }
      .premium-feature-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f8f5ef;
        border: 1px solid rgba(95,105,94,.10);
      }
      .premium-feature-item-emoji { font-size: 22px; flex: 0 0 auto; }
      .premium-feature-item strong { display: block; color: #26342c; font-size: 14px; margin-bottom: 2px; }
      .premium-feature-item small { color: #68716a; font-size: 12px; line-height: 1.45; }
      .premium-preview-section {
        text-align: left;
        margin-bottom: 22px;
      }
      .premium-preview-heading {
        margin: 0 0 4px;
        font-family: Georgia, serif;
        color: #26342c;
        font-size: 18px;
      }
      .premium-preview-subtitle {
        margin: 0 0 14px;
        color: #8a8478;
        font-size: 13px;
      }
      .premium-preview-example {
        padding: 16px 18px;
        border-radius: 18px;
        background: #f8f5ef;
        border: 1px solid rgba(95,105,94,.10);
        margin-bottom: 10px;
      }
      .premium-preview-example:last-child { margin-bottom: 0; }
      .premium-preview-situation {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .premium-preview-emoji { font-size: 24px; flex: 0 0 auto; line-height: 1.2; }
      .premium-preview-situation strong {
        display: block;
        color: #26342c;
        font-size: 14px;
        font-family: Georgia, serif;
        margin-bottom: 2px;
      }
      .premium-preview-situation small {
        color: #9a9488;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .premium-preview-comparison {
        display: grid;
        gap: 10px;
      }
      .premium-preview-free,
      .premium-preview-paid {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(95,105,94,.10);
      }
      .premium-preview-free {
        background: #faf7f1;
      }
      .premium-preview-paid {
        background: #f0f5ef;
        border-color: rgba(73,100,85,.16);
      }
      .premium-preview-tag {
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 999px;
        background: #e8e2d6;
        color: #6d6558;
        margin-bottom: 8px;
      }
      .premium-preview-tag-premium {
        background: #496455;
        color: #fff;
      }
      .premium-preview-free p,
      .premium-preview-paid p {
        margin: 0 0 6px;
        color: #4a524a;
        font-size: 13px;
        line-height: 1.55;
      }
      .premium-preview-paid p:last-child { margin-bottom: 0; }
      .premium-preview-paid strong {
        color: #3d5346;
        font-size: 12px;
        font-weight: 800;
      }
      .premium-preview-subheading {
        margin: 14px 0 8px;
        font-family: Georgia, serif;
        color: #6d5542;
        font-size: 14px;
        font-weight: 800;
      }
      .premium-preview-plan {
        margin: 6px 0 10px;
        padding-left: 18px;
        color: #4a524a;
        font-size: 13px;
        line-height: 1.6;
      }
      .premium-preview-plan li { margin-bottom: 3px; }
      .premium-preview-plan strong { color: #3d5346; font-weight: 800; }
      .premium-preview-remember {
        margin: 10px 0 0;
        padding: 10px 12px;
        border-radius: 12px;
        background: #eef4ee;
        color: #4a524a;
        font-size: 12px;
        line-height: 1.5;
      }
      .premium-preview-remember strong { color: #3d5346; }
      .premium-cta-area { padding-top: 10px; }
      .premium-price-note { color: #8b938d; font-size: 12px; margin-bottom: 12px; }
      .premium-activate-button {
        display: block;
        width: 100%;
        border: 0;
        border-radius: 16px;
        padding: 14px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(73,100,85,.22);
        transition: .2s ease;
      }
      .premium-activate-button:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(73,100,85,.28); }
      .premium-maybe-later {
        display: block;
        margin: 12px auto 0;
        border: 0;
        background: transparent;
        color: #8b938d;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .premium-locked-card {
        text-align: center;
        padding: 30px 20px;
        border-radius: 20px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.12);
        margin-top: 18px;
      }
      .premium-locked-card .premium-locked-icon { font-size: 40px; margin-bottom: 10px; }
      .premium-locked-card strong { display: block; color: #26342c; font-size: 18px; font-family: Georgia, serif; margin-bottom: 6px; }
      .premium-locked-card p { color: #68716a; font-size: 14px; line-height: 1.5; max-width: 420px; margin: 0 auto 16px; }
      .premium-locked-card .premium-unlock-button {
        border: 0;
        border-radius: 14px;
        padding: 12px 28px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(73,100,85,.18);
        transition: .2s ease;
      }
      .premium-locked-card .premium-unlock-button:hover { transform: translateY(-2px); }
      .premium-locked-inline {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px;
        border-radius: 18px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.12);
      }
      .premium-locked-inline .premium-locked-icon-sm { font-size: 28px; flex: 0 0 auto; }
      .premium-locked-inline strong { display: block; color: #26342c; font-size: 15px; margin-bottom: 4px; }
      .premium-locked-inline p { color: #68716a; font-size: 13px; line-height: 1.5; margin: 0 0 8px; }
      .premium-unlock-button-sm {
        border: 0;
        border-radius: 10px;
        padding: 8px 16px;
        background: #496455;
        color: #fff;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: .2s ease;
      }
      .premium-unlock-button-sm:hover { background: #5a7565; }
      .premium-feature-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 18px;
      }
      .premium-locked-card-sm {
        padding: 16px;
        border-radius: 18px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.12);
        text-align: center;
      }
      .premium-locked-card-sm .premium-locked-icon-sm { font-size: 28px; margin-bottom: 8px; }
      .premium-locked-card-sm strong { display: block; color: #26342c; font-size: 14px; margin-bottom: 4px; }
      .premium-locked-card-sm p { color: #68716a; font-size: 12px; line-height: 1.45; margin: 0 0 10px; }

      .premium-help-now {
        margin-top: 24px;
        padding: 24px;
        border-radius: 22px;
        background: linear-gradient(135deg, #f7f3ec, #f0f5ef);
        border: 1px solid rgba(73,100,85,.14);
      }
      .premium-help-now-header { margin-bottom: 16px; }
      .premium-help-now-header .eyebrow { color: #496455; font-size: 11px; letter-spacing: .12em; margin: 0 0 4px; }
      .premium-help-now-header h3 { margin: 0; font-family: Georgia, serif; color: #26342c; font-size: 20px; }
      .premium-help-now-section { padding: 14px 0; border-top: 1px solid rgba(95,105,94,.10); }
      .premium-help-now-section:first-of-type { border-top: 0; padding-top: 6px; }
      .premium-help-now-section h4 { margin: 0 0 6px; color: #6d5542; font-size: 13px; font-weight: 800; }
      .premium-help-now-section p { margin: 0; color: #4a524a; line-height: 1.6; font-size: 14px; }
      .premium-help-now-section ul { margin: 0; padding-left: 20px; }
      .premium-help-now-section li { color: #4a524a; line-height: 1.6; font-size: 14px; margin-bottom: 6px; }
      .premium-help-now-section li:last-child { margin-bottom: 0; }

      .premium-help-now-locked {
        text-align: center;
        padding: 28px 20px;
        border-radius: 20px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.12);
        margin-top: 18px;
      }
      .premium-help-now-locked .premium-locked-icon { font-size: 36px; margin-bottom: 8px; }
      .premium-help-now-locked strong { display: block; color: #26342c; font-size: 17px; font-family: Georgia, serif; margin-bottom: 6px; }
      .premium-help-now-locked p { color: #68716a; font-size: 13px; line-height: 1.5; max-width: 400px; margin: 0 auto 14px; }
      .premium-help-now-locked .premium-unlock-button {
        border: 0;
        border-radius: 14px;
        padding: 12px 28px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(73,100,85,.18);
        transition: .2s ease;
      }
      .premium-help-now-locked .premium-unlock-button:hover { transform: translateY(-2px); }
      .premium-help-now-locked .premium-locked-features {
        list-style: none;
        padding: 0;
        margin: 0 auto 16px;
        max-width: 320px;
        text-align: left;
      }
      .premium-help-now-locked .premium-locked-features li {
        padding: 6px 0 6px 24px;
        position: relative;
        color: #4a524a;
        font-size: 14px;
        line-height: 1.5;
      }
      .premium-help-now-locked .premium-locked-features li::before {
        content: '🔒';
        position: absolute;
        left: 0;
        top: 6px;
        font-size: 13px;
      }
      .help-now-usage-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
        margin: 10px 0 4px;
        padding: 10px 16px;
        border-radius: 14px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.10);
        font-size: 13px;
      }
      .help-now-usage-count {
        font-weight: 800;
        color: #26342c;
      }
      .help-now-usage-premium {
        color: #496455;
        font-weight: 700;
        font-size: 12px;
      }
      .help-now-category-group {
        margin-bottom: 20px;
      }
      .help-now-category-label {
        margin: 0 0 10px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .06em;
        color: #6d5542;
        text-transform: uppercase;
      }
      .help-now-category-items {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      @media (max-width: 640px) {
        .help-now-category-items {
          grid-template-columns: 1fr;
        }
      }
      .help-now-locked-screen {
        text-align: center;
        padding: 36px 24px;
        border-radius: 22px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.14);
        margin-top: 18px;
      }
      .help-now-locked-screen .help-now-locked-icon { font-size: 44px; margin-bottom: 10px; }
      .help-now-locked-screen h3 {
        color: #26342c;
        font-size: 19px;
        font-family: Georgia, serif;
        margin: 0 0 8px;
        max-width: 420px;
        margin-left: auto;
        margin-right: auto;
      }
      .help-now-locked-screen > p {
        color: #68716a;
        font-size: 14px;
        line-height: 1.5;
        max-width: 380px;
        margin: 0 auto 16px;
      }
      .help-now-locked-screen .premium-locked-features {
        list-style: none;
        padding: 0;
        margin: 0 auto 18px;
        max-width: 340px;
        text-align: left;
      }
      .help-now-locked-screen .premium-locked-features li {
        padding: 6px 0 6px 26px;
        position: relative;
        color: #4a524a;
        font-size: 14px;
        line-height: 1.5;
      }
      .help-now-locked-screen .premium-locked-features li::before {
        content: '✓';
        position: absolute;
        left: 0;
        top: 6px;
        font-size: 14px;
        font-weight: 800;
        color: #496455;
      }
      .help-now-locked-screen .premium-price {
        font-size: 18px;
        font-weight: 800;
        color: #26342c;
        margin: 0 0 14px;
      }
      .help-now-locked-screen .premium-unlock-button {
        border: 0;
        border-radius: 14px;
        padding: 14px 32px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(73,100,85,.18);
        transition: .2s ease;
      }
      .help-now-locked-screen .premium-unlock-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(73,100,85,.25);
      }

      .help-now-locked {
        text-align: center;
        padding: 36px 24px;
        border-radius: 22px;
        background: #f0f5ef;
        border: 1px solid rgba(73,100,85,.14);
        margin-top: 18px;
      }
      .help-now-locked .help-now-locked-icon { font-size: 44px; margin-bottom: 10px; }
      .help-now-locked h3 {
        color: #26342c;
        font-size: 19px;
        font-family: Georgia, serif;
        margin: 0 0 8px;
        max-width: 420px;
        margin-left: auto;
        margin-right: auto;
      }
      .help-now-locked > p {
        color: #68716a;
        font-size: 14px;
        line-height: 1.5;
        max-width: 380px;
        margin: 0 auto 16px;
      }
      .help-now-premium-list {
        list-style: none;
        padding: 0;
        margin: 0 auto 18px;
        max-width: 340px;
        text-align: left;
      }
      .help-now-premium-list li {
        padding: 6px 0 6px 26px;
        position: relative;
        color: #4a524a;
        font-size: 14px;
        line-height: 1.5;
      }
      .help-now-premium-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        top: 6px;
        font-size: 14px;
        font-weight: 800;
        color: #496455;
      }
      .help-now-locked .premium-unlock-button {
        border: 0;
        border-radius: 14px;
        padding: 14px 32px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(73,100,85,.18);
        transition: .2s ease;
      }
      .help-now-locked .premium-unlock-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(73,100,85,.25);
      }

      .premium-preview {
        text-align: left;
        padding: 20px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid rgba(73,100,85,.14);
        margin-bottom: 20px;
      }
      .premium-preview-header {
        text-align: center;
        margin-bottom: 16px;
      }
      .premium-preview-badge {
        display: inline-block;
        padding: 4px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #496455, #6b8e78);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .06em;
        margin-bottom: 8px;
      }
      .premium-preview-header h3 {
        margin: 0;
        font-family: Georgia, serif;
        color: #26342c;
        font-size: 17px;
      }
      .premium-preview-section {
        padding: 12px 0;
        border-top: 1px solid rgba(95,105,94,.10);
      }
      .premium-preview-section:first-of-type { border-top: 0; padding-top: 4px; }
      .premium-preview-section h4 {
        margin: 0 0 6px;
        color: #6d5542;
        font-size: 13px;
        font-weight: 800;
      }
      .premium-preview-section p {
        margin: 0;
        color: #4a524a;
        line-height: 1.6;
        font-size: 14px;
      }
      .premium-preview-quote {
        font-style: italic;
        color: #496455;
      }
      .premium-preview-note {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #f7f3ec;
        font-size: 13px;
        color: #68716a;
        line-height: 1.5;
        text-align: center;
      }

      .learning-suggestion-box {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        margin-top: 20px;
        padding: 18px 20px;
        border-radius: 18px;
        background: #f7f3ec;
        border: 1px solid rgba(95,105,94,.12);
      }
      .learning-suggestion-icon { font-size: 28px; flex-shrink: 0; }
      .learning-suggestion-box strong {
        display: block;
        font-size: 15px;
        color: #26342c;
        margin-bottom: 4px;
      }
      .learning-suggestion-box p {
        margin: 0 0 10px;
        font-size: 14px;
        color: #68716a;
        line-height: 1.5;
      }
      .learning-suggestion-button {
        border: 0;
        border-radius: 12px;
        padding: 10px 20px;
        background: #496455;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: .2s ease;
      }
      .learning-suggestion-button:hover {
        background: #3d5346;
        transform: translateY(-1px);
      }

      .related-help-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .related-help-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 1px solid rgba(73,100,85,.18);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: #496455;
        transition: .2s ease;
      }
      .related-help-chip:hover {
        background: #f0f5ef;
        border-color: #496455;
        transform: translateY(-1px);
      }

      @media (max-width: 700px) {
        .premium-feature-row { grid-template-columns: 1fr; }
      }

      /* ===== Child Switcher Bar ===== */
      .child-switcher-bar {
        position: relative;
        margin: 14px 0 4px;
        display: flex;
        justify-content: center;
      }
      .child-switcher-button {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 18px;
        border: 1px solid rgba(32,52,81,.12);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        transition: .2s ease;
        box-shadow: 0 4px 14px rgba(32,52,81,.06);
      }
      .child-switcher-button:hover {
        border-color: var(--soft-pink);
        box-shadow: 0 6px 18px rgba(32,52,81,.1);
      }
      .child-switcher-avatar {
        font-size: 22px;
      }
      .child-switcher-info {
        display: flex;
        flex-direction: column;
        text-align: left;
      }
      .child-switcher-info strong {
        font-size: 15px;
        color: var(--navy);
      }
      .child-switcher-info small {
        font-size: 12px;
        color: rgba(32,52,81,.6);
      }
      .child-switcher-arrow {
        font-size: 10px;
        color: rgba(32,52,81,.5);
      }
      .child-switcher-dropdown {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 6px;
        min-width: 220px;
        background: #fff;
        border: 1px solid rgba(32,52,81,.12);
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(32,52,81,.14);
        padding: 6px;
        z-index: 100;
      }
      .child-switcher-option {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        border: 0;
        background: transparent;
        border-radius: 12px;
        cursor: pointer;
        text-align: left;
        transition: .15s ease;
      }
      .child-switcher-option:hover {
        background: #fde9ee;
      }
      .child-switcher-option.active {
        background: #fde9ee;
      }
      .child-switcher-option span:first-child {
        font-size: 20px;
      }
      .child-switcher-option > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .child-switcher-option strong {
        font-size: 14px;
        color: var(--navy);
      }
      .child-switcher-option small {
        font-size: 11px;
        color: rgba(32,52,81,.55);
      }
      .child-switcher-single {
        cursor: pointer;
      }
      .child-switcher-button-static {
        cursor: pointer;
      }
      .child-switcher-button-static:hover {
        border-color: rgba(32,52,81,.12);
        box-shadow: 0 4px 14px rgba(32,52,81,.06);
      }

      /* ===== For [Child] Area ===== */
      .for-child-area {
        margin: 10px 0 6px;
        padding: 18px 20px;
        background: rgba(255,255,255,0.96);
        border: 1px solid rgba(32,52,81,.08);
        border-radius: 24px;
        box-shadow: 0 6px 20px rgba(32,52,81,.06);
      }
      .for-child-label {
        margin: 0 0 12px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .08em;
        color: var(--soft-pink);
      }
      .for-child-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .for-child-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 14px;
        border: 1px solid rgba(32,52,81,.1);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        transition: .2s ease;
        font-size: 13px;
        font-weight: 700;
        color: var(--navy);
      }
      .for-child-chip:hover {
        border-color: var(--soft-pink);
        background: #fde9ee;
        transform: translateY(-1px);
      }
      .for-child-chip span {
        font-size: 18px;
      }
      .for-child-chip-primary {
        background: #496455;
        color: #fff;
        border-color: #496455;
        box-shadow: 0 4px 14px rgba(73,100,85,.22);
      }
      .for-child-chip-primary:hover {
        background: #3d5346;
        border-color: #3d5346;
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(73,100,85,.28);
      }
      .for-child-chip-primary small {
        color: #fff;
      }

      /* ===== Taking Over Button ===== */
      .taking-over-button {
        display: block;
        width: 100%;
        margin: 10px 0;
        padding: 14px 20px;
        border: 0;
        border-radius: 18px;
        background: linear-gradient(135deg, #496455, #5d7e6a);
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        transition: .2s ease;
        box-shadow: 0 6px 18px rgba(73,100,85,.2);
      }
      .taking-over-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(73,100,85,.28);
      }

      /* ===== Taking Over Modal ===== */
      .taking-over-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(32,52,81,.45);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
      }
      .taking-over-modal {
        background: #fff;
        border-radius: 28px;
        max-width: 560px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        padding: 28px 24px;
        box-shadow: 0 20px 60px rgba(32,52,81,.25);
      }
      .taking-over-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .taking-over-header h3 {
        margin: 0;
        font-size: 22px;
        color: var(--navy);
        font-family: Georgia, serif;
      }
      .taking-over-header button {
        border: 0;
        background: transparent;
        font-size: 20px;
        cursor: pointer;
        color: rgba(32,52,81,.5);
        padding: 4px 8px;
      }
      .taking-over-subtitle {
        margin: 0 0 20px;
        font-size: 14px;
        color: rgba(32,52,81,.65);
      }
      .taking-over-section {
        margin-bottom: 18px;
      }
      .taking-over-section > label {
        display: block;
        font-size: 13px;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 8px;
      }
      .taking-over-choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .taking-over-choice {
        padding: 8px 14px;
        border: 1px solid rgba(32,52,81,.12);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: var(--navy);
        transition: .15s ease;
      }
      .taking-over-choice:hover {
        border-color: var(--soft-pink);
      }
      .taking-over-choice.selected {
        background: #496455;
        color: #fff;
        border-color: #496455;
      }
      .taking-over-generate {
        display: block;
        width: 100%;
        padding: 14px;
        border: 0;
        border-radius: 16px;
        background: #496455;
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        transition: .2s ease;
        margin-bottom: 16px;
      }
      .taking-over-generate:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(73,100,85,.25);
      }
      .taking-over-generate:disabled {
        opacity: .5;
        cursor: not-allowed;
      }
      .taking-over-result {
        display: grid;
        gap: 12px;
      }
      .taking-over-step {
        padding: 14px 16px;
        border-radius: 16px;
        background: #f7f4fb;
        border: 1px solid rgba(32,52,81,.06);
      }
      .taking-over-step-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        color: #496455;
        margin-bottom: 6px;
      }
      .taking-over-step p {
        margin: 0;
        font-size: 14px;
        color: var(--navy);
        line-height: 1.5;
      }

      .home-reset-section {
        background: rgba(255,255,255,0.96);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 8px 28px rgba(32,52,81,0.07);
        padding: 28px 24px;
        margin: 16px 0;
      }
      .home-reset-group {
        margin-bottom: 20px;
      }
      .home-reset-group > label {
        display: block;
        font-size: 13px;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 10px;
      }
      .home-reset-choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .home-reset-choice {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 14px;
        border: 1px solid rgba(32,52,81,.12);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: var(--navy);
        transition: .15s ease;
      }
      .home-reset-choice:hover {
        border-color: var(--soft-pink);
        transform: translateY(-1px);
      }
      .home-reset-choice.selected {
        background: #496455;
        color: #fff;
        border-color: #496455;
      }
      .home-reset-result {
        margin-top: 8px;
      }
      .home-reset-result-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
      }
      .home-reset-result-emoji {
        font-size: 36px;
      }
      .home-reset-result-header h3 {
        margin: 0;
        font-size: 22px;
        color: var(--navy);
        font-family: Georgia, serif;
      }
      .home-reset-result-header small {
        font-size: 13px;
        color: rgba(32,52,81,.55);
        font-weight: 600;
      }
      .home-reset-start-here {
        padding: 20px;
        border-radius: 20px;
        background: #f0f5f1;
        border: 1px solid rgba(73,100,85,.12);
        margin-bottom: 16px;
      }
      .home-reset-start-here ol {
        margin: 10px 0 0;
        padding-left: 22px;
        color: var(--navy);
        line-height: 1.7;
      }
      .home-reset-start-here li {
        font-size: 15px;
        font-weight: 600;
      }
      .home-reset-stop-note {
        margin: 14px 0 0;
        font-size: 13px;
        color: #496455;
        font-weight: 800;
        text-align: center;
      }
      .home-reset-more-time {
        padding: 18px 20px;
        border-radius: 18px;
        background: #f7f3ec;
        border: 1px solid rgba(95,105,94,.10);
        margin-bottom: 16px;
      }
      .home-reset-more-time ul {
        margin: 10px 0 0;
        padding-left: 20px;
        color: #68716a;
        line-height: 1.7;
      }
      .home-reset-kids-help {
        margin-bottom: 16px;
      }
      .home-reset-kids-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 10px;
      }
      .home-reset-kids-card {
        padding: 16px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid var(--border);
      }
      .home-reset-kids-card strong {
        display: block;
        font-size: 13px;
        color: var(--navy);
        margin-bottom: 8px;
      }
      .home-reset-kids-card ul {
        margin: 0;
        padding-left: 18px;
        color: #68716a;
        font-size: 13px;
        line-height: 1.6;
      }
      .home-reset-tips {
        padding: 16px 20px;
        border-radius: 16px;
        background: #fff8f0;
        border: 1px solid rgba(245,201,143,.25);
      }
      .home-reset-tips ul {
        margin: 10px 0 0;
        padding-left: 20px;
        color: #68716a;
        line-height: 1.6;
        font-size: 14px;
      }
      .home-reset-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 8px;
      }
      .home-reset-redo {
        border: 1px solid rgba(32,52,81,.15);
        background: transparent;
        border-radius: 12px;
        padding: 10px 16px;
        font-weight: 700;
        color: var(--navy);
        cursor: pointer;
        transition: .15s ease;
      }
      .home-reset-redo:hover {
        background: #f7f3ec;
      }
      .explore-hub {
        margin: 14px 0 26px;
        padding: 28px;
        border-radius: 28px;
        background: #fffdf9;
        border: 1px solid rgba(73,100,85,.10);
        box-shadow: 0 16px 38px rgba(60,65,55,.06);
      }
      .explore-hub-header { max-width: 760px; margin: 0 auto 20px; text-align: center; }
      .explore-hub-header h2 { margin: 6px 0 8px; color: #26342c; font-family: Georgia, serif; font-size: clamp(28px, 3vw, 38px); }
      .explore-hub-header p:last-child { margin: 0; color: #68716a; line-height: 1.6; font-size: 14px; }
      .explore-hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .explore-hub-card { display: flex; align-items: flex-start; gap: 13px; width: 100%; padding: 17px 18px; text-align: left; border: 1px solid rgba(73,100,85,.12); border-radius: 18px; background: #fff; color: #26342c; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
      .explore-hub-card:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(60,65,55,.07); border-color: rgba(73,100,85,.24); }
      .explore-hub-card-featured { background: #f7f3ec; }
      .explore-hub-icon { flex: 0 0 auto; font-size: 26px; line-height: 1; }
      .explore-hub-card strong, .explore-hub-card small, .explore-hub-card em { display: block; }
      .explore-hub-card strong { font-family: Georgia, serif; font-size: 16px; margin-bottom: 4px; }
      .explore-hub-card small { color: #68716a; font-size: 12px; line-height: 1.5; }
      .explore-hub-card em { margin-top: 7px; color: #496455; font-style: normal; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }

      .first-time-start {
        margin: 14px 0 22px;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(250,247,241,.92);
        border: 1px solid rgba(73,100,85,.12);
      }
      .first-time-start-heading {
        display: flex;
        flex-direction: column;
        gap: 3px;
        color: #26342c;
      }
      .first-time-start-heading span { color: #68716a; font-size: 13px; line-height: 1.45; }
      .first-time-start-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .first-time-start-button {
        border: 1px solid rgba(73,100,85,.18);
        background: #fff;
        color: #496455;
        border-radius: 999px;
        padding: 9px 13px;
        font-weight: 800;
        cursor: pointer;
      }
      
.first-time-start-select {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #d7d1c7;
  border-radius: 12px;
  background: #fffdf9;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.first-time-start-select:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.first-time-start-button-primary { background: #496455; color: #fff; border-color: #496455; }

            .explore-hub-section-label-main { margin-top: 28px; margin-bottom: 8px; font-size: 11px; letter-spacing: .14em; }
      .explore-hub-subsection-label { margin: 18px 0 9px; font-size: 12px; letter-spacing: .04em; font-weight: 800; color: #6b746e; }
      .personalize-top-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .personalize-top-heading small { display: block; color: #68716a; font-size: 12px; line-height: 1.4; }
      .personalize-top-status { flex: 0 0 auto; padding: 5px 9px; border-radius: 999px; background: #edf2ed; color: #496455; font-size: 11px; font-weight: 800; }
      .personalize-top-select-wrap { display: block; }
      .personalize-top-select { width: 100%; min-height: 52px; appearance: none; -webkit-appearance: none; padding: 13px 42px 13px 15px; border: 1px solid rgba(73,100,85,.16); border-radius: 16px; background: #fffdf9; color: #26342c; font: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(60,65,55,.03); background-image: linear-gradient(45deg, transparent 50%, #68716a 50%), linear-gradient(135deg, #68716a 50%, transparent 50%); background-position: calc(100% - 20px) 22px, calc(100% - 14px) 22px; background-size: 6px 6px, 6px 6px; background-repeat: no-repeat; }
      .personalize-top-select:focus-visible { outline: 2px solid #496455; outline-offset: 2px; }
      .home-next-step { display: grid; grid-template-columns: minmax(0, 1.3fr) auto; align-items: center; gap: 18px; margin: 14px 0 20px; padding: 18px 20px; border: 1px solid rgba(73,100,85,.14); border-radius: 22px; background: linear-gradient(135deg, rgba(255,253,249,.96), rgba(244,240,231,.78)); box-shadow: 0 10px 28px rgba(60,65,55,.05); }
      .home-next-step-copy .eyebrow { margin-bottom: 5px; }
      .home-next-step-copy h3 { margin: 0 0 5px; color: #26342c; font-family: Georgia, serif; font-size: 20px; }
      .home-next-step-copy p:last-child { margin: 0; color: #68716a; line-height: 1.5; font-size: 13px; max-width: 580px; }
      .home-next-step-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .home-next-step-actions button { border-radius: 999px; padding: 10px 14px; font-weight: 800; font-size: 12px; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
      .home-next-step-actions button:hover { transform: translateY(-1px); }
      .home-next-step-primary { border: 1px solid #496455; background: #496455; color: #fff; box-shadow: 0 8px 18px rgba(73,100,85,.15); }
      .home-next-step-secondary { border: 1px solid rgba(73,100,85,.18); background: #fffdf9; color: #496455; }
      .secondary-home-action { opacity: .92; }
      @media (max-width: 760px) { .home-next-step { grid-template-columns: 1fr; } .home-next-step-actions { justify-content: flex-start; } }
      @media (max-width: 640px) { .personalize-top-heading { gap: 8px; } .personalize-top-select { min-height: 50px; } .home-next-step { padding: 16px; border-radius: 20px; } }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

.personalize-top-card { margin: 22px 0 16px; padding: 18px; border: 1px solid rgba(73,100,85,.10); border-radius: 22px; background: rgba(255,255,255,.78); box-shadow: 0 10px 28px rgba(60,65,55,.045); }
      .personalize-top-card .mood-check-in-label { margin: 0 0 12px; }
      .personalize-top-options { display: flex; flex-wrap: wrap; gap: 9px; }
      .personalize-top-option { appearance: none; -webkit-appearance: none; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 9px; align-items: center; min-width: 150px; flex: 1 1 150px; padding: 11px 13px; border: 1px solid rgba(73,100,85,.13); border-radius: 16px; background: #fffdf9; color: #26342c; text-align: left; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease; }
      .personalize-top-option:hover { transform: translateY(-1px); border-color: rgba(73,100,85,.26); box-shadow: 0 7px 18px rgba(60,65,55,.07); }
      .personalize-top-option:focus-visible { outline: 2px solid #496455; outline-offset: 2px; }
      .personalize-top-option.selected { background: #f3eee5; border-color: rgba(73,100,85,.42); box-shadow: 0 0 0 2px rgba(73,100,85,.08); }
      .personalize-add-child { display: inline-flex; align-items: center; margin-top: 11px; padding: 7px 2px; border: 0; background: transparent; color: #496455; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
      .personalize-add-child:hover { text-decoration: underline; }
      .personalize-add-child:focus-visible { outline: 2px solid #496455; outline-offset: 3px; border-radius: 6px; }
      .personalize-top-option > span { grid-row: 1 / span 2; font-size: 21px; line-height: 1; }
      .personalize-top-option strong { display: block; font-family: Georgia, serif; font-size: 14px; line-height: 1.2; }
      .personalize-top-option small { display: block; margin-top: 3px; color: #68716a; font-size: 11px; line-height: 1.2; }
      .mood-check-in { margin: 10px 0 18px; }
      .mood-choices { display: flex; flex-wrap: wrap; gap: 9px; }
      .mood-chip { appearance: none; -webkit-appearance: none; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 15px; border: 1px solid rgba(73,100,85,.13); border-radius: 999px; background: #fffdf9; color: #26342c; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(60,65,55,.035); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease; }
      .mood-chip:hover { transform: translateY(-1px); border-color: rgba(73,100,85,.26); box-shadow: 0 7px 18px rgba(60,65,55,.07); }
      .mood-chip:focus-visible { outline: 2px solid #496455; outline-offset: 2px; }
      .mood-chip-selected { background: #f3eee5; border-color: rgba(73,100,85,.40); box-shadow: 0 0 0 2px rgba(73,100,85,.07); }
      .mood-chip-emoji { font-size: 17px; line-height: 1; }
      @media (max-width: 640px) {
        .personalize-top-card { padding: 16px; border-radius: 20px; }
        .personalize-top-options { display: grid; grid-template-columns: 1fr 1fr; }
        .personalize-top-option { min-width: 0; }
        .mood-chip { flex: 1 1 145px; justify-content: center; }
      }

      @media (max-width: 640px) {
        .taking-over-modal { padding: 20px 16px; border-radius: 22px; }
        .for-child-grid { gap: 8px; }
        .for-child-chip { padding: 8px 12px; font-size: 12px; }
      }
`}</style>


        

<main className="app">
      {runtimeError && (
        <div role="alert" style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: '#fff', border: '1px solid rgba(73,100,85,.18)', boxShadow: '0 8px 30px rgba(32,52,81,.14)' }}>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>{runtimeError}</span>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Refresh</button>
          <button type="button" aria-label="Dismiss" onClick={() => setRuntimeError(null)} style={{ border: 0, background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      )}
      <div className="background-shape shape-one" />
      <div className="background-shape shape-two" />

      <section className="container">
        <header className="header">
          <div className="logo bird-logo" aria-label="Breezier Days app icon" title="Breezier Days" style={{ width: 78, height: 78, flex: '0 0 78px', background: 'transparent', overflow: 'hidden', borderRadius: 18 }}>
            <img
              src={A_GOOD_WAY_ICON_DATA_URL}
              alt="Breezier Days app icon"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <p className="eyebrow">A little help for parents and caregivers</p>
            <h1>Breezier Days</h1>
            <p style={{ margin: "3px 0 4px", fontSize: "13px", fontWeight: 600, opacity: 0.72 }}>Less figuring it out. Less fuss. More living.</p>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, opacity: 0.58 }}>Built from early childhood experience. Made for the real-life moments of raising and caring for little ones.</p>
            {isPremium && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="premium-badge-header" onClick={() => { setPremiumModalFeature(null); setShowPremiumModal(true); }} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>✦ Premium</button>
                <button type="button" className="premium-badge-header" onClick={manageSubscription} disabled={checkoutLoading} style={{ border: '1px solid rgba(73,100,85,.22)', background: '#f7f3ec', cursor: checkoutLoading ? 'wait' : 'pointer', borderRadius: 999, padding: '7px 12px', fontWeight: 800 }}>
                  {checkoutLoading ? 'Opening…' : 'Manage Subscription'}
                </button>
              </div>
            )}
            {!isPremium && (
              <button type="button" className="premium-unlock-link" onClick={() => unlockPremium()}>
                ✦ Unlock Breezier Days Premium
              </button>
            )}
            <button type="button" className="story-link" onClick={() => { pushNavHistory(); closeCompetingViews(); setShowStory(true); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
              Meet the Founder
            </button>
          </div>
        </header>

        <nav className="desktop-main-nav" aria-label="Breezier Days desktop navigation">
          <button type="button" className={activeNav === 'home' ? 'active' : ''} onClick={returnHome}>🏠 Home</button>
          <button type="button" className={activeNav === 'help' ? 'active' : ''} onClick={openHelpNow}>💡 Help</button>
          <button type="button" className={activeNav === 'explore' ? 'active' : ''} onClick={openExploreHub}>🧭 Explore</button>
          <button type="button" className={activeNav === 'saved' ? 'active' : ''} onClick={() => {
            closeCompetingViews();
            setSelectedHelp('');
            setSelectedSituation(null);
            setSelectedDevTopic(null);
            setActiveNav('saved');
            window.requestAnimationFrame(() => {
              const target = savedIdeasRef.current;
              if (target) {
                const navOffset = window.innerWidth >= 701 ? 88 : 12;
                const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
                window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' });
              }
            });
          }}>❤️ Saved</button>
        </nav>

        {showExploreHub && (
          <section ref={exploreHubRef} className="explore-hub" aria-label="Everything Breezier Days can do">
            <div className="explore-hub-header">
              <p className="eyebrow">EXPLORE BREEZIER DAYS</p>
              <h2>What do you need right now?</h2>
              <p>Start with one of the four quickest ways to get help. Everything else is below.</p>
            </div>

            <div className="explore-hub-grid explore-hub-grid-primary">
              <button type="button" className="explore-hub-card explore-hub-card-featured" onClick={openHelpNow}>
                <span className="explore-hub-icon">💡</span>
                <span><strong>What Do I Do Now?</strong><small>Get a practical next step for what is happening right now.</small></span>
              </button>
              <button type="button" className="explore-hub-card explore-hub-card-featured" onClick={openHomeReset}>
                <span className="explore-hub-icon">🏠</span>
                <span><strong>Home Reset</strong><small>Make the house feel more manageable with one realistic reset.</small></span>
              </button>
              <button type="button" className="explore-hub-card explore-hub-card-featured" onClick={() => selectHelp('activities')}>
                <span className="explore-hub-icon">🎨</span>
                <span><strong>Find an Activity</strong><small>Something realistic to do with your child right now.</small></span>
              </button>
              <button type="button" className="explore-hub-card explore-hub-card-featured" onClick={() => selectHelp('mealtime')}>
                <span className="explore-hub-icon">🍽️</span>
                <span><strong>Food &amp; Meals</strong><small>Help with what to make, serve, or handle next.</small></span>
              </button>
            </div>

            <div className="explore-hub-section-label explore-hub-section-label-main">ALL BREEZIER DAYS TOOLS</div>
            <div className="explore-hub-subsection-label">EVERYDAY HELP</div>
            <div className="explore-hub-grid">
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('activities')}><span className="explore-hub-icon">🎨</span><span><strong>Activities</strong><small>Low-prep ideas matched to age, time, energy, and what you have.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('mealtime')}><span className="explore-hub-icon">🍽️</span><span><strong>Meals & Food</strong><small>Mealtime help, picky eating, lunch ideas, and easier options.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('sleep')}><span className="explore-hub-icon">😴</span><span><strong>Sleep</strong><small>Naps, bedtime, night waking, and practical sleep support.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('feelings')}><span className="explore-hub-icon">💛</span><span><strong>Feelings & Behavior</strong><small>Big feelings, tantrums, hitting, cooperation, and connection.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('potty')}><span className="explore-hub-icon">🚽</span><span><strong>Potty Training</strong><small>Getting started, accidents, resistance, and routines.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('health')}><span className="explore-hub-icon">🩺</span><span><strong>Health & Everyday Care</strong><small>General guidance and when to seek professional care.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('health')}><span className="explore-hub-icon">🛋️</span><span><strong>Take It Easy</strong><small>When your child is sick, teething, or simply not feeling like themselves: rest, fluids, comfort, and what to watch.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('development')}><span className="explore-hub-icon">🌱</span><span><strong>Development & Milestones</strong><small>Age-specific help with speech, movement, thinking, and social development.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('siblings')}><span className="explore-hub-icon">👧</span><span><strong>Sibling Problems</strong><small>Fighting, sharing, jealousy, boundaries, and repair.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => selectHelp('bullying')}><span className="explore-hub-icon">🛡️</span><span><strong>Bullying & Friendship</strong><small>Teasing, exclusion, conflict, school, and online problems.</small></span></button>
            </div>

            <div className="explore-hub-subsection-label">PLANNING & FAMILY TOOLS</div>
            <div className="explore-hub-grid">
              <button type="button" className="explore-hub-card" onClick={openDayPlanner}><span className="explore-hub-icon">☀️</span><span><strong>Plan My Day</strong><small>Build a realistic day around routines, naps, commitments, and energy.</small><em>Premium</em></span></button>
              <button type="button" className="explore-hub-card" onClick={openTakingOver}><span className="explore-hub-icon">👨‍👩‍👧</span><span><strong>I'm Taking Over</strong><small>A quick caregiver plan when someone else is stepping in.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => { closeCompetingViews(); setShowHandoff(true); setActiveNav('help'); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' })); }}><span className="explore-hub-icon">🤝</span><span><strong>Caregiver Handoff</strong><small>Leave another adult a clear snapshot of what matters.</small></span></button>
              <button type="button" className="explore-hub-card" onClick={() => { closeCompetingViews(); setActiveNav('saved'); window.requestAnimationFrame(() => savedIdeasRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })); }}><span className="explore-hub-icon">❤️</span><span><strong>Saved</strong><small>Find your favorite answers, ideas, and plans again.</small></span></button>
            </div>

            <div className="explore-hub-subsection-label">MORE BREEZIER DAYS TOOLS</div>
            <div className="explore-hub-grid">
              {premiumFeatures.filter(feature => !['unlimited-help-now','deeper-behavior','personalized-daily-plan','multi-child'].includes(feature.id)).map(feature => (
                <button type="button" key={feature.id} className="explore-hub-card" onClick={() => {
                  if (feature.id === 'food-on-hand' || feature.id === 'picky-eating' || feature.id === 'preschool-lunch') {
                    selectHelp('mealtime');
                    return;
                  }
                  if (feature.id === 'home-reset-premium') { openHomeReset(); return; }
                  if (feature.id === 'real-reminders') {
                    closeCompetingViews();
                    setActiveNav('saved');
                    window.requestAnimationFrame(() => savedIdeasRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }));
                    return;
                  }
                  unlockPremium(feature.id);
                }}>
                  <span className="explore-hub-icon">{feature.emoji}</span>
                  <span><strong>{feature.title}</strong><small>{feature.description}</small>{feature.free ? <em>Free</em> : <em>Premium</em>}</span>
                </button>
              ))}
            </div>

            <button type="button" className="back-button explore-hub-back explore-hub-back-bottom" onClick={goBack}>
              ← Back
            </button>
          </section>
        )}

        {!showStory && (
          <section className="littlewise-philosophy" aria-label="The Breezier Days approach">
            <div className="littlewise-philosophy-kicker">THE BREEZIER DAYS APPROACH</div>
            <h2>You don't have to do more.</h2>
            <p>Less pressure. Less rushing. Use what you have. Make room for connection, independence, ordinary play, and the moments that don't need filling.</p>
          </section>
        )}

        {showStory && (
          <section className="story-page">
            <div className="story-header">
              <p className="eyebrow">MY STORY</p>
              <h1 className="story-title">My Story</h1>
              <p className="story-subtitle">Why I Created Breezier Days</p>
            </div>

            <div className="story-main">
              <img
                className="story-founder-photo"
                src="/images/ChatGPT_Image_Aug_31,_2026,_08_32_44_AM.png"
                alt="Breezier Days founder holding a piglet"
              />
              <div className="story-content">
                <p>I didn&rsquo;t create Breezier Days because parents need more parenting advice. I created it because sometimes, in the middle of a hard moment, we just need to know what to do next.</p>
                <p>I became a mom without my own mom to turn to. She passed away before I had children, and there have been so many moments when I wished I could simply pick up the phone and ask, &ldquo;What do I do?&rdquo;</p>
                <p>I&rsquo;ve been fortunate to have family and friends to turn to, along with books and research. But I found that advice often came from someone else&rsquo;s experience &mdash; another parent, another family, another child. What worked for their child didn&rsquo;t always fit mine.</p>
                <p>I saw that same need in our own family when my husband would call and say, &ldquo;The baby is crying. I&rsquo;ve tried everything. I don&rsquo;t know what to do next.&rdquo;</p>
                <p>That question stayed with me.</p>
                <p>I wanted a tool that could understand this child, this situation, what has already happened today, and what has worked before &mdash; and help you figure out what to try next.</p>
                <p>That&rsquo;s why I created Breezier Days.</p>
                <p>Breezier Days is for parents and caregivers navigating the real moments of everyday life. It&rsquo;s not about being perfect or having all the answers. It&rsquo;s about having a thoughtful, practical place to turn when you need help.</p>
                <p>Sometimes, you just need to know what to do next.</p>
                <p>And sometimes, the answer is that you do not need to do anything at all. I believe families can be happier with less pressure, less rushing, and less stuff for the sake of stuff — and with more room for connection, independence, ordinary play, and the moments that happen when we stop trying to fill every space.</p>
              </div>
            </div>

            <div className="story-signature">
              <p>&mdash; Erika, Founder of Breezier Days</p>
            </div>

            <button type="button" className="back-button story-back-bottom" onClick={goBack}>
              ← Back to Breezier Days
            </button>
          </section>
        )}

        {children.length > 0 && (() => {
          const activeChild = children.find(c => c.id === selectedChildForHelp) ?? children[0];
          const childAgeId = getChildGuidanceAge(activeChild.age);
          const childStageLabel = ageGroups.find(a => a.id === childAgeId)?.label ?? activeChild.age;
          if (children.length === 1) {
            return (
              <div className="child-switcher-bar child-switcher-single">
                <button type="button" className="child-switcher-button child-switcher-button-static" onClick={() => scrollToChildProfile(activeChild.id)}>
                  <span className="child-switcher-avatar">👧</span>
                  <span className="child-switcher-info">
                    <strong>{activeChild.name}</strong>
                    <small>{activeChild.age} · {childStageLabel}</small>
                  </span>
                </button>
              </div>
            );
          }
          return (
            <div className="child-switcher-bar">
              <button type="button" className="child-switcher-button" onClick={() => setShowChildSwitcher(s => !s)}>
                <span className="child-switcher-avatar">👧</span>
                <span className="child-switcher-info">
                  <strong>{activeChild.name}</strong>
                  <small>{activeChild.age} · {childStageLabel}</small>
                </span>
                <span className="child-switcher-arrow">▼</span>
              </button>
              {showChildSwitcher && (
                <div className="child-switcher-dropdown">
                  {children.map(c => (
                    <button key={c.id} type="button"
                      className={`child-switcher-option ${selectedChildForHelp === c.id ? 'active' : ''}`}
                      onClick={() => scrollToChildProfile(c.id)}
                    >
                      <span>👧</span>
                      <span><strong>{c.name}</strong><small>{c.age}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {children.length > 0 && selectedHelpChild && (() => {
          return (
            <div className="for-child-area">
              <p className="for-child-label">FOR {selectedHelpChild.name.toUpperCase()}</p>
              <div className="for-child-grid">
                <button type="button" className="for-child-chip for-child-chip-primary" onClick={() => selectHelp('help-now')}>
                  <span>💡</span><small>What Do I Do Now?</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('mealtime')}>
                  <span>🍎</span><small>Food</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('activities')}>
                  <span>🎨</span><small>Activities</small>
                </button>
                <button type="button" className="for-child-chip" onClick={openLearning}>
                  <span>📚</span><small>Learning</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('sleep')}>
                  <span>😴</span><small>Sleep</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('feelings')}>
                  <span>💛</span><small>Feelings &amp; Behavior</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('health')}>
                  <span>🩺</span><small>Common Problems</small>
                </button>
                <button type="button" className="for-child-chip" onClick={() => selectHelp('development')}>
                  <span>🌱</span><small>Development</small>
                </button>
                <button type="button" className="for-child-chip" onClick={openHomeReset}>
                  <span>🏠</span><small>Home Reset</small>
                </button>
              </div>
            </div>
          );
        })()}

        {showTakingOver && (
          <div className="taking-over-modal-overlay" onClick={goBack}>
            <div className="taking-over-modal" onClick={e => e.stopPropagation()}>
              <div className="taking-over-header">
                <h3>👨‍👩‍👧 I'm Taking Over</h3>
                <button type="button" onClick={goBack} aria-label="Close">✕</button>
              </div>
              <p className="taking-over-subtitle">Everything you need when you're stepping in to care for a little one.</p>

              <div className="taking-over-section">
                <label>Who am I caring for?</label>
                <div className="taking-over-choices">
                  {([['baby','Baby'],['toddler','Toddler'],['preschool','Preschooler'],['bigkid','School Age'],['tween','Tween (9–12)'],['multiple','Multiple kids']] as const).map(([val, label]) => (
                    <button key={val} type="button"
                      className={`taking-over-choice ${takingOverAge === val ? 'selected' : ''}`}
                      onClick={() => setTakingOverAge(val)}
                    >{label}</button>
                  ))}
                </div>
              </div>

              <div className="taking-over-section">
                <label>How much time?</label>
                <div className="taking-over-choices">
                  {['5 min','10 min','30 min','1 hour','A few hours','All afternoon'].map(t => (
                    <button key={t} type="button"
                      className={`taking-over-choice ${takingOverTime === t ? 'selected' : ''}`}
                      onClick={() => setTakingOverTime(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div className="taking-over-section">
                <label>What's going on?</label>
                <div className="taking-over-choices">
                  {takingOverSituations.map(s => (
                    <button key={s.id} type="button"
                      className={`taking-over-choice ${takingOverSituation === s.id ? 'selected' : ''}`}
                      onClick={() => setTakingOverSituation(s.id)}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="taking-over-section">
                <label>Caregiver energy</label>
                <div className="taking-over-choices">
                  {([['high','I have energy'],['some','I have some energy'],['exhausted',"I'm exhausted"]] as const).map(([val, label]) => (
                    <button key={val} type="button"
                      className={`taking-over-choice ${takingOverEnergy === val ? 'selected' : ''}`}
                      onClick={() => setTakingOverEnergy(val)}
                    >{label}</button>
                  ))}
                </div>
              </div>

              <button type="button" className="taking-over-generate" onClick={buildTakingOverPlan}
                disabled={!takingOverSituation}
              >Give me a plan</button>

              {takingOverPlan && (
                <div className="taking-over-result">
                  <div className="taking-over-step"><div className="taking-over-step-label">RIGHT NOW</div><p>{takingOverPlan.rightNow}</p></div>
                  <div className="taking-over-step"><div className="taking-over-step-label">NEXT</div><p>{takingOverPlan.next}</p></div>
                  {isPremium && (
                    <>
                      <div className="taking-over-step"><div className="taking-over-step-label">IF THAT DOESN'T WORK</div><p>{takingOverPlan.ifNotWorking}</p></div>
                      <div className="taking-over-step"><div className="taking-over-step-label">KEEP THEM BUSY</div><p>{takingOverPlan.keepBusy}</p></div>
                      <div className="taking-over-step"><div className="taking-over-step-label">NEXT TRANSITION</div><p>{takingOverPlan.nextTransition}</p></div>
                    </>
                  )}
                </div>
              )}

              {takingOverPlan && isPremium && (() => {
                const dedupeKey = 'Taking Over Plan::Caregiver Help';
                const isSaved = recentlySavedAnswer.has(dedupeKey) || savedIdeas.some(i => i.title === 'Taking Over Plan' && i.category === 'Caregiver Help');
                return (
                <button type="button" className="save-help-button" style={{ marginTop: 12, width: '100%' }}
                  disabled={isSaved}
                  onClick={() => {
                    saveIdea({
                      title: 'Taking Over Plan',
                      category: 'Caregiver Help',
                      emoji: '👨‍👩‍👧',
                      description: takingOverPlan.rightNow,
                      meta: `Taking Over · ${takingOverTime} · ${takingOverSituation}`,
                    });
                  }}
                >{isSaved ? '✓ Saved' : '❤️ Save this answer'}</button>
                );
              })()}

              {takingOverPlan && !isPremium && (
                <div className="help-now-premium-upsell" style={{ marginTop: 16, padding: 18, borderRadius: 16, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.12)' }}>
                  <strong>🔒 Get the Full Caregiver Plan with Premium</strong>
                  <p style={{ margin: '8px 0 12px', color: '#68716a', lineHeight: 1.55, fontSize: 13 }}>
                    Premium unlocks: backup strategies, keep-them-busy ideas, next-transition planning, age-specific strategies, multiple-child strategies, low-energy caregiver plans, and the ability to save your plans.
                  </p>
                  <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>✦ Unlock Premium — $4.99/month</button>
                </div>
              )}
            </div>
          </div>
        )}

<section className="hero" ref={helpSectionRef}>
          <p className="hero-label">YOUR STARTING POINT</p>
          <h2>{greeting}. <span style={{ fontSize: '0.6em', color: 'var(--soft-pink, #e97891)' }}>❤️</span></h2>
          <p className="hero-text" style={{ marginBottom: 12 }}>Let's make the next part of today easier.</p>
          <p className="hero-text">
            {selectedStage === 'expecting'
              ? 'You\'re in your expecting-parent season. Choose what would make today feel simpler.'
              : selectedStage === 'newparent'
              ? 'You\'re in the new-parent season. Choose what would save you the most time or mental energy right now.'
              : 'Whether you\'re a parent, nanny, grandparent, or caregiver — choose what is happening right now and we\'ll help you find a practical next step.'}
          </p>

          <div className="personalize-top-card" aria-label="Choose who you need help for">
            <div className="personalize-top-heading">
              <div>
                <p className="mood-check-in-label">Who are you getting help for?</p>
                <small>Add your children here to personalize ideas, guidance, and plans for each one.</small>
              </div>
              {homePersonChosen && (
                <span className="personalize-top-status">✓ Set</span>
              )}
            </div>

            {children.length > 0 ? (
              <>
                <div className="personalize-top-options">
                  <button type="button" className={`personalize-top-option ${selectedStage === 'expecting' && selectedChildForHelp === null ? 'selected' : ''}`} onClick={() => selectTopPerson({ type: 'stage', id: 'expecting' })}>
                    <span>🤍</span><strong>Baby on the way</strong><small>Pregnancy</small>
                  </button>
                  {children.map(child => (
                    <button key={child.id} type="button" className={`personalize-top-option ${selectedChildForHelp === child.id ? 'selected' : ''}`} onClick={() => selectTopPerson({ type: 'child', id: child.id })}>
                      <span>👧</span><strong>{child.name}</strong><small>{child.age}</small>
                    </button>
                  ))}
                </div>
                <button type="button" className="personalize-add-child" onClick={() => setShowChildForm(true)}>
                  ＋ Add another child for more personalized help
                </button>
              </>
            ) : (
              <>
                <label className="personalize-top-select-wrap">
                  <span className="sr-only">Choose an age or stage</span>
                  <select
                    className="personalize-top-select"
                    value={homePersonChosen ? (selectedStage === 'expecting' ? 'expecting' : selectedAge) : ''}
                    onChange={(e) => {
                      const value = e.target.value as ParentingStageId;
                      if (!value) return;
                      if (value === 'expecting') {
                        selectTopPerson({ type: 'stage', id: 'expecting' });
                      } else {
                        selectTopPerson({ type: 'stage', id: value as AgeId });
                      }
                    }}
                  >
                    <option value="">Choose an age or stage…</option>
                    <option value="expecting">🤍 Baby on the way</option>
                    <option value="baby">👶 Baby · 0–12 months</option>
                    <option value="toddler">🧸 Toddler · 1–2 years</option>
                    <option value="preschool">🦋 Preschooler · 3–5 years</option>
                    <option value="bigkid">🎒 School Age · 6–8 years</option>
                    <option value="tween">🧩 Tween · 9–12 years</option>
                  </select>
                </label>
                <button type="button" className="personalize-add-child" onClick={() => setShowChildForm(true)}>
                  ＋ Add a child for more personalized help
                </button>
              </>
            )}
          </div>

          <div className="mood-check-in">
            <p className="mood-check-in-label">How's today going?</p>
            <div className="mood-choices">
              {moodOptions.map((mood) => (
                <button
                  type="button"
                  key={mood.id}
                  className={`mood-chip ${dayMood === mood.id ? 'mood-chip-selected' : ''}`}
                  onClick={() => selectMood(mood.id)}
                >
                  <span className="mood-chip-emoji">{mood.emoji}</span>
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          <section className="make-today-easier" aria-label="Make today easier" style={{ marginTop: 22, padding: '20px 18px', borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 5 }}>MAKE TODAY EASIER</p>
                <h3 style={{ margin: 0, fontSize: 22 }}>What's making today harder?</h3>
                <p style={{ margin: '6px 0 0', color: '#68716a', lineHeight: 1.5, maxWidth: 650 }}>Pick one. Breezier Days will point you to the most useful next step instead of making you sort through everything.</p>
              </div>
              {easeNeed && easeTime && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#496455', background: '#edf2ec', borderRadius: 999, padding: '7px 10px' }}>
                  {easeTime === '2' ? '2 minutes' : easeTime === '10' ? '10 minutes' : easeTime === '30' ? '30 minutes' : 'More time'}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 9, marginTop: 14 }}>
              {[
                ['child', '👧', 'My child'],
                ['schedule', '🗓️', 'My schedule'],
                ['house', '🏠', 'My house'],
                ['meals', '🍽️', 'Meals'],
                ['overwhelmed', '💛', "I'm overwhelmed"],
                ['other', '✨', 'Something else'],
              ].map(([id, emoji, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEaseNeed(id as EaseNeed)}
                  aria-pressed={easeNeed === id}
                  style={{
                    border: easeNeed === id ? '1.5px solid #496455' : '1px solid rgba(95, 105, 94, 0.14)',
                    background: easeNeed === id ? '#edf2ec' : '#fffdf9',
                    borderRadius: 16,
                    padding: '11px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 800,
                    color: '#34433a',
                    boxShadow: easeNeed === id ? '0 7px 18px rgba(73,100,85,.10)' : 'none',
                  }}
                >
                  <span style={{ marginRight: 7 }}>{emoji}</span>{label}
                </button>
              ))}
            </div>

            {easeNeed && (
              <div style={{ marginTop: 14 }}>
                <p className="eyebrow" style={{ marginBottom: 7 }}>HOW MUCH TIME DO YOU HAVE?</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['2', '2 min'], ['10', '10 min'], ['30', '30 min'], ['longer', 'More time']].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEaseTime(id as EaseTime)}
                      aria-pressed={easeTime === id}
                      style={{
                        border: easeTime === id ? '1.5px solid #496455' : '1px solid rgba(95, 105, 94, 0.14)',
                        background: easeTime === id ? '#edf2ec' : '#fffdf9',
                        borderRadius: 14,
                        padding: '9px 13px',
                        cursor: 'pointer',
                        fontWeight: 800,
                        color: '#496455',
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            )}

            {easeNeed && easeTime && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: '#68716a', lineHeight: 1.45, fontSize: 14 }}>You don't have to solve everything today. Let's find the next useful thing.</p>
                <button type="button" className="primary-button" onClick={openEaseNextStep}>
                  Show me the next step →
                </button>
              </div>
            )}
          </section>

          {homePersonChosen && (
            <section className="home-next-step" aria-label="Your next best step">
              <div className="home-next-step-copy">
                <p className="eyebrow">A GOOD PLACE TO START</p>
                <h3>{selectedChildForHelp ? `Help for ${children.find(c => c.id === selectedChildForHelp)?.name}` : selectedStage === 'expecting' ? 'Support for your season' : `Ideas for your ${currentAge?.label?.toLowerCase() || 'stage'}`}</h3>
                <p>{dayMood === 'good' ? 'Keep the good day simple. Pick one useful thing and leave the rest for later.' : 'Tell us what is happening, or choose something practical for the next part of today.'}</p>
              </div>
              <div className="home-next-step-actions">
                <button type="button" className="home-next-step-primary" onClick={openHelpNow}>
                  💡 What Do I Do Now?
                </button>
                <button type="button" className="home-next-step-secondary" onClick={() => selectHelp('activities')}>
                  ✨ Find an activity
                </button>
              </div>
            </section>
          )}

          {dayMood === 'good' && (
            <div className="mood-response-card" role="status" aria-live="polite">
              <div className="mood-response-copy">
                <strong>Nice. You don't need to turn a good day into a project.</strong>
                <p>What would make the next part of today a little easier?</p>
              </div>
              <div className="mood-response-actions">
                <button type="button" className="secondary-button" onClick={() => selectHelp('activities')}>
                  ✨ Find an activity
                </button>
                <button type="button" className="secondary-button" onClick={() => selectHelp('mealtime')}>
                  🍽️ Find a meal
                </button>
                <button type="button" className="secondary-button" onClick={openHomeReset}>
                  🏠 Home Reset
                </button>
                <button type="button" className="secondary-button" onClick={openHelpNow}>
                  💡 I need help
                </button>
              </div>
            </div>
          )}


        <section className="just-tell-me-section" ref={justTellMeRef}>
          <div className="section-heading">
            <p className="eyebrow" style={{ color: '#496455', fontWeight: 800, letterSpacing: '.12em' }}>LESS FIGURING IT OUT</p>
            <h2>Just tell me what's happening.</h2>
            <p className="personalized-help-note"><strong>Free:</strong> Get 5 personalized practical answers each month. Premium makes personalized help unlimited and adds full game plans.</p>
            <p>
              One sentence is enough. Breezier Days will turn it into one practical next step.
            </p>
            <p className="help-now-usage-bar" style={{ marginTop: 12 }}>
              {isPremium
                ? <span className="help-now-usage-count">✦ Premium · Unlimited personalized help + full game plans</span>
                : personalizedHelpUsage < FREE_PERSONALIZED_HELP_LIMIT
                ? <span className="help-now-usage-count">✓ Free · {FREE_PERSONALIZED_HELP_LIMIT - personalizedHelpUsage} personalized {FREE_PERSONALIZED_HELP_LIMIT - personalizedHelpUsage === 1 ? 'answer' : 'answers'} left this month</span>
                : <span className="help-now-usage-count">✦ You've used this month's personalized answers · Premium makes them unlimited</span>}
            </p>
          </div>

          {false && !isPremium && personalizedHelpUsage >= FREE_PERSONALIZED_HELP_LIMIT ? (
            <div className="help-now-locked">
              <div className="help-now-locked-icon">🔒</div>
              <h3>You've used your {FREE_PERSONALIZED_HELP_LIMIT} free personalized answers this month.</h3>
              <p>Get deeper, personalized game plans for the parenting and childcare situations you're dealing with right now.</p>
              <ul className="help-now-premium-list">
                <li>Unlimited What Do I Do Now? help</li>
                <li>Full game plans</li>
                <li>Personalized guidance</li>
                <li>Age-specific strategies</li>
                <li>What to say</li>
                <li>What to do next</li>
                <li>Backup strategies</li>
                <li>What to avoid</li>
                <li>Related help</li>
                <li>Save your answers</li>
              </ul>
              <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>
                ✦ Unlock unlimited help with Premium — $4.99/month
              </button>
            </div>
          ) : (
            <>
              <div className="just-tell-me-form">
                <textarea
                  value={justTellMeText}
                  onChange={(e) => setJustTellMeText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleJustTellMe();
                  }}
                  placeholder="Example: My toddler is melting down and I need to make dinner."
                  rows={3}
                />
                <button type="button" className="just-tell-me-cta" onClick={handleJustTellMe} disabled={!justTellMeText.trim()}>
                  ✨ Tell me what to do
                </button>
              </div>

              <div className="just-tell-me-examples">
                <button type="button" onClick={() => setJustTellMeText('My toddler is melting down and I need to make dinner.')}>"Toddler meltdown + dinner"</button>
                <button type="button" onClick={() => setJustTellMeText('My baby will not sleep and I am exhausted.')}>"Baby won't sleep"</button>
                <button type="button" onClick={() => setJustTellMeText('My preschooler is picky and I need an easy lunch.')}>"Preschool lunch"</button>
                <button type="button" onClick={() => setJustTellMeText('My kids are fighting and I need to get something done.')}>"Kids fighting + busy"</button>
                <button type="button" onClick={() => setJustTellMeText('I have no energy and my toddler needs something to do.')}>"No energy + toddler"</button>
                <button type="button" onClick={() => setJustTellMeText('My 3-year-old doesn\'t speak as clearly as other kids.')}>"Preschooler speech concern"</button>
              </div>

              {justTellMeResult && (
                <section className="just-tell-me-result">
                  <p className="eyebrow">HERE'S YOUR NEXT STEP</p>
                  <div className="just-tell-me-result-title">
                    <span>{justTellMeResult.emoji}</span>
                    <div>
                      <h3>{justTellMeResult.title}</h3>
                      <small>Based on: {justTellMeTitle}</small>
                    </div>
                  </div>
                  <div className="just-tell-me-result-grid">
                    <div><strong>DO THIS NOW</strong><p>{justTellMeResult.doNow}</p></div>
                    <div><strong>SAY THIS</strong><p>"{justTellMeResult.sayThis}"</p></div>
                    <div><strong>AVOID THIS</strong><p>{justTellMeResult.avoidThis}</p></div>
                    <div><strong>AFTERWARD</strong><p>{justTellMeResult.afterward}</p></div>
                  </div>
                  {isPremium && justTellMeDeepDive.length > 0 && (
                    <div className="deep-dive" style={{ marginTop: 24, padding: 24, borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)' }}>
                      <div className="deep-dive-heading" style={{ marginBottom: 6 }}>
                        <p className="eyebrow">A LITTLE DEEPER</p>
                        <h3>When you want more context</h3>
                        <p>Short, practical context—without turning this into a giant article.</p>
                      </div>
                      {justTellMeDeepDive.map((item) => (
                        <div className="deep-dive-item" key={item.heading} style={{ padding: '15px 0', borderTop: '1px solid rgba(95, 105, 94, 0.10)' }}>
                          <h4 style={{ margin: '0 0 6px', color: '#6d5542', fontSize: 13 }}>{item.heading}</h4>
                          <p style={{ margin: 0, color: '#68716a', lineHeight: 1.6 }}>{item.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {isPremium ? (
                    <>
                      <div className="refine-section">
                        <p className="eyebrow" style={{ marginBottom: 10 }}>MAKE THIS MORE SPECIFIC</p>
                        <p style={{ margin: '0 0 12px', color: '#68716a', lineHeight: 1.55, fontSize: 14 }}>What else is going on for your child right now? Pick one and Breezier Days will refine the advice.</p>
                        <div className="refine-context-grid">
                          {refineContextOptions.map(opt => (
                            <button key={opt.id} type="button"
                              className={`refine-context-chip ${refineContext === opt.id ? 'selected' : ''}`}
                              onClick={() => setRefineContext(opt.id)}
                            >
                              <span>{opt.emoji}</span>
                              <strong>{opt.label}</strong>
                            </button>
                          ))}
                        </div>
                        <button type="button" className="primary-button refine-button" disabled={!refineContext} onClick={handleRefine}>
                          ✨ Refine this advice
                        </button>
                      </div>

                      {refinedResult && (
                        <div className="refined-result">
                          <p className="eyebrow">HERE'S YOUR REFINED ADVICE</p>
                          <div className="just-tell-me-result-title">
                            <span>{refinedResult.emoji}</span>
                            <div>
                              <h3>{refinedResult.title}</h3>
                              <small>Refined based on: {refineContextOptions.find(o => o.id === refineContext)?.label}</small>
                            </div>
                          </div>
                          <div className="just-tell-me-result-grid">
                            <div><strong>DO THIS NOW</strong><p>{refinedResult.doNow}</p></div>
                            <div><strong>SAY THIS</strong><p>"{refinedResult.sayThis}"</p></div>
                            <div><strong>AVOID THIS</strong><p>{refinedResult.avoidThis}</p></div>
                            <div><strong>AFTERWARD</strong><p>{refinedResult.afterward}</p></div>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const dedupeKey = `${justTellMeResult.title}::Caregiver Help`;
                        const isSaved = recentlySavedAnswer.has(dedupeKey) || savedIdeas.some(i => i.title === justTellMeResult.title && i.category === 'Caregiver Help');
                        return (
                      <button type="button" className="save-help-button" style={{ marginTop: 16 }} disabled={isSaved} onClick={saveJustTellMeResult}>{isSaved ? '✓ Saved' : '❤️ Save this answer'}</button>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="help-now-premium-upsell" style={{ marginTop: 20, padding: 20, borderRadius: 18, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.12)' }}>
                      <strong>🔒 Get the Full Game Plan with Premium</strong>
                      <p style={{ margin: '8px 0 12px', color: '#68716a', lineHeight: 1.55 }}>Premium unlocks unlimited personalized help plus full game plans: what to say, what to avoid, what to do next, why this may be happening, age-specific strategies, related help, the ability to refine advice with context, and the ability to save this answer.</p>
                      <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>✦ Unlock Premium — $4.99/month</button>
                    </div>
                  )}
                </section>
              )}

              {justTellMeDevResult && (
                <section className="just-tell-me-result">
                  <p className="eyebrow">HERE'S YOUR DEVELOPMENT ANSWER</p>
                  <div className="just-tell-me-result-title">
                    <span>{justTellMeDevResult.emoji}</span>
                    <div>
                      <h3>{justTellMeDevResult.title}</h3>
                      <small>Based on: {justTellMeTitle}</small>
                    </div>
                  </div>
                  <div className="just-tell-me-result-grid">
                    <div><strong>WHAT'S COMMON AT THIS AGE</strong><p>{justTellMeDevResult.common}</p></div>
                    {isPremium && <div><strong>WHAT TO WATCH FOR</strong><p>{justTellMeDevResult.watchFor}</p></div>}
                    {isPremium && <div><strong>WHAT YOU CAN DO</strong><p>{justTellMeDevResult.whatYouCanDo}</p></div>}
                    {isPremium && <div><strong>WHEN TO ASK ABOUT IT</strong><p>{justTellMeDevResult.whenToAsk}</p></div>}
                  </div>
                  {isPremium && justTellMeDevResult.deepDive.length > 0 && (
                    <div className="deep-dive" style={{ marginTop: 24, padding: 24, borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)' }}>
                      <div className="deep-dive-heading" style={{ marginBottom: 6 }}>
                        <p className="eyebrow">A LITTLE DEEPER</p>
                        <h3>When you want more context</h3>
                      </div>
                      {justTellMeDevResult.deepDive.map((item) => (
                        <div className="deep-dive-item" key={item.heading} style={{ padding: '15px 0', borderTop: '1px solid rgba(95, 105, 94, 0.10)' }}>
                          <h4 style={{ margin: '0 0 6px', color: '#6d5542', fontSize: 13 }}>{item.heading}</h4>
                          <p style={{ margin: 0, color: '#68716a', lineHeight: 1.6 }}>{item.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="remember-box" style={{ marginTop: 20 }}>
                    <strong>💛 Remember</strong>
                    <p>Milestones are developmental guides, not rigid deadlines. If you are concerned, you do not need to wait — contact your healthcare professional. This information is not a diagnosis.</p>
                  </div>
                  {isPremium ? (
                    (() => {
                      const dedupeKey = `${justTellMeDevResult.title}::Development`;
                      const isSaved = recentlySavedAnswer.has(dedupeKey) || savedIdeas.some(i => i.title === justTellMeDevResult.title && i.category === 'Development');
                      return (
                    <button type="button" className="save-help-button" style={{ marginTop: 16 }} disabled={isSaved} onClick={saveJustTellMeDevResult}>{isSaved ? '✓ Saved' : '❤️ Save this answer'}</button>
                      );
                    })()
                  ) : (
                    <div className="help-now-premium-upsell" style={{ marginTop: 20, padding: 20, borderRadius: 18, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.12)' }}>
                      <strong>🔒 Get the Full Game Plan with Premium</strong>
                      <p style={{ margin: '8px 0 12px', color: '#68716a', lineHeight: 1.55 }}>Premium unlocks: What to watch for, what you can do, when to ask about it, deeper context, and the ability to save this answer.</p>
                      <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>✦ Unlock Premium — $4.99/month</button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>

          <div className="supportive-message">
            <p>{supportiveMessage}</p>
          </div>

          <button type="button"
            className="help-now-button"
            aria-label="What Do I Do Now?"
            onClick={() => {
              selectHelp('help-now');
            }}
          >
            <span className="help-now-icon">💡</span>
            <span>
              <strong>WHAT DO I DO NOW?</strong>
              <small>Stuck with a tricky moment? Start here.</small>
            </span>
            <b>→</b>
          </button>

          <button type="button"
            className="help-now-button taking-over-hero-button secondary-home-action"
            aria-label="I'm Taking Over"
            onClick={() => { pushNavHistory(); setShowTakingOver(true); }}
            style={{ background: 'linear-gradient(135deg, #496455, #5d7e6a)', marginTop: 10 }}
          >
            <span className="help-now-icon" style={{ background: 'rgba(255,255,255,.2)' }}>👨‍👩‍👧</span>
            <span>
              <strong>I'M TAKING OVER</strong>
              <small>Everything you need when you're stepping in to care for a little one.</small>
            </span>
            <b>→</b>
          </button>
        </section>

        <section className="common-problems-section">
          <div className="section-heading">
            <p className="eyebrow">QUICK HELP</p>
            <h2>What's happening right now?</h2>
            <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
              Choose a problem below to get a practical next step — sleep, food, feelings, potty, health, and more.
            </p>
          </div>
          <div className="help-dropdowns">
            {[
              { id: 'daily-care', title: 'Daily Care', emoji: '🧺', ids: ['potty', 'sleep', 'mealtime', 'dressed-now', 'screen-now'] },
              { id: 'behavior-feelings', title: 'Behavior & Feelings', emoji: '💛', ids: ['feelings', 'siblings', 'bullying'] },
              { id: 'baby-care', title: 'Baby Care', emoji: '👶', ids: ['feeding', 'health'] },
              { id: 'activities-learning', title: 'Activities & Learning', emoji: '🎨', ids: ['activities', 'development'] },
              { id: 'home-family', title: 'Home & Family', emoji: '🏠', ids: ['overwhelmed', 'help-now'] },
            ].map((group) => {
              const groupOptions = visibleHelpOptions.filter((help) => group.ids.includes(help.id));
              if (groupOptions.length === 0) return null;
              const isGroupOpen = groupOptions.some((help) => selectedHelp === help.id);
              return (
                <details key={group.id} className="help-dropdown" open={isGroupOpen}>
                  <summary>
                    <span className="help-dropdown-title">
                      <span className="help-dropdown-icon">{group.emoji}</span>
                      <span>
                        <strong>{group.title}</strong>
                        <small>{groupOptions.length} {groupOptions.length === 1 ? 'topic' : 'topics'}</small>
                      </span>
                    </span>
                    <span className="help-dropdown-chevron">⌄</span>
                  </summary>
                  <div className="help-dropdown-options">
                    {groupOptions.map((help) => (
                      <button type="button" key={help.id}
                        className={`help-button ${selectedHelp === help.id ? 'selected' : ''}`}
                        onClick={() => selectHelp(help.id)}
                      >
                        <span>{help.emoji}</span>
                        <div><strong>{help.title}</strong><small>{help.description}</small></div>
                        <b>→</b>
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* These destinations now live in Explore/Home's primary quick actions.
            Keeping duplicate cards here made the main experience feel longer and repetitive. */}
        {!isPremium && (
          <section className="premium-preview-showcase">
            <div className="premium-preview-showcase-heading">
              <span className="premium-preview-badge">✦ SEE PREMIUM IN ACTION</span>
              <h2>Breezier Days gets more useful when it knows your situation.</h2>
              <p>Three examples of how Premium can use your time, energy, and what you already have to give you a more useful next step.</p>
            </div>
            <div className="premium-preview-showcase-grid">
              <div className="premium-preview-showcase-card"><span>⏱️</span><strong>Time-Based Recommendations</strong><p><b>“I have 15 minutes.”</b></p><small>Premium narrows the choices to a few realistic activities that actually fit your window.</small></div>
              <div className="premium-preview-showcase-card"><span>🏠</span><strong>Home Reset</strong><p><b>“I have 15 minutes and no energy.”</b></p><small>Premium prioritizes the reset that will make the biggest difference without giving you a giant cleaning list.</small></div>
              <div className="premium-preview-showcase-card"><span>🥘</span><strong>What Can I Make With What I Have?</strong><p><b>“I have chicken thighs, rice and cheese.”</b></p><small>Premium gives you 2–3 easy meal ideas and lets you save the ones your family actually likes.</small></div>
            </div>
            <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('personalized-daily-plan')}>✦ See Everything Premium Can Do</button>
          </section>
        )}

<section className="development-section" ref={developmentRef}>
          <div className="development-heading">
            <div>
              <span className="development-kicker">Grow together</span>
              <h2>🧠 Growing and Learning</h2>
              <p>
                Age-appropriate ideas for communication, movement, social-emotional skills, and thinking.
              </p>
            </div>
          </div>

          {!selectedHelpChild ? (
            <div className="development-empty">
              <strong>👧 Choose a child first</strong>
              <span>Select a child below to see personalized ideas for their age.</span>
            </div>
          ) : (
            <>
              <div className="development-child-banner">
                <span>Personalized for <strong>{selectedHelpChild.name}</strong> · {selectedHelpChild.age}</span>
              </div>

              <div className="development-grid">
                {developmentSuggestions.map((activity) => {
                  const completed = (selectedHelpChild.development || []).some(
                    saved => saved.title === activity.title && saved.completed
                  );

                  return (
                    <div className={`development-card ${completed ? 'completed' : ''}`} key={activity.title}>
                      <div className="development-area">{activity.area}</div>
                      <h3>{activity.title}</h3>
                      <p>{activity.description}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const existing = (selectedHelpChild.development || []).find(
                            saved => saved.title === activity.title
                          );
                          if (existing) {
                            toggleDevelopmentActivity(existing.id);
                          } else {
                            addDevelopmentActivity(activity);
                          }
                        }}
                      >
                        {completed ? '✓ We tried this' : '✨ Try this today'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {(selectedHelpChild.development || []).length > 0 && (
                <div className="development-progress">
                  <strong>💛 {selectedHelpChild.name}'s activities</strong>
                  <span>
                    {(selectedHelpChild.development || []).filter(activity => activity.completed).length} completed
                  </span>
                  <div className="development-saved-list">
                    {(selectedHelpChild.development || []).map(activity => (
                      <div className={`development-saved-item ${activity.completed ? 'done' : ''}`} key={activity.id}>
                        <span>{activity.completed ? '✓' : '○'} {activity.title}</span>
                        <button type="button" onClick={() => removeDevelopmentActivity(activity.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="child-profiles" ref={toolsRef}>
          <div className="child-profiles-heading">
            <span>PERSONALIZE YOUR APP</span>
            <h2>👧 Who are you caring for?</h2>
            <p>Create a profile for each child. Get ideas personalized to their age and stage — free for unlimited children.</p>
          </div>



          {children.map(child => (
            <div key={child.id} className={`child-card ${selectedChildId === child.id ? 'selected' : ''}`}>
              <button type="button" className="child-select" onClick={() => scrollToChildProfile(child.id)}>
                <span className="child-avatar">👧</span>
                <span><strong>{child.name}</strong><small>{child.age} · {child.notes.length} {child.notes.length === 1 ? 'note' : 'notes'}</small></span>
              </button>
              <button type="button" className="child-delete" onClick={() => deleteChild(child.id)} aria-label={`Delete ${child.name}`}>×</button>
            </div>
          ))}

          {selectedChildId !== null && (() => {
            const child = children.find(c => c.id === selectedChildId);
            if (!child) return null;
            return (
              <div className="child-profile">
                <div className="child-profile-top">
                  <div><b>👧 {child.name}</b><small>{child.age}</small></div>
                  <button type="button" onClick={() => setSelectedChildId(null)}>Close</button>
                </div>

                {(() => {
                  const temperamentLocked = isFeatureLocked('temperament-personalization');
                  return (
                    <>
                      {temperamentLocked && (
                        <div className="premium-locked-inline temperament-locked">
                          <div className="premium-locked-icon-sm">🌈</div>
                          <div>
                            <strong>Temperament Personalization — Premium</strong>
                            <p>Save a few temperament traits for {child.name} and What Do I Do Now? will tailor its guidance to fit your child's personality.</p>
                            <button type="button" className="premium-unlock-button-sm" onClick={() => unlockPremium('temperament-personalization')}>✦ Unlock Premium</button>
                          </div>
                        </div>
                      )}
                      {!temperamentLocked && (
                        <div className="temperament-area">
                          <div className="temperament-heading">
                            <h4>🌈 {child.name}'s temperament</h4>
                            <p>Tap a few traits that fit. This helps personalize the advice in What Do I Do Now? — skip it if you're not sure yet.</p>
                          </div>
                          <div className="temperament-chips">
                            {temperamentTraits.map(trait => (
                              <button
                                type="button"
                                key={trait.id}
                                className={`temperament-chip ${child.traits.includes(trait.id) ? 'selected' : ''}`}
                                onClick={() => toggleTrait(trait.id)}
                              >
                                <span className="temperament-chip-emoji">{trait.emoji}</span>
                                {trait.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div style={{ marginTop: 18, padding: '18px', borderRadius: 18, background: '#faf7f1', border: '1px solid rgba(73,100,85,.12)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ margin: 0, color: '#26342c' }}>📋 Today's notes</h4>
                    <p style={{ margin: '4px 0 0', color: '#68716a', fontSize: 13 }}>Keep the little details here so you can see how the day is going at a glance.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {[
                      ['wakeTime', '☀️ Wake-up', '7:00 AM'],
                      ['napTime', '😴 Nap / quiet time', '1:00–2:30 PM'],
                      ['meals', '🍎 Meals / appetite', 'Ate well / picky at lunch'],
                      ['mood', '😊 Mood', 'Happy / tired / clingy'],
                      ['potty', '🚽 Potty', 'Accident / went well / N/A'],
                    ].map(([field, label, placeholder]) => (
                      <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#496455', fontSize: 12, fontWeight: 700 }}>
                        {label}
                        <input
                          value={child.dailyLog?.date === new Date().toISOString().slice(0, 10) ? (child.dailyLog?.[field as keyof DailyChildLog] ?? '') : ''}
                          onChange={e => updateDailyLog(field as keyof Omit<DailyChildLog, 'date'>, e.target.value)}
                          placeholder={placeholder}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 11px', borderRadius: 11, border: '1px solid rgba(73,100,85,.18)', fontFamily: 'inherit', fontSize: 13, background: '#fff' }}
                        />
                      </label>
                    ))}
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, color: '#496455', fontSize: 12, fontWeight: 700 }}>
                    📝 Anything to remember today
                    <textarea
                      value={child.dailyLog?.date === new Date().toISOString().slice(0, 10) ? (child.dailyLog?.note ?? '') : ''}
                      onChange={e => updateDailyLog('note', e.target.value)}
                      placeholder={`A quick note about ${child.name}'s day...`}
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 11, border: '1px solid rgba(73,100,85,.18)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', background: '#fff' }}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: '#f4f7f3', color: '#68716a', fontSize: 12, lineHeight: 1.5 }}>
                  💛 You do not have to fill this out every day. It is here to make the moments you want to remember easier to keep track of.
                </div>

                <div className="saved-help-preview">
                  ❤️ <strong>My Saved Help</strong>
                  <span>Personalized guidance for {child.name} can live here.</span>
                </div>

                <div className="saved-notes">
                  {child.notes.length === 0 ? <small>No notes saved yet.</small> : child.notes.map(note => (
                    <div className="saved-note" key={note.id}>
                      <span><b>{note.text}</b><small>{note.createdAt}</small></span>
                      <button type="button" onClick={() => deleteNote(note.id)}>×</button>
                    </div>
                  ))}


                <div className="saved-help-area">
                  <div className="saved-help-heading">
                    <div>
                      <h4>❤️ Saved Help</h4>
                      <p>Keep the advice you want to find again quickly.</p>
                    </div>
                  </div>

                  {(child.savedHelp || []).length === 0 ? (
                    <p className="empty-saved-help">No saved help yet. When something is useful, tap ❤️ Save this help.</p>
                  ) : (
                    <div className="saved-help-list">
                      {(child.savedHelp || []).map(saved => (
                        <div className="saved-help-item" key={saved.id}>
                          <div>
                            <strong>{saved.title}</strong>
                            <small>Saved {saved.savedAt}</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSavedHelp(saved.id)}
                            aria-label={`Remove ${saved.title} from saved help`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="reminders-area">
                  <div className="reminders-heading">
                    <div>
                      <h4>🧰 My Parenting Tools {isPremium ? '' : '· PREMIUM'}</h4>
                      <p>Save little things that make your days easier — routines, scripts, snack ideas, calming ideas, and more.</p>
                    </div>
                  </div>

                  {(() => {
                    const locked = isFeatureLocked('real-reminders');
                    return (
                      <>
                        {locked && (
                          <div className="premium-locked-inline">
                            <div className="premium-locked-icon-sm">🔔</div>
                            <div>
                              <strong>My Parenting Tools — Preview</strong>
                              <p>Save routines, scripts, and calming ideas that make parenting easier. Unlock Premium to create and save your own tools.</p>
                              <button type="button" className="premium-unlock-button-sm" onClick={() => unlockPremium('real-reminders')}>✦ Unlock Premium</button>
                            </div>
                          </div>
                        )}
                        <div className="tools-examples">
                          <small>Try saving things like:</small>
                          <div className="tools-example-chips">
                            <span>🛁 Bedtime routine</span>
                            <span>☀️ Morning routine</span>
                            <span>🧘 Calming ideas</span>
                            <span>💬 Helpful scripts</span>
                            <span>🍎 Snack ideas</span>
                          </div>
                        </div>
                        <div className="reminder-form">
                          <input
                            value={newReminderTitle}
                            onChange={e => setNewReminderTitle(e.target.value)}
                            placeholder="What's the tool? (e.g. Bedtime routine)"
                          />
                          <div className="reminder-form-buttons">
                            <button
                              type="button"
                              className="save-note"
                              onClick={addReminder}
                              disabled={!newReminderTitle.trim()}
                            >
                              {editingReminderId !== null ? 'Save changes' : '＋ Add tool'}
                            </button>
                            {editingReminderId !== null && (
                              <button type="button" className="cancel-edit-button" onClick={cancelEditReminder}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="saved-reminders">
                          {(child.reminders || []).length === 0 ? (
                            <small>No tools saved yet. Add your first one above.</small>
                          ) : (
                            (child.reminders || []).map(reminder => (
                              <div className={`saved-reminder ${reminder.notified ? 'completed' : ''}`} key={reminder.id}>
                                <div>
                                  <strong>{reminder.title}</strong>
                                </div>
                                <div className="reminder-actions">
                                  <button
                                    type="button"
                                    onClick={() => startEditReminder(reminder)}
                                    title="Edit tool"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleReminderComplete(reminder.id)}
                                    title={reminder.notified ? 'Mark incomplete' : 'Mark complete'}
                                  >
                                    {reminder.notified ? '↩' : '✓'}
                                  </button>
                                  <button type="button" onClick={() => deleteReminder(reminder.id)} title="Delete tool">
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                </div>
              </div>
            );
          })()}

          {!showChildForm ? (
            <button type="button" className="add-child" onClick={() => setShowChildForm(true)}>＋ Add child</button>
          ) : (
            <div className="child-form">
              <input value={childName} onChange={e => setChildName(e.target.value)} placeholder="Child's name" />
              <select value={childAge} onChange={e => setChildAge(e.target.value)}>
                <option value="">Choose age</option>
                <option>Newborn</option><option>0–12 months</option><option>1 year</option><option>2 years</option>
                <option>3 years</option><option>4 years</option><option>5 years</option><option>6–8 years</option>
                <option>9–12 years</option>
              </select>
              <div><button type="button" className="save-note" onClick={addChild} disabled={!childName.trim() || !childAge}>Save child</button>
              <button type="button" onClick={() => setShowChildForm(false)}>Cancel</button></div>
              <small>🔒 Profiles and notes stay in this browser. Don't enter sensitive medical information.</small>
            </div>
          )}
        </section>

        <style>{`
          .saved-ideas-card {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            padding: 14px 18px;
            margin-top: 14px;
            border: 1px solid rgba(95, 105, 94, 0.13);
            border-radius: 20px;
            background: #f8f5ef;
            color: #35443b;
            text-align: left;
            cursor: pointer;
            transition: 0.2s ease;
          }
          .saved-ideas-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(60, 65, 55, 0.08);
          }
          .saved-ideas-card-icon {
            width: 45px;
            height: 45px;
            flex: 0 0 45px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            background: #fde2e8;
            font-size: 22px;
          }
          .saved-ideas-card strong {
            display: block;
            font-size: 15px;
            margin-bottom: 4px;
          }
          .saved-ideas-card small {
            display: block;
            font-size: 12px;
            line-height: 1.35;
            opacity: 0.72;
          }
          .saved-ideas-card > b {
            font-size: 20px;
            opacity: 0.5;
          }
          .help-now-button {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            padding: 18px 20px;
            margin-top: 14px;
            border: 0;
            border-radius: 22px;
            background: #496455;
            color: #fffdf9;
            text-align: left;
            cursor: pointer;
            box-shadow: 0 12px 30px rgba(73, 100, 85, 0.22);
            transition: 0.2s ease;
          }
          .help-now-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 36px rgba(73, 100, 85, 0.28);
          }
          .help-now-icon {
            width: 50px;
            height: 50px;
            flex: 0 0 50px;
            display: grid;
            place-items: center;
            border-radius: 15px;
            background: rgba(255,255,255,0.15);
            font-size: 26px;
          }
          .help-now-button strong {
            display: block;
            font-size: 16px;
            margin-bottom: 4px;
            letter-spacing: 0.03em;
          }
          .help-now-button small {
            display: block;
            font-size: 13px;
            opacity: 0.82;
          }
          .help-now-button > b {
            font-size: 22px;
            opacity: 0.7;
          }
          .stage-section {
            margin-top: 24px;
            padding: 30px;
            background: #fffdf9;
            border-radius: 28px;
            box-shadow: 0 16px 40px rgba(60, 65, 55, 0.06);
          }
          .compact-person-selector-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
          .compact-person-selector-heading h2 { margin: 4px 0 6px; }
          .compact-person-selector-heading p:last-child { margin:0; color:#68716a; line-height:1.45; font-size:13px; max-width:620px; }
          .compact-person-select-wrap { display:block; margin-top:16px; }
          .compact-person-select { width:100%; min-height:52px; appearance:none; -webkit-appearance:none; padding:13px 44px 13px 16px; border:1px solid rgba(73,100,85,.16); border-radius:17px; background:#fffdf9; color:#26342c; font:inherit; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(60,65,55,.03); background-image:linear-gradient(45deg, transparent 50%, #68716a 50%),linear-gradient(135deg,#68716a 50%,transparent 50%); background-position:calc(100% - 21px) 22px,calc(100% - 15px) 22px; background-size:6px 6px,6px 6px; background-repeat:no-repeat; }
          .compact-person-select:focus-visible { outline:2px solid #496455; outline-offset:2px; }
          .compact-person-actions { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-top:8px; }
          .pregnancy-help-note { color:#496455; font-size:12px; }
          .pregnancy-help-note summary { cursor:pointer; font-weight:800; list-style:none; }
          .pregnancy-help-note summary::-webkit-details-marker { display:none; }
          .pregnancy-help-note p { margin:7px 0 0; max-width:620px; color:#68716a; line-height:1.45; }
          @media (max-width:640px) { .compact-person-selector { padding:20px 18px; border-radius:22px; } .compact-person-actions { align-items:flex-start; } .pregnancy-help-note { width:100%; } }
          .stage-section .section-heading {
            margin-bottom: 20px;
          }
          .stage-section .section-heading p:last-child {
            max-width: 680px;
            margin: 8px auto 0;
            color: #68716a;
            line-height: 1.5;
          }
          .stage-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .stage-card {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            min-height: 112px;
            padding: 16px;
            border: 1px solid rgba(95, 105, 94, 0.13);
            border-radius: 20px;
            background: #f8f5ef;
            color: #35443b;
            text-align: left;
            cursor: pointer;
            transition: 0.2s ease;
          }
          .stage-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(60, 65, 55, 0.08);
          }
          .stage-card.selected {
            background: #496455;
            color: white;
            border-color: #496455;
          }
          .stage-icon {
            width: 58px;
            height: 58px;
            flex: 0 0 58px;
            display: grid;
            place-items: center;
            border-radius: 18px;
            background: #f1e7dc;
            font-size: 29px;
          }
          .stage-card.selected .stage-icon {
            background: rgba(255,255,255,0.18);
          }
          .stage-copy {
            flex: 1;
          }
          .stage-copy strong, .stage-copy small, .stage-copy em {
            display: block;
          }
          .stage-copy strong {
            font-size: 15px;
            margin-bottom: 4px;
          }
          .stage-copy small {
            font-size: 12px;
            line-height: 1.35;
            opacity: 0.78;
          }
          .stage-copy em {
            margin-top: 6px;
            font-size: 10px;
            font-style: normal;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            opacity: 0.62;
          }
          .stage-card > b {
            font-size: 20px;
            opacity: 0.7;
          }
          .stage-card.selected > b {
            opacity: 1;
          }
          .just-tell-me-section {
            margin-top: 24px;
            padding: 36px 30px;
            background: linear-gradient(135deg, #f9f4ea 0%, #fffdf9 60%, #edf2ec 100%);
            border-radius: 28px;
            border: 1.5px solid rgba(73,100,85,.12);
            box-shadow: 0 20px 50px rgba(60, 65, 55, 0.10);
            text-align: center;
          }
          .just-tell-me-section h2 {
            font-family: Georgia, serif;
            font-size: 26px;
            color: #26342c;
            margin: 0 0 6px;
          }
          .just-tell-me-section > p {
            color: #5a6b5e;
            font-size: 15px;
            line-height: 1.55;
            max-width: 540px;
            margin: 0 auto;
          }
          .just-tell-me-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 22px auto 0;
            padding: 16px 32px;
            border-radius: 999px;
            background: #496455;
            color: #fff;
            font-size: 17px;
            font-weight: 800;
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(73,100,85,.25);
            transition: transform .2s ease, box-shadow .2s ease;
          }
          .just-tell-me-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(73,100,85,.30);
          }
          .just-tell-me-cta:active {
            transform: translateY(0);
          }
          .just-tell-me-form {
            max-width: 760px;
            margin: 20px auto 0;
          }
          .just-tell-me-form textarea {
            width: 100%;
            min-height: 100px;
            resize: vertical;
            padding: 16px;
            border: 1px solid rgba(95, 105, 94, 0.16);
            border-radius: 18px;
            background: #f8f5ef;
            color: #35443b;
            font: inherit;
            line-height: 1.5;
            outline: none;
          }
          .just-tell-me-form textarea:focus {
            border-color: #496455;
            box-shadow: 0 0 0 3px rgba(73,100,85,.10);
          }
          .just-tell-me-form .primary-button:disabled {
            opacity: .5;
            cursor: not-allowed;
          }
          .just-tell-me-examples {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
            margin-top: 12px;
          }
          .just-tell-me-examples button {
            border: 1px solid rgba(95, 105, 94, 0.12);
            border-radius: 999px;
            padding: 9px 13px;
            background: #f8f5ef;
            color: #496455;
            cursor: pointer;
          }
          .just-tell-me-result {
            max-width: 760px;
            margin: 22px auto 0;
            padding: 22px;
            border-radius: 22px;
            background: #f7f3ec;
            border: 1px solid rgba(95,105,94,.10);
            text-align: left;
          }
          .just-tell-me-result-title {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
          }
          .just-tell-me-result-title > span { font-size: 34px; }
          .just-tell-me-result-title h3 { margin: 0 0 4px; font-family: Georgia, serif; font-size: 25px; color: #26342c; }
          .just-tell-me-result-title small { color: #68716a; }
          .just-tell-me-result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .just-tell-me-result-grid > div { padding: 15px; border-radius: 16px; background: #fffdf9; }
          .just-tell-me-result-grid strong { display: block; margin-bottom: 6px; color: #98765b; font-size: 11px; letter-spacing: .1em; }
          .just-tell-me-result-grid p { margin: 0; color: #68716a; line-height: 1.55; }

          .day-plan-section { margin-top: 24px; padding: 30px; background: #fffdf9; border-radius: 28px; box-shadow: 0 16px 40px rgba(60, 65, 55, 0.06); }
          .saved-ideas-section { margin-top: 24px; padding: 30px; background: #fffdf9; border-radius: 28px; box-shadow: 0 16px 40px rgba(60,65,55,.06); }
          .saved-filter-row { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin:18px 0; }
          .saved-filter-row button { border:1px solid rgba(95,105,94,.14); border-radius:999px; padding:9px 14px; background:#f8f5ef; color:#496455; font-weight:800; cursor:pointer; }
          .saved-filter-row button.selected { background:#496455; color:white; border-color:#496455; }
          .saved-ideas-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
          .saved-idea-card { position:relative; display:flex; gap:13px; align-items:flex-start; padding:16px; border:1px solid rgba(95,105,94,.12); border-radius:18px; background:#f8f5ef; }
          .saved-idea-icon { width:44px; height:44px; flex:0 0 44px; display:grid; place-items:center; border-radius:14px; background:#f1e7dc; font-size:22px; }
          .saved-idea-copy { min-width:0; padding-right:18px; }
          .saved-idea-copy small { color:#98765b; font-weight:800; text-transform:uppercase; letter-spacing:.08em; font-size:10px; }
          .saved-idea-copy h3 { margin:4px 0 5px; font-family:Georgia,serif; color:#26342c; font-size:19px; }
          .saved-idea-copy p { margin:0; color:#68716a; line-height:1.5; font-size:13px; }
          .saved-idea-copy span { display:block; margin-top:7px; color:#8b938d; font-size:11px; }
          .saved-idea-remove { position:absolute; top:9px; right:10px; border:0; background:transparent; color:#8b938d; font-size:20px; cursor:pointer; }
          .saved-empty-state { padding:22px; border-radius:18px; background:#f7f3ec; text-align:center; color:#68716a; }
          .saved-empty-state > div { font-size:30px; margin-bottom:5px; }
          .saved-empty-state strong { display:block; color:#26342c; font-family:Georgia,serif; font-size:19px; }
          .saved-empty-state p { margin:6px auto 0; max-width:500px; line-height:1.5; font-size:13px; }
          .secondary-save-button { border:1px solid rgba(73,100,85,.18); border-radius:28px; padding:13px 18px; background:#f8f5ef; color:#496455; font-weight:800; cursor:pointer; }
          .day-mood-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px; }
          .day-mood-card { min-height: 86px; padding: 14px; border:1px solid rgba(95,105,94,.13); border-radius:18px; background:#f8f5ef; color:#35443b; cursor:pointer; text-align:left; transition:.2s ease; }
          .day-mood-card:hover { transform: translateY(-2px); }
          .day-mood-card.selected { background:#496455; color:white; border-color:#496455; }
          .day-mood-card span { display:block; font-size:24px; margin-bottom:7px; }
          .day-mood-card strong { font-size:13px; line-height:1.3; }
          .day-time-row { margin-top: 22px; display:grid; gap:10px; justify-items:center; }
          .day-time-options { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
          .day-time-options button { border:1px solid rgba(95,105,94,.14); border-radius:999px; padding:9px 14px; background:#f8f5ef; color:#496455; font-weight:800; cursor:pointer; }
          .day-time-options button.selected { background:#496455; color:white; border-color:#496455; }
          .day-plan-button { display:block; margin:22px auto 0; }
          .day-plan-result { margin-top:22px; padding:20px; border-radius:22px; background:#f7f3ec; border:1px solid rgba(95,105,94,.10); }
          .day-plan-intro { display:flex; gap:14px; align-items:flex-start; padding-bottom:15px; }
          .day-plan-intro > span { font-size:28px; }
          .day-plan-intro strong { display:block; color:#26342c; font-family:Georgia, serif; font-size:20px; }
          .day-plan-intro p { margin:5px 0 0; color:#68716a; line-height:1.5; }
          .day-plan-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
          .day-plan-card { padding:16px; border-radius:18px; background:#fffdf9; }
          .day-plan-card > span { font-size:24px; }
          .day-plan-card small { display:block; margin-top:8px; color:#98765b; font-weight:800; letter-spacing:.08em; font-size:10px; }
          .day-plan-card h3 { margin:6px 0 7px; font-family:Georgia, serif; color:#26342c; font-size:20px; }
          .day-plan-card p { margin:0 0 9px; color:#68716a; line-height:1.5; font-size:13px; }
          .day-plan-card b { color:#496455; font-size:11px; }
          .day-plan-morning { margin-top:12px; padding:15px; border-radius:17px; background:#edf2ec; color:#35443b; }
          .day-plan-morning p { margin:5px 0 0; color:#68716a; line-height:1.5; }
          .day-plan-note { margin:14px 0 0; text-align:center; color:#8b938d; font-size:11px; }

          .refine-section { margin-top: 24px; padding: 20px; border-radius: 18px; background: #f7f3ec; border: 1px solid rgba(95,105,94,.10); }
          .refine-context-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .refine-context-chip { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid rgba(95,105,94,.14); border-radius: 14px; background: #fffdf9; cursor: pointer; text-align: left; transition: .2s ease; }
          .refine-context-chip:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(95,105,94,.08); }
          .refine-context-chip.selected { background: #496455; color: white; border-color: #496455; }
          .refine-context-chip span { font-size: 18px; }
          .refine-context-chip strong { font-size: 12px; line-height: 1.3; }
          .refine-button { display: block; margin: 16px auto 0; }
          .refine-button:disabled { opacity: .5; cursor: default; }
          .refined-result { margin-top: 20px; padding: 20px; border-radius: 22px; background: #fffdf9; border: 1px solid rgba(95,105,94,.12); }

          .plan-my-day-blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
          .plan-my-day-block { padding: 18px; border-radius: 18px; background: #fffdf9; border: 1px solid rgba(95,105,94,.08); }
          .plan-my-day-block-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
          .plan-my-day-block-header span { font-size: 22px; }
          .plan-my-day-block-header h3 { margin: 0; font-family: Georgia, serif; color: #26342c; font-size: 18px; }
          .plan-my-day-block-content { display: grid; gap: 12px; }
          .plan-my-day-item small { display: block; color: #98765b; font-weight: 800; letter-spacing: .08em; font-size: 10px; margin-bottom: 4px; }
          .plan-my-day-item p { margin: 0; color: #68716a; line-height: 1.5; font-size: 13px; }

          .day-plan-event-builder { max-width: 640px; margin: 0 auto; }
          .day-plan-day-selector { margin-bottom: 20px; }
          .day-plan-day-selector-label { font-size: 14px; font-weight: 700; color: #496455; margin: 0 0 10px; text-align: center; }
          .day-plan-day-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
          .day-plan-day-chip { padding: 8px 16px; border-radius: 12px; border: 1px solid rgba(73,100,85,.2); background: #fffdf9; color: #496455; font-size: 14px; font-weight: 600; cursor: pointer; transition: .2s ease; }
          .day-plan-day-chip:hover { border-color: rgba(73,100,85,.35); background: #edf2ec; }
          .day-plan-day-chip.selected { background: #496455; color: #fff; border-color: #496455; }
          .day-plan-event-prompt { font-size: 14px; font-weight: 700; color: #496455; margin: 0 0 12px; text-align: center; }
          .day-plan-event-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
          .day-plan-event-chip { padding: 10px 16px; border-radius: 14px; border: 1px solid rgba(73,100,85,.2); background: #fffdf9; color: #496455; font-size: 14px; font-weight: 700; cursor: pointer; transition: .2s ease; display: flex; align-items: center; gap: 6px; }
          .day-plan-event-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(73,100,85,.12); border-color: rgba(73,100,85,.35); }
          .day-plan-event-chip span { font-size: 18px; }
          .day-plan-event-chip-added { background: #496455; color: #fff; border-color: #496455; }
          .day-plan-event-chip-added:hover { background: #3e5347; border-color: #3e5347; }
          .day-plan-event-chip-added span { font-size: 16px; }
          .day-plan-custom-row { display: flex; gap: 10px; margin-top: 14px; }
          .day-plan-custom-input, .day-plan-time-input, .day-plan-time-hint-input { padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(95,105,94,.2); font-size: 14px; color: #26342c; background: #fffdf9; flex: 1; }
          .day-plan-custom-input:focus, .day-plan-time-input:focus, .day-plan-time-hint-input:focus { outline: none; border-color: #496455; }
          .day-plan-time-input { max-width: 140px; }
          .day-plan-event-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; justify-content: center; }
          .day-plan-event-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: #edf2ec; border: 1px solid rgba(73,100,85,.15); font-size: 13px; font-weight: 600; color: #496455; }
          .day-plan-event-item-emoji { font-size: 16px; }
          .day-plan-event-item-label { color: #26342c; }
          .day-plan-event-item-time { color: #8a9388; font-size: 12px; }
          .day-plan-event-remove { background: none; border: none; color: #c44444; cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
          .day-plan-event-remove:hover { color: #a03030; }
          .day-plan-time-hint { margin-top: 12px; }
          .day-plan-time-hint-input { width: 100%; }
          .day-plan-button { margin-top: 18px; }
          .day-plan-button:disabled { opacity: .5; cursor: not-allowed; }

          .day-plan-trait-tips { padding: 16px 20px; border-radius: 16px; background: #fffdf9; border: 1px solid rgba(95,105,94,.12); margin-top: 16px; }
          .day-plan-trait-tips h4 { font-size: 13px; font-weight: 800; color: #6d5542; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }
          .day-plan-trait-tips ul { margin: 0; padding-left: 20px; }
          .day-plan-trait-tips li { font-size: 14px; color: #4a524a; line-height: 1.6; margin-bottom: 6px; }
          .day-plan-trait-tips li:last-child { margin-bottom: 0; }

          .day-plan-suggestions { display: grid; gap: 14px; margin-top: 16px; }
          .day-plan-suggestion-card { padding: 18px; border-radius: 18px; background: #fffdf9; border: 1px solid rgba(95,105,94,.1); }
          .day-plan-suggestion-before { border-left: 4px solid #496455; }
          .day-plan-suggestion-during { border-left: 4px solid #b8860b; }
          .day-plan-suggestion-after { border-left: 4px solid #6d5542; }
          .day-plan-suggestion-evening { border-left: 4px solid #4a5c6e; }
          .day-plan-suggestion-morning { border-left: 4px solid #7a9b6d; }
          .day-plan-suggestion-midmorning { border-left: 4px solid #8baa7d; }
          .day-plan-suggestion-lunch { border-left: 4px solid #c4956a; }
          .day-plan-suggestion-nap { border-left: 4px solid #8a7a9b; }
          .day-plan-suggestion-afternoon { border-left: 4px solid #6a9b8a; }
          .day-plan-suggestion-dinner { border-left: 4px solid #b8765a; }
          .day-plan-suggestion-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
          .day-plan-suggestion-emoji { font-size: 22px; }
          .day-plan-suggestion-header h3 { margin: 0; font-family: Georgia, serif; color: #26342c; font-size: 17px; }
          .day-plan-suggestion-time { margin: 0 0 12px 32px; font-size: 13px; font-weight: 700; color: #8a9388; letter-spacing: 0.03em; }
          .day-plan-suggestion-items { margin: 0; padding-left: 20px; }
          .day-plan-suggestion-items li { font-size: 14px; color: #4a524a; line-height: 1.6; margin-bottom: 8px; }
          .day-plan-suggestion-items li:last-child { margin-bottom: 0; }

          .day-plan-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 18px; }
          .day-plan-action-secondary { font-size: 14px; padding: 10px 18px; }
          .day-plan-saved-list { max-width: 640px; margin: 24px auto 0; }
          .day-plan-saved-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
          .day-plan-saved-heading { font-family: Georgia, serif; color: #26342c; font-size: 18px; margin: 0; }
          .day-plan-new-button { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(73,100,85,.2); background: #fffdf9; color: #496455; font-size: 13px; font-weight: 600; cursor: pointer; transition: .2s ease; }
          .day-plan-new-button:hover { background: #edf2ec; border-color: rgba(73,100,85,.35); }
          .day-plan-saved-card { padding: 14px 18px; border-radius: 16px; background: #fffdf9; border: 1px solid rgba(95,105,94,.1); margin-bottom: 10px; }
          .day-plan-saved-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
          .day-plan-saved-card-header strong { font-size: 15px; color: #26342c; }
          .day-plan-saved-card-meta { font-size: 13px; color: #8a9388; margin-top: 4px; line-height: 1.4; }
          .day-plan-saved-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
          .day-plan-saved-action { padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(73,100,85,.2); background: #fffdf9; color: #496455; font-size: 13px; font-weight: 600; cursor: pointer; transition: .2s ease; }
          .day-plan-saved-action:hover { background: #edf2ec; border-color: rgba(73,100,85,.35); }
          .day-plan-saved-delete { color: #c44444; border-color: rgba(196,68,68,.2); }
          .day-plan-saved-delete:hover { background: rgba(196,68,68,.08); border-color: rgba(196,68,68,.35); }
          .plan-easier-button { display: block; margin: 18px auto 0; }
          .plan-easier-note { text-align: center; margin: 14px 0 0; color: #8b938d; font-size: 12px; }

          .weather-smart-section { margin-top: 24px; padding: 30px; background: #fffdf9; border-radius: 28px; box-shadow: 0 16px 40px rgba(60, 65, 55, 0.06); }
          .weather-permission-prompt { text-align: center; padding: 20px; max-width: 420px; margin: 0 auto; }
          .weather-permission-prompt p { color: #68716a; font-size: 14px; line-height: 1.55; margin: 0 0 16px; }
          .weather-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 30px; }
          .weather-loading p { color: #68716a; font-size: 14px; margin: 0; }
          .weather-spinner { width: 28px; height: 28px; border: 3px solid rgba(95,105,94,.15); border-top-color: #496455; border-radius: 50%; animation: weatherSpin .7s linear infinite; }
          @keyframes weatherSpin { to { transform: rotate(360deg); } }
          .weather-error { text-align: center; padding: 20px; max-width: 420px; margin: 0 auto; }
          .weather-error p { color: #b5654a; font-size: 14px; line-height: 1.5; margin: 0 0 14px; }
          .weather-manual-input-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
          .weather-manual-input { flex: 1; min-width: 0; max-width: 260px; padding: 11px 14px; border: 1px solid rgba(32,52,81,.15); border-radius: 14px; font-size: 15px; font-family: inherit; background: #fffdf9; color: #26342c; }
          .weather-manual-input:focus { outline: none; border-color: #496455; box-shadow: 0 0 0 3px rgba(73,100,85,.12); }
          .secondary-button { border: 1px solid rgba(32,52,81,.15); background: transparent; color: #203451; border-radius: 14px; padding: 11px 18px; font-weight: 700; cursor: pointer; font-size: 14px; }
          .weather-info-bar { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 18px; background: #edf2ec; margin-bottom: 20px; }
          .weather-info-emoji { font-size: 32px; flex: 0 0 auto; }
          .weather-info-bar > div { flex: 1; }
          .weather-info-bar strong { display: block; color: #26342c; font-size: 16px; font-family: Georgia, serif; }
          .weather-info-bar small { display: block; color: #8b938d; font-size: 12px; margin-top: 2px; }
          .weather-refresh-button { border: 0; background: transparent; color: #68716a; font-size: 20px; cursor: pointer; padding: 6px 10px; border-radius: 10px; }
          .weather-refresh-button:hover { background: rgba(95,105,94,.08); }
          .weather-controls { display: flex; flex-direction: column; gap: 18px; margin-bottom: 20px; }
          .weather-control-group { display: flex; flex-direction: column; gap: 8px; }
          .weather-time-options, .weather-energy-options, .weather-pref-options { display: flex; flex-wrap: wrap; gap: 8px; }
          .weather-time-options button, .weather-energy-options button, .weather-pref-options button { border: 1px solid rgba(32,52,81,.12); background: #fffdf9; color: #68716a; border-radius: 14px; padding: 10px 16px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all .2s; }
          .weather-time-options button.selected, .weather-energy-options button.selected, .weather-pref-options button.selected { background: #496455; color: #fff; border-color: #496455; }
          .weather-recommend-button { display: block; margin: 0 auto; }
          .weather-result { margin-top: 22px; padding: 20px; border-radius: 22px; background: #f7f3ec; border: 1px solid rgba(95,105,94,.10); }
          .weather-result-intro { display: flex; gap: 14px; align-items: flex-start; padding-bottom: 15px; }
          .weather-result-intro > span { font-size: 28px; }
          .weather-result-intro strong { display: block; color: #26342c; font-family: Georgia, serif; font-size: 20px; }
          .weather-result-intro p { margin: 5px 0 0; color: #68716a; line-height: 1.5; font-size: 13px; }
          .weather-result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .weather-result-card { padding: 16px; border-radius: 18px; background: #fffdf9; }
          .weather-result-card > span { font-size: 24px; }
          .weather-result-card small { display: block; margin-top: 8px; color: #98765b; font-weight: 800; letter-spacing: .08em; font-size: 10px; }
          .weather-result-card h3 { margin: 6px 0 7px; font-family: Georgia, serif; color: #26342c; font-size: 20px; }
          .weather-result-card p { margin: 0 0 9px; color: #68716a; line-height: 1.5; font-size: 13px; }
          .weather-result-card b { color: #496455; font-size: 11px; }

          @media (max-width: 700px) {
            .stage-grid { grid-template-columns: 1fr; }
            .day-mood-grid { grid-template-columns: 1fr 1fr; }
            .day-plan-section { padding: 24px 18px; }
            .day-plan-grid { grid-template-columns: 1fr; }
            .plan-my-day-blocks { grid-template-columns: 1fr; }
            .refine-context-grid { grid-template-columns: 1fr 1fr; }
            .weather-result-grid { grid-template-columns: 1fr; }
            .weather-smart-section { padding: 24px 18px; }
            .saved-ideas-grid { grid-template-columns: 1fr; }
            .saved-ideas-section { padding: 24px 18px; }
            .stage-section { padding: 24px 18px; }
            .just-tell-me-section { padding: 24px 18px; }
            .weather-smart-section { padding: 24px 18px; }
            .just-tell-me-result-grid { grid-template-columns: 1fr; }
          }

          .premium-preview-showcase { margin: 26px auto 0; max-width: 900px; padding: 26px; border-radius: 26px; background: linear-gradient(135deg, #f7f3ec, #edf2ec); border: 1px solid rgba(73,100,85,.12); text-align: center; }
          .premium-preview-showcase-heading { max-width: 680px; margin: 0 auto 20px; }
          .premium-preview-showcase-heading h2 { margin: 10px 0 8px; color: #26342c; font-family: Georgia, serif; font-size: clamp(24px, 4vw, 32px); }
          .premium-preview-showcase-heading p { margin: 0; color: #68716a; line-height: 1.55; }
          .premium-preview-showcase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: left; margin: 20px 0; }
          .premium-preview-showcase-card { padding: 18px; border-radius: 18px; background: rgba(255,253,249,.92); border: 1px solid rgba(95,105,94,.10); }
          .premium-preview-showcase-card > span { font-size: 26px; }
          .premium-preview-showcase-card strong { display: block; margin-top: 8px; color: #26342c; font-family: Georgia, serif; font-size: 17px; }
          .premium-preview-showcase-card p { margin: 8px 0 5px; color: #496455; font-size: 13px; }
          .premium-preview-showcase-card small { color: #68716a; line-height: 1.5; font-size: 12px; }
          .help-dropdowns { display: flex; flex-direction: column; gap: 10px; max-width: 760px; margin: 0 auto; }

          .no-situation-quick-links { margin: 16px auto 4px; max-width: 760px; }
          .no-situation-quick-links-intro { margin: 0 0 10px; color: #68716a; font-size: 14px; line-height: 1.5; }
          .no-situation-quick-links-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .quick-topic-choice { min-height: 64px; text-align: left; }
          .quick-topic-choice > div { display: flex; flex-direction: column; gap: 3px; flex: 1; }
          .quick-topic-choice small { color: #8a9388; line-height: 1.35; }
          @media (max-width: 700px) { .no-situation-quick-links-grid { grid-template-columns: 1fr; } }
          .help-dropdown { background: #fffdf9; border: 1px solid rgba(95,105,94,.12); border-radius: 18px; overflow: hidden; box-shadow: 0 8px 24px rgba(60,65,55,.04); }
          .help-dropdown summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; cursor: pointer; }
          .help-dropdown summary::-webkit-details-marker { display: none; }
          .help-dropdown summary:hover { background: #f7f3ec; }
          .help-dropdown-title { display: flex; align-items: center; gap: 12px; text-align: left; }
          .help-dropdown-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; background: #edf2ec; font-size: 22px; }
          .help-dropdown-title strong { display: block; color: #26342c; font-family: Georgia, serif; font-size: 17px; }
          .help-dropdown-title small { display: block; color: #8a9388; font-size: 12px; margin-top: 3px; }
          .help-dropdown-chevron { color: #496455; font-size: 22px; transition: transform .2s ease; }
          .help-dropdown[open] .help-dropdown-chevron { transform: rotate(180deg); }
          .help-dropdown-options { padding: 0 10px 10px; display: grid; gap: 8px; }
          .help-dropdown-options .help-button { width: 100%; margin: 0; }
          @media (max-width: 700px) { .premium-preview-showcase-grid { grid-template-columns: 1fr; } .premium-preview-showcase { padding: 22px 16px; } }
          @media (max-width: 640px) { .help-dropdown summary { padding: 14px; } .help-dropdown-icon { width: 38px; height: 38px; font-size: 20px; } .help-dropdown-title strong { font-size: 16px; } .help-dropdown-options { padding: 0 8px 8px; } }

          /* Mobile polish: prioritize thumb-friendly controls, readable cards, and less scrolling. */
          @media (max-width: 640px) {
            .app-container { padding: 12px 10px 28px; }
            header { padding: 14px 6px 18px; }
            header h1 { font-size: clamp(30px, 10vw, 38px); }

            .child-profiles,
            .guidance-card,
            .help-now-card,
            .topic-section,
            .hero-card,
            .stage-section,
            .day-plan-section,
            .saved-ideas-section,
            .just-tell-me-section,
            .weather-smart-section {
              border-radius: 20px;
            }

            .saved-ideas-card { border-radius: 16px; }
            .help-now-button { border-radius: 18px; }

            .help-grid,
            .quick-grid,
            .topic-grid,
            .age-grid {
              grid-template-columns: 1fr;
            }

            .help-now-button,
            .saved-ideas-card,
            .primary-button,
            .add-child,
            .save-note,
            .save-help-button,
            .secondary-save-button,
            .browse-button,
            .back-button,
            .notification-button,
            .child-select,
            .child-delete {
              min-height: 46px;
            }

            .primary-button,
            .add-child,
            .save-note {
              padding: 13px 16px;
            }

            .activity-card {
              flex-direction: column;
              gap: 14px;
              padding: 20px 16px;
            }

            .activity-icon {
              width: 60px;
              height: 60px;
              flex-basis: 60px;
              font-size: 30px;
            }

            .activity-card h3 { font-size: 24px; }
            .activity-content { min-width: 0; }
            .activity-list-item { padding: 14px; }

            .guidance-title {
              align-items: flex-start;
              gap: 12px;
            }

            .guidance-title .topic-icon,
            .topic-choice > span:first-child,
            .topic-icon {
              flex: 0 0 50px;
              width: 50px;
              height: 50px;
            }

            .advice-block { gap: 10px; }
            .number { width: 30px; height: 30px; flex-basis: 30px; }
            .quote { padding: 13px 14px; }

            .day-mood-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .day-mood-card { min-height: 78px; padding: 12px; }
            .day-time-options { gap: 7px; }
            .day-time-options button { min-height: 44px; padding: 9px 12px; }

            .just-tell-me-form textarea,
            .just-tell-me-form input,
            .child-form input,
            .child-form select,
            .reminder-form input,
            .reminder-form select,
            .reminder-form textarea {
              font-size: 16px;
            }

            .saved-filter-row {
              display: flex;
              flex-wrap: nowrap;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              padding-bottom: 2px;
            }

            .saved-filter-row::-webkit-scrollbar { display: none; }
            .saved-filter-row button { white-space: nowrap; min-height: 42px; }

            .legal-modal {
              width: calc(100vw - 20px);
              max-height: 88vh;
              margin: 10px auto;
            }

            .legal-modal-body {
              padding: 16px;
            }

            footer { padding: 22px 8px; }
            .legal-links { gap: 10px; }
          }

          @media (max-width: 390px) {
            .app-container { padding-left: 8px; padding-right: 8px; }
            header h1 { font-size: 30px; }
            .day-mood-grid { grid-template-columns: 1fr; }
            .refine-context-grid { grid-template-columns: 1fr; }
            .stage-copy h3, .activity-card h3, .topic-heading h2 { font-size: 22px; }
            .topic-choice { min-height: 68px; padding: 12px; }
          }
        `}</style>

        <section className="premium-features-section">
          <div className="section-heading">
            <p className="eyebrow">PREMIUM FEATURES</p>
            <h2>✦ Go a little deeper</h2>
            <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
              Extra tools to make caring for kids easier. Unlock all of them with Premium.
            </p>
            <p style={{ marginTop: 12 }}>
              <button type="button" onClick={() => setLegalPage('subscription')} style={{ border: 0, background: 'transparent', color: '#496455', fontWeight: 700, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                Subscription Information
              </button>
            </p>
          </div>

        {showHomeReset && (
          <section className="home-reset-section" ref={homeResetRef}>
            <div className="section-heading">
              <p className="eyebrow">MAKE YOUR HOME FEEL MANAGEABLE</p>
              <h2>🏠 Home Reset</h2>
              <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
                Don't overwhelm me with a list. Tell me what to do next.
              </p>
            </div>

            {!homeResetResult ? (
              <>
                <div className="home-reset-group">
                  <label>What needs a reset?</label>
                  <div className="home-reset-choices">
                    {homeResetAreas.map((area) => (
                      <button key={area.id} type="button"
                        className={`home-reset-choice ${homeResetArea === area.id ? 'selected' : ''}`}
                        onClick={() => setHomeResetArea(area.id)}
                      >
                        <span>{area.emoji}</span>
                        <strong>{area.label}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="home-reset-group">
                  <label>How much time do you have?</label>
                  <div className="home-reset-choices">
                    {homeResetTimeOptions.map(t => (
                      <button key={t} type="button"
                        className={`home-reset-choice ${homeResetTime === t ? 'selected' : ''}`}
                        onClick={() => setHomeResetTime(t)}
                      >
                        {t < 60 ? `${t} min` : '1 hour'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="home-reset-group">
                  <label>How is your energy?</label>
                  <div className="home-reset-choices">
                    {([['high','I have energy'],['some','I have a little energy'],['exhausted',"I'm exhausted"]] as const).map(([val, label]) => (
                      <button key={val} type="button"
                        className={`home-reset-choice ${homeResetEnergy === val ? 'selected' : ''}`}
                        onClick={() => setHomeResetEnergy(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" className="primary-button" onClick={buildHomeResetPlan}
                  disabled={!homeResetArea}
                  style={{ marginTop: 8 }}
                >
                  ✨ What should I do first?
                </button>
              </>
            ) : (
              <div className="home-reset-result">
                <div className="home-reset-result-header">
                  <span className="home-reset-result-emoji">{homeResetResult.emoji}</span>
                  <div>
                    <h3>{homeResetResult.title}</h3>
                    <small>{homeResetTime < 60 ? `${homeResetTime} minutes` : '1 hour'} · {homeResetEnergy === 'exhausted' ? 'Low energy' : homeResetEnergy === 'some' ? 'Some energy' : 'Full energy'}</small>
                  </div>
                </div>

                <div className="home-reset-start-here">
                  <p className="eyebrow">START HERE</p>
                  <ol>
                    {homeResetResult.startHere.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <p className="home-reset-stop-note">Then stop. Small wins matter more than perfection.</p>
                </div>

                {isPremium && homeResetResult.ifYouHaveMoreTime.length > 0 && (
                  <div className="home-reset-more-time">
                    <p className="eyebrow">IF YOU HAVE MORE TIME</p>
                    <ul>
                      {homeResetResult.ifYouHaveMoreTime.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isPremium && homeResetResult.kidsCanHelp.length > 0 && (
                  <div className="home-reset-kids-help">
                    <p className="eyebrow">KIDS CAN HELP</p>
                    <div className="home-reset-kids-grid">
                      {homeResetResult.kidsCanHelp.map((group) => (
                        <div className="home-reset-kids-card" key={group.label}>
                          <strong>{group.label}</strong>
                          <ul>
                            {group.tasks.map((task, i) => (
                              <li key={i}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isPremium && homeResetResult.tips.length > 0 && (
                  <div className="home-reset-tips">
                    <p className="eyebrow">TIPS</p>
                    <ul>
                      {homeResetResult.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isPremium ? (
                  <div className="home-reset-actions">
                    <button type="button" className="save-help-button" onClick={saveHomeResetRoutine}>❤️ Save this routine</button>
                    <button type="button" className="home-reset-redo" onClick={() => setHomeResetResult(null)}>← Start over</button>
                  </div>
                ) : (
                  <div className="home-reset-actions">
                    <button type="button" className="home-reset-redo" onClick={() => setHomeResetResult(null)}>← Start over</button>
                  </div>
                )}

                {!isPremium && (
                  <div className="help-now-premium-upsell" style={{ marginTop: 20, padding: 20, borderRadius: 18, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.12)' }}>
                    <strong>🔒 Get Personalized Reset Plans with Premium</strong>
                    <p style={{ margin: '8px 0 12px', color: '#68716a', lineHeight: 1.55 }}>
                      Premium unlocks: room-by-room plans, if-you-have-more-time steps, age-appropriate tasks kids can help with, low-energy reset plans, before-guests reset, end-of-day reset, weekly reset plan, and the ability to save your favorite routines.
                    </p>
                    <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('home-reset-premium')}>✦ Unlock Premium — $4.99/month</button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="stage-section compact-person-selector">
          <div className="compact-person-selector-heading">
            <div>
              <p className="eyebrow">MAKE IT RELEVANT TO YOU</p>
              <h2>Who do you want help with?</h2>
              <p>Choose a child for age-specific guidance, or Baby on the way for pregnancy support.</p>
            </div>
            {homePersonChosen && <span className="personalize-top-status">✓ Set</span>}
          </div>

          <label className="compact-person-select-wrap">
            <span className="sr-only">Choose who you want help with</span>
            <select
              className="compact-person-select"
              value={children.length > 0 ? (selectedStage === 'expecting' && selectedChildForHelp === null ? 'expecting' : selectedChildForHelp !== null ? `child-${selectedChildForHelp}` : '') : (homePersonChosen ? (selectedStage === 'expecting' ? 'expecting' : selectedAge) : '')}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                if (value === 'expecting') {
                  selectTopPerson({ type: 'stage', id: 'expecting' });
                  return;
                }
                if (value.startsWith('child-')) {
                  const childId = Number(value.replace('child-', ''));
                  if (Number.isFinite(childId)) selectTopPerson({ type: 'child', id: childId });
                  return;
                }
                selectTopPerson({ type: 'stage', id: value as AgeId });
              }}
            >
              <option value="">Choose who you want help with…</option>
              <option value="expecting">🤍 Baby on the way — Pregnancy support</option>
              {children.length > 0
                ? children.map(child => <option key={child.id} value={`child-${child.id}`}>👧 {child.name} — {child.age}</option>)
                : stageOptions.filter(stage => stage.id !== 'expecting').map(stage => <option key={stage.id} value={stage.id}>{stage.emoji} {stage.label} — {stage.range}</option>)}
            </select>
          </label>

          <div className="compact-person-actions">
            <button type="button" className="personalize-add-child" onClick={() => { setShowChildForm(true); window.requestAnimationFrame(() => { const el = document.querySelector('.child-profiles'); if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }}>
              ＋ Add another child for personalized help
            </button>
            <details className="pregnancy-help-note">
              <summary>🤍 Pregnant and already parenting?</summary>
              <p>Choose <strong>Baby on the way</strong> above. Your children stay saved, and you can switch back to any of them whenever you want.</p>
            </details>
          </div>
        </section>

        <section className="day-plan-section">
          <div className="section-heading">
            <p className="eyebrow">PLAN MY DAY {isPremium ? '' : '· PREMIUM'}</p>
            <h2>☀️ Plan My Day</h2>
            <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
              Tell Breezier Days what your day already looks like, and it helps you figure out the rest. Pick a day — today or up to a week ahead — add what is happening, and get practical suggestions for before, during, after, and evening.
            </p>
          </div>

          {isFeatureLocked('personalized-daily-plan') ? (
            <div className="premium-locked-card">
              <div className="premium-locked-icon">☀️</div>
              <strong>Plan My Day</strong>
              <p>Breezier Days remembers your child, understands their personality, and builds a flexible day around what is already on your calendar — so you can stop figuring out what comes next.</p>
              <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('personalized-daily-plan')}>
                ✦ Unlock Premium
              </button>
            </div>
          ) : (
            <>
              <div className="day-plan-event-builder">
                <div className="day-plan-day-selector">
                  <p className="day-plan-day-selector-label">Which day are you planning?</p>
                  <div className="day-plan-day-chips">
                    {[0, 1, 2, 3, 4, 5, 6].map(offset => (
                      <button
                        type="button"
                        key={offset}
                        className={`day-plan-day-chip ${dayPlanSelectedDay === offset ? 'selected' : ''}`}
                        onClick={() => setDayPlanSelectedDay(offset)}
                      >
                        {getDayLabel(offset)}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="day-plan-event-prompt">What is happening {dayPlanSelectedDay === 0 ? 'today' : dayPlanSelectedDay === 1 ? 'tomorrow' : 'on ' + getDayLabel(dayPlanSelectedDay).toLowerCase()}?</p>
                <div className="day-plan-event-chips">
                  {dayEventTypes.map((t) => {
                    const visibleDayEvents = dayEvents.filter(e => (e.dayOffset ?? 0) === dayPlanSelectedDay);
                    const added = visibleDayEvents.some(e => e.type === t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        className={`day-plan-event-chip${added ? ' day-plan-event-chip-added' : ''}`}
                        onClick={() => addDayEvent(t.id)}
                      >
                        <span>{t.emoji}</span> {added ? '✓ Added' : t.label}
                      </button>
                    );
                  })}
                </div>

                {dayEventTypes.find(t => t.id === 'custom') && (
                  <div className="day-plan-custom-row">
                    <input
                      type="text"
                      value={dayEventInput}
                      onChange={(e) => setDayEventInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && dayEventInput.trim()) addDayEvent('custom'); }}
                      placeholder="Or type a custom event name"
                      className="day-plan-custom-input"
                    />
                  </div>
                )}

                {dayEvents.filter(e => (e.dayOffset ?? 0) === dayPlanSelectedDay).length > 0 && (
                  <div className="day-plan-event-list">
                    {dayEvents.filter(e => (e.dayOffset ?? 0) === dayPlanSelectedDay).map((event) => {
                      const meta = dayEventTypes.find(t => t.id === event.type)!;
                      return (
                        <div key={event.id} className="day-plan-event-item">
                          <span className="day-plan-event-item-emoji">{meta.emoji}</span>
                          <span className="day-plan-event-item-label">{event.label}</span>
                          {event.time && <span className="day-plan-event-item-time">{event.time}</span>}
                          <button type="button" className="day-plan-event-remove" onClick={() => removeDayEvent(event.id)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isPremium && (
                  <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#f7f3ec', border: '1px solid rgba(73,100,85,.12)' }}>
                    <h3 style={{ margin: '0 0 6px', color: '#26342c' }}>🧠 Remember a recurring routine</h3>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#68716a', lineHeight: 1.45 }}>Save the logistics you repeat — school, gymnastics, appointments, leaving the house — so Breezier Days can build around them next time.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
                      <input value={routineLabel} onChange={e => setRoutineLabel(e.target.value)} placeholder="Routine name" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                      <input value={routineDays} onChange={e => setRoutineDays(e.target.value)} placeholder="Days (Tue, Thu) or Daily" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                      <input value={routineTime} onChange={e => setRoutineTime(e.target.value)} placeholder="Time (10am) or Flexible" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                      <input value={routineDuration} onChange={e => setRoutineDuration(e.target.value)} placeholder="Duration" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                      <input value={routinePrepMinutes} onChange={e => setRoutinePrepMinutes(e.target.value)} placeholder="Prep min" inputMode="numeric" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                      <input value={routineTravelMinutes} onChange={e => setRoutineTravelMinutes(e.target.value)} placeholder="Travel min" inputMode="numeric" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                    </div>
                    <button type="button" className="save-help-button" style={{ marginTop: 10 }} onClick={saveDayRoutine} disabled={!routineLabel.trim()}>❤️ Remember this routine</button>
                    {dayRoutines.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <strong style={{ fontSize: 13 }}>Saved routines</strong>
                        {dayRoutines.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, padding: '9px 10px', background: '#fff', borderRadius: 10, fontSize: 12 }}>
                            <span>{r.emoji}</span><span style={{ flex: 1 }}><strong>{r.label}</strong> · {r.days} · {r.time}{r.travelMinutes !== '0' ? ` · ${r.travelMinutes} min travel` : ''}</span>
                            <button type="button" className="day-plan-saved-action" onClick={() => applyRoutineToDay(r)}>Use</button>
                            <button type="button" className="day-plan-saved-action day-plan-saved-delete" onClick={() => deleteDayRoutine(r.id)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="day-plan-time-hint">
                  <input
                    type="text"
                    value={dayEventTime}
                    onChange={(e) => setDayEventTime(e.target.value)}
                    placeholder="Add a time for the next event (e.g. 9–12, 2pm, Morning)"
                    className="day-plan-time-hint-input"
                  />
                </div>

                <button
                  type="button"
                  className="primary-button day-plan-button"
                  onClick={buildDayEventPlan}
                >
                  ✨ {dayEvents.filter(e => (e.dayOffset ?? 0) === dayPlanSelectedDay).length === 0 ? 'Build a day plan' : 'Build my day around these events'}
                </button>
              </div>

              {dayEventPlan && (
                <div ref={planMyDayRef} className="day-plan-result">
                  <div className="day-plan-intro">
                    <span>💛</span>
                    <div>
                      <strong>Here is a plan built around your day.</strong>
                      <p>{dayEventPlan.intro}</p>
                    </div>
                  </div>

                  {dayEventPlan.traitTips.length > 0 && (
                    <div className="day-plan-trait-tips">
                      <h4>✨ Tips for your child</h4>
                      <ul>
                        {dayEventPlan.traitTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="day-plan-suggestions">
                    {dayEventPlan.suggestions.map((sug, i) => (
                      <div key={i} className={`day-plan-suggestion-card day-plan-suggestion-${sug.phase}`}>
                        <div className="day-plan-suggestion-header">
                          <span className="day-plan-suggestion-emoji">{sug.emoji}</span>
                          <h3>{sug.label}</h3>
                        </div>
                        {sug.timeRange && (
                          <p className="day-plan-suggestion-time">{sug.timeRange}</p>
                        )}
                        <ul className="day-plan-suggestion-items">
                          {sug.items.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#f7f3ec', border: '1px solid rgba(73,100,85,.12)' }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>What would help you most?</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {[
                        ['independent-play', '🧸 Let them play'],
                        ['home-reset', '🏠 Home Reset'],
                        ['plan-meal', '🍽️ Plan a Meal'],
                        ['rest', '☕ I need to rest'],
                        ['accomplish', '🎯 What are you trying to accomplish?'],
                        ['nothing', '🌿 Nothing'],
                        ['lighter', '🌿 Make Today Lighter']
                      ].map(([id, label]) => (
                        <button key={id} type="button" className={`day-plan-event-chip${dayPlanIntent === id ? ' day-plan-event-chip-added' : ''}`} onClick={() => setDayPlanIntent(id as typeof dayPlanIntent)}>{label}</button>
                      ))}
                    </div>
                    {dayPlanIntent === 'independent-play' && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid rgba(73,100,85,.10)', color: '#68716a', fontSize: 12, lineHeight: 1.5 }}>
                        <strong style={{ color: '#496455' }}>They are happily playing.</strong> You can leave the play alone — or use this protected window for a Home Reset, planning a meal, resting, doing one small thing, or simply nothing.
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                          <button type="button" className={`day-plan-event-chip${dayPlanIntent === 'home-reset' ? ' day-plan-event-chip-added' : ''}`} onClick={() => setDayPlanIntent('home-reset')}>🏠 Home Reset</button>
                          <button type="button" className={`day-plan-event-chip${dayPlanIntent === 'plan-meal' ? ' day-plan-event-chip-added' : ''}`} onClick={() => setDayPlanIntent('plan-meal')}>🍽️ Plan a Meal</button>
                        </div>
                      </div>
                    )}
                    {dayPlanIntent === 'accomplish' && (
                      <input type="text" value={dayPlanAccomplish} onChange={e => setDayPlanAccomplish(e.target.value)} placeholder="What are you trying to accomplish?" style={{ marginTop: 9, width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid rgba(73,100,85,.18)' }} />
                    )}
                    {(dayPlanIntent === 'home-reset' || dayPlanIntent === 'plan-meal') && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {dayPlanIntent === 'home-reset' ? (
                          <button type="button" className="secondary-button day-plan-action-secondary" onClick={openHomeReset}>
                            🏠 Open Home Reset
                          </button>
                        ) : (
                          <button type="button" className="secondary-button day-plan-action-secondary" onClick={() => selectHelp('mealtime')}>
                            🍽️ Plan a Meal
                          </button>
                        )}
                      </div>
                    )}
                    {dayPlanIntent === 'lighter' && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid rgba(73,100,85,.10)', color: '#68716a', fontSize: 12, lineHeight: 1.5 }}>
                        <strong style={{ color: '#496455' }}>You may already have enough planned.</strong> Breezier Days will protect your real commitments, remove pressure where it can, and leave more of the day open. <strong>You do not need to replace what you skip.</strong>
                      </div>
                    )}
                    {!dayPlanIntent && (dayEventPlan?.events?.length ?? 0) <= 2 && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid rgba(73,100,85,.10)', color: '#68716a', fontSize: 12, lineHeight: 1.5 }}>
                        <strong style={{ color: '#496455' }}>This may already be enough.</strong> You have {(dayEventPlan?.events?.length ?? 0) === 1 ? 'one real commitment' : 'a couple of real commitments'} today. Breezier Days is leaving some space open on purpose.
                      </div>
                    )}
                    <p className="day-plan-note">Nothing here is a rule. Keep what helps, skip what doesn't, and come back later.</p>
                  </div>

                  <div className="day-plan-actions">
                    {isPremium ? (
                      <>
                        <button type="button" className="save-help-button" onClick={saveDayPlan}>
                          {openedSavedDayPlan ? '♡ Update saved plan' : '♡ Save this day'}
                        </button>
                        <button type="button" className="secondary-button day-plan-action-secondary" onClick={editDayPlan}>
                          ✏️ Edit / adjust
                        </button>
                        <button type="button" className="secondary-button day-plan-action-secondary" onClick={makeDayPlanEasier}>
                          💛 Make it easier
                        </button>
                        <button type="button" className="secondary-button day-plan-action-secondary" onClick={makeDayPlanMoreSpecific}>
                          🎯 Make it more specific
                        </button>
                      </>
                    ) : (
                      <button type="button" className="save-help-button" onClick={() => unlockPremium('personalized-daily-plan')}>
                        🔒 Save plans with Premium
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isPremium && savedDayPlans.length > 0 && (
                <div className="day-plan-saved-list">
                  <div className="day-plan-saved-header-row">
                    <h3 className="day-plan-saved-heading">📅 Saved days</h3>
                    <button type="button" className="day-plan-new-button" onClick={startNewDayPlan}>＋ New plan</button>
                  </div>
                  {savedDayPlans.map(plan => (
                    <div key={plan.id} className="day-plan-saved-card">
                      <div className="day-plan-saved-card-header">
                        <div>
                          <strong>{plan.dayLabel}</strong>
                          <div className="day-plan-saved-card-meta">
                            {plan.childName !== 'your child' && <span>{plan.childName} · </span>}
                            {plan.events.map(e => e.label).join(', ')}
                          </div>
                        </div>
                        <div className="day-plan-saved-card-actions">
                          <button type="button" className="day-plan-saved-action" onClick={() => openSavedDayPlan(plan)}>View</button>
                          <button type="button" className="day-plan-saved-action" onClick={() => reuseSavedDayPlan(plan)}>Use again</button>
                          <button type="button" className="day-plan-saved-action day-plan-saved-delete" onClick={() => deleteSavedDayPlan(plan.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="weather-smart-section">
          <div className="section-heading">
            <p className="eyebrow">ACTIVITIES FOR THE WEATHER {isPremium ? '' : '· PREMIUM'}</p>
            <h2>☀️ Weather-Smart Activities</h2>
            <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
              Get activity ideas based on the real weather where you are — tailored to your child's age, your time, and their energy.
            </p>
          </div>

          {isFeatureLocked('weather-smart-activities') ? (
            <div className="premium-locked-card">
              <div className="premium-locked-icon">☀️</div>
              <strong>Weather-Smart Activities</strong>
              <p>Get activity ideas based on the real weather where you are — rain or shine — matched to your child's age, your time, and their energy level.</p>
              <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('weather-smart-activities')}>
                ✦ Unlock Premium
              </button>
            </div>
          ) : (
            <>
              {!weatherData && !weatherLoading && !weatherManualMode && !weatherError && (
                <div className="weather-permission-prompt">
                  <p>Breezier Days uses your local weather to recommend activities that fit the conditions. You can share your location or enter your city or ZIP code.</p>
                  <button type="button" className="primary-button" onClick={requestWeatherLocation}>
                    📍 Share my location
                  </button>
                  <button type="button" className="secondary-button" style={{ marginTop: 10 }} onClick={() => { setWeatherManualMode(true); setWeatherError(null); }}>
                    ✏️ Enter city or ZIP instead
                  </button>
                </div>
              )}

              {!weatherData && !weatherLoading && weatherManualMode && (
                <div className="weather-permission-prompt">
                  <p>Enter your city or ZIP code and Breezier Days will check the weather there.</p>
                  <div className="weather-manual-input-row">
                    <input
                      type="text"
                      value={weatherManualInput}
                      onChange={(e) => setWeatherManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchWeatherByLocation(); }}
                      placeholder="City or ZIP code"
                      className="weather-manual-input"
                    />
                    <button type="button" className="primary-button" onClick={fetchWeatherByLocation} disabled={!weatherManualInput.trim()}>
                      Check weather
                    </button>
                  </div>
                  {navigator.geolocation && (
                    <button type="button" className="secondary-button" style={{ marginTop: 10 }} onClick={() => { setWeatherManualMode(false); setWeatherManualInput(''); }}>
                      ← Use my location instead
                    </button>
                  )}
                </div>
              )}

              {weatherLoading && (
                <div className="weather-loading">
                  <span className="weather-spinner" />
                  <p>Checking the weather near you…</p>
                </div>
              )}

              {weatherError && !weatherManualMode && (
                <div className="weather-error">
                  <p>{weatherError}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                    <button type="button" className="secondary-button" onClick={requestWeatherLocation}>Try location again</button>
                    <button type="button" className="secondary-button" onClick={() => { setWeatherManualMode(true); setWeatherError(null); }}>Enter city or ZIP</button>
                  </div>
                </div>
              )}

              {weatherError && weatherManualMode && (
                <div className="weather-error">
                  <p>{weatherError}</p>
                  <div className="weather-manual-input-row" style={{ marginTop: 12 }}>
                    <input
                      type="text"
                      value={weatherManualInput}
                      onChange={(e) => setWeatherManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchWeatherByLocation(); }}
                      placeholder="City or ZIP code"
                      className="weather-manual-input"
                    />
                    <button type="button" className="primary-button" onClick={fetchWeatherByLocation} disabled={!weatherManualInput.trim()}>
                      Check weather
                    </button>
                  </div>
                </div>
              )}

              {weatherData && (
                <>
                  <div className="weather-info-bar">
                    <span className="weather-info-emoji">
                      {weatherCodeToCategory(weatherData.code, weatherData.temp) === 'rain' ? '🌧️'
                        : weatherCodeToCategory(weatherData.code, weatherData.temp) === 'cold' ? '❄️'
                        : weatherCodeToCategory(weatherData.code, weatherData.temp) === 'hot' ? '☀️'
                        : '🌤️'}
                    </span>
                    <div>
                      <strong>{weatherData.description} · {weatherData.temp}°C</strong>
                      <small>{weatherData.locationName}</small>
                    </div>
                    <button type="button" className="weather-refresh-button" onClick={requestWeatherLocation} title="Refresh weather">↻</button>
                  </div>

                  <div className="weather-controls">
                    <div className="weather-control-group">
                      <span className="eyebrow">HOW MUCH TIME?</span>
                      <div className="weather-time-options">
                        {([5, 15, 20, 30] as const).map(minutes => (
                          <button key={minutes} type="button" className={weatherTime === minutes ? 'selected' : ''} onClick={() => setWeatherTime(minutes)}>
                            {minutes === 30 ? '30+ min' : `${minutes} min`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="weather-control-group">
                      <span className="eyebrow">CHILD'S ENERGY LEVEL?</span>
                      <div className="weather-energy-options">
                        {([['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] as const).map(([id, label]) => (
                          <button key={id} type="button" className={weatherEnergy === id ? 'selected' : ''} onClick={() => setWeatherEnergy(id)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="weather-control-group">
                      <span className="eyebrow">INDOOR OR OUTDOOR?</span>
                      <div className="weather-pref-options">
                        {([['either', 'Either'], ['indoor', 'Indoor'], ['outdoor', 'Outdoor']] as const).map(([id, label]) => (
                          <button key={id} type="button" className={weatherPreference === id ? 'selected' : ''} onClick={() => setWeatherPreference(id)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button type="button" className="primary-button weather-recommend-button" onClick={recommendWeatherActivities}>
                    ✨ Recommend activities for this weather
                  </button>

                  {weatherResult && weatherResult.length > 0 && (
                    <div ref={weatherResultRef} className="weather-result">
                      <div className="weather-result-intro">
                        <span>🌤️</span>
                        <div>
                          <strong>Here's what fits the weather.</strong>
                          <p>{weatherResultMessage}</p>
                        </div>
                      </div>
                      <div className="weather-result-grid">
                        {weatherResult.map((act, i) => (
                          <div className="weather-result-card" key={`${act.title}-${i}`}>
                            <span>{act.emoji}</span>
                            <small>{act.category}</small>
                            <h3>{act.title}</h3>
                            <p>{act.description}</p>
                            <b>{act.time} · {act.effort} effort</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
        </section>

        <section ref={savedIdeasRef} className="saved-ideas-section">
          <div className="section-heading">
            <p className="eyebrow">KEEP THE THINGS THAT WORK</p>
            <h2>❤️ Saved Ideas</h2>
            <p style={{ maxWidth: 650, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>Save an activity, meal, or parenting answer so you don't have to figure it out again.</p>
          </div>
          <div className="saved-filter-row">
            {(['All', 'Activity', 'Meal', 'Caregiver Help', 'Development', 'Learning', 'Home Reset'] as const).map(filter => (
              <button key={filter} type="button" className={savedFilter === filter ? 'selected' : ''} onClick={() => setSavedFilter(filter)}>
                {filter === 'All' ? 'Everything' : filter === 'Caregiver Help' ? 'Caregiver Help' : filter === 'Home Reset' ? 'Home Reset' : `${filter}s`}
              </button>
            ))}
          </div>
          {savedIdeas.length === 0 ? (
            <div className="saved-empty-state"><div>💛</div><strong>Nothing saved yet?</strong><p>When something feels useful, tap <b>Save this idea</b>. It will live here for next time.</p></div>
          ) : savedIdeas.filter(item => savedFilter === 'All' || item.category === savedFilter).length === 0 ? (
            <div className="saved-empty-state"><div>🫶</div><strong>Nothing saved in this category yet.</strong><p>Save something useful and it will show up here.</p></div>
          ) : (
            <div className="saved-ideas-grid">
              {savedIdeas.filter(item => savedFilter === 'All' || item.category === savedFilter).map(item => (
                <div className={`saved-idea-card ${(item.helpNowFull || item.meal) ? 'saved-idea-clickable' : ''}`} key={item.id} onClick={item.helpNowFull ? () => { pushNavHistory(); setReopenedSavedAnswer(item); } : item.meal ? () => openSavedMeal(item) : undefined} role={(item.helpNowFull || item.meal) ? 'button' : undefined} tabIndex={(item.helpNowFull || item.meal) ? 0 : undefined}>
                  <div className="saved-idea-icon">{item.emoji}</div>
                  <div className="saved-idea-copy"><small>{item.category}</small><h3>{item.title}</h3><p>{item.description}</p><span>{item.meta} · Saved {item.savedAt}</span>{item.helpNowFull && <span className="saved-idea-reopen">Tap to reopen →</span>}{item.meal && <span className="saved-idea-reopen">Tap to open meal →</span>}</div>
                  <button type="button" className="saved-idea-remove" onClick={(e) => { e.stopPropagation(); removeSavedIdea(item.id); }} aria-label={`Remove ${item.title}`}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="little-wins-section little-wins-compact">
          <details>
            <summary>
              <span>💛</span>
              <span><strong>Little wins</strong><small>Notice what went well without turning it into another task.</small></span>
            </summary>

            <div className="little-wins-actions">
              <p className="little-wins-prompt">Did something go well today?</p>
              <div className="little-wins-buttons">
                {littleWinPool.slice(0, 6).map((win) => (
                  <button
                    type="button"
                    key={win.text}
                    className="little-win-add-button"
                    onClick={() => recordLittleWin(win)}
                  >
                    <span>{win.emoji}</span>
                    <span>{win.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {littleWins.length > 0 ? (
              <div className="little-wins-list">
                {littleWins.map((win) => (
                  <div className="little-win-item" key={win.id}>
                    <span className="little-win-emoji">{win.emoji}</span>
                    <div className="little-win-content">
                      <strong>{win.text}</strong>
                      <small>{win.date}</small>
                    </div>
                    <button
                      type="button"
                      className="little-win-remove"
                      onClick={() => removeLittleWin(win.id)}
                      aria-label={`Remove ${win.text}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="little-wins-empty">
                <p>No wins recorded yet. That's okay — even getting through the day counts.</p>
              </div>
            )}
          </details>
        </section>

        {false && !isParentingStageOnly && (
          <section className="age-section">
            <p className="eyebrow">PERSONALIZE IT</p>
            <h2>How old is your little one?</h2>

            <div className="age-grid">
              {ageGroups.map((age) => (
                <button type="button"
                  key={age.id}
                  className={`age-button ${
                    selectedAge === age.id ? 'selected' : ''
                  }`}
                  onClick={() => changeAge(age.id)}
                >
                  <span>{age.emoji}</span>
                  <strong>{age.label}</strong>
                  <small>{age.range}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedHelp === 'development' ? (
          <>
            {!selectedDevTopic ? (
              <section ref={contentRef} className="topic-section">
                <div className="topic-heading">
                  <div className="topic-icon">🌱</div>
                  <p className="eyebrow">{isParentingStageOnly ? (selectedStage === 'expecting' ? 'EXPECTING PARENT' : 'NEW PARENT') : currentAge?.label.toUpperCase()}</p>
                  <h2>Development and Milestones</h2>
                  <p>Real, age-specific answers about how your child is growing and learning — not just "every child develops differently."</p>
                  {selectedHelpChild && (
                    <div className="helping-child-chip">
                      👧 Helping <strong>{selectedHelpChild.name}</strong> · {selectedHelpChild.age}
                      <button type="button" onClick={() => setSelectedChildForHelp(null)}>Change</button>
                    </div>
                  )}
                  <h3>What would you like to explore?</h3>
                </div>
                <div className="topic-grid">
                  {developmentTopics.map((topic) => (
                    <button type="button" key={topic.id} className="topic-choice" onClick={() => openDevelopmentTopic(topic.id)}>
                      <span>{topic.emoji}</span>
                      <strong>{topic.title}</strong>
                      <small>{topic.subtitle}</small>
                      <b>→</b>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section ref={contentRef} className="guidance-card">
                <button type="button" className="back-button" onClick={goBack}>
                  ← Back to development topics
                </button>

                {currentDevTopic && currentDevGuidance && (
                  <>
                    <div className="guidance-title">
                      <div className="topic-icon">{currentDevGuidance.emoji}</div>
                      <div>
                        <p className="eyebrow">{currentAge?.label.toUpperCase()}</p>
                        <h2>{currentDevGuidance.title}</h2>
                        <button type="button" className="save-help-button" onClick={saveDevelopmentHelp}>❤️ Save this idea</button>
                        {selectedHelpChild && (
                          <p className="personalized-guidance-label">
                            Personalized for {selectedHelpChild.name} · {selectedHelpChild.age}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="advice-block">
                      <div className="number">1</div>
                      <div>
                        <h4>WHAT'S COMMON AT THIS AGE</h4>
                        <p>{currentDevGuidance.common}</p>
                      </div>
                    </div>

                    <div className="advice-block">
                      <div className="number">2</div>
                      <div>
                        <h4>WHAT TO WATCH FOR</h4>
                        <p>{currentDevGuidance.watchFor}</p>
                      </div>
                    </div>

                    <div className="advice-block">
                      <div className="number">3</div>
                      <div>
                        <h4>WHAT YOU CAN DO</h4>
                        <p>{currentDevGuidance.whatYouCanDo}</p>
                      </div>
                    </div>

                    <div className="advice-block">
                      <div className="number">4</div>
                      <div>
                        <h4>WHEN TO ASK ABOUT IT</h4>
                        <p>{currentDevGuidance.whenToAsk}</p>
                      </div>
                    </div>

                    {currentDevGuidance.deepDive.length > 0 && (
                      <div className="deep-dive" style={{ marginTop: 24, padding: 24, borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)' }}>
                        <div className="deep-dive-heading" style={{ marginBottom: 6 }}>
                          <p className="eyebrow">A LITTLE DEEPER</p>
                          <h3>When you want more context</h3>
                        </div>
                        {currentDevGuidance.deepDive.map((item) => (
                          <div className="deep-dive-item" key={item.heading} style={{ padding: '15px 0', borderTop: '1px solid rgba(95, 105, 94, 0.10)' }}>
                            <h4 style={{ margin: '0 0 6px', color: '#6d5542', fontSize: 13 }}>{item.heading}</h4>
                            <p style={{ margin: 0, color: '#68716a', lineHeight: 1.6 }}>{item.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="remember-box">
                      <strong>💛 Remember</strong>
                      <p>
                        Milestones are developmental guides, not rigid deadlines. Every child develops at their own pace.
                        If you are concerned, you do not need to wait for a specific age — contact your healthcare professional.
                        This information is not a diagnosis and does not replace professional guidance.
                      </p>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        ) : selectedHelp === 'activities' ? (
          <>

            <section ref={(el) => { activityRef.current = el; contentRef.current = el; }} className="activity-card">
              <div className="activity-icon">{activity.emoji}</div>
              <div className="activity-content">
                <div className="tag-row">
                  <span>{activity.category}</span>
                  <span>⏱ {activity.time}</span>
                  <span>🧠 {activity.effort} effort</span>
                  <span>🧺 {activity.setup} setup</span>
                  <span>🧼 {activity.mess} mess</span>
                </div>
                <h3>{activity.title}</h3>
                <p>{activity.description}</p>
                <div className="age">
                  <span>♥</span>
                  Great for {currentAge?.label} · {currentAge?.range}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="primary-button" onClick={chooseActivity}>✨ Give me another idea</button>
                  <button type="button" className="secondary-save-button" onClick={saveCurrentActivity}>❤️ Save this idea</button>
                </div>
              </div>
            </section>

            <section className="quick-section">
              <div className="section-heading">
                <p className="eyebrow">SAVE TIME + MENTAL ENERGY</p>
                <h2>What do you need right now?</h2>
                <p style={{ maxWidth: 620, margin: '8px auto 0', color: '#68716a', lineHeight: 1.55 }}>
                  Pick the kind of help you need. Breezier Days will choose an age-appropriate idea for you.
                </p>
              </div>

              <div className="quick-grid">
                <button type="button" aria-pressed={selectedNeed === 'outside'} style={{ borderColor: selectedNeed === 'outside' ? '#496455' : undefined, boxShadow: selectedNeed === 'outside' ? '0 8px 20px rgba(73,100,85,.14)' : undefined }} onClick={() => chooseActivityForNeed('outside')}>
                  <span>🌿</span>
                  <strong>We need to get outside</strong>
                  <small>Fresh air + easy play</small>
                </button>

                <button type="button" aria-pressed={selectedNeed === 'calm'} style={{ borderColor: selectedNeed === 'calm' ? '#496455' : undefined, boxShadow: selectedNeed === 'calm' ? '0 8px 20px rgba(73,100,85,.14)' : undefined }} onClick={() => chooseActivityForNeed('calm')}>
                  <span>🧸</span>
                  <strong>We need something calm</strong>
                  <small>Low-energy + lower mess</small>
                </button>

                <button type="button" aria-pressed={selectedNeed === 'play'} style={{ borderColor: selectedNeed === 'play' ? '#496455' : undefined, boxShadow: selectedNeed === 'play' ? '0 8px 20px rgba(73,100,85,.14)' : undefined }} onClick={() => chooseActivityForNeed('play')}>
                  <span>🎭</span>
                  <strong>Playtime needed</strong>
                  <small>Just give me an idea</small>
                </button>

                <button type="button" aria-pressed={selectedNeed === 'get-things-done'} style={{ borderColor: selectedNeed === 'get-things-done' ? '#496455' : undefined, boxShadow: selectedNeed === 'get-things-done' ? '0 8px 20px rgba(73,100,85,.14)' : undefined }} onClick={() => chooseActivityForNeed('get-things-done')}>
                  <span>🏠</span>
                  <strong>I need to get things done</strong>
                  <small>Keep them involved nearby</small>
                </button>

                <button type="button" aria-pressed={selectedNeed === 'lowest-effort'} style={{ borderColor: selectedNeed === 'lowest-effort' ? '#496455' : undefined, boxShadow: selectedNeed === 'lowest-effort' ? '0 8px 20px rgba(73,100,85,.14)' : undefined }} onClick={() => chooseActivityForNeed('lowest-effort')}>
                  <span>💛</span>
                  <strong>I have no energy</strong>
                  <small>The easiest good-enough option</small>
                </button>
              </div>

              {activitySelectionMessage && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: '#edf2ec',
                    color: '#35443b',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                  role="status"
                  aria-live="polite"
                >
                  ✨ {activitySelectionMessage}
                </div>
              )}

              <div className="section-heading" style={{ marginTop: 24 }}>
                <p className="eyebrow">HOW MUCH TIME DO YOU HAVE? {isPremium ? '' : '· PREMIUM'}</p>
                {isFeatureLocked('time-based-recommendations') ? (
                  <div className="premium-locked-inline">
                    <div className="premium-locked-icon-sm">⏱️</div>
                    <div>
                      <strong>Time-Based Recommendations</strong>
                      <p>Get ideas matched to the exact time you have — 5, 15, 20, or 30+ minutes.</p>
                      <button type="button" className="premium-unlock-button-sm" onClick={() => unlockPremium('time-based-recommendations')}>
                        ✦ Unlock Premium
                      </button>
                    </div>
                  </div>
                ) : (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                  {[5, 15, 20, 30].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => chooseActivityForTime(minutes)}
                      style={{
                        border: selectedTime === minutes ? '1px solid #496455' : '1px solid rgba(95,105,94,.15)',
                        borderRadius: 999,
                        padding: '10px 16px',
                        background: selectedTime === minutes ? '#496455' : '#fffdf9',
                        color: selectedTime === minutes ? '#fff' : '#496455',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {minutes === 30 ? '30+ min' : `${minutes} min`}
                    </button>
                  ))}
                </div>
                )}
              </div>
            </section>

            <button type="button"
              className="browse-button"
              onClick={() => {
                setShowAll(!showAll);
                if (!showAll) window.setTimeout(() => {
                  browseRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }, 100);
              }}
            >
              {showAll ? 'Hide activities ↑' : 'Browse all ideas →'}
            </button>

            {showAll && (
              <section ref={browseRef} className="all-activities">
                {matchingActivities.map((item) => (
                  <button type="button"
                    key={item.title}
                    className="activity-list-item"
                    onClick={() => {
                      setActivity(item);
                      setShowAll(false);
                      window.setTimeout(() => {
                        activityRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
                      }, 100);
                    }}
                  >
                    <span>{item.emoji}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.category} · {item.time} · {item.effort} effort · {item.setup} setup · {item.mess} mess</small>
                    </div>
                    <b>→</b>
                  </button>
                ))}
              </section>
            )}
          </>
        ) : (
          !selectedSituation ? (
            <section
              ref={(el) => {
                contentRef.current = el;
                helpNowRef.current = selectedHelp === 'help-now' ? el : null;
              }}
              className={`topic-section ${
                selectedHelp === 'help-now' ? 'help-now-section' : ''
              }`}
            >
              {selectedHelp === 'help-now' && (
                <div className="help-personalized-intro" style={{ marginBottom: 26, padding: '26px 24px', borderRadius: 24, background: '#f7f3ec', border: '1px solid rgba(73,100,85,.12)' }}>
                  <p className="eyebrow" style={{ color: '#496455', fontWeight: 800, letterSpacing: '.12em', marginBottom: 8 }}>LESS FIGURING IT OUT</p>
                  <h2 style={{ margin: '0 0 8px' }}>Just tell me what's happening.</h2>
                  <p style={{ margin: '0 0 10px', color: '#4a524a', lineHeight: 1.6 }}><strong>Free:</strong> Get 5 personalized practical answers each month. Premium makes personalized help unlimited and adds full game plans.</p>
                  <p style={{ margin: '0 0 12px', color: '#68716a', lineHeight: 1.6 }}>One sentence is enough. Breezier Days will turn it into one practical next step.</p>
                  <p style={{ margin: '0 0 14px', color: '#496455', fontSize: 13, fontWeight: 800 }}>
                    {isPremium
                      ? '✦ Premium · Unlimited personalized help + full game plans'
                      : personalizedHelpUsage >= FREE_PERSONALIZED_HELP_LIMIT
                      ? "✦ You've used this month's personalized answers · Premium makes them unlimited"
                      : `✓ Free · ${FREE_PERSONALIZED_HELP_LIMIT - personalizedHelpUsage} personalized ${FREE_PERSONALIZED_HELP_LIMIT - personalizedHelpUsage === 1 ? 'answer' : 'answers'} left this month`}
                  </p>
                  <div className="just-tell-me-form">
                    <textarea
                      value={justTellMeText}
                      onChange={(e) => setJustTellMeText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleJustTellMe();
                      }}
                      placeholder="Example: My toddler is melting down and I need to make dinner."
                      rows={3}
                    />
                    <button type="button" className="just-tell-me-cta" onClick={handleJustTellMe} disabled={!justTellMeText.trim()}>
                      ✨ Tell me what to do
                    </button>
                  </div>
                  <p style={{ margin: '10px 0 0', color: '#68716a', fontSize: 12 }}>One sentence is enough. No need to explain everything.</p>
                </div>
              )}

              <div className="topic-heading">
                <div className="topic-icon">
                  {currentHelpOption?.emoji}
                </div>
                <p className="eyebrow">{isParentingStageOnly ? (selectedStage === 'expecting' ? 'EXPECTING PARENT' : 'NEW PARENT') : currentAge?.label.toUpperCase()}</p>
                <h2>
                  {currentHelpOption?.title}
                </h2>
                <p>
                  {selectedHelp === 'help-now'
                    ? 'Choose what is happening and get a simple next step right away.'
                    : selectedHelp === 'feeding'
                    ? 'Breastfeeding, formula, pumping, and combination feeding — practical help without judgment.'
                    : selectedHelp === 'sleep'
                    ? 'Sleep looks different at every age. Let\'s find a practical next step.'
                    : selectedStage === 'expecting'
                    ? 'Keep the useful things, skip the overwhelm, and take one practical step at a time.'
                    : selectedStage === 'newparent'
                    ? 'Practical support for the early days — fewer decisions, less mental load, more time with your baby.'
                    : 'Tell us what is happening right now. We\'ll give you a practical next step.'}
                </p>
                
                {selectedHelpChild && (
                  <div className="helping-child-chip">
                    👧 Helping <strong>{selectedHelpChild.name}</strong> · {selectedHelpChild.age}
                    <button
                      type="button"
                      onClick={() => setSelectedChildForHelp(null)}
                    >
                      Change
                    </button>
                  </div>
                )}

                <h3>
                  {selectedHelp === 'help-now'
                    ? '🚨 What\'s happening right now?'
                    : selectedHelp === 'sleep'
                    ? 'What\'s happening with sleep?'
                    : 'What\'s happening?'}
                </h3>

                {situationList.length === 0 && selectedHelp !== 'development' && (
                  <div className="no-situation-quick-links" aria-label="Choose a topic">
                    <p className="no-situation-quick-links-intro">Choose what is closest to what you need help with:</p>
                    <div className="no-situation-quick-links-grid">
                      {helpOptions.map((help) => (
                        <button
                          key={help.id}
                          type="button"
                          className="topic-choice quick-topic-choice"
                          onClick={() => selectHelp(help.id)}
                        >
                          <span>{help.emoji}</span>
                          <div>
                            <strong>{help.title}</strong>
                            <small>{help.description}</small>
                          </div>
                          <b>→</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedStage === 'expecting' && !selectedSituation && (
                <section className="pregnancy-today-panel">
                  <p className="eyebrow">PREGNANCY TODAY</p>
                  <h3>How are you feeling today?</h3>
                  <p>Breezier Days can help you plan around your energy, not make you squeeze pregnancy into another checklist.</p>
                  <div className="feeling-choices">
                    {Object.entries(pregnancyTodayOptions).map(([id, option]) => (
                      <button type="button" key={id} className={`feeling-chip ${pregnancyTodayFeeling === id ? 'feeling-chip-selected' : ''}`} onClick={() => setPregnancyTodayFeeling(pregnancyTodayFeeling === id ? '' : id)}>
                        <span className="feeling-chip-emoji">{option.emoji}</span><span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {pregnancyTodayFeeling && pregnancyTodayOptions[pregnancyTodayFeeling] && (
                    <div className="feeling-support-options">
                      <p className="feeling-support-heading">{pregnancyTodayOptions[pregnancyTodayFeeling].focus}</p>
                      <ul>
                        <li><strong>One thing to do:</strong> {pregnancyTodayOptions[pregnancyTodayFeeling].action}</li>
                        <li><strong>One thing to skip:</strong> {pregnancyTodayOptions[pregnancyTodayFeeling].skip}</li>
                      </ul>
                      <p className="feeling-support-close">You are pregnant and still parenting. The goal is not to do everything — it is to make today work for the family you have right now.</p>
                    </div>
                  )}
                </section>
              )}

              {selectedHelp === 'help-now' && children.length > 0 && !selectedHelpChild && (
                <div className="choose-child-prompt">
                  <strong>👧 Who are you helping?</strong>
                  <div className="choose-child-buttons">
                    {children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => scrollToChildProfile(child.id)}
                      >
                        {child.name} · {child.age}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedHelp === 'help-now' && (
                <div className="handoff-section">
                  <button type="button" className="handoff-toggle" onClick={() => setShowHandoff(s => !s)}>
                    <span className="handoff-toggle-icon">🤝</span>
                    <span className="handoff-toggle-text">
                      <strong>What should I know?</strong>
                      <small>Tell Breezier Days what's happened so far today</small>
                    </span>
                    <span className="handoff-toggle-arrow">{showHandoff ? '▲' : '▼'}</span>
                  </button>

                  {showHandoff && (
                    <div className="handoff-fields">
                      <div className="handoff-field">
                        <label>Wake-up time</label>
                        <input type="text" placeholder="e.g. 6:30 AM" value={handoff.wakeTime}
                          onChange={(e) => setHandoff(h => ({ ...h, wakeTime: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Last feeding / bottle / nursing</label>
                        <input type="text" placeholder="e.g. Nursed at 7 AM, 4 oz bottle at 10" value={handoff.lastFeeding}
                          onChange={(e) => setHandoff(h => ({ ...h, lastFeeding: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Last nap &amp; length</label>
                        <input type="text" placeholder="e.g. 9–9:40 AM, 40 min" value={handoff.lastNap}
                          onChange={(e) => setHandoff(h => ({ ...h, lastNap: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Nap schedule today</label>
                        <input type="text" placeholder="e.g. Usually 9 &amp; 1, skipped afternoon" value={handoff.napSchedule}
                          onChange={(e) => setHandoff(h => ({ ...h, napSchedule: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Diaper / potty</label>
                        <input type="text" placeholder="e.g. Last wet diaper 11 AM, no BM yet" value={handoff.diaper}
                          onChange={(e) => setHandoff(h => ({ ...h, diaper: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Activities or outings</label>
                        <input type="text" placeholder="e.g. Park 10–11, storytime at library" value={handoff.activities}
                          onChange={(e) => setHandoff(h => ({ ...h, activities: e.target.value }))} />
                      </div>
                      <div className="handoff-field">
                        <label>Anything unusual today</label>
                        <input type="text" placeholder="e.g. Skipped lunch, extra fussy" value={handoff.unusual}
                          onChange={(e) => setHandoff(h => ({ ...h, unusual: e.target.value }))} />
                      </div>
                      <div className="handoff-field handoff-field-full">
                        <label>Anything else I should know?</label>
                        <textarea rows={2} placeholder="She woke at 6:30, nursed at 7, had breakfast at 8, and only slept 30 minutes. She's been cranky since lunch."
                          value={handoff.notes}
                          onChange={(e) => setHandoff(h => ({ ...h, notes: e.target.value }))} />
                      </div>
                      <button type="button" className="handoff-done" onClick={() => setShowHandoff(false)}>
                        Done
                      </button>
                    </div>
                  )}

                  {(() => {
                    const filled = (Object.entries(handoff) as [keyof typeof handoff, string][]).filter(([, v]) => v.trim());
                    if (!filled.length) return null;
                    return (
                      <div className="handoff-summary">
                        <p className="handoff-summary-label">📋 Today so far</p>
                        <ul>
                          {filled.map(([key, val]) => {
                            const labels: Record<string, string> = {
                              wakeTime: 'Wake-up', lastFeeding: 'Last feeding', lastNap: 'Last nap',
                              napSchedule: 'Nap schedule', diaper: 'Diaper/potty', activities: 'Activities',
                              unusual: 'Unusual', notes: 'Notes',
                            };
                            return <li key={String(key)}><strong>{labels[String(key)] ?? String(key)}:</strong> {val}</li>;
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedHelp === 'help-now' && selectedHelpChild && (
                <div className="handoff-section">
                  <button type="button" className="handoff-toggle" onClick={() => setShowAboutChild(s => !s)}>
                    <span className="handoff-toggle-icon">🧒</span>
                    <span className="handoff-toggle-text">
                      <strong>About {selectedHelpChild.name}</strong>
                      <small>Things Breezier Days can remember over time</small>
                    </span>
                    <span className="handoff-toggle-arrow">{showAboutChild ? '▲' : '▼'}</span>
                  </button>

                  {showAboutChild && (
                    <div className="handoff-fields about-child-fields">
                      <div className="handoff-field handoff-field-full">
                        <label>What do they enjoy?</label>
                        <input type="text" placeholder="e.g. dinosaurs, drawing, being outside, silly songs"
                          value={selectedHelpChild.aboutChild.enjoys}
                          onChange={(e) => updateAboutChild('enjoys', e.target.value)} />
                      </div>
                      <div className="handoff-field handoff-field-full">
                        <label>What usually works?</label>
                        <input type="text" placeholder="e.g. choices, music, cuddling, distraction, getting outside"
                          value={selectedHelpChild.aboutChild.whatWorks}
                          onChange={(e) => updateAboutChild('whatWorks', e.target.value)} />
                      </div>
                      <div className="handoff-field handoff-field-full">
                        <label>What has worked before?</label>
                        <input type="text" placeholder="e.g. A quiet minute together before transitions helped"
                          value={selectedHelpChild.aboutChild.workedBefore}
                          onChange={(e) => updateAboutChild('workedBefore', e.target.value)} />
                      </div>
                      <div className="handoff-field handoff-field-full">
                        <label>What tends to make things harder?</label>
                        <input type="text" placeholder="e.g. being rushed, hunger, tiredness, too much stimulation"
                          value={selectedHelpChild.aboutChild.makesHarder}
                          onChange={(e) => updateAboutChild('makesHarder', e.target.value)} />
                      </div>
                      <div className="handoff-field handoff-field-full">
                        <label>Anything else that helps us understand them?</label>
                        <textarea rows={2} placeholder="e.g. She needs a few minutes to adjust to new places"
                          value={selectedHelpChild.aboutChild.anythingElse}
                          onChange={(e) => updateAboutChild('anythingElse', e.target.value)} />
                      </div>
                      <button type="button" className="handoff-done" onClick={() => setShowAboutChild(false)}>
                        Done
                      </button>
                    </div>
                  )}

                  {(() => {
                    const a = selectedHelpChild.aboutChild;
                    const filled = (Object.entries(a) as [string, string][])
                      .filter(([, v]) => v.trim());
                    if (!filled.length) return null;
                    const labels: Record<string, string> = {
                      enjoys: 'Enjoys', whatWorks: 'Usually works', workedBefore: 'Worked before',
                      makesHarder: 'Makes harder', anythingElse: 'More',
                    };
                    return (
                      <div className="handoff-summary">
                        <p className="handoff-summary-label">🧒 About {selectedHelpChild.name}</p>
                        <ul>
                          {filled.map(([key, val]) => (
                            <li key={String(key)}><strong>{labels[String(key)] ?? String(key)}:</strong> {val}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedHelp === 'help-now' && (
                <div className="feeling-section">
                  <p className="feeling-prompt">How are you feeling right now?</p>
                  <div className="feeling-choices">
                    {[
                      { id: 'frustrated', label: "I'm frustrated", emoji: '😤' },
                      { id: 'overwhelmed', label: "I'm overwhelmed", emoji: '🌊' },
                      { id: 'exhausted', label: "I'm exhausted", emoji: '😮‍💨' },
                      { id: 'alone', label: "I'm feeling alone", emoji: '🫂' },
                      { id: 'worried', label: "I'm worried", emoji: '😟' },
                      { id: 'unsure', label: "I'm not sure what to do", emoji: '🤔' },
                    ].map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        className={`feeling-chip ${caregiverFeeling === f.id ? 'feeling-chip-selected' : ''}`}
                        onClick={() => {
                          const next = caregiverFeeling === f.id ? '' : f.id;
                          setCaregiverFeeling(next);
                          if (next === 'unsure' && situationGridRef.current) {
                            setTimeout(() => situationGridRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 100);
                          }
                        }}
                      >
                        <span className="feeling-chip-emoji">{f.emoji}</span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                  {caregiverFeeling && caregiverFeeling !== 'unsure' && feelingResponses[caregiverFeeling] && (
                    <p className="feeling-response">{feelingResponses[caregiverFeeling]}</p>
                  )}
                  {caregiverFeeling && feelingActionOptions[caregiverFeeling] && (
                    <div className="feeling-support-options">
                      <p className="feeling-support-heading">A few things you can actually do right now:</p>
                      <ul>
                        {feelingActionOptions[caregiverFeeling].map((option) => (
                          <li key={option.title}><strong>{option.title}:</strong> {option.body}</li>
                        ))}
                      </ul>
                      {caregiverFeeling === 'alone' && (
                        <p className="feeling-support-close">If this feeling keeps showing up or starts feeling like more than loneliness, tell someone you trust and consider talking with a healthcare or mental-health professional. You deserve real support.</p>
                      )}
                    </div>
                  )}
                  {caregiverFeeling === 'unsure' && (
                    <p className="feeling-response">That's what we're here for. Pick the situation below that's closest — we'll walk you through it step by step.</p>
                  )}
                  {caregiverFeeling && (
                    <button
                      type="button"
                      className="feeling-clear"
                      onClick={() => setCaregiverFeeling('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {false && selectedHelp === 'help-now' && !isPremium && personalizedHelpUsage >= FREE_PERSONALIZED_HELP_LIMIT ? (
                <div className="help-now-locked-screen">
                  <div className="help-now-locked-icon">🔒</div>
                  <h3>You've used your {FREE_PERSONALIZED_HELP_LIMIT} free personalized answers this month.</h3>
                  <p>Unlock unlimited help + full game plans with Premium.</p>
                  <ul className="premium-locked-features">
                    <li>Unlimited What Do I Do Now? answers</li>
                    <li>Full game plans: what to say, what to try, what to avoid</li>
                    <li>Age-specific strategies for every situation</li>
                    <li>Save any answer to find it later</li>
                  </ul>
                  <p className="premium-price">$4.99/month</p>
                  <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>
                    ✦ Unlock Premium
                  </button>
                </div>
              ) : (
              <div className="topic-grid" ref={situationGridRef}>
                {selectedHelp === 'help-now' && situationList.length > 12 ? (
                  helpNowCategories.map((cat) => {
                    const catSituations = situationList.filter((s) => s.category === cat.id);
                    if (!catSituations.length) return null;
                    return (
                      <div key={cat.id} className="help-now-category-group">
                        <h4 className="help-now-category-label">{cat.emoji} {cat.label}</h4>
                        <div className="help-now-category-items">
                          {catSituations.map((situation) => (
                            <button type="button"
                              key={situation.id}
                              className="topic-choice"
                              onClick={() => {
                                if (!tryUseHelpNow()) return;
                                openSituation(situation.id);
                              }}
                            >
                              <span>{situation.emoji}</span>
                              <strong>{situation.title}</strong>
                              <b>→</b>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  situationList.map((situation) => (
                    <button type="button"
                      key={situation.id}
                      className="topic-choice"
                      onClick={() => {
                        if (!tryUseHelpNow()) return;
                        openSituation(situation.id);
                      }}
                    >
                      <span>{situation.emoji}</span>
                      <strong>{situation.title}</strong>
                      <b>→</b>
                    </button>
                  ))
                )}
              </div>
              )}
            </section>
          ) : (
            <section ref={contentRef} className="guidance-card">
              <button type="button"
                className="back-button"
                onClick={goBack}
              >
                ← Back to situations
              </button>

              <div className="guidance-title">
                <div className="topic-icon">{currentSituation?.emoji}</div>
                <div>
                  <p className="eyebrow">{currentAge?.label.toUpperCase()}</p>
                  <h2>{currentGuidance?.title}</h2>

                  {currentGuidance && isPremium && (
                    <button type="button" className="save-help-button" onClick={saveCurrentHelp}>❤️ Save this idea</button>
                  )}
                  {currentGuidance && !isPremium && (
                    <button type="button" className="save-help-button save-help-locked" onClick={() => unlockPremium('unlimited-saved')}>🔒 Save this answer with Premium</button>
                  )}

                  {selectedHelpChild && (
                    <p className="personalized-guidance-label">
                      Personalized for {selectedHelpChild.name} · {selectedHelpChild.age}{childTraits.length > 0 ? ' · temperament-aware' : ''} — age-appropriate guidance is selected automatically
                    </p>
                  )}

                  {selectedHelp === 'help-now' && (() => {
                    const filled = (Object.entries(handoff) as [keyof typeof handoff, string][]).filter(([, v]) => v.trim());
                    if (!filled.length) return null;
                    return (
                      <div className="handoff-context-banner">
                        <p className="handoff-context-label">📋 Today so far — used to personalize this guidance</p>
                        <ul>
                          {filled.map(([key, val]) => {
                            const labels: Record<string, string> = {
                              wakeTime: 'Wake-up', lastFeeding: 'Last feeding', lastNap: 'Last nap',
                              napSchedule: 'Nap schedule', diaper: 'Diaper/potty', activities: 'Activities',
                              unusual: 'Unusual', notes: 'Notes',
                            };
                            return <li key={String(key)}><strong>{labels[String(key)] ?? String(key)}:</strong> {val}</li>;
                          })}
                        </ul>
                      </div>
                    );
                  })()}

                  {selectedHelp === 'help-now' && selectedHelpChild && (() => {
                    const a = selectedHelpChild.aboutChild;
                    const filled = (Object.entries(a) as [string, string][])
                      .filter(([, v]) => v.trim());
                    if (!filled.length) return null;
                    const labels: Record<string, string> = {
                      enjoys: 'Enjoys', whatWorks: 'Usually works', workedBefore: 'Worked before',
                      makesHarder: 'Makes harder', anythingElse: 'More',
                    };
                    return (
                      <div className="handoff-context-banner">
                        <p className="handoff-context-label">🧒 About {selectedHelpChild.name} — used to personalize this guidance</p>
                        <ul>
                          {filled.map(([key, val]) => (
                            <li key={String(key)}><strong>{labels[String(key)] ?? String(key)}:</strong> {val}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {selectedHelp === 'help-now' && currentSituation?.id === 'losing-control-now' && currentGuidance && (
                <section className="sos-solution-card" data-breezier-days-sos-solution aria-label="Immediate safety step">
                  <div className="sos-solution-eyebrow">🆘 RIGHT NOW</div>
                  <h3>Step away before you try to solve anything.</h3>
                  <p className="sos-solution-main">{currentGuidance.doNow}</p>
                  <div className="sos-solution-say">
                    <strong>Say this:</strong> “{currentGuidance.sayThis}”
                  </div>
                  <p className="sos-solution-note">Put your child in a safe place, create physical space, and get another adult or emergency support involved when needed. You do not have to handle the rest of the situation right now.</p>
                </section>
              )}

              {isSleepOrNapSituation && !sleepNeedsCheck.active && (
                <div className="sleep-needs-check-intro">
                  <p className="eyebrow">BEFORE WE BEGIN</p>
                  <h3>Let&apos;s check a few things first</h3>
                  <p>Before giving sleep advice, let&apos;s quickly rule out the basics. This takes about 30 seconds.</p>
                  <button type="button" className="sleep-needs-start-button" onClick={() => setSleepNeedsCheck({ active: true, step: 0, answers: {}, completed: false })}>
                    Start quick check →
                  </button>
                </div>
              )}

              {isSleepOrNapSituation && sleepNeedsCheck.active && !sleepNeedsCheck.completed && currentSleepQuestion && (
                <div className="sleep-needs-check">
                  <div className="sleep-needs-progress">
                    <p className="eyebrow">QUICK CHECK · {sleepNeedsCheck.step + 1} of {relevantSleepQuestions.length}</p>
                  </div>
                  <h3>{currentSleepQuestion.label}</h3>
                  <div className="sleep-needs-buttons">
                    <button type="button" className="sleep-needs-answer sleep-needs-yes" onClick={() => handleSleepNeedAnswer('yes')}>
                      Yes
                    </button>
                    <button type="button" className="sleep-needs-answer sleep-needs-no" onClick={() => handleSleepNeedAnswer('no')}>
                      No
                    </button>
                    <button type="button" className="sleep-needs-answer sleep-needs-unsure" onClick={() => handleSleepNeedAnswer('unsure')}>
                      Not sure
                    </button>
                  </div>
                </div>
              )}

              {isSleepOrNapSituation && sleepNeedsCheck.completed && sleepNeedsResult && (
                <div className="sleep-needs-result">
                  {sleepNeedsResult.type === 'address' ? (
                    <>
                      <p className="eyebrow">QUICK CHECK COMPLETE</p>
                      <h3>A few things to address first</h3>
                      <p>These may be making it harder for your child to settle. Take care of these, then try again:</p>
                      <ul className="sleep-needs-flagged">
                        {sleepNeedsResult.items.map((item, i) => (
                          <li key={i}>
                            <strong>{item.label}</strong>
                            <p>{item.hint}</p>
                          </li>
                        ))}
                      </ul>
                      <p className="sleep-needs-next-step">
                        Once you&apos;ve addressed these, come back and try the steps below.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">QUICK CHECK COMPLETE</p>
                      <h3>Basic needs look covered</h3>
                      <p>
                        {sleepNeedsResult.isNap
                          ? 'Since the basics are covered, the most likely issue is nap timing, overtiredness, or a nap transition. Here is one practical next step:'
                          : 'Since the basics are covered, the most likely issue is bedtime timing, overstimulation, or a boundary being tested. Here is one practical next step:'}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="advice-block" data-breezier-days-solution>
                <div className="number">1</div>
                <div>
                  <h4>DO THIS NOW</h4>
                  <p style={{ whiteSpace: 'pre-line' }}>{currentGuidance?.doNow}</p>
                </div>
              </div>

              {isPremium ? (
                <>
              <div className="advice-block">
                <div className="number">2</div>
                <div>
                  <h4>SAY THIS</h4>
                  <div className="quote">"{currentGuidance?.sayThis}"</div>
                </div>
              </div>

              {currentGuidance?.thenTry && (
                <div className="advice-block">
                  <div className="number">3</div>
                  <div>
                    <h4>THEN TRY THIS</h4>
                    <p>{currentGuidance.thenTry}</p>
                  </div>
                </div>
              )}

              {currentGuidance?.ifNotWorking && (
                <div className="advice-block">
                  <div className="number">4</div>
                  <div>
                    <h4>IF THAT DOESN'T WORK</h4>
                    <p>{currentGuidance.ifNotWorking}</p>
                  </div>
                </div>
              )}

              {currentGuidance?.keepBusy && (
                <div className="advice-block">
                  <div className="number">5</div>
                  <div>
                    <h4>KEEP THEM BUSY</h4>
                    <p>{currentGuidance.keepBusy}</p>
                  </div>
                </div>
              )}

              {currentGuidance?.contactParent && (
                <div className="advice-block contact-parent-block">
                  <div className="number">!</div>
                  <div>
                    <h4>WHEN TO CONTACT THE PARENT</h4>
                    <p>{currentGuidance.contactParent}</p>
                  </div>
                </div>
              )}

              <div className="advice-block">
                <div className="number">{currentGuidance?.thenTry || currentGuidance?.ifNotWorking || currentGuidance?.keepBusy || currentGuidance?.contactParent ? '6' : '3'}</div>
                <div>
                  <h4>AVOID THIS</h4>
                  <p>{currentGuidance?.avoidThis}</p>
                </div>
              </div>

              <div className="advice-block">
                <div className="number">{currentGuidance?.thenTry || currentGuidance?.ifNotWorking || currentGuidance?.keepBusy || currentGuidance?.contactParent ? '7' : '4'}</div>
                <div>
                  <h4>AFTERWARD</h4>
                  <p>{currentGuidance?.afterward}</p>
                </div>
              </div>

              {selectedHelp === 'help-now' && currentSituation && (currentSituation.id === 'overwhelmed-now' || currentSituation.id === 'losing-control-now') && (
                <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 16, background: 'rgba(255, 248, 230, 0.6)', border: '1px solid rgba(180, 140, 60, 0.15)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#5a4a3a' }}>
                    <input
                      type="checkbox"
                      checked={anotherAdultPresent}
                      onChange={(e) => setAnotherAdultPresent(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#6d5542', cursor: 'pointer' }}
                    />
                    <span>Another adult is here with me</span>
                  </label>
                  {anotherAdultPresent && (
                    <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 12, background: '#f7f3ec', fontSize: 13.5, lineHeight: 1.6, color: '#5a4a3a' }}>
                      <strong style={{ display: 'block', marginBottom: 6, fontSize: 12, letterSpacing: 0.5, color: '#6d5542' }}>IF ANOTHER ADULT IS HERE</strong>
                      {currentSituation.id === 'losing-control-now'
                        ? 'Hand off the children right now. You do not need to explain. Say: "I need a break. Can you take over for 10 minutes?" Take that time to reset — not to plan or problem-solve. Come back when you can speak calmly.'
                        : 'Divide and conquer. One adult handles the children while the other takes a short reset. If tensions are high between the adults too, take turns — one person steps out for 5 minutes while the other holds the space. You do not have to fix everything together right now.'}
                    </div>
                  )}
                </div>
              )}

              {selectedHelp === 'help-now' && currentSituation && currentSituation.id === 'overwhelmed-now' && (
                <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: '#fdf0ee', border: '1px solid rgba(180, 80, 70, 0.15)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: '#8a4a3a' }}>
                    <strong>Feeling like you might lose control?</strong> If you are so angry or overwhelmed that you might snap, there is a safer next step.
                  </p>
                  <button
                    type="button"
                    onClick={() => openSituation('losing-control-now')}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: 'none', background: '#c0584a', color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    🆘 I might lose control
                  </button>
                </div>
              )}

              {selectedHelp === 'help-now' && currentSituation && (currentSituation.id === 'overwhelmed-now' || currentSituation.id === 'losing-control-now' || currentSituation.id === 'meltdown-now' || currentSituation.id === 'hitting-now' || currentSituation.id === 'siblings-now') && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: '#8a8275', marginBottom: 10 }}>WHAT'S HAPPENING NEXT?</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { label: 'Kids are fighting', id: 'siblings-now' },
                      { label: "They won't listen", id: 'meltdown-now' },
                      { label: "They're crying", id: 'meltdown-now' },
                      { label: 'I need a break', id: 'overwhelmed-now' },
                      { label: 'Tell me what to say', id: null },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          if (btn.id) openSituation(btn.id);
                          else {
                            const sayThis = document.querySelector('[data-breezier-days-say-this]');
                            if (sayThis instanceof HTMLElement) sayThis.scrollIntoView({ behavior: 'auto', block: 'start' });
                          }
                        }}
                        style={{
                          padding: '10px 16px', borderRadius: 20, border: '1px solid rgba(95, 105, 94, 0.2)',
                          background: '#fff', color: '#5a4a3a', fontSize: 13, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f7f3ec'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentDeepDive.length > 0 && (
              <div className="deep-dive" style={{ marginTop: 24, padding: 24, borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)' }}>
                <div className="deep-dive-heading" style={{ marginBottom: 6 }}>
                  <p className="eyebrow">A LITTLE DEEPER</p>
                  <h3>When you want more context</h3>
                  <p>Short, practical context—without turning this into a giant article.</p>
                </div>
                {currentDeepDive.map((item) => (
                  <div className="deep-dive-item" key={item.heading} style={{ padding: '15px 0', borderTop: '1px solid rgba(95, 105, 94, 0.10)' }}>
                    <h4 style={{ margin: '0 0 6px', color: '#6d5542', fontSize: 13 }}>{item.heading}</h4>
                    <p style={{ margin: 0, color: '#68716a', lineHeight: 1.6 }}>{item.body}</p>
                  </div>
                ))}
              </div>
              )}

              {currentPremiumHelp && (
                <div className="premium-help-now">
                  <div className="premium-help-now-header">
                    <p className="eyebrow">✨ PREMIUM DEEP DIVE</p>
                    <h3>Going deeper</h3>
                  </div>

                  <div className="premium-help-now-section">
                    <h4>Why this works</h4>
                    <p>{currentPremiumHelp.whyThisWorks}</p>
                  </div>

                  <div className="premium-help-now-section">
                    <h4>What to try next</h4>
                    <ul>
                      {currentPremiumHelp.tryNext.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  {currentPremiumHelp.whatToAvoid && currentPremiumHelp.whatToAvoid.length > 0 && (
                    <div className="premium-help-now-section">
                      <h4>What to avoid</h4>
                      <ul>
                        {currentPremiumHelp.whatToAvoid.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentPremiumHelp.ageSpecific && (
                    <div className="premium-help-now-section">
                      <h4>Age-specific strategies</h4>
                      <p>{currentPremiumHelp.ageSpecific[selectedAge]}</p>
                    </div>
                  )}

                  {currentPremiumHelp.phrasesToSay && currentPremiumHelp.phrasesToSay.length > 0 && (
                    <div className="premium-help-now-section">
                      <h4>Phrases to say</h4>
                      <ul>
                        {currentPremiumHelp.phrasesToSay.map((phrase, i) => (
                          <li key={i}>"{phrase}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="premium-help-now-section">
                    <h4>When to reassess</h4>
                    <p>{currentPremiumHelp.whenToReassess}</p>
                  </div>

                  {currentPremiumHelp.relatedHelp && currentPremiumHelp.relatedHelp.length > 0 && (
                    <div className="premium-help-now-section">
                      <h4>Related help</h4>
                      <div className="related-help-row">
                        {currentPremiumHelp.relatedHelp.map((helpId) => {
                          const relatedSituation = allHelpNowSituations.find((s) => s.id === helpId);
                          if (!relatedSituation) return null;
                          return (
                            <button
                              type="button"
                              key={helpId}
                              className="related-help-chip"
                              onClick={() => {
                                openSituation(helpId);
                              }}
                            >
                              {relatedSituation.emoji} {relatedSituation.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
                </>
              ) : (
                <div className="premium-help-now-locked">
                  {currentPremiumHelp && (
                    <div className="premium-preview">
                      <div className="premium-preview-header">
                        <span className="premium-preview-badge">✦ Free Preview</span>
                        <h3>A taste of the full game plan</h3>
                      </div>
                      <div className="premium-preview-section">
                        <h4>Why this works</h4>
                        <p>{currentPremiumHelp.whyThisWorks}</p>
                      </div>
                      {currentPremiumHelp.phrasesToSay && currentPremiumHelp.phrasesToSay.length > 0 && (
                        <div className="premium-preview-section">
                          <h4>Try saying</h4>
                          <p className="premium-preview-quote">"{currentPremiumHelp.phrasesToSay[0]}"</p>
                        </div>
                      )}
                      <p className="premium-preview-note">
                        The full Premium guide includes what to try next, age-specific strategies,
                        what to avoid, when to reassess, and related help — all tailored to your situation.
                      </p>
                    </div>
                  )}
                  <div className="premium-locked-icon">🔒</div>
                  <strong>🔒 PREMIUM — Get the full game plan</strong>
                  <p>You've got the immediate next step. Unlock the complete guide for this situation:</p>
                  <ul className="premium-locked-features">
                    <li>What to do next</li>
                    <li>What to say</li>
                    <li>If that doesn't work</li>
                    <li>Why this may be happening</li>
                    <li>Age-specific strategy</li>
                    <li>What to avoid</li>
                    <li>Related help</li>
                    <li>Save this answer</li>
                  </ul>
                  <p className="premium-price">$4.99/month</p>
                  <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('unlimited-help-now')}>
                    ✦ Get the full game plan
                  </button>
                </div>
              )}

              {selectedHelp === 'help-now' && currentSituation && (currentSituation.id === 'screen-now' || currentSituation.id === 'overwhelmed-now') && (
                <div className="learning-suggestion-box">
                  <div className="learning-suggestion-icon">🎓</div>
                  <div>
                    <strong>Try a Learning Activity</strong>
                    <p>{currentSituation.id === 'screen-now'
                      ? 'A quick hands-on activity can make the screen transition easier. Browse low-prep learning ideas by age and interest.'
                      : 'A simple, low-energy activity can help you and your child reconnect. Browse 5-minute learning ideas that need almost no prep.'}</p>
                    <button type="button" className="learning-suggestion-button" onClick={openLearning}>
                      Browse Learning Activities →
                    </button>
                  </div>
                </div>
              )}

              {selectedHelp === 'mealtime' && (
                <div className="remember-box">
                  <strong>⚠️ Food safety</strong>
                  <p>
                    Prepare food in an age- and developmentally appropriate
                    size, shape, and texture. Young children should sit
                    upright and be actively supervised while eating. When
                    unsure about a particular food, check with your child's
                    healthcare professional.
                  </p>
                </div>
              )}

              {selectedHelp === 'mealtime' && (
                <div className="premium-feature-row">
                  {[
                    { id: 'food-on-hand' as PremiumFeatureId, emoji: '🥘', title: 'What Can I Make With What I Have?', text: "Tell Breezier Days what’s in your kitchen and get simple meal ideas." },
                    { id: 'picky-eating' as PremiumFeatureId, emoji: '🥦', title: 'Picky Eating Help', text: 'Practical, low-pressure strategies for selective eating.' },
                    { id: 'preschool-lunch' as PremiumFeatureId, emoji: '🥪', title: 'Preschool Lunch Ideas', text: 'Simple, packable lunch ideas built around familiar foods.' },
                  ].map((feature) => (
                    <div className="premium-locked-card-sm" key={feature.id}>
                      <div className="premium-locked-icon-sm">{feature.emoji}</div>
                      <strong>{feature.title}</strong>
                      <p>{feature.text}</p>
                      <button
                        type="button"
                        className="premium-unlock-button-sm"
                        onClick={() => {
                          if (!isPremium) { unlockPremium(feature.id); return; }
                          if (feature.id === 'picky-eating') { loadPickyProfile(); setPremiumModalFeature('picky-eating'); setShowPremiumModal(true); return; }
                          if (feature.id === 'preschool-lunch') { setPremiumModalFeature('preschool-lunch'); setShowPremiumModal(true); return; }
                          unlockPremium(feature.id);
                        }}
                      >
                        {isPremium ? '✓ Open Premium' : '✦ Unlock'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedHelp === 'feeding' && (
                <div className="remember-box">
                  <strong>💛 There is no one right way to feed your baby</strong>
                  <p>
                    Breast milk, formula, pumping, and combination feeding can
                    all be part of a family's feeding journey. If breastfeeding
                    is not possible or you choose not to breastfeed, commercial
                    infant formula is an important infant-feeding option.
                  </p>
                </div>
              )}

              {selectedHelp === 'sleep' && (
                <div className="remember-box">
                  <strong>🛏️ Safe sleep matters</strong>
                  <p>
                    For infants, place baby on the back for every sleep on a
                    firm, flat, noninclined surface made for infant sleep.
                    Keep loose blankets, pillows, bumpers, and toys out of the
                    sleep space.
                  </p>
                </div>
              )}

              {selectedHelp === 'siblings' && (
                <div className="remember-box">
                  <strong>💛 Siblings do not have to be best friends every minute</strong>
                  <p>
                    The goal is safety, respect, and learning how to handle
                    conflict. Step in for hitting, biting, dangerous behavior,
                    or ignored boundaries, then help children practice a better
                    way when everyone is calm.
                  </p>
                </div>
              )}

              {selectedHelp === 'bullying' && (
                <>
                  <div className="guidance-card">
                    <p className="eyebrow">START HERE</p>
                    <h3>🛡️ First figure out what is happening</h3>
                    <p>
                      Not every disagreement or unkind moment is bullying. Look for a pattern:
                      repeated behavior, a power imbalance, intentional harm, or a child who
                      is having trouble getting the behavior to stop.
                    </p>
                    <div className="guidance-card-grid">
                      <div><strong>Ask your child</strong><p>“Tell me what happened from the beginning.” Listen before deciding who is right.</p></div>
                      <div><strong>Look for patterns</strong><p>Who is involved? Is it repeated? Where does it happen? Is your child afraid or avoiding school?</p></div>
                      <div><strong>Get help when needed</strong><p>For repeated bullying, threats, harassment, or safety concerns, involve a trusted adult or school.</p></div>
                    </div>
                  </div>
                  <div className="remember-box">
                    <strong>💬 What to say tonight</strong>
                    <p>“I’m glad you told me. You do not deserve to be treated that way. We are going to figure out what is happening and what help you need.”</p>
                  </div>
                  <div className="premium-feature-row">
                    <div className="premium-locked-card-sm">
                      <div className="premium-locked-icon-sm">✦</div>
                      <strong>Premium Bullying & Friendship Support</strong>
                      <p>Age-specific help with bullying, exclusion, friendship problems, school conversations, online issues, and what to do if your child is the one hurting others.</p>
                      <button type="button" className="premium-unlock-button-sm" onClick={() => unlockPremium('deeper-behavior')}>
                        {isPremium ? '✓ Open Premium' : '✦ See Premium Support'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="remember-box">
                <strong>💛 Remember</strong>
                <p>
                  You do not have to handle every moment perfectly. The goal is
                  safety, connection, and helping your child learn over time.
                </p>
              </div>
            </section>
          )
        )}

        {selectedHelp && selectedHelp !== 'development' && !selectedSituation && situationList.length === 0 && (
          <section ref={contentRef} className="topic-section route-fallback">
            <div className="topic-heading">
              <div className="topic-icon">💛</div>
              <p className="eyebrow">BREEZIER DAYS</p>
              <h2>Let's find a practical next step.</h2>
              <p>This topic does not have a matching card for this stage yet, so we kept you on a useful path instead of leaving a blank screen.</p>
            </div>
            <div className="route-fallback-actions">
              <button type="button" className="primary-button" onClick={openHelpNow}>💡 What Do I Do Now?</button>
              <button type="button" className="secondary-button" onClick={() => selectHelp('activities')}>✨ Find an Activity</button>
            </div>
          </section>
        )}

        {showLearning && (
          <section ref={learningRef} className="learning-section">
            {!selectedLearningActivity ? (
              <>
                <div className="learning-header">
                  <button type="button" className="back-button" onClick={goBack}>
                    ← Back to Breezier Days
                  </button>
                  <p className="eyebrow">LEARNING ACTIVITIES</p>
                  <h2>🎓 Practical Learning Ideas</h2>
                  <p>Low-prep activities using everyday household items. Filter by age, category, time, and more. All activities are free.</p>
                </div>

                {learningView === 'activities' && (
                  <button type="button" className="learning-filter-toggle" onClick={() => setShowLearningFilters(v => !v)} aria-expanded={showLearningFilters}>
                    {showLearningFilters ? 'Hide filters' : 'Filter activities'}
                    <span>{showLearningFilters ? '▲' : '▼'}</span>
                  </button>
                )}

                <div className="learning-view-toggle">
                  <button
                    type="button"
                    className={`learning-view-tab ${learningView === 'activities' ? 'active' : ''}`}
                    onClick={() => { setLearningView('activities'); setSelectedPlanDay(null); }}
                  >
                    🎨 Activities
                  </button>
                  <button
                    type="button"
                    className={`learning-view-tab ${learningView === 'plans' ? 'active' : ''}`}
                    onClick={() => {
                      if (isFeatureLocked('learning-plans')) {
                        unlockPremium('learning-plans');
                        return;
                      }
                      setLearningView('plans');
                      setSelectedPlanDay(null);
                    }}
                  >
                    📋 Learning Plans <span className="learning-view-premium-badge">✦</span>
                  </button>
                </div>

                {learningView === 'activities' && (
                <>
                {showLearningFilters && (<>
                <div className="learning-filter-group">
                  <h4>Age / Stage</h4>
                  <div className="learning-filter-row">
                    {learningAgeGroups.map((age) => (
                      <button
                        type="button"
                        key={age.id}
                        className={`learning-filter-chip ${learningAge === age.id ? 'selected' : ''}`}
                        onClick={() => { setLearningAge(age.id); }}
                      >
                        <span>{age.emoji}</span>
                        {age.label}
                        <small>{age.range}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-filter-group">
                  <h4>Category</h4>
                  <div className="learning-filter-row learning-category-row">
                    <button
                      type="button"
                      className={`learning-filter-chip-sm ${learningCategory === 'all' ? 'selected' : ''}`}
                      onClick={() => setLearningCategory('all')}
                    >
                      All
                    </button>
                    {learningCategories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        className={`learning-filter-chip-sm ${learningCategory === cat.id ? 'selected' : ''}`}
                        onClick={() => setLearningCategory(cat.id)}
                      >
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-filter-group">
                  <h4>Time</h4>
                  <div className="learning-filter-row">
                    {(['all', '5 min', '10 min', '20+ min'] as const).map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={`learning-filter-chip-sm ${learningTime === t ? 'selected' : ''}`}
                        onClick={() => setLearningTime(t)}
                      >
                        {t === 'all' ? 'Any' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-filter-group">
                  <h4>Indoor / Outdoor</h4>
                  <div className="learning-filter-row">
                    {(['all', 'Indoor', 'Outdoor', 'Both'] as const).map((loc) => (
                      <button
                        type="button"
                        key={loc}
                        className={`learning-filter-chip-sm ${learningLocation === loc ? 'selected' : ''}`}
                        onClick={() => setLearningLocation(loc)}
                      >
                        {loc === 'all' ? 'Any' : loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-filter-group">
                  <h4>Energy Level</h4>
                  <div className="learning-filter-row">
                    {(['all', 'Low', 'Medium', 'High'] as const).map((e) => (
                      <button
                        type="button"
                        key={e}
                        className={`learning-filter-chip-sm ${learningEnergy === e ? 'selected' : ''}`}
                        onClick={() => setLearningEnergy(e)}
                      >
                        {e === 'all' ? 'Any' : e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-filter-group">
                  <h4>Prep Level</h4>
                  <div className="learning-filter-row">
                    {(['all', 'None', '2 min', '5 min+'] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`learning-filter-chip-sm ${learningPrep === p ? 'selected' : ''}`}
                        onClick={() => setLearningPrep(p)}
                      >
                        {p === 'all' ? 'Any' : p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learning-results-count">
                  <strong>{filteredLearningActivities.length}</strong> {filteredLearningActivities.length === 1 ? 'activity' : 'activities'} found
                </div>

                {filteredLearningActivities.length === 0 ? (
                  <div className="learning-empty">
                    <p>No activities match all your filters. Try removing a filter to see more ideas.</p>
                  </div>
                ) : (
                  <div className="learning-card-grid">
                    {filteredLearningActivities.map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        className="learning-card"
                        onClick={() => {
                          pushNavHistory();
                          setSelectedLearningActivity(act);
                          setShowLearningFilters(false);
                          window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
                            learningRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
                          }));
                        }}
                      >
                        <div className="learning-card-emoji">{act.emoji}</div>
                        <div className="learning-card-body">
                          <div className="learning-card-tags">
                            <span>{learningCategories.find(c => c.id === act.category)?.emoji} {learningCategories.find(c => c.id === act.category)?.label}</span>
                            <span>⏱ {act.time}</span>
                          </div>
                          <h3>{act.title}</h3>
                          <p>{act.learning}</p>
                          <div className="learning-card-meta">
                            <span>📦 {act.prep} prep</span>
                            <span>📍 {act.location}</span>
                            <span>⚡ {act.energy} energy</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                </>)}
                </>
                )}

                {!isPremium && (
                  <div className="learning-premium-banner">
                    <div className="learning-premium-banner-icon">✦</div>
                    <strong>Unlock Personalized Activities & Learning Plans</strong>
                    <p>All activities above are free. Premium adds personalization — activities tailored to your child's age and temperament, "I only have 10 minutes" picks, "Make this easier" adjustments, and structured weekly Learning Plans that help your child build a skill day by day.</p>
                    <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('personalized-learning')}>
                      ✦ Unlock Breezier Days Premium
                    </button>
                  </div>
                )}

                {learningView === 'plans' && isPremium && (
                  <div className="learning-plans-section">
                    {!currentLearningPlan && !selectedPlanDay && (
                      <>
                        <div className="learning-plans-intro">
                          <h3>📋 Weekly Learning Plans</h3>
                          <p>Don't just give an activity — give your child a simple plan for practicing and building a skill. Each plan has 5 days of 10–15 minute activities with a clear weekly goal, a natural progression from easier to more challenging, and tips for your child's temperament.</p>
                          {selectedHelpChild && (
                            <p className="learning-plans-child-note">
                              👤 Plan for <strong>{selectedHelpChild.name}</strong> · {learningAgeGroups.find(g => g.id === learningAge)?.label} ({learningAgeGroups.find(g => g.id === learningAge)?.range})
                              {selectedHelpChild.traits.length > 0 && ' · Personalized for their temperament'}
                            </p>
                          )}
                        </div>

                        <div className="learning-plans-templates">
                          <h4>Choose a focus area for this week:</h4>
                          <div className="learning-plans-template-grid">
                            {getAvailablePlanTemplates(learningAge).map((tpl) => {
                              const cat = learningCategories.find(c => c.id === tpl.focusArea);
                              return (
                                <button
                                  type="button"
                                  key={tpl.id}
                                  className="learning-plan-template-card"
                                  onClick={() => generateLearningPlan(tpl.id)}
                                >
                                  <div className="learning-plan-template-emoji">{cat?.emoji ?? '📋'}</div>
                                  <div className="learning-plan-template-body">
                                    <strong>{cat?.label ?? tpl.focusArea}</strong>
                                    <p>{tpl.goal}</p>
                                    <span>5 days · 10–15 min each</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {savedLearningPlans.length > 0 && (
                          <div className="learning-plans-saved">
                            <h4>💾 Saved Learning Plans</h4>
                            <div className="learning-plans-saved-list">
                              {savedLearningPlans.map((plan) => {
                                const cat = learningCategories.find(c => c.id === plan.focusArea);
                                return (
                                  <div key={plan.id} className="learning-plan-saved-card">
                                    <button type="button" onClick={() => openSavedLearningPlan(plan)} className="learning-plan-saved-info">
                                      <div className="learning-plan-saved-emoji">{cat?.emoji ?? '📋'}</div>
                                      <div>
                                        <strong>{cat?.label ?? plan.focusArea}</strong>
                                        <p>{plan.goal}</p>
                                        <span>{plan.childName ? `For ${plan.childName} · ` : ''}Saved {plan.createdAt}</span>
                                      </div>
                                    </button>
                                    <button type="button" className="learning-plan-saved-delete" onClick={() => deleteSavedLearningPlan(plan.id)}>🗑️</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {currentLearningPlan && !selectedPlanDay && (
                      <div className="learning-plan-view">
                        <button type="button" className="back-button" onClick={() => { goBack(); setCurrentLearningPlan(null); }}>
                          ← Back to Learning Plans
                        </button>

                        <div className="learning-plan-header">
                          <p className="eyebrow">{learningCategories.find(c => c.id === currentLearningPlan.focusArea)?.label.toUpperCase()}</p>
                          <h3>📋 This Week's Learning Plan</h3>
                          {currentLearningPlan.childName && (
                            <p className="learning-plan-child-name">For {currentLearningPlan.childName}</p>
                          )}
                        </div>

                        <div className="learning-plan-goal">
                          <h4>🎯 Weekly Goal</h4>
                          <p>{currentLearningPlan.goal}</p>
                        </div>

                        {currentLearningPlan.traitTips.length > 0 && (
                          <div className="learning-plan-trait-tips">
                            <h4>✨ Tips for Your Child's Temperament</h4>
                            <ul>
                              {currentLearningPlan.traitTips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="learning-plan-days">
                          <h4>📅 Daily Activities</h4>
                          <p className="learning-plan-progression-note">Each day builds on the one before — starting easier and getting more challenging.</p>
                          <div className="learning-plan-days-list">
                            {currentLearningPlan.days.map((day, i) => (
                              <button
                                type="button"
                                key={i}
                                className="learning-plan-day-card"
                                onClick={() => { pushNavHistory(); setSelectedPlanDay(day); }}
                              >
                                <div className="learning-plan-day-number">{day.day}</div>
                                <div className="learning-plan-day-body">
                                  <div className="learning-plan-day-emoji">{day.activity.emoji}</div>
                                  <div className="learning-plan-day-content">
                                    <strong>{day.title}</strong>
                                    <p className="learning-plan-day-skill">Practicing: {day.skill}</p>
                                    <div className="learning-plan-day-meta">
                                      <span>⏱ {day.activity.time}</span>
                                      <span>📦 {day.activity.prep} prep</span>
                                      <span>📍 {day.activity.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="learning-plan-actions">
                          <button type="button" className="secondary-save-button" onClick={saveLearningPlan}>
                            💾 Save this plan
                          </button>
                          <button type="button" className="learning-plan-regenerate" onClick={() => generateLearningPlan()}>
                            🔄 Generate new plan
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedPlanDay && currentLearningPlan && (
                      <div className="learning-plan-day-detail">
                        <button type="button" className="back-button" onClick={() => { goBack(); setSelectedPlanDay(null); }}>
                          ← Back to plan
                        </button>

                        <div className="learning-plan-day-detail-header">
                          <div className="learning-plan-day-detail-emoji">{selectedPlanDay.activity.emoji}</div>
                          <div>
                            <p className="eyebrow">{selectedPlanDay.day} · {learningCategories.find(c => c.id === selectedPlanDay.activity.category)?.label.toUpperCase()}</p>
                            <h3>{selectedPlanDay.title}</h3>
                          </div>
                        </div>

                        <div className="learning-detail-section">
                          <h4>🎯 What this activity practices</h4>
                          <p>{selectedPlanDay.skill}</p>
                        </div>

                        <div className="learning-detail-section">
                          <h4>📦 What you need</h4>
                          <p>{selectedPlanDay.activity.materials}</p>
                        </div>

                        <div className="learning-detail-section">
                          <h4>📝 How to do it</h4>
                          <ol>
                            {selectedPlanDay.activity.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="learning-plan-adjustments">
                          <div className="learning-plan-adjustment-card easier">
                            <div className="learning-plan-adjustment-icon">⬇️</div>
                            <div>
                              <h4>Make It Easier</h4>
                              <p>{selectedPlanDay.easier}</p>
                            </div>
                          </div>
                          <div className="learning-plan-adjustment-card harder">
                            <div className="learning-plan-adjustment-icon">⬆️</div>
                            <div>
                              <h4>Make It More Challenging</h4>
                              <p>{selectedPlanDay.harder}</p>
                            </div>
                          </div>
                        </div>

                        <div className="learning-detail-meta">
                          <span>⏱ {selectedPlanDay.activity.time}</span>
                          <span>📦 {selectedPlanDay.activity.prep} prep</span>
                          <span>📍 {selectedPlanDay.activity.location}</span>
                          <span>⚡ {selectedPlanDay.activity.energy} energy</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {learningView === 'plans' && !isPremium && (
                  <div className="learning-plans-locked">
                    <div className="learning-plans-locked-icon">📋</div>
                    <strong>Learning Plans are a Premium feature</strong>
                    <p>Individual activities are always free. Learning Plans give you a structured weekly plan — 5 days of 10–15 minute activities, a clear weekly goal, easier-to-harder progression, and tips personalized to your child's temperament.</p>
                    <button type="button" className="premium-unlock-button" onClick={() => unlockPremium('learning-plans')}>
                      ✦ Unlock Breezier Days Premium
                    </button>
                  </div>
                )}
              </>
            ) : (
              <section className="learning-detail">
                <button type="button" className="back-button" onClick={goBack}>
                  ← Back to activities
                </button>

                <div className="learning-detail-header">
                  <div className="learning-detail-emoji">{selectedLearningActivity.emoji}</div>
                  <div>
                    <p className="eyebrow">{learningCategories.find(c => c.id === selectedLearningActivity.category)?.label.toUpperCase()}</p>
                    <h2>{selectedLearningActivity.title}</h2>
                  </div>
                </div>

                <div className="learning-detail-section">
                  <h4>🎯 What your child is learning</h4>
                  <p>{selectedLearningActivity.learning}</p>
                </div>

                <div className="learning-detail-section">
                  <h4>📦 What you need</h4>
                  <p>{selectedLearningActivity.materials}</p>
                </div>

                <div className="learning-detail-section">
                  <h4>📝 How to do it</h4>
                  <ol>
                    {selectedLearningActivity.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="learning-detail-meta">
                  <span>⏱ {selectedLearningActivity.time}</span>
                  <span>📦 {selectedLearningActivity.prep} prep</span>
                  <span>📍 {selectedLearningActivity.location}</span>
                  <span>⚡ {selectedLearningActivity.energy} energy</span>
                  <span>👶 {selectedLearningActivity.ages.join(' / ')}</span>
                </div>

                <button type="button" className="secondary-save-button" onClick={() => saveLearningActivity(selectedLearningActivity)}>
                  ❤️ Save this activity
                </button>
              </section>
            )}
          </section>
        )}

        {reopenedSavedAnswer && reopenedSavedAnswer.helpNowFull && (
          <div className="taking-over-modal-overlay" onClick={goBack}>
            <div className="taking-over-modal" onClick={e => e.stopPropagation()}>
              <div className="taking-over-header">
                <h3>{reopenedSavedAnswer.emoji} {reopenedSavedAnswer.title}</h3>
                <button type="button" onClick={goBack}>×</button>
              </div>
              <p className="taking-over-subtitle">
                {reopenedSavedAnswer.meta} · Saved {reopenedSavedAnswer.savedAt}
                {reopenedSavedAnswer.helpNowChildId != null && (() => {
                  const child = children.find(c => c.id === reopenedSavedAnswer.helpNowChildId);
                  return child ? ` · For ${child.name}` : '';
                })()}
              </p>

              <div className="advice-block">
                <div className="number">1</div>
                <div>
                  <h4>DO THIS NOW</h4>
                  <p>{reopenedSavedAnswer.helpNowFull.doNow}</p>
                </div>
              </div>

              {reopenedSavedAnswer.helpNowFull.sayThis && (
                <div className="advice-block">
                  <div className="number">2</div>
                  <div>
                    <h4>SAY THIS</h4>
                    <div className="quote">"{reopenedSavedAnswer.helpNowFull.sayThis}"</div>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.thenTry && (
                <div className="advice-block">
                  <div className="number">3</div>
                  <div>
                    <h4>THEN TRY THIS</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.thenTry}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.ifNotWorking && (
                <div className="advice-block">
                  <div className="number">4</div>
                  <div>
                    <h4>IF THAT DOESN'T WORK</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.ifNotWorking}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.keepBusy && (
                <div className="advice-block">
                  <div className="number">5</div>
                  <div>
                    <h4>KEEP THEM BUSY</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.keepBusy}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.contactParent && (
                <div className="advice-block contact-parent-block">
                  <div className="number">!</div>
                  <div>
                    <h4>WHEN TO CONTACT THE PARENT</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.contactParent}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.avoidThis && (
                <div className="advice-block">
                  <div className="number">6</div>
                  <div>
                    <h4>AVOID THIS</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.avoidThis}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.afterward && (
                <div className="advice-block">
                  <div className="number">7</div>
                  <div>
                    <h4>AFTERWARD</h4>
                    <p>{reopenedSavedAnswer.helpNowFull.afterward}</p>
                  </div>
                </div>
              )}

              {reopenedSavedAnswer.helpNowFull.deepDive && reopenedSavedAnswer.helpNowFull.deepDive.length > 0 && (
                <div className="deep-dive" style={{ marginTop: 24, padding: 24, borderRadius: 22, background: '#f7f3ec', border: '1px solid rgba(95, 105, 94, 0.10)' }}>
                  <div className="deep-dive-heading" style={{ marginBottom: 6 }}>
                    <p className="eyebrow">A LITTLE DEEPER</p>
                    <h3>When you want more context</h3>
                  </div>
                  {reopenedSavedAnswer.helpNowFull.deepDive.map((item) => (
                    <div className="deep-dive-item" key={item.heading} style={{ padding: '15px 0', borderTop: '1px solid rgba(95, 105, 94, 0.10)' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#6d5542', fontSize: 13 }}>{item.heading}</h4>
                      <p style={{ margin: 0, color: '#68716a', lineHeight: 1.6 }}>{item.body}</p>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="taking-over-generate" onClick={() => { removeSavedIdea(reopenedSavedAnswer.id); setReopenedSavedAnswer(null); }}>
                🗑️ Delete this saved answer
              </button>
            </div>
          </div>
        )}

        <footer>
          <p style={{ padding: '12px 0' }}>Made for real life — for parents, nannies, grandparents, and caregivers.</p>

          <div className="legal-links">
            <button type="button" onClick={() => { pushNavHistory(); setLegalPage('privacy') }}>Privacy Policy</button>
            <button type="button" onClick={() => { pushNavHistory(); setLegalPage('terms') }}>Terms of Use</button>
            <button type="button" onClick={() => { pushNavHistory(); setLegalPage('health') }}>Health Disclaimer</button>
            <button type="button" onClick={() => { pushNavHistory(); setLegalPage('delete') }}>Delete My Data</button>
            <button type="button" onClick={() => { pushNavHistory(); setLegalPage('subscription') }}>Subscription Info</button>
          </div>

          <div className="sync-section">
            {syncPasscode ? (
              <>
                <div className="sync-status-row">
                  <span className={`sync-status-dot ${syncState === 'synced' ? 'synced' : syncState === 'syncing' ? 'pending' : ''}`} />
                  <span className="sync-status-text">
                    {syncState === 'syncing' ? 'Syncing...' : syncState === 'synced' ? 'Synced across devices' : syncState === 'error' ? 'Sync error' : 'Sync ready'}
                  </span>
                  <button type="button" className="sync-signout-btn" onClick={clearSyncPasscode}>Disconnect</button>
                </div>
                {syncError && <span className="sync-error-text">{syncError}</span>}
                <p style={{ fontSize: 11, opacity: .55, textAlign: 'center', maxWidth: 380 }}>
                  Your sync code is <strong>{syncPasscode}</strong>. Enter this code on any other device to sync your data.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, opacity: .62, textAlign: 'center', maxWidth: 380, margin: '0 0 4px' }}>
                  Save your data across devices and the Home Screen app. Enter a sync code to link this device.
                </p>
                <div className="sync-form-row">
                  <input
                    className="sync-email-input"
                    type="text"
                    placeholder="Enter sync code"
                    maxLength={20}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const input = e.currentTarget; if (input.value.trim()) { setSyncPasscode(input.value); input.value = ''; } } }}
                  />
                  <button
                    type="button"
                    className="sync-send-btn"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (input && input.value.trim()) { setSyncPasscode(input.value); input.value = ''; }
                    }}
                  >Link device</button>
                </div>
                <button
                  type="button"
                  className="sync-signout-btn"
                  style={{ marginTop: 4 }}
                  onClick={async () => {
                    const code = 'lw-' + Math.random().toString(36).slice(2, 8);
                    setSyncPasscode(code);
                  }}
                >Create a new sync code</button>
              </>
            )}
          </div>

</footer>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        <button type="button" className={activeNav === 'home' ? 'active' : ''} onClick={returnHome}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button type="button" className={activeNav === 'help' ? 'active' : ''} onClick={openHelpNow}>
          <span className="nav-icon">💡</span>
          <span className="nav-label">Help</span>
        </button>
        <button type="button" className={activeNav === 'explore' ? 'active' : ''} onClick={openExploreHub}>
          <span className="nav-icon">🧭</span>
          <span className="nav-label">Explore</span>
        </button>
        <button type="button" className={activeNav === 'saved' ? 'active' : ''} onClick={() => {
          setActiveNav('saved');
          window.setTimeout(() => {
            savedIdeasRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
          }, 100);
        }}>
          <span className="nav-icon">❤️</span>
          <span className="nav-label">Saved</span>
        </button>
      </nav>

      {showLittleWinToast && (
        <div className="little-win-toast" role="status" aria-live="polite">
          <span className="little-win-toast-check">✓</span>
          <span>{littleWinToastText}</span>
        </div>
      )}

      {savedAnswerToast && (
        <div className="saved-answer-toast" role="status" aria-live="polite">
          <span className="saved-answer-toast-check">✓</span>
          <span>Answer saved</span>
        </div>
      )}
    </main>
    </>
  );
}

type AppErrorBoundaryProps = { children?: React.ReactNode };

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error('Breezier Days render error:', error); }
  render() {
    if (this.state.hasError) return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f7f3ec', color: '#26342c' }}>
        <section style={{ maxWidth: 480, textAlign: 'center', padding: 28, borderRadius: 20, background: '#fff', boxShadow: '0 10px 30px rgba(32,52,81,.12)' }}>
          <div style={{ fontSize: 42 }}>🐦</div>
          <h1>Breezier Days needs a quick refresh</h1>
          <p style={{ lineHeight: 1.55, color: '#68716a' }}>The screen hit an unexpected error. Your saved browser data will not be cleared.</p>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>Refresh Breezier Days</button>
        </section>
      </main>
    );
    return this.props.children;
  }
}

export default function AGoodWayApp() {
  return <AppErrorBoundary><App /></AppErrorBoundary>;
}

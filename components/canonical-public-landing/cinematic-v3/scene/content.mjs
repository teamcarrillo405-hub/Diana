export const assetPath = file => {
  const base = globalThis.__DIANA_ASSET_BASE__;
  const version = globalThis.__DIANA_ASSET_VERSION__;
  return base ? `${String(base).replace(/\/$/, '')}/${file}${version ? `?v=${version}` : ''}` : file;
};

export const productSlides = [
  {
    title: 'Your Day Starts Here',
    description: 'Open your lobby and see where to start first.',
    detail: 'Optional check-ins for energy, sleep, and movement help Diana understand how your day is going before you begin.',
    image: assetPath('lobby.webp'), mobile: assetPath('lobby-mobile.webp'), scale: .9,
    detailImage: assetPath('check-in.webp'), detailMobile: assetPath('check-in-mobile.webp'),
    alt: 'Diana Lobby with the next assignment and separate optional Check-in tab',
  },
  {
    title: 'Homework Organized',
    description: 'Assignments, deadlines, saved progress, and review status stay in one place, so your next step is easier to find.',
    detail: '',
    image: assetPath('control-work.webp'), mobile: assetPath('control-work-mobile.webp'),
    alt: 'Diana Work with a weekly assignment list and saved progress',
  },
  {
    title: 'Work Through It',
    description: 'Ask Diana for help and work the problem together, one question and one step at a time.',
    detail: 'Talk to Diana live, type a question or use voice to text to work through a confusing part.',
    image: assetPath('work-through-it.webp'), mobile: assetPath('work-through-it-mobile.webp'),
    alt: 'Diana linear equations workspace with message, voice-to-text, and live voice support',
  },
  {
    title: 'Prepare For The Test',
    description: 'Turn what you are learning into practice. Review the parts that need another look.',
    detail: '',
    image: assetPath('practice-desktop.webp'), mobile: assetPath('practice-mobile.webp'),
    alt: 'Diana practice questions with readable answer choices',
  },
];

export const differenceCopy = "Chatbots start with a blank prompt. It doesn't understand your schedule. It doesn't teach you to be a better student. But now, Diana is a tutor that you can call on any day or time. Diana is here to help you learn and organize. Diana learns how to help you best.";

export const studentDaySlides = [
  {
    title: 'See Your Whole Day',
    description: '',
    detail: 'Diana helps you see where schoolwork fits around real life, then choose a realistic starting point for the time you have.',
    image: assetPath('calendar.webp'), mobile: assetPath('calendar-mobile.webp'), alt: 'Diana Calendar with basketball practice, robotics club, and a study block', action: 'See Your Calendar',
  },
  {
    title: 'Bring It All Together',
    description: 'Put homework, notes, syllabi, screenshots, and class files in one place instead of searching through apps when you sit down.',
    detail: '',
    image: assetPath('bring-it-all-together-poster.webp'), video: assetPath('bring-it-all-together.mp4'),
    alt: 'Student taking notes during a classroom lesson', action: 'Watch Class Context',
  },
  {
    title: 'Beyond Homework',
    description: 'Make a plan with room for the things you care about, and a clear place to pick up when you come back.',
    detail: '',
    image: assetPath('beyond-homework-poster.webp'), video: assetPath('beyond-homework.mp4'),
    alt: 'Students walking together after school, representing life beyond homework', action: 'See The Film',
  },
];

export const questions = [
  ['When does Diana launch?', 'Diana is in early access. Join the waitlist for access updates and an invitation.'],
  ['How much will Diana cost?', 'Your account’s Access page shows available plans and options. Review the details before choosing a plan.'],
  ['Is using Diana cheating?', 'Diana is designed to help you learn, work through problems, and prepare for tests. You do the thinking and the work. Always follow your teacher\'s AI rules for each assignment and ask when you are unsure what help is allowed.'],
  ['What classes can Diana help with?', 'Bring math, science, writing, history, and other assignments. Add your class materials and teacher instructions to give Diana context.'],
  ['Do I have to connect my school account?', 'No. Add assignments and materials manually, or use the connections available in Settings. Availability depends on your school and the enabled services.'],
];

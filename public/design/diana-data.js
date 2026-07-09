/* Diana — shared assignment catalog + deep-link resolver.
   Loaded via a <script> in each page's <helmet>; exposes window.DianaData.
   Purpose: cross-link state precision AND per-assignment material. A card
   links to "Assignment Detail.dc.html?a=<id>"; every page reads the id back
   with DianaData.resolve() so the same assignment identity — and its actual
   working material — flows through the whole chain. Each assignment carries a
   `material` block; the deep tools (Reading Panel, Co-write, Visual Tools,
   Take The Test) read their slice of it and fall back to built-in demo
   content when an assignment doesn't define that slice. */
(function () {
  var A = {
    'eng-rhet': {
      id: 'eng-rhet',
      course: 'English', strand: 'Reading', color: '#29d0ff',
      title: 'Rhetorical analysis — Ch. 3',
      teacher: 'Ms. Chen',
      kind: 'Reading response', estimate: '25 min', readingLoad: 'Moderate',
      due: 'Due tomorrow 9pm', duePast: 'Was due yesterday 9pm',
      status: 'drafting',
      prompt: "Write a rhetorical analysis of the assigned speech from Chapter 3 — Lincoln's Gettysburg Address. Identify at least three rhetorical devices and explain how each supports Lincoln's overall argument. Use direct quotes as evidence.",
      focusMinutes: 25,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Read the source' },
        { page: 'Homework Mission.dc.html', label: 'Draft with structure' },
      ],
      material: {
        breakdown: {
          docName: 'Rhetorical Analysis — Gettysburg.pdf', docPages: '2 pages',
          docTitle: 'Rhetoric in the Gettysburg Address',
          docIntro: "In just 272 words, Lincoln leans on parallelism, antithesis, and allusion to turn a battlefield dedication into an argument about the nation\u2019s unfinished purpose \u2014 each device pushing the audience from mourning toward resolve.",
          steps: [
            { action: 'Reread the passage and underline 3 places where Lincoln repeats or contrasts ideas.', minutes: 4 },
            { action: 'Name the device at each spot (parallelism, antithesis, allusion).', minutes: 4 },
            { action: 'Pick the 3 strongest devices to write about.', minutes: 3 },
            { action: 'Write one claim sentence: what do these devices do together?', minutes: 5 },
            { action: 'Outline 3 short paragraphs \u2014 one device each.', minutes: 5 },
            { action: 'Draft the intro using your claim sentence.', minutes: 5 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Each device is named, not just quoted', detail: 'Say "antithesis," not just "this line."' },
            { label: 'Every point explains the effect on the audience', detail: 'What does the device make the listener feel or believe?' },
            { label: 'Your claim ties all three devices together', detail: 'One argument, not three separate observations.' },
          ],
        },
        reading: {
          subtitle: 'English · Ch. 3 — "The Gettysburg Address," Abraham Lincoln',
          text: "Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. But in a larger sense we cannot dedicate, we cannot consecrate, we cannot hallow this ground. It is for us the living to be dedicated to the unfinished work which they who fought here have thus far so nobly advanced.",
          vocab: [
            { word: 'score', pronunciation: 'skor', definition: 'A group of twenty. "Four score and seven" = 87.', context: 'Used in the opening — Lincoln means 87 years before, i.e. 1776.' },
            { word: 'conceived', pronunciation: 'kon-SEEVD', definition: 'Formed or brought into being as an idea.', context: 'Used for a nation "conceived in liberty" — born from an idea, not just land.' },
            { word: 'consecrate', pronunciation: 'KON-suh-krayt', definition: 'To declare something sacred or set it apart as holy.', context: 'Used in the triple "we cannot dedicate, consecrate, hallow."' },
            { word: 'hallow', pronunciation: 'HAL-oh', definition: 'To honor as holy; to make sacred.', context: 'The third verb in Lincoln\u2019s escalating list about the ground.' },
          ],
          soFar: 'Lincoln anchors the nation in its founding idea — that all are created equal — then frames the Civil War as a test of whether such a nation can survive. He turns from the dead to a charge for the living.',
          think: 'Why might Lincoln begin with the nation\u2019s birth ("four score and seven years ago") instead of the battle in front of him? What does that choice do for his argument?',
          retrieval: [
            'What founding idea does Lincoln say the nation was dedicated to?',
            'What does Lincoln say the Civil War is "testing"?',
            'Find one place where Lincoln repeats a structure for effect — what is the effect?',
          ],
        },
        cowrite: {
          badge: 'E', badgeC1: '#5b9bff', badgeC2: '#2b52c9', course: 'English · Period 2',
          workingOn: 'Rhetorical Analysis Essay', dueLine: 'Due tomorrow · Draft in progress',
          draft: "In the Gettysburg Address, Abraham Lincoln uses repetition and contrast to argue that the nation's survival depends on the living finishing the work of the dead. ",
          modes: {
            essay_scaffold: { title: 'Essay scaffold', note: 'Keep your wording as the source of truth.', suggestions: [
              { label: 'Structure', text: 'Name the device (e.g. parallelism), name the audience, then explain the effect on that audience. Do this for each of your three devices.', rationale: 'This keeps the draft student-led — you write every sentence.', action: 'Use as outline' },
              { label: 'Claim starter', text: 'One shape to open with: "Lincoln uses ___ to move his audience from ___ to ___." Fill in the blanks in your own words.', rationale: 'A frame to fill, not a sentence to copy.', action: 'Use as prompt' },
            ] },
            transition: { title: 'Transition check', note: 'Name the relationship between two devices before bridging them.', suggestions: [
              { label: 'Between your points', text: 'Ask: does your second device do the same work as the first, or something different? Name that in the bridge sentence.', rationale: 'A transition works when it names a relationship, not just adds a word.', action: 'Use as prompt' },
            ] },
            evidence: { title: 'Evidence finder', note: 'Pick one quote, then explain why it belongs here.', suggestions: [
              { label: 'From the text', text: '"we cannot dedicate, we cannot consecrate, we cannot hallow" — a strong candidate for your parallelism point.', rationale: 'Points you to a quote, not the argument about it.', action: 'Use as prompt' },
              { label: 'From your notes', text: '"antithesis: the living vs. the dead" — from your Ch. 3 device list.', rationale: 'Pulled from your own notes for this unit.', action: 'Insert citation' },
            ] },
            argument: { title: 'Argument check', note: 'Check claim, evidence, and reasoning point the same way.', suggestions: [
              { label: 'Consistency check', text: 'Your claim is about "survival," but your second paragraph is about tone. Consider connecting tone back to survival explicitly.', rationale: 'A structural note, not an edit to your sentence.', action: 'Review paragraph 2' },
            ] },
            readability: { title: 'Readability tune', note: 'Find the longest sentence and split it at a natural pause.', suggestions: [
              { label: 'Long sentence', text: 'Your opening sentence runs long. Try splitting it after "...work of the dead."', rationale: 'Shorter sentences are easier to read aloud and proofread.', action: 'Highlight sentence' },
            ] },
            tone: { title: 'Tone check', note: 'Swap one vague word for a precise one.', suggestions: [
              { label: 'Vague word', text: '"repetition and contrast" is broad — name the exact devices (anaphora, antithesis).', rationale: 'Specific language reads as more confident and precise.', action: 'Highlight phrase' },
            ] },
          },
        },
        test: {
          subtitle: "Practice test · Gettysburg Address devices",
          source: "Ch. 3 — the speech + your device notes",
          questions: [
            { question: "Which rhetorical device is “we cannot dedicate, we cannot consecrate, we cannot hallow” an example of?", type: 'mc', choices: ["Anaphora — repetition at the start of clauses","Hyperbole","Rhetorical question","Understatement"], correctIdx: 0, hint: "Notice what repeats at the beginning of each clause.", sourceAnchor: "Speech, paragraph 3" },
            { question: "In your own words, why might Lincoln open with “four score and seven years ago” instead of the battle in front of him?", type: 'sr', hint: "Think about what grounding the nation in its founding does for his argument.", sourceAnchor: "Speech, opening line" },
            { question: "Which line best supports the claim that Lincoln frames the war as a test of the nation’s founding idea?", type: 'ec', hint: "Look for the sentence pairing “conceived” and “dedicated” with “testing.”", sourceAnchor: "Speech, paragraph 1" },
            { question: "You’re writing about antithesis. Which contrast in the speech would you use as evidence, and why?", type: 'ap', hint: "The living versus the dead runs through the final paragraph.", sourceAnchor: "Speech, paragraph 3" },
            { question: "What is the effect of Lincoln turning from “we” to a call for “the living” to finish the work?", type: 'mc', choices: ["It transfers responsibility to the audience","It changes the physical setting","It introduces a counterargument","It cites an outside source"], correctIdx: 0, hint: "Ask who is being called to act by the end.", sourceAnchor: "Speech, closing" },
          ],
        },
      },
    },
    'math-u4': {
      id: 'math-u4',
      course: 'Math', strand: 'Algebra II', color: '#29d0ff',
      title: 'Unit 4 problem set',
      teacher: 'Mr. Okafor',
      kind: 'Problem set', estimate: '25 min', readingLoad: 'Light',
      due: 'Due tomorrow', duePast: 'Was due yesterday',
      status: 'todo',
      prompt: "Complete problems 1\u201318 in the Unit 4 set on quadratic functions. Show your steps for each — the work matters more than the final number. Circle any problem you get stuck on so we can look at it together.",
      focusMinutes: 25,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'See it visually' },
      ],
      material: {
        breakdown: {
          docName: 'Unit 4 Problem Set.pdf', docPages: 'your worked solutions',
          docTitle: 'Unit 4 \u2014 Quadratic Functions, Problems 1\u201318',
          docIntro: 'Eighteen problems, each with the steps shown \u2014 factoring where the roots are clean, the quadratic formula where they aren\u2019t. The circled ones are the two to look at with Mr. Okafor.',
          steps: [
            { action: 'Skim problems 1\u201318 and mark each as "factor" or "formula".', minutes: 4 },
            { action: 'Do problems 1\u20136 by factoring \u2014 show every step.', minutes: 5 },
            { action: 'Do problems 7\u201312 with the quadratic formula.', minutes: 5 },
            { action: 'Do problems 13\u201318 (mixed methods).', minutes: 5 },
            { action: 'Circle any problem you got stuck on for Mr. Okafor.', minutes: 3 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Every problem shows its steps', detail: 'The work matters more than the final number.' },
            { label: 'Method fits the problem', detail: 'Clean roots \u2192 factor. Messy roots \u2192 formula.' },
            { label: 'Stuck ones are circled, not skipped', detail: 'So you and Mr. Okafor can look together.' },
          ],
        },
        visual: {
          badge: 'M', badgeC1: '#7e5cff', badgeC2: '#4a2fb0', subject: 'Math · Algebra II',
          noteTitle: 'Unit 4 — Quadratic Functions', noteSub: 'Problem set 1\u201318 · your notes',
          intro: 'A quadratic can look like an equation, a graph, or a set of steps. Pick a view — hover any node to see what it does.',
          centerLabel: 'Quadratic\nFunctions', centerDesc: 'Any function of the form y = ax\u00b2 + bx + c. Its graph is a parabola; solving it means finding where y = 0.',
          terms: ['Standard form', 'Vertex form', 'Factoring', 'Quadratic formula', 'Discriminant', 'Parabola'],
          meta: {
            'Standard form':    { emoji: '\uD83D\uDCD0', color: '#29d0ff', desc: 'y = ax\u00b2 + bx + c. The default form — easy to read off a, b, and c for the quadratic formula.' },
            'Vertex form':      { emoji: '\uD83D\uDCCD', color: '#4aa8ff', desc: 'y = a(x \u2212 h)\u00b2 + k. The vertex (h, k) is read directly. Best for graphing the turning point.' },
            'Factoring':        { emoji: '\u2702\uFE0F', color: '#36e07a', desc: 'Rewrite as a(x \u2212 r\u2081)(x \u2212 r\u2082). Fast when the roots are whole numbers.' },
            'Quadratic formula':{ emoji: '\uD83E\uDDEE', color: '#ffd24a', desc: 'x = (\u2212b \u00b1 \u221a(b\u00b2 \u2212 4ac)) / 2a. Always works, even when factoring fails.' },
            'Discriminant':     { emoji: '\uD83D\uDD0D', color: '#ff9d4a', desc: 'b\u00b2 \u2212 4ac. Tells you how many real roots: positive = two, zero = one, negative = none.' },
            'Parabola':         { emoji: '\uD83D\uDCC8', color: '#7e5cff', desc: 'The U-shaped graph. Its vertex is the min or max; the axis of symmetry runs through it.' },
          },
          conceptChain: [[0,2],[0,3],[0,4],[1,5],[3,4],[2,5],[0,1]],
          timeline: [
            { date: 'Step 1', label: 'Identify a, b, c', note: 'Write the quadratic in standard form and read off the three coefficients.', color: '#29d0ff' },
            { date: 'Step 2', label: 'Choose a method', note: 'Whole-number roots? Try factoring. Otherwise, reach for the quadratic formula.', color: '#36e07a' },
            { date: 'Step 3', label: 'Solve for x', note: 'Apply the method to find where the parabola crosses the x-axis (the roots).', color: '#ffd24a' },
            { date: 'Step 4', label: 'Check the discriminant', note: 'Use b\u00b2 \u2212 4ac to confirm how many real roots you should have found.', color: '#7e5cff' },
          ],
          comparison: {
            columns: ['Factoring', 'Quadratic formula', 'Vertex form'],
            rows: [
              { label: 'Best when', values: ['Roots are whole numbers', 'Any quadratic at all', 'You need the turning point'] },
              { label: 'Speed', values: ['Fastest — if it factors', 'Steady, always works', 'Instant vertex read'] },
              { label: 'Always works?', values: ['No', 'Yes', 'Yes (for graphing)'] },
            ],
          },
          diagramCaption: 'The parabola y = ax\u00b2 + bx + c — tap a part to label it',
          diagramDots: [
            { label: 'Vertex', x: 50, y: 68, prompt: 'Is this a minimum or a maximum? How do you know from the sign of a?' },
            { label: 'Axis of symmetry', x: 50, y: 30, prompt: 'What is the equation of the vertical line through the vertex? (x = \u2212b/2a)' },
            { label: 'Roots (x-intercepts)', x: 30, y: 50, prompt: 'What is y at these points, and how does the discriminant predict how many there are?' },
            { label: 'y-intercept', x: 72, y: 42, prompt: 'What is x here, and which coefficient gives you the y-intercept directly?' },
          ],
        },
        test: {
          subtitle: "Practice test · Unit 4 quadratics",
          source: "Unit 4 problem set",
          questions: [
            { question: "The graph of y = ax² + bx + c opens downward. What must be true?", type: 'mc', choices: ["a < 0","a > 0","b = 0","c < 0"], correctIdx: 0, hint: "The sign of the leading coefficient controls which way it opens.", sourceAnchor: "Unit 4, problems 1–4" },
            { question: "Explain how you’d find the vertex of y = x² − 6x + 5 without graphing it.", type: 'sr', hint: "x = −b/2a gives the axis of symmetry; substitute back to get y.", sourceAnchor: "Unit 4, problem 9" },
            { question: "How many real roots does x² + 4x + 4 = 0 have?", type: 'mc', choices: ["Two distinct roots","One repeated root","No real roots","Cannot be determined"], correctIdx: 1, hint: "Compute the discriminant b² − 4ac.", sourceAnchor: "Unit 4, problem 12" },
            { question: "For x² − 7x + 12 = 0, would you factor or use the quadratic formula? Justify your choice.", type: 'ap', hint: "The roots are whole numbers — which method rewards that?", sourceAnchor: "Unit 4, problem 6" },
            { question: "A ball’s height is h = −16t² + 32t. Describe how you’d find when it lands.", type: 'sr', hint: "Landing means h = 0 — solve for t.", sourceAnchor: "Unit 4, problem 15" },
          ],
        },
      },
    },
    'hist-sg6': {
      id: 'hist-sg6',
      course: 'History', strand: 'Unit 6', color: '#ff9a3d',
      title: 'Study guide — Unit 6',
      teacher: 'Ms. Alvarez',
      kind: 'Study guide', estimate: '30 min', readingLoad: 'Moderate',
      due: 'Due Fri', duePast: 'Was due Friday',
      status: 'todo',
      prompt: "Build a study guide covering the causes of World War I (Unit 6). For each cause: what it was, why it mattered, and one connection to another cause. Diana can turn your notes into a guide — you review and correct it.",
      focusMinutes: 30,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Map the timeline' },
        { page: 'Homework Mission.dc.html', label: 'Build the guide' },
      ],
      material: {
        breakdown: {
          docName: 'Unit 6 Study Guide.pdf', docPages: 'five causes, one page',
          docTitle: 'Causes of WWI \u2014 Study Guide',
          docIntro: 'Each of the five threads gets three lines: what it was, why it mattered, and one link to another cause \u2014 together showing how long-building pressure plus a single spark became a world war.',
          steps: [
            { action: 'List the five threads: Militarism, Alliances, Imperialism, Nationalism, the Spark.', minutes: 3 },
            { action: 'For each, write one line: what it was.', minutes: 5 },
            { action: 'Add one line each: why it mattered.', minutes: 5 },
            { action: 'Add one connection per cause to another cause.', minutes: 5 },
            { action: 'Add the 1914 spark and how alliances chained the war.', minutes: 4 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Each cause has what / why / connection', detail: 'All three lines, every thread.' },
            { label: 'All five threads are covered', detail: 'The four M.A.I.N. causes plus the spark.' },
            { label: 'Connections are specific, not vague', detail: '"Alliances turned one war into all," not "they\u2019re related."' },
          ],
        },
        visual: {
          badge: 'H', badgeC1: '#ff9a3d', badgeC2: '#c9641f', subject: 'History · Period 3',
          noteTitle: 'Unit 6 — Causes of WWI', noteSub: 'Class notes · 5 key threads',
          intro: 'The causes of WWI connect to each other more than they stand alone. Pick a view — hover any node to see how it fed the war.',
          centerLabel: 'Causes of\nWWI', centerDesc: 'The long-building pressures (the M.A.I.N. causes) plus the spark that turned a regional crisis into a world war.',
          terms: ['Militarism', 'Alliances', 'Imperialism', 'Nationalism', 'The Spark'],
          meta: {
            'Militarism':  { emoji: '\u2699\uFE0F', color: '#29d0ff', desc: 'The arms race — especially the British\u2013German naval buildup — made war feel like a tool nations were ready to use.' },
            'Alliances':   { emoji: '\uD83E\uDD1D', color: '#36e07a', desc: 'Two blocs (Triple Alliance vs. Triple Entente) meant one conflict could pull everyone in at once.' },
            'Imperialism': { emoji: '\uD83C\uDF0D', color: '#ffd24a', desc: 'Competition for colonies and markets created rivalries and flashpoints, like the Moroccan crises.' },
            'Nationalism': { emoji: '\uD83D\uDEA9', color: '#ff9d4a', desc: 'Pride and independence movements — especially in the Balkans — raised tensions and ambitions.' },
            'The Spark':   { emoji: '\uD83D\uDCA5', color: '#7e5cff', desc: 'The assassination of Archduke Franz Ferdinand (June 1914) set the alliance system in motion.' },
          },
          conceptChain: [[3,4],[4,1],[1,0],[2,3],[2,0]],
          timeline: [
            { date: '1882', label: 'Triple Alliance forms', note: 'Germany, Austria-Hungary, and Italy align — the first bloc of the alliance system.', color: '#36e07a' },
            { date: '1898\u20131912', label: 'Naval arms race', note: 'Britain and Germany race to build dreadnoughts — militarism in the open.', color: '#29d0ff' },
            { date: '1905 & 1911', label: 'Moroccan crises', note: 'Imperial rivalry between France and Germany nearly boils over twice.', color: '#ffd24a' },
            { date: '28 Jun 1914', label: 'Assassination in Sarajevo', note: 'Franz Ferdinand is killed — Balkan nationalism provides the spark.', color: '#7e5cff' },
            { date: 'Aug 1914', label: 'War declared', note: 'Alliances activate in a chain; a regional crisis becomes a world war.', color: '#ff9d4a' },
          ],
          comparison: {
            columns: ['Militarism', 'Alliances', 'Nationalism'],
            rows: [
              { label: 'What it was', values: ['Arms build-up & war planning', 'Binding defense pacts', 'Pride & independence movements'] },
              { label: 'Example', values: ['Anglo-German naval race', 'Triple Entente', 'Balkan tensions'] },
              { label: 'How it fueled war', values: ['Made force feel usable', 'Turned one war into all', 'Provided the spark'] },
            ],
          },
          diagramCaption: 'Europe\u2019s two alliance blocs, 1914 — tap a bloc to review it',
          diagramDots: [
            { label: 'Triple Entente', x: 30, y: 45, prompt: 'Which three powers formed the Entente, and what bound them together?' },
            { label: 'Triple Alliance', x: 62, y: 40, prompt: 'Which powers were in the Alliance, and which one switched sides in 1915?' },
            { label: 'The Balkans', x: 55, y: 68, prompt: 'Why was this region called "the powder keg of Europe"?' },
            { label: 'Neutral states', x: 20, y: 70, prompt: 'Name one neutral country and one reason it stayed out early on.' },
          ],
        },
        cowrite: {
          badge: 'H', badgeC1: '#ff9a3d', badgeC2: '#c9641f', course: 'History · Period 3',
          workingOn: 'Unit 6 Study Guide', dueLine: 'Due Fri · In progress',
          draft: "Cause 1 \u2014 Militarism: In the years before 1914, Britain and Germany raced to build the largest navy, which made leaders more willing to treat war as a usable option. ",
          modes: {
            essay_scaffold: { title: 'Guide scaffold', note: 'One entry per cause — keep it in your own words.', suggestions: [
              { label: 'Entry structure', text: 'For each cause write three lines: (1) what it was, (2) why it mattered, (3) one connection to another cause.', rationale: 'Matches exactly what the assignment asks for — you fill each line.', action: 'Use as outline' },
              { label: 'Coverage check', text: 'The M.A.I.N. causes plus the spark = five entries. You have one so far.', rationale: 'A checklist, not written content.', action: 'Use as prompt' },
            ] },
            transition: { title: 'Connection check', note: 'Each entry needs one link to another cause.', suggestions: [
              { label: 'Link this entry', text: 'Militarism connects to Alliances — a big navy is only threatening because of who you\u2019re allied against. Try naming that link.', rationale: 'Points to a relationship; you write the sentence.', action: 'Use as prompt' },
            ] },
            evidence: { title: 'Evidence finder', note: 'One concrete example per cause makes the guide usable.', suggestions: [
              { label: 'From your notes', text: '"Anglo-German dreadnought race, 1906 onward" — from your Unit 6 notes.', rationale: 'Pulled from your own notes.', action: 'Insert citation' },
            ] },
            argument: { title: 'Accuracy check', note: 'Make sure "why it mattered" actually explains cause, not just fact.', suggestions: [
              { label: 'Cause vs. fact', text: 'Your first entry states the navy race but not why it pushed toward war. Add the "so what."', rationale: 'A structural note, not an edit.', action: 'Review entry 1' },
            ] },
            readability: { title: 'Readability tune', note: 'Study guides are scanned, not read — keep lines short.', suggestions: [
              { label: 'Long sentence', text: 'Split your first entry after "...largest navy" so each idea stands alone.', rationale: 'Easier to review the night before a test.', action: 'Highlight sentence' },
            ] },
            tone: { title: 'Precision check', note: 'Swap vague dates or names for exact ones.', suggestions: [
              { label: 'Vague phrase', text: '"in the years before 1914" — if you know the years (1898\u20131912), name them.', rationale: 'Precise facts are what you\u2019ll be tested on.', action: 'Highlight phrase' },
            ] },
          },
        },
        test: {
          subtitle: "Practice test · WWI causes",
          source: "Unit 6 — the M.A.I.N. causes",
          questions: [
            { question: "What does the “M” in the M.A.I.N. causes of WWI stand for?", type: 'mc', choices: ["Militarism","Monarchy","Migration","Markets"], correctIdx: 0, hint: "It refers to the arms buildup and the glorification of military power.", sourceAnchor: "Guide, cause 1" },
            { question: "Explain how the alliance system turned a local conflict into a world war.", type: 'sr', hint: "Follow the chain of obligations once one power mobilized.", sourceAnchor: "Guide, cause 3" },
            { question: "Which fact best supports “militarism connects to alliances”? Name the link.", type: 'ec', hint: "The Anglo-German naval race is only threatening given who each side was allied against.", sourceAnchor: "Guide, cause 1 → 3" },
            { question: "If you had to name the single “spark” of WWI, what would you choose and why?", type: 'ap', hint: "Think about Sarajevo, June 1914 — and why a spark still needs fuel.", sourceAnchor: "Guide, the spark" },
            { question: "Which pair were both members of the Triple Entente?", type: 'mc', choices: ["France and Russia","Germany and Austria-Hungary","Italy and Germany","Austria-Hungary and Russia"], correctIdx: 0, hint: "The Entente formed to oppose the Triple Alliance.", sourceAnchor: "Guide, alliance map" },
          ],
        },
      },
    },
    'sci-titration': {
      id: 'sci-titration',
      course: 'Science', strand: 'Chemistry', color: '#36e07a',
      title: 'Lab write-up — Titration',
      teacher: 'Dr. Park',
      kind: 'Lab report', estimate: '40 min', readingLoad: 'Moderate',
      due: 'Due Thu', duePast: 'Was due Thursday',
      status: 'drafting',
      prompt: "Write up the titration lab: purpose, procedure, data table, and your calculated concentration. End with one sentence on a source of error. Use the section headings from the lab handout.",
      focusMinutes: 30,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Reread the handout' },
        { page: 'Homework Mission.dc.html', label: 'Write the sections' },
        { page: 'Homework Mission.dc.html', label: 'Check yourself' },
      ],
      material: {
        breakdown: {
          docName: 'Titration Lab Write-up.pdf', docPages: 'handout sections',
          docTitle: 'Acid\u2013Base Titration \u2014 Lab Report',
          docIntro: 'Purpose, procedure, data, and the calculated concentration \u2014 in the handout\u2019s section order \u2014 ending with one honest source of error. The mole-ratio step is shown, not just the final number.',
          steps: [
            { action: 'Write the Purpose in one sentence.', minutes: 4 },
            { action: 'List the Procedure steps you actually followed.', minutes: 5 },
            { action: 'Fill the Data table with your trial volumes.', minutes: 5 },
            { action: 'Calculate the unknown concentration \u2014 show the mole-ratio math.', minutes: 5 },
            { action: 'Write one sentence naming a source of error.', minutes: 4 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Uses the handout\u2019s section headings', detail: 'Purpose, Procedure, Data, Calculation, Error.' },
            { label: 'Calculation shows the mole-ratio step', detail: 'Not just the final concentration.' },
            { label: 'Ends with one real source of error', detail: 'Something specific to your trials.' },
          ],
        },
        reading: {
          subtitle: 'Chemistry · Titration lab handout',
          text: "In an acid\u2013base titration, a solution of known concentration \u2014 the titrant \u2014 is added slowly to a measured volume of an unknown solution until the reaction reaches its equivalence point. An indicator marks this point with a sharp color change. By recording the volume of titrant used and applying the mole ratio from the balanced equation, you can calculate the unknown concentration. Rinse the burette with titrant before filling, and read the volume at the bottom of the meniscus at eye level.",
          vocab: [
            { word: 'titrant', pronunciation: 'TY-truhnt', definition: 'The solution of known concentration added from the burette.', context: 'Here the titrant is the standardized NaOH you add to the acid.' },
            { word: 'equivalence point', pronunciation: 'ee-KWIV-uh-lence', definition: 'The moment when the added titrant exactly neutralizes the unknown.', context: 'Signalled by the indicator\u2019s sharp color change.' },
            { word: 'indicator', pronunciation: 'IN-dih-kay-tur', definition: 'A dye that changes color at a specific pH.', context: 'Phenolphthalein turns pink right at the equivalence point.' },
            { word: 'mole ratio', pronunciation: 'mohl RAY-shee-oh', definition: 'The ratio of reactants from the balanced equation.', context: 'You multiply by this ratio to get from moles of titrant to moles of unknown.' },
          ],
          soFar: 'A titrant of known concentration is added to a measured unknown until the equivalence point, marked by the indicator. The volume used, plus the mole ratio, lets you calculate the unknown concentration.',
          think: 'Why does the indicator\u2019s color change need to be sharp for your volume reading to be trustworthy?',
          retrieval: [
            'What is the "equivalence point," and what signals it?',
            'Which measured quantity lets you calculate the unknown concentration?',
            'Why does the balanced equation (the mole ratio) matter for the calculation?',
          ],
        },
        cowrite: {
          badge: 'S', badgeC1: '#36e07a', badgeC2: '#1f9a54', course: 'Science · Period 4',
          workingOn: 'Titration Lab Write-up', dueLine: 'Due Thu · Draft in progress',
          draft: "Purpose: The purpose of this lab was to determine the concentration of an unknown hydrochloric acid solution by titrating it against a standardized sodium hydroxide solution. ",
          modes: {
            essay_scaffold: { title: 'Report scaffold', note: 'Use the handout\u2019s section headings in order.', suggestions: [
              { label: 'Sections', text: 'Purpose \u2192 Procedure \u2192 Data table \u2192 Calculation \u2192 Source of error. Draft one heading at a time.', rationale: 'Matches the handout — you write the content under each.', action: 'Use as outline' },
              { label: 'Calculation frame', text: 'Show: moles of titrant = M \u00d7 V, then apply the mole ratio, then divide by the unknown\u2019s volume. Fill in your numbers.', rationale: 'A method frame, not your answer.', action: 'Use as prompt' },
            ] },
            transition: { title: 'Flow check', note: 'Each section should hand off cleanly to the next.', suggestions: [
              { label: 'Procedure \u2192 Data', text: 'End the procedure by naming what you measured, so the data table follows naturally.', rationale: 'Names the relationship between sections.', action: 'Use as prompt' },
            ] },
            evidence: { title: 'Data finder', note: 'Pull real numbers from your recorded trials.', suggestions: [
              { label: 'From your data', text: '"Trial 2: 24.6 mL NaOH to reach the pink endpoint" — from your lab sheet.', rationale: 'Pulled from your own recorded data.', action: 'Insert value' },
            ] },
            argument: { title: 'Reasoning check', note: 'Your conclusion should follow from your data, not restate it.', suggestions: [
              { label: 'Consistency check', text: 'Your calculated concentration should match your averaged titrant volume. Double-check they line up.', rationale: 'A structural note, not an edit.', action: 'Review calculation' },
            ] },
            readability: { title: 'Readability tune', note: 'Lab reports are precise, not wordy — trim filler.', suggestions: [
              { label: 'Wordy sentence', text: 'Your purpose sentence is long. Try: "This lab determined the concentration of an unknown HCl solution by titration."', rationale: 'Shorter reads as more scientific.', action: 'Highlight sentence' },
            ] },
            tone: { title: 'Precision check', note: 'Use exact terms and units.', suggestions: [
              { label: 'Vague word', text: '"some acid" \u2192 name the acid and its role (the unknown HCl analyte).', rationale: 'Specific terms are expected in a lab report.', action: 'Highlight phrase' },
            ] },
          },
        },
        test: {
          subtitle: "Practice test · Titration lab",
          source: "Titration lab handout",
          questions: [
            { question: "In an acid-base titration, the equivalence point is where…", type: 'mc', choices: ["moles of acid equal moles of base","the indicator is first added","the burette is filled","the solution begins to boil"], correctIdx: 0, hint: "It is about stoichiometric amounts, not the color change.", sourceAnchor: "Handout, procedure step 4" },
            { question: "Explain the difference between the endpoint and the equivalence point.", type: 'sr', hint: "One is observed (indicator color); one is theoretical (stoichiometry).", sourceAnchor: "Handout, analysis" },
            { question: "Which measurement is your main source of error, and how would you reduce it?", type: 'ec', hint: "Reading the burette meniscus — think precision and parallax.", sourceAnchor: "Handout, error analysis" },
            { question: "You titrated 25.0 mL of HCl with 0.100 M NaOH and used 20.0 mL. Outline how you’d find the HCl concentration.", type: 'ap', hint: "moles NaOH = M × V; at equivalence, moles of acid = moles of base.", sourceAnchor: "Handout, calculation" },
            { question: "Why place a white tile under the flask during a titration?", type: 'mc', choices: ["To see the indicator color change clearly","To keep the flask warm","To measure the volume","To neutralize spills"], correctIdx: 0, hint: "It is about spotting the endpoint.", sourceAnchor: "Handout, setup" },
          ],
        },
      },
    },
    'eng-reading': {
      id: 'eng-reading',
      course: 'English', strand: 'Reading', color: '#f25fb0',
      title: 'Reading response',
      teacher: 'Ms. Chen',
      kind: 'Reading', estimate: '10 min', readingLoad: 'Light',
      due: 'Finished · turn in', duePast: 'Finished · turn in',
      status: 'exporting',
      prompt: "Respond to this week's reading \u2014 the opening of \"The Tell-Tale Heart\" \u2014 in one paragraph: what stood out, and one question it left you with. You've drafted this — the last step is turning it in.",
      focusMinutes: 15,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Read with support' },
        { page: 'Homework Mission.dc.html', label: 'Draft the response' },
      ],
      material: {
        breakdown: {
          docName: 'Reading Response.pdf', docPages: 'one paragraph',
          docTitle: 'Response \u2014 "The Tell-Tale Heart"',
          docIntro: 'One tight paragraph: what stood out, a line from the text that shows it, and one question the opening left you with.',
          steps: [
            { action: 'Note what stood out in the passage.', minutes: 3 },
            { action: 'Find one line that shows it.', minutes: 3 },
            { action: 'Write your reaction in 2\u20133 sentences.', minutes: 5 },
            { action: 'End with one question the reading left you.', minutes: 3 },
          ],
        },
        focus: {
          checklist: [
            { label: 'One clear idea, not five', detail: 'Keep the whole paragraph on a single point.' },
            { label: 'A line from the text backs it up', detail: 'Quote or paraphrase one specific moment.' },
            { label: 'Ends with a real question', detail: 'Something the reading genuinely left open.' },
          ],
        },
        reading: {
          subtitle: 'English · This week\u2019s reading — "The Tell-Tale Heart," Edgar Allan Poe',
          text: "True! nervous, very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses, not destroyed, not dulled them. Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Observe how healthily, how calmly I can tell you the whole story.",
          vocab: [
            { word: 'acute', pronunciation: 'uh-KYOOT', definition: 'Sharp, keen, highly sensitive.', context: 'The narrator says his hearing became acute — unusually sharp.' },
            { word: 'dreadfully', pronunciation: 'DRED-ful-ee', definition: 'Extremely; also, in a way full of dread.', context: 'A double meaning: "very nervous" and "full of dread."' },
            { word: 'dulled', pronunciation: 'duld', definition: 'Made less sharp or less intense.', context: 'The narrator insists the disease did not dull his senses.' },
            { word: 'healthily', pronunciation: 'HEL-thuh-lee', definition: 'In a sound, well, sane manner.', context: 'He offers his "healthy, calm" telling as proof of sanity.' },
          ],
          soFar: 'The narrator insists he is not mad, arguing that his illness sharpened rather than destroyed his senses — especially his hearing. He offers his calm storytelling as proof of his sanity.',
          think: 'The narrator says his calmness proves he is sane. Does his insistence make you trust him more, or less?',
          retrieval: [
            'What does the narrator claim the disease did to his senses?',
            'What evidence does he offer that he is not mad?',
            'Why might a reader doubt the narrator even as he insists he is calm?',
          ],
        },
        cowrite: {
          badge: 'E', badgeC1: '#f25fb0', badgeC2: '#b0347a', course: 'English · Period 2',
          workingOn: 'Reading Response', dueLine: 'Finished · turn in',
          draft: "What stood out to me in this week\u2019s reading was how the narrator\u2019s insistence that he is sane actually made me trust him less. ",
          modes: {
            essay_scaffold: { title: 'Response scaffold', note: 'One paragraph: what stood out + one question.', suggestions: [
              { label: 'Structure', text: 'Sentence 1: name what stood out. Sentences 2\u20133: give a detail from the text. Last sentence: your question.', rationale: 'Matches the one-paragraph ask — you write each sentence.', action: 'Use as outline' },
              { label: 'Question starter', text: 'A good response question digs in: "Why does the narrator ___?" or "What if ___?" Fill it in.', rationale: 'A frame to fill, not a question to copy.', action: 'Use as prompt' },
            ] },
            transition: { title: 'Flow check', note: 'Connect your reaction to your evidence.', suggestions: [
              { label: 'Reaction \u2192 evidence', text: 'After "made me trust him less," add "because \u2014" and point to a line from the text.', rationale: 'Bridges your opinion to proof.', action: 'Use as prompt' },
            ] },
            evidence: { title: 'Evidence finder', note: 'One short quote anchors a response.', suggestions: [
              { label: 'From the text', text: '"Observe how healthily, how calmly I can tell you the whole story" — his calm claim is strong evidence for your point.', rationale: 'Points to a quote, not your reaction to it.', action: 'Use as prompt' },
            ] },
            argument: { title: 'Focus check', note: 'A response should make one clear point, not five.', suggestions: [
              { label: 'One idea', text: 'You have a strong idea (insistence = distrust). Keep the whole paragraph on that one idea.', rationale: 'A structural note, not an edit.', action: 'Review paragraph' },
            ] },
            readability: { title: 'Readability tune', note: 'Keep it to one tight paragraph.', suggestions: [
              { label: 'Long sentence', text: 'Your opening sentence is long — try ending it after "trust him less."', rationale: 'Cleaner for a short response.', action: 'Highlight sentence' },
            ] },
            tone: { title: 'Voice check', note: 'A response can sound like you — just stay specific.', suggestions: [
              { label: 'Vague word', text: '"stood out" is fine to open, but name exactly what: the narrator\u2019s tone? his logic?', rationale: 'Specificity makes a response feel earned.', action: 'Highlight phrase' },
            ] },
          },
        },
        test: {
          subtitle: "Practice test · Reading response",
          source: "The assigned passage + your notes",
          questions: [
            { question: "A strong reading response is built primarily around…", type: 'mc', choices: ["a claim supported by textual evidence","a plot summary","a personal star rating","a list of vocabulary"], correctIdx: 0, hint: "It is analysis, not retelling.", sourceAnchor: "Rubric, row 1" },
            { question: "State your response’s central claim in one sentence.", type: 'sr', hint: "What is the one idea about the text you want to argue?", sourceAnchor: "Your draft, thesis" },
            { question: "Which quotation from the passage best supports your claim, and why?", type: 'ec', hint: "Pick the line that shows, not just tells, your point.", sourceAnchor: "Passage, your highlight" },
            { question: "How would you connect this passage to something outside it — another text or an experience?", type: 'ap', hint: "A response deepens when the claim reaches beyond the page.", sourceAnchor: "Rubric, “extends thinking”" },
            { question: "What is the best way to close a reading response?", type: 'mc', choices: ["Return to the claim with a “so what”","Introduce a brand-new topic","Apologize for the length","Repeat the prompt"], correctIdx: 0, hint: "A conclusion answers why the claim matters.", sourceAnchor: "Rubric, row 4" },
          ],
        },
      },
    },
    'math-flash': {
      id: 'math-flash',
      course: 'Math', strand: 'Ch. 4', color: '#b09cff',
      title: 'Flashcards — Ch. 4 formulas',
      teacher: 'Mr. Okafor',
      kind: 'Flashcards', estimate: '15 min', readingLoad: 'Light',
      due: '18 cards due', duePast: '18 cards due',
      status: 'todo',
      prompt: "Review the Chapter 4 formula deck — quadratic functions. Focus on the cards you missed last time — Diana surfaces those first.",
      focusMinutes: 15,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Quiz yourself' },
      ],
      material: {
        breakdown: {
          docName: 'Ch. 4 Review \u2014 session notes.pdf', docPages: 'what to restudy',
          docTitle: 'Ch. 4 Formulas \u2014 Review Session',
          docIntro: 'A quick log of the deck: which formula cards came back fast, and which ones to run again before the quiz.',
          steps: [
            { action: 'Sort the deck so the ones you missed last time are on top.', minutes: 3 },
            { action: 'Review cards 1\u20136 \u2014 say each answer before you flip.', minutes: 5 },
            { action: 'Review cards 7\u201312.', minutes: 5 },
            { action: 'Review cards 13\u201318.', minutes: 5 },
            { action: 'Re-run just the ones you missed this pass.', minutes: 4 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Say the answer before flipping', detail: 'Recall beats recognition.' },
            { label: 'Missed cards go back in the pile', detail: 'Don\u2019t retire a card you guessed.' },
            { label: 'End when you get each one twice', detail: 'Two clean passes, then stop.' },
          ],
        },
        test: {
          subtitle: 'Practice test · Ch. 4 formulas',
          source: 'Ch. 4 formula deck',
          questions: [
            { question: 'Which is the quadratic formula, used to solve ax\u00b2 + bx + c = 0?', type: 'mc', choices: ['x = (\u2212b \u00b1 \u221a(b\u00b2 \u2212 4ac)) / 2a', 'x = \u2212b/2a', 'x = a(x \u2212 h)\u00b2 + k', 'x = (b\u00b2 \u2212 4ac) / 2a'], correctIdx: 0, hint: 'It has a plus-or-minus and a square root over 2a.', sourceAnchor: 'Ch. 4 deck, card 3' },
            { question: 'In your own words, what does the discriminant b\u00b2 \u2212 4ac tell you about a quadratic?', type: 'sr', hint: 'Think about the number of real roots for positive, zero, and negative values.', sourceAnchor: 'Ch. 4 deck, card 7' },
            { question: 'Which form of a quadratic lets you read the vertex (h, k) directly?', type: 'mc', choices: ['Standard form: y = ax\u00b2 + bx + c', 'Vertex form: y = a(x \u2212 h)\u00b2 + k', 'Factored form: y = a(x \u2212 r\u2081)(x \u2212 r\u2082)', 'Slope-intercept: y = mx + b'], correctIdx: 1, hint: 'The name of the form is a strong clue.', sourceAnchor: 'Ch. 4 deck, card 5' },
            { question: 'For x\u00b2 \u2212 5x + 6 = 0, which method is fastest, and why?', type: 'ap', hint: 'The roots are whole numbers (2 and 3). Which method loves whole-number roots?', sourceAnchor: 'Ch. 4 deck, card 9' },
            { question: 'If the discriminant equals zero, how many real roots does the quadratic have?', type: 'mc', choices: ['Two', 'One (a repeated root)', 'None', 'Infinitely many'], correctIdx: 1, hint: 'Zero under the square root means the \u00b1 gives the same value twice.', sourceAnchor: 'Ch. 4 deck, card 8' },
          ],
        },
      },
    },
    'ath-reflect': {
      id: 'ath-reflect',
      course: 'Athletics', strand: 'Training', color: '#5b9bff',
      title: 'Log workout reflection',
      teacher: 'Coach Rivera',
      kind: 'Reflection', estimate: '10 min', readingLoad: 'Light',
      due: 'Due Mon', duePast: 'Was due Monday',
      status: 'todo',
      prompt: "Log today's session: what you did, how it felt (1\u201310), and one thing to work on next time. Voice note is fine — Diana will transcribe it.",
      focusMinutes: 10,
      tools: [
        { page: 'Homework Mission.dc.html', label: 'Structure the reflection' },
      ],
      material: {
        breakdown: {
          docName: 'Workout Reflection.pdf', docPages: 'quick log',
          docTitle: 'Training Reflection',
          docIntro: 'Three lines: what today\u2019s session was, how it felt on a 1\u201310 with a reason, and one thing to work on next time.',
          steps: [
            { action: 'Note what you did today \u2014 the actual sets.', minutes: 3 },
            { action: 'Rate how it felt, 1\u201310, with a reason.', minutes: 3 },
            { action: 'Name one thing to work on next time.', minutes: 4 },
          ],
        },
        focus: {
          checklist: [
            { label: 'Names the actual workout', detail: '"6 \u00d7 200m," not "training."' },
            { label: 'The rating has a reason', detail: '"7/10 because\u2026"' },
            { label: 'One concrete thing for next time', detail: 'Specific and doable.' },
          ],
        },
        cowrite: {
          badge: 'A', badgeC1: '#5b9bff', badgeC2: '#2b52c9', course: 'Athletics · Training',
          workingOn: 'Workout Reflection', dueLine: 'Due Mon · Quick log',
          draft: "Today\u2019s session was interval sprints plus core work. It felt like a 7 out of 10 \u2014 my legs were heavy from yesterday, but my breathing stayed controlled through the last set. ",
          modes: {
            essay_scaffold: { title: 'Reflection scaffold', note: 'Three parts: what you did, how it felt, one thing next.', suggestions: [
              { label: 'Structure', text: 'Line 1: what you did. Line 2: how it felt (1\u201310) and why. Line 3: one thing to work on next time.', rationale: 'Matches the log format — you fill each line.', action: 'Use as outline' },
              { label: 'Rating prompt', text: 'A rating means more with a reason: "7/10 because ___." Fill in the because.', rationale: 'A frame to fill, not a sentence to copy.', action: 'Use as prompt' },
            ] },
            transition: { title: 'Flow check', note: 'Connect how it felt to what you\u2019ll change.', suggestions: [
              { label: 'Feeling \u2192 next step', text: 'You noted heavy legs — that\u2019s a natural lead-in to your "one thing next time" (recovery? warm-up?).', rationale: 'Bridges the reflection to an action.', action: 'Use as prompt' },
            ] },
            evidence: { title: 'Detail finder', note: 'One concrete detail makes a reflection real.', suggestions: [
              { label: 'From today', text: 'Name the actual set: "6 \u00d7 200m sprints, 90s rest." Specifics help you track progress.', rationale: 'Prompts you for a real detail.', action: 'Use as prompt' },
            ] },
            argument: { title: 'Honesty check', note: 'A useful reflection is honest, not just positive.', suggestions: [
              { label: 'Balance check', text: 'You named a strength (breathing). Is there one honest weakness to log too?', rationale: 'A nudge, not an edit.', action: 'Review reflection' },
            ] },
            readability: { title: 'Readability tune', note: 'Keep it short — three lines is plenty.', suggestions: [
              { label: 'Long sentence', text: 'Split after "7 out of 10" so the rating and the reason each stand out.', rationale: 'Easier to scan later.', action: 'Highlight sentence' },
            ] },
            tone: { title: 'Voice check', note: 'This is yours — casual is fine, vague is not.', suggestions: [
              { label: 'Vague word', text: '"core work" \u2192 name it (planks? hanging leg raises?).', rationale: 'Specifics make the log worth keeping.', action: 'Highlight phrase' },
            ] },
          },
        },
        test: {
          subtitle: "Practice test · Training reflection",
          source: "Your training log + reflection guide",
          questions: [
            { question: "A useful training reflection focuses most on…", type: 'mc', choices: ["what you noticed and what to adjust next","only how tired you felt","the weather that day","your teammates’ times"], correctIdx: 0, hint: "Reflection is about learning and adjustment.", sourceAnchor: "Guide, purpose" },
            { question: "Describe one thing that went well in this workout, and why.", type: 'sr', hint: "Name the specific action, not just “it was good.”", sourceAnchor: "Log, session notes" },
            { question: "What is one adjustment you’ll make next session, and what prompted it?", type: 'sr', hint: "Tie the change to something you actually observed today.", sourceAnchor: "Log, session notes" },
            { question: "How does today’s session connect to your goal for the season?", type: 'ap', hint: "Link the small step to the bigger target.", sourceAnchor: "Guide, goals" },
            { question: "Why log RPE (rate of perceived exertion) after a workout?", type: 'mc', choices: ["To track effort and manage load over time","To compare with friends","To fill the page","It is required for a grade"], correctIdx: 0, hint: "It helps you balance hard and easy days.", sourceAnchor: "Guide, RPE scale" },
          ],
        },
      },
    },
  };

  var DEFAULT_ID = 'eng-rhet';

  function currentId() {
    try {
      var q = new URLSearchParams(window.location.search);
      var id = q.get('a');
      if (id && A[id]) return id;
    } catch (e) {}
    return DEFAULT_ID;
  }

  window.DianaData = {
    assignments: A,
    defaultId: DEFAULT_ID,
    // Resolve the assignment referenced by the current URL (?a=<id>), or the default.
    resolve: function () { return A[currentId()]; },
    get: function (id) { return A[id] || null; },
    currentId: currentId,
    // Build a deep link to `page` carrying the current (or given) assignment id.
    link: function (page, id) {
      var aid = id || currentId();
      return page + '?a=' + encodeURIComponent(aid);
    },
  };
})();

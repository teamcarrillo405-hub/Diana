"""Original fictional Qwen3 preference research, author A.

Research only: rejected completions deliberately demonstrate defective tutoring.
All settings, people, passages, and records below were authored for this module.
No observed learner performance or validated curriculum level is claimed.
The constructor only serializes authored cases; it does not call a model.
"""

from __future__ import annotations

from copy import deepcopy


def _context(
    subject: str,
    slug: str,
    category: str,
    source: str,
    known: tuple[str, str, str, str, list[str], str],
    missing: tuple[str, str, str, list[str], str],
    *,
    conflicting: bool = False,
    decoy: str | None = None,
) -> list[dict]:
    """Expand two independently authored questions about one fictional context."""
    question, quote, next_question, bad_next, anchors, reason = known
    missing_question, missing_next, missing_bad_next, missing_anchors, missing_reason = missing
    family = f"original-a-{subject}-{slug}"
    common = {
        "family": family,
        "subject": "English" if subject == "english" else subject,
        "level": "unvalidated-middle-school-label",
        "source": source,
        "preferenceCategory": category,
        "conflictingContext": conflicting,
        "researchOnly": True,
    }
    return [
        {
            **common,
            "id": f"pref-a-{subject}-{slug}-stated",
            "question": question,
            "target": f"EVIDENCE: {quote}\nNEXT: {next_question}",
            "rejected": f"EVIDENCE: {'insufficient' if category == 'wrong-answerability' else quote}\nNEXT: {bad_next}",
            "expectedAbstention": False,
            "acceptedQuotes": [quote],
            "nextStepAnchors": anchors,
            "answerability": "answerable",
            "preferenceReason": reason,
        },
        {
            **common,
            "id": f"pref-a-{subject}-{slug}-unresolved",
            "question": missing_question,
            "target": f"EVIDENCE: insufficient\nNEXT: {missing_next}",
            "rejected": f"EVIDENCE: {(decoy or quote) if category == 'wrong-answerability' else 'insufficient'}\nNEXT: {missing_bad_next}",
            "expectedAbstention": True,
            "acceptedQuotes": [],
            "nextStepAnchors": missing_anchors,
            "answerability": "insufficient",
            "preferenceReason": missing_reason,
        },
    ]


def rows() -> list[dict]:
    """Return 100 independently authored pairs, in 50 two-question families."""
    result: list[dict] = []
    result += _context(
        "math", "tile-crates", "echo",
        "The workshop sheet says each sealed crate contains 18 square tiles. Mara counted four sealed crates beside the workbench and drew four equal groups in her notebook. A delivery slip lists 83 loose tiles, while an unsigned shelf card lists 86; neither record has a date.",
        (
            "How many tiles are represented by Mara's four sealed crates?",
            "The workshop sheet says each sealed crate contains 18 square tiles. Mara counted four sealed crates beside the workbench and drew four equal groups in her notebook.",
            "How could you label Mara's four groups with 18 and use repeated addition to count only the sealed-crate tiles?",
            "How many tiles are in the four crates?",
            ["four groups", "repeated addition", "sealed-crate"],
            "The preferred step turns the stated equal groups into an operation without supplying the total; the rejected step repeats the requested total without a method.",
        ),
        (
            "How many loose tiles are currently on the shelf?",
            "What count could a fresh shelf inventory establish for the loose tiles, and how would you compare it with the two undated records?",
            "How many loose tiles are currently there?",
            ["fresh shelf inventory", "two undated records"],
            "A fresh inventory can resolve the two incompatible loose-tile records; repeating the quantity question cannot decide which record is current.",
        ), conflicting=True,
    )
    result += _context(
        "math", "tank-label", "echo",
        "A tank's calibration note states that each marked interval represents 6 liters. There are five marked intervals between empty and the drawn waterline. The blue tag calls the tank's full capacity 42 liters, but the red tag says 48 liters; the drawing stops below the rim.",
        (
            "What volume does the drawn waterline represent?",
            "A tank's calibration note states that each marked interval represents 6 liters. There are five marked intervals between empty and the drawn waterline.",
            "How would multiplying the five intervals by 6 liters per interval translate this waterline into a volume?",
            "What is the volume at that waterline?",
            ["multiplying", "five intervals", "6 liters"],
            "The preferred question identifies the scale conversion; the rejected question simply requests the original volume again.",
        ),
        (
            "What is this tank's full capacity?",
            "What capacity information could you seek on a manufacturer plate or specification sheet to check the conflicting blue and red tags?",
            "What is the full capacity of the tank?",
            ["manufacturer plate", "blue and red tags"],
            "The plate is a concrete evidence source for adjudicating the tags; the drawn partial waterline cannot settle full capacity and the rejected step supplies no route to resolve it.",
        ), conflicting=True,
    )
    result += _context(
        "math", "bus-fare", "echo",
        "The fare chart gives a single ride as $2.40 and a book of ten rides as $21. Elin plans exactly ten rides for a weekend project and has copied both prices onto a comparison strip. A separate note says a youth discount may apply, but its rate and eligibility rules were not copied.",
        (
            "How much would Elin save by buying the book instead of ten single rides at the listed prices?",
            "The fare chart gives a single ride as $2.40 and a book of ten rides as $21.",
            "What comparison do you get by first multiplying $2.40 by ten and then subtracting the book's $21 price?",
            "How much money would Elin save?",
            ["multiplying $2.40", "subtracting", "$21"],
            "The preferred step supplies the comparison operation while leaving the calculation to the learner; the rejection echoes the savings question.",
        ),
        (
            "What would Elin pay for a youth-discounted book?",
            "What rate and eligibility conditions would you seek in the transit office's youth-discount notice for a ten-ride book?",
            "What is the youth-discounted book price?",
            ["transit office", "rate and eligibility", "ten-ride book"],
            "Checking the discount notice retrieves inputs needed to calculate a price; asking for that unknown price again is circular.",
        ),
    )
    result += _context(
        "math", "mural-ribbon", "echo",
        "For a mural border, Ravi cut a 3.6-meter ribbon into six equal lengths and kept every piece. He sketched six boxes beneath the ribbon measurement to plan labels for the pieces. His order sheet mentions attaching a bead to each piece, but it gives no bead price or package size.",
        (
            "What length should Ravi write on each of the six pieces?",
            "For a mural border, Ravi cut a 3.6-meter ribbon into six equal lengths and kept every piece.",
            "How can dividing 3.6 meters among the six boxes help you label one ribbon piece with the correct unit?",
            "How long is each piece?",
            ["dividing 3.6 meters", "six boxes", "correct unit"],
            "The preferred prompt links equal sharing to division and units; the rejection only repeats the requested length.",
        ),
        (
            "How much would the beads for the six pieces cost?",
            "What bead quantity and price would you seek in the supplier's package listing to work out how many packages six pieces require?",
            "How much will all the beads cost?",
            ["supplier's package listing", "quantity and price", "six pieces"],
            "The supplier listing supplies two missing purchase inputs without inventing them; the rejected question asks for the unavailable total again.",
        ),
    )
    result += _context(
        "math", "ramp-plan", "unsupported-premise",
        "A scale plan uses 1 centimeter for every 0.5 meter of actual ramp length. The ramp segment on this plan measures 7 centimeters. Jo has not yet measured the built ramp; a margin note asks whether the builders followed the drawing after moving the entrance.",
        (
            "What actual ramp length is represented by the scale plan?",
            "A scale plan uses 1 centimeter for every 0.5 meter of actual ramp length. The ramp segment on this plan measures 7 centimeters.",
            "How would applying 0.5 meter per centimeter to the drawn 7 centimeters give the planned length in meters?",
            "How would you subtract the confirmed half-meter construction error from the planned length?",
            ["0.5 meter per centimeter", "7 centimeters", "planned length"],
            "Scaling the drawing addresses planned length; the rejected step invents a confirmed construction error even though no built-ramp measurement exists.",
        ),
        (
            "How long is the ramp that was actually built?",
            "What end-to-end measurement could Jo take along the built ramp to compare its length with the scale-plan prediction?",
            "How would Jo correct the tape reading that already proves the ramp is shorter?",
            ["end-to-end measurement", "built ramp", "scale-plan prediction"],
            "A proposed measurement can establish actual length; the rejected question pretends a tape reading and shorter result already exist.",
        ),
    )
    result += _context(
        "math", "seed-trays", "unsupported-premise",
        "The club planted 72 seeds in eight trays, with the same number of seeds in each tray. Imani labeled the trays A through H before placing them on the windowsill. The notebook reserves a column for sprouts counted after one week, but every cell in that column is still blank.",
        (
            "How many seeds were planted in each tray?",
            "The club planted 72 seeds in eight trays, with the same number of seeds in each tray.",
            "How could partitioning 72 into eight equal groups show the number of planted seeds for one tray?",
            "How should you add the two replacement seeds that Imani put in every tray?",
            ["partitioning 72", "eight equal groups", "planted seeds"],
            "Equal partitioning uses the planting record; the rejected step introduces replacement seeds that the source never records.",
        ),
        (
            "What fraction of all planted seeds sprouted after one week?",
            "Which one-week sprout counts would need to be entered for trays A through H before you sum them and compare that sum with 72?",
            "How would you convert the recorded 54 sprouts into a fraction of the seeds planted?",
            ["one-week sprout counts", "A through H", "compare that sum with 72"],
            "The preferred step identifies the missing numerator and how to assemble it; the rejected step fabricates 54 observed sprouts.",
        ),
    )
    result += _context(
        "math", "kite-diagonal", "wrong-scope",
        "A kite pattern shows diagonals of 12 centimeters and 20 centimeters. Its instruction card defines the area as half the product of the diagonals. The paper shop will sell enough material for the pattern, but the excerpt does not list a price per square centimeter or any minimum purchase.",
        (
            "What area does the kite pattern cover?",
            "A kite pattern shows diagonals of 12 centimeters and 20 centimeters. Its instruction card defines the area as half the product of the diagonals.",
            "How would you substitute 12 and 20 into the card's half-product rule while keeping track of square centimeters?",
            "What result do you get by adding 12 and 20 to compare the two diagonal lengths?",
            ["substitute 12 and 20", "half-product rule", "square centimeters"],
            "The preferred question follows the supplied area definition; summing diagonals studies lengths and does not compute area.",
        ),
        (
            "What will the paper needed for this pattern cost at the shop?",
            "What unit price and minimum purchase would you seek in the shop's paper listing for the material used in this kite?",
            "What colors could you identify by sorting the shop's paper samples into warm and cool groups?",
            ["unit price", "minimum purchase", "shop's paper listing"],
            "The preferred evidence request supports a purchase calculation; color sorting does not retrieve the missing cost terms.",
        ),
    )
    result += _context(
        "math", "library-sample", "wrong-scope",
        "In a survey of 40 library visitors, 14 chose quiet reading as their favorite activity. Each visitor chose exactly one activity, and Tessa wants a percentage for this surveyed group. The librarian did not record how the visitors were selected or the size of the entire membership.",
        (
            "What percentage of the surveyed visitors chose quiet reading?",
            "In a survey of 40 library visitors, 14 chose quiet reading as their favorite activity.",
            "How could you express 14 out of 40 as a fraction and then scale that fraction to a denominator of 100?",
            "What alphabetical order do you get by arranging the names of the library activities?",
            ["14 out of 40", "fraction", "denominator of 100"],
            "Scaling the observed fraction addresses the survey percentage; alphabetizing activity names has no bearing on the count ratio.",
        ),
        (
            "What percentage of the entire membership favors quiet reading?",
            "What membership-wide survey counts would you collect for quiet-reading preferences beyond these 40 visitors before calculating a percentage of all members?",
            "What average shelf height would you obtain by measuring three bookcases in the reading room?",
            ["membership-wide survey counts", "quiet-reading preferences", "beyond these 40 visitors"],
            "Evidence about the wider membership is needed before generalizing; shelf heights do not address sampling or preferences.",
        ),
    )
    result += _context(
        "math", "pump-trial", "wrong-answerability",
        "During a timed trial, the pump moved 28 liters in four minutes at a steady rate. Niko recorded those two measurements in the trial table. The maintenance note says the pump was adjusted afterward, but no flow measurement was taken after that adjustment.",
        (
            "What was the pump's rate in liters per minute during the timed trial?",
            "During a timed trial, the pump moved 28 liters in four minutes at a steady rate.",
            "How would dividing the trial's 28 liters by its four minutes express the recorded flow for one minute?",
            "What new timed trial would you need before calculating any liters-per-minute rate?",
            ["dividing", "28 liters", "four minutes"],
            "The trial already supplies volume and time, so a unit-rate calculation is supported; the rejection unnecessarily abstains and asks for replacement data.",
        ),
        (
            "What was the pump's rate after the maintenance adjustment?",
            "What volume could you collect over a measured interval after the adjustment to calculate the pump's new liters-per-minute rate?",
            "How would you divide the trial volume by its duration to label the adjusted pump's rate?",
            ["volume", "measured interval", "after the adjustment"],
            "A new measured interval would support a post-adjustment rate; quoting the earlier trial as sufficient silently transfers evidence across the adjustment.",
        ),
    )
    result += _context(
        "math", "recipe-portion", "wrong-answerability",
        "The kitchen card says that a batch uses 450 grams of oats and makes nine equal portions. Sal copied the batch quantities to plan a portion label. The card leaves the nutrition panel empty and does not identify the oat brand or calories per gram.",
        (
            "How many grams of oats belong to one equal portion?",
            "The kitchen card says that a batch uses 450 grams of oats and makes nine equal portions.",
            "How could you distribute 450 grams equally across nine portion boxes and label the amount in one box?",
            "Which supplier should you contact before you can determine any portion mass?",
            ["450 grams", "nine portion boxes", "one box"],
            "The equal-portion data suffices for division; the rejected completion wrongly treats portion mass as unavailable.",
        ),
        (
            "How many calories from oats are in one portion?",
            "What calories-per-gram information could Sal obtain from the actual oat package to combine with the portion's oat mass?",
            "How would you divide 450 by nine to report the calories in a portion?",
            ["calories-per-gram", "actual oat package", "oat mass"],
            "The package would supply the missing energy conversion; the rejected evidence gives mass and portions, which cannot alone establish calories.",
        ),
    )

    result += _context(
        "reading", "harbor-letter", "echo",
        "In the fictional harbor story, Ana folds the ferry notice and slips it beneath her brother's cup so he will see it at breakfast. A dock diary says the ferry left before sunrise; a later letter says it remained tied up until noon. Neither writer explains the disagreement.",
        (
            "Why does Ana place the notice beneath her brother's cup?",
            "In the fictional harbor story, Ana folds the ferry notice and slips it beneath her brother's cup so he will see it at breakfast.",
            "Which words after 'so' connect Ana's placement of the notice to what she wants her brother to do at breakfast?",
            "Why does Ana put the notice under the cup?",
            ["words after 'so'", "notice", "at breakfast"],
            "Locating the purpose clause makes the stated motive accessible; the rejected question restates the motive request without a reading operation.",
        ),
        (
            "When did the ferry actually leave that day?",
            "What departure time and date could a harbor log provide to check the diary's sunrise claim against the letter's noon claim?",
            "When did the ferry really leave?",
            ["harbor log", "time and date", "sunrise claim"],
            "A dated departure record could adjudicate the conflicting accounts; repeating the departure question cannot establish which narrator is accurate.",
        ), conflicting=True,
    )
    result += _context(
        "reading", "orchard-path", "echo",
        "The orchard tale describes the east path as narrow, shaded, and bordered by leaning pear trees. Dev sketches this path while waiting for a guide. A map says the locked gate faces west, while the guide's note says the same gate faces south; no compass appears in the excerpt.",
        (
            "What details give the east path a sheltered feeling?",
            "The orchard tale describes the east path as narrow, shaded, and bordered by leaning pear trees.",
            "How could you group the words about light and the trees' position to explain the east path's sheltered feeling?",
            "Which details make the east path feel sheltered?",
            ["words about light", "trees' position", "east path"],
            "Grouping sensory and spatial wording gives a concrete reading move; the rejection asks the same interpretive question again.",
        ),
        (
            "Does the locked gate actually face west or south?",
            "What orientation would a compass reading at the locked gate supply when you compare the map's label with the guide's note?",
            "Does the gate face west or south?",
            ["compass reading", "locked gate", "map's label"],
            "A compass check could resolve the incompatible labels; the repeated either-or question contributes no evidence.",
        ), conflicting=True,
    )
    result += _context(
        "reading", "spare-chair", "echo",
        "In the invented scene, Uma moves a spare chair beside the stove because her visitor's coat is wet and his hands are shaking from the cold. She brings a towel before asking his name. The scene ends when he reaches into a pocket; the contents of that pocket are not described.",
        (
            "What does Uma's response suggest about how she treats the visitor?",
            "She brings a towel before asking his name.",
            "How does the order of bringing a towel and asking a name help you infer Uma's immediate priority for the visitor?",
            "What does her response suggest about her treatment of him?",
            ["order", "bringing a towel", "immediate priority"],
            "Examining the order of actions grounds an inference in behavior; the rejection repeats the inference request without directing attention to evidence.",
        ),
        (
            "What object does the visitor take out of his pocket?",
            "Which sentence in a continuation of the scene would identify what the visitor actually removes from the pocket?",
            "What object comes out of his pocket?",
            ["continuation of the scene", "actually removes", "pocket"],
            "A continuation might supply the omitted action and object; the rejected prompt merely reasks what the excerpt withholds.",
        ),
    )
    result += _context(
        "reading", "bell-comparison", "echo",
        "The original poem says, 'The bell scattered silver birds across the square.' Its next line describes listeners lifting their faces as the sound fades above the roofs. The worksheet lists the poem without a poet's name, publication date, or explanation of where it was written.",
        (
            "What does the image of silver birds help readers imagine about the bell's sound?",
            "The original poem says, 'The bell scattered silver birds across the square.'",
            "What effect on the imagined sound could you infer by comparing the action word 'scattered' with the movement and fading in the following line?",
            "What does the silver-birds image make readers imagine?",
            ["imagined sound", "action word 'scattered'", "following line"],
            "Comparing the image's action word with the following line provides a reading method without supplying the interpretation; the rejected next step only repeats the interpretation task.",
        ),
        (
            "In what year did the poet write this poem?",
            "What date in an author manuscript record or publication note could distinguish the poem's composition from a later printing?",
            "In what year was the poem written?",
            ["author manuscript record", "composition", "later printing"],
            "The preferred question identifies documentary evidence and the date distinction needed; the rejection asks for the absent year again.",
        ),
    )
    result += _context(
        "reading", "hidden-key", "unsupported-premise",
        "In the invented mystery, Lio places a key inside an empty flour tin to keep it out of a toddler's reach. He tells his aunt where he put it before leaving for work. The excerpt follows Lio down the street and never returns to the kitchen or reports whether anyone moves the tin.",
        (
            "Why does Lio hide the key in the flour tin?",
            "In the invented mystery, Lio places a key inside an empty flour tin to keep it out of a toddler's reach.",
            "How does the phrase introduced by 'to' connect Lio's placement of the key with his purpose?",
            "How does the aunt's earlier theft explain why Lio hides the key from her?",
            ["phrase introduced by 'to'", "placement of the key", "purpose"],
            "Locating the infinitive purpose phrase offers a method for finding Lio's reason without supplying it; the rejected question invents a theft and substitutes concealment from the aunt for the stated motive.",
        ),
        (
            "Who removes the key from the tin after Lio leaves?",
            "What later kitchen scene would need to show a character opening the tin and taking the key before you could identify a remover?",
            "Which detail in the aunt's confession explains when she took the key?",
            ["later kitchen scene", "opening the tin", "taking the key"],
            "The preferred prompt seeks an unshown action without assuming it occurred; the rejected prompt invents both a removal and a confession.",
        ),
    )
    result += _context(
        "reading", "cracked-cup", "unsupported-premise",
        "The narrator of this original vignette keeps a cracked blue cup on the shelf because it reminds her of afternoons painting with her grandmother. She uses another mug for tea. A final line says she writes a letter about the cup, but neither its recipient nor its contents appear.",
        (
            "Why does the narrator keep a cup she no longer uses for tea?",
            "The narrator of this original vignette keeps a cracked blue cup on the shelf because it reminds her of afternoons painting with her grandmother.",
            "How does the 'because' clause connect the cup to a memory rather than its usefulness for drinking?",
            "How does the cup's auction value explain why the narrator refuses to sell it?",
            ["'because' clause", "cup", "memory"],
            "The memory clause supports the stated reason for keeping the cup; the rejected question presumes an auction valuation and sale decision absent from the vignette.",
        ),
        (
            "To whom does the narrator address the letter about the cup?",
            "What addressee in the letter's salutation or envelope would establish whom the narrator is writing to?",
            "How does the grandmother's reply confirm that the letter was addressed to her?",
            ["addressee", "salutation or envelope", "writing to"],
            "Looking for an addressee requests the omitted evidence; a grandmother's reply is an invented event and cannot establish the recipient.",
        ),
    )
    result += _context(
        "reading", "market-silence", "wrong-scope",
        "The fictional market opens with carts rattling, sellers calling, and awnings snapping in the wind. After the clock strikes, every seller pauses to listen to a musician at the well. The passage gives no description of the instrument and stops before the musician begins a second tune.",
        (
            "How does the passage create a contrast between the opening and the pause?",
            "The fictional market opens with carts rattling, sellers calling, and awnings snapping in the wind. After the clock strikes, every seller pauses to listen to a musician at the well.",
            "What changes when you compare the opening sound verbs with the sellers' shared action after the clock strikes?",
            "What market opening time would you calculate by subtracting three hours from noon?",
            ["compare", "opening sound verbs", "after the clock strikes"],
            "Comparing actions and sounds reveals the textual contrast; an unrelated time calculation does not analyze how the passage creates it.",
        ),
        (
            "Which instrument is the musician playing?",
            "What description of the instrument's shape or playing action in a fuller passage would help identify what the musician uses?",
            "Which stall would be cheapest if you compared the prices of apples across the market?",
            ["instrument's shape", "playing action", "fuller passage"],
            "A fuller description could identify the instrument; comparing produce prices addresses a different question entirely.",
        ),
    )
    result += _context(
        "reading", "folded-map", "wrong-scope",
        "In this fictional adventure, Sera folds the map along the mountain ridge so that the coastal route stays visible on top. She checks the coast before every turn. The narrator mentions an earlier journey with her father but gives no route, duration, or destination for that earlier trip.",
        (
            "Which route is Sera keeping easy to consult on this journey?",
            "In this fictional adventure, Sera folds the map along the mountain ridge so that the coastal route stays visible on top.",
            "Which route is named in the result clause after 'so that', and how does the fold keep that route available to Sera?",
            "What mountains could you rank by height using a world atlas?",
            ["result clause", "'so that'", "fold"],
            "The preferred step locates the named result of the fold; ranking real mountains does not establish which fictional route she consults.",
        ),
        (
            "Where did Sera and her father go on their earlier journey?",
            "What destination statement in a flashback or an earlier-trip itinerary would connect Sera and her father to that journey's endpoint?",
            "How many map folds would you make to fit this paper into a smaller pocket?",
            ["destination statement", "flashback", "earlier-trip itinerary"],
            "The preferred evidence request distinguishes the earlier journey from the present one; paper-folding logistics cannot reveal its destination.",
        ),
    )
    result += _context(
        "reading", "garden-message", "wrong-answerability",
        "In the original garden scene, Bo leaves a chalk arrow on the wall so the delivery driver can find the side gate. Bo then goes indoors to answer a ringing phone. The excerpt ends there, before the driver arrives or anyone reports whether the arrow was noticed.",
        (
            "What does Bo intend the chalk arrow to help the driver do?",
            "In the original garden scene, Bo leaves a chalk arrow on the wall so the delivery driver can find the side gate.",
            "What intended action is attached to 'so' in the arrow sentence, and how does it explain Bo's choice of a direction mark?",
            "What interview with Bo would be needed before we could identify any purpose for the arrow?",
            ["intended action", "'so'", "direction mark"],
            "The purpose is explicitly stated and can be located in the sentence; the rejected abstention wrongly treats intention as unreported.",
        ),
        (
            "Did the driver successfully find the side gate by following the arrow?",
            "What later arrival scene or driver report would show whether the arrow was noticed and used to reach the side gate?",
            "How does Bo's reason for drawing the arrow prove the driver's successful arrival?",
            ["later arrival scene", "driver report", "noticed and used"],
            "Outcome evidence would need to follow the driver's arrival; quoting the stated purpose as sufficient confuses an intention with its success.",
        ),
    )
    result += _context(
        "reading", "storm-shutters", "wrong-answerability",
        "The narrator says, 'We closed every shutter because the weather bulletin warned of hail.' In the next sentence the family carries blankets downstairs and waits together. No hail is described in the available passage, and the account ends before anyone looks outside again.",
        (
            "What prompted the family to close every shutter?",
            "The narrator says, 'We closed every shutter because the weather bulletin warned of hail.'",
            "Which words after 'because' identify the information that prompted the shutter-closing action?",
            "Which eyewitness would you need to contact before identifying any reason for closing the shutters?",
            ["words after 'because'", "information", "shutter-closing"],
            "The cause of the action is quoted directly; abstaining ignores a stated reason merely because later weather is unknown.",
        ),
        (
            "Did hail actually strike the family's house that evening?",
            "What later observation at the house could distinguish a hail warning from hail actually falling there that evening?",
            "How does the bulletin's warning establish that hail struck the house?",
            ["later observation", "at the house", "warning"],
            "A location-specific observation could establish the event; the rejected answer treats a forecast that motivated action as confirmation of weather.",
        ),
    )

    result += _context(
        "english", "semicolon-draft", "echo",
        "The draft reads, 'The lantern flickered; the audience waited.' The workshop note says a semicolon can join two closely related independent clauses. One editor's card says the author approved replacing it with a period; a second says the semicolon was retained, and neither card is dated.",
        (
            "How is the semicolon functioning in the quoted draft sentence?",
            "The draft reads, 'The lantern flickered; the audience waited.' The workshop note says a semicolon can join two closely related independent clauses.",
            "Can you separate the text on either side of the semicolon and check whether each side has a subject and a complete predicate?",
            "What function does the semicolon have here?",
            ["either side of the semicolon", "subject", "complete predicate"],
            "Testing each side as an independent clause applies the workshop rule; the rejected prompt simply repeats the function question.",
        ),
        (
            "Which punctuation mark did the author finally approve between the clauses?",
            "What mark would you look for in a dated author-approved proof to compare with the two undated editor cards?",
            "Which punctuation mark did the author approve?",
            ["dated author-approved proof", "mark", "editor cards"],
            "A dated proof could settle the incompatible editorial reports; another request for the final mark cannot resolve their provenance.",
        ), conflicting=True,
    )
    result += _context(
        "english", "pile-agreement", "echo",
        "The exercise sentence is 'A pile of coats rests by the door.' Its grammar note says a verb agrees with the head noun of its subject phrase. Two revision slips name the final story title as 'Winter Guests' and 'The Last Coat'; both claim to record the author's final choice.",
        (
            "Why does the exercise use 'rests' instead of 'rest'?",
            "The exercise sentence is 'A pile of coats rests by the door.' Its grammar note says a verb agrees with the head noun of its subject phrase.",
            "If you temporarily bracket 'of coats', which noun remains as the subject's head for checking agreement with 'rests'?",
            "Why is 'rests' the verb in this sentence?",
            ["bracket 'of coats'", "subject's head", "agreement"],
            "Bracketing the modifying phrase isolates the noun controlling agreement; repeating why the verb was chosen offers no grammar operation.",
        ),
        (
            "What title did the author finally choose for the story?",
            "What title would you look for on a signed final manuscript to cross-check the two conflicting revision slips?",
            "What was the author's final title choice?",
            ["signed final manuscript", "title", "revision slips"],
            "The signed manuscript is a concrete way to adjudicate the title slips; the rejected question leaves their conflict untouched.",
        ), conflicting=True,
    )
    result += _context(
        "english", "quotation-boundary", "echo",
        "The dialogue draft reads, 'I can carry the basket,' said Ren. The margin explains that the spoken words are enclosed in quotation marks while the speaker tag stays outside. A planned illustration is mentioned beneath the line, but there is no drawing or description of the basket's contents.",
        (
            "Which part of the line is Ren's speech rather than the speaker tag?",
            "The dialogue draft reads, 'I can carry the basket,' said Ren. The margin explains that the spoken words are enclosed in quotation marks while the speaker tag stays outside.",
            "What words fall inside the paired quotation marks when you trace them from the opening mark to the closing mark?",
            "Which words are Ren's speech?",
            ["inside the paired quotation marks", "opening mark", "closing mark"],
            "Tracing the punctuation boundary gives a concrete way to separate speech from tag; the rejected question asks for the same identification again.",
        ),
        (
            "What objects should the illustration show inside Ren's basket?",
            "What contents would you seek in an illustration brief or another descriptive sentence before selecting objects to draw in the basket?",
            "What is inside Ren's basket?",
            ["illustration brief", "descriptive sentence", "contents"],
            "A brief or description could establish intended contents; the rejection asks for objects absent from the text without finding a source.",
        ),
    )
    result += _context(
        "english", "simile-workshop", "echo",
        "The workshop draft says, 'The corridor twisted like a ribbon.' A supplied note defines a simile as a comparison using 'like' or 'as.' The writer has circled the comparison for discussion but has not recorded whether the corridor is in a school, a museum, or another building.",
        (
            "Why does the comparison in the draft count as a simile?",
            "The workshop draft says, 'The corridor twisted like a ribbon.' A supplied note defines a simile as a comparison using 'like' or 'as.'",
            "Which comparison word joins the corridor and ribbon, and how does that word match the workshop's simile definition?",
            "Why is this comparison a simile?",
            ["comparison word", "corridor and ribbon", "simile definition"],
            "Matching a visible comparison marker to the supplied definition supports classification; the rejected next step repeats the classification request.",
        ),
        (
            "In what kind of building is this corridor located?",
            "What setting detail in the surrounding paragraph or the writer's scene notes would identify the building that contains the corridor?",
            "What kind of building contains the corridor?",
            ["setting detail", "surrounding paragraph", "scene notes"],
            "A setting statement could locate the corridor; the rejected question asks for the absent location without identifying evidence.",
        ),
    )
    result += _context(
        "english", "passive-notice", "unsupported-premise",
        "The notice draft reads, 'The committee approved the mural.' A revision guide says a passive construction makes the receiver of an action the subject and uses a form of 'be' with a past participle. A note proposes emailing the revision to committee members, but no email or reply is included.",
        (
            "How could the writer begin changing the quoted sentence into passive voice?",
            "A revision guide says a passive construction makes the receiver of an action the subject and uses a form of 'be' with a past participle.",
            "In 'The committee approved the mural,' which noun receives the approval and could become the subject under the guide's passive-voice rule?",
            "How would you preserve the committee's second vote when rewriting the notice?",
            ["receives the approval", "become the subject", "passive-voice rule"],
            "Identifying the action's receiver starts the specified transformation without completing it; the rejected question introduces a second vote absent from the draft.",
        ),
        (
            "Did the committee members accept the emailed revision?",
            "What sent-message record and member replies would you check to establish whether the proposed revision was delivered and accepted?",
            "Which sentence in the unanimous acceptance email explains why every member approved the revision?",
            ["sent-message record", "member replies", "delivered and accepted"],
            "Delivery and replies must be checked because only an email proposal is known; the rejected question fabricates a unanimous acceptance email.",
        ),
    )
    result += _context(
        "english", "contrast-transition", "unsupported-premise",
        "The paragraph draft reads, 'The route is short. However, its steep steps make the walk tiring.' The teacher's handout identifies 'however' as a contrast transition. The writer has reserved a footnote for a walking-time survey, but no survey questions, responses, or findings are supplied.",
        (
            "What relationship does 'however' signal between the two draft sentences?",
            "The paragraph draft reads, 'The route is short. However, its steep steps make the walk tiring.' The teacher's handout identifies 'however' as a contrast transition.",
            "What relationship does 'however' signal when you compare the first sentence's route description with the second sentence's effect on the walker?",
            "How does the survey's finding that all walkers prefer the route explain the transition?",
            ["compare", "first sentence's route description", "second sentence's effect"],
            "Comparing route description with the walking effect supplies a method for interpreting the connective without naming its relationship; the rejected step presumes unanimous survey findings where no survey data is supplied.",
        ),
        (
            "What was the surveyed walkers' average time for completing this route?",
            "What individual completion times and number of walkers would the survey footnote need to supply before you could compute a mean?",
            "How would removing the confirmed 90-minute outlier change the survey's average?",
            ["individual completion times", "number of walkers", "compute a mean"],
            "The preferred prompt identifies the missing inputs for a mean; the rejection assumes a specific outlier and an existing survey result.",
        ),
    )
    result += _context(
        "english", "paragraph-focus", "wrong-scope",
        "An original paragraph begins, 'The rooftop garden saves water.' The next sentences describe rain barrels, mulch, and drip hoses as ways to reduce watering. A quotation from a gardener is marked for later insertion, but the draft does not name a gardener or provide any interview material.",
        (
            "How do the details support the paragraph's opening claim?",
            "An original paragraph begins, 'The rooftop garden saves water.' The next sentences describe rain barrels, mulch, and drip hoses as ways to reduce watering.",
            "How could you link each of the three water-saving details to the opening claim in a claim-and-support outline?",
            "What letter count do you get by tallying each letter in 'rooftop'?",
            ["three water-saving details", "opening claim", "claim-and-support outline"],
            "An outline maps the details to the claim and directly answers the writing question; a letter tally is unrelated to paragraph support.",
        ),
        (
            "Which gardener supplied the quotation planned for insertion?",
            "What speaker name and quoted wording in an interview transcript would let you attribute the planned insertion accurately?",
            "Which paint color would best match the garden's rain barrels if you compared color swatches?",
            ["speaker name", "quoted wording", "interview transcript"],
            "An interview record could identify and verify a quotation's speaker; comparing paint colors cannot establish attribution.",
        ),
    )
    result += _context(
        "english", "modifier-attachment", "wrong-scope",
        "The editing exercise gives the sentence 'I watched the painter with the binoculars.' Its note explains that the final phrase could describe the watcher using binoculars or the painter carrying them. The writer has not selected either meaning or provided a scene sketch that would settle the attachment.",
        (
            "What makes the placement of 'with the binoculars' ambiguous?",
            "Its note explains that the final phrase could describe the watcher using binoculars or the painter carrying them.",
            "Can you draw two attachment arrows from 'with the binoculars,' one to the watching action and one to the painter, to compare the readings?",
            "What past-tense form would you get by conjugating 'paint' in a separate sentence?",
            ["two attachment arrows", "watching action", "painter"],
            "Two attachment diagrams make the stated ambiguity concrete; an unrelated verb conjugation does not explain modifier placement.",
        ),
        (
            "Which of the two meanings did the writer actually intend?",
            "What clarification from the writer about who used or carried the binoculars would let you choose one attachment?",
            "What alphabetical order results from sorting the sentence's nouns?",
            ["clarification from the writer", "used or carried", "binoculars"],
            "A targeted intention clarification can distinguish the two supported readings; sorting nouns cannot select the writer's intended one.",
        ),
    )
    result += _context(
        "english", "revision-request", "wrong-answerability",
        "The editor's note says, 'Replace the vague word things with the names of the tools on the bench.' The writer places this note beside an unfinished workshop description. The excerpt contains no revised sentence and no list or image of the tools that are actually on that bench.",
        (
            "What change does the editor request in the workshop description?",
            "The editor's note says, 'Replace the vague word things with the names of the tools on the bench.'",
            "Which vague word does the note flag, and what kind of more specific noun phrase does it ask the writer to collect from the bench?",
            "What additional editor interview would be required before identifying any requested change?",
            ["vague word", "specific noun phrase", "bench"],
            "The editing action is stated even though the needed tool names are absent; the rejected abstention discards the explicit request.",
        ),
        (
            "Which exact tool names did the writer put in the revised sentence?",
            "If a revision is available, what nouns would you check in the writer's next draft where 'things' originally stood against the actual bench inventory?",
            "How does the editor's instruction show which tool names the writer inserted?",
            ["writer's next draft", "where 'things' originally stood", "bench inventory"],
            "The next draft would reveal the implementation; the rejected response mistakes a requested revision for a record of completed wording.",
        ),
    )
    result += _context(
        "english", "audience-leaflet", "wrong-answerability",
        "The leaflet plan says, 'Define compost in the first sentence because the audience is new to gardening.' A writer has drafted a definition, but the excerpt does not reproduce it. No audience reading session, comprehension answers, or feedback forms have been collected for the leaflet.",
        (
            "Why does the plan call for defining compost at the beginning?",
            "The leaflet plan says, 'Define compost in the first sentence because the audience is new to gardening.'",
            "How does the audience description in the 'because' clause explain the planned position of the compost definition?",
            "What audience test must be completed before the plan's stated reason can be identified?",
            ["audience description", "'because' clause", "compost definition"],
            "The plan itself supplies a reason for the chosen order; testing readers is unnecessary to report that stated rationale.",
        ),
        (
            "Could the intended readers accurately explain compost after reading the leaflet?",
            "What explanation of compost could readers give after reading the leaflet, and how could you compare those explanations with the definition's intended meaning?",
            "How does planning a definition for beginners establish that those readers understood it?",
            ["readers give after reading", "compare those explanations", "intended meaning"],
            "A proposed post-reading explanation check could establish observed comprehension without claiming the definition caused it; the rejected evidence shows a teaching intention and no observed reader outcome.",
        ),
    )

    result += _context(
        "science", "ice-covers", "echo",
        "Two identical ice blocks sit on matching trays under the same lamp; only the cover color differs, white on one tray and black on the other. The student's timer sheet says the white-covered block melted first, while a partner's note says the black-covered block did. Neither note has start times.",
        (
            "Which feature was deliberately varied between the two ice setups?",
            "Two identical ice blocks sit on matching trays under the same lamp; only the cover color differs, white on one tray and black on the other.",
            "If you make a two-column setup table, which listed feature changes between the trays while the block, tray, and lamp entries stay matched?",
            "Which feature was changed between the setups?",
            ["two-column setup table", "feature changes", "stay matched"],
            "A comparison table isolates the manipulated feature from held conditions; the rejected question simply restates the variable-identification task.",
        ),
        (
            "Which cover color produced the earlier melting time in the recorded trial?",
            "What start and finish timestamps in a trial video or timer log could resolve the disagreement about which block melted first?",
            "Which block melted earlier in that trial?",
            ["start and finish timestamps", "trial video or timer log", "disagreement"],
            "Timing evidence could adjudicate the conflicting observations; reasking which block melted earlier supplies no method to choose between them.",
        ), conflicting=True,
    )
    result += _context(
        "science", "rock-labels", "echo",
        "A laboratory note records that sample R moved toward a magnet held beside it without touching it. The sample remained dry throughout this observation. A balance printout labels its mass 41 grams, but the handwritten inventory says 47 grams; both carry the same sample code and no measurement date.",
        (
            "What recorded observation supports a magnetic response in sample R?",
            "A laboratory note records that sample R moved toward a magnet held beside it without touching it.",
            "Which direction-of-motion phrase in the laboratory note connects the sample's movement to the nearby magnet rather than contact?",
            "What observation shows a magnetic response?",
            ["direction-of-motion phrase", "laboratory note", "rather than contact"],
            "The preferred step directs attention to the observed motion and absence of contact; the rejection repeats the evidence request without locating the relevant detail.",
        ),
        (
            "What mass should be reported for sample R now?",
            "What mass would a fresh zeroed-balance measurement of sample R record when checked against the two undated mass entries?",
            "What is sample R's mass now?",
            ["fresh zeroed-balance measurement", "sample R", "undated mass entries"],
            "A fresh measurement can settle the present reporting value; another request for mass does not resolve inconsistent records.",
        ), conflicting=True,
    )
    result += _context(
        "science", "lamp-seedlings", "echo",
        "Four bean seedlings are assigned to each of two lamp schedules, six hours and twelve hours per day. Every pot receives 30 milliliters of water each morning. The class plans to compare changes in height after ten days, but neither starting heights nor final heights are entered in the notebook.",
        (
            "Which watering condition is held constant across the lamp schedules?",
            "Every pot receives 30 milliliters of water each morning.",
            "Which amount and frequency from the watering sentence would you copy into both groups' control-condition columns?",
            "What watering condition is kept the same?",
            ["amount and frequency", "watering sentence", "both groups' control-condition columns"],
            "Extracting amount and frequency identifies the controlled watering condition; the rejected prompt only asks the original question again.",
        ),
        (
            "Which lamp schedule produced the larger average height increase?",
            "What starting and final height entries for each seedling would you need to subtract and average within the two lamp groups?",
            "Which schedule produced more growth on average?",
            ["starting and final height", "subtract and average", "two lamp groups"],
            "The preferred step requests both measurements needed for change scores and group means; the rejection asks for an unrecorded comparison again.",
        ),
    )
    result += _context(
        "science", "salt-water", "echo",
        "The observation sheet says the salt crystals were visible before stirring and no separate crystals were visible after two minutes of stirring in water. The liquid was not poured out. The student proposes drying a small sample later, but no drying procedure or residue observation is recorded.",
        (
            "What visible change occurred while the student stirred the salt and water?",
            "The observation sheet says the salt crystals were visible before stirring and no separate crystals were visible after two minutes of stirring in water.",
            "How would a before-and-after observation table describe crystal visibility without turning 'not visible' into a claim that the salt ceased to exist?",
            "What visible change occurred during stirring?",
            ["before-and-after observation table", "crystal visibility", "not visible"],
            "The preferred comparison describes the observation while limiting its scope; the rejected question merely repeats the requested visible change.",
        ),
        (
            "What residue did the student obtain after drying the sample?",
            "What dated drying entry and residue description would you look for to establish whether the proposed sample-drying step was completed and what remained?",
            "What residue was left after drying?",
            ["dated drying entry", "residue description", "was completed"],
            "A procedure and observation record could distinguish a proposal from a completed drying result; the rejection assumes the missing result can be restated.",
        ),
    )
    result += _context(
        "science", "soil-windows", "unsupported-premise",
        "Two cups contain equal masses of the same damp soil. One cup sits by a sunny window and the other in a dark cupboard, so light exposure and storage location change together. The plan calls for weighing the cups tomorrow; the only measurements currently recorded are the equal starting masses.",
        (
            "What design limitation makes it hard to isolate a light effect in this setup?",
            "One cup sits by a sunny window and the other in a dark cupboard, so light exposure and storage location change together.",
            "Which two changing conditions would you mark in a setup comparison before deciding how to vary light while matching the cups' surroundings?",
            "How would you remove the known three-degree temperature difference measured between the cups?",
            ["two changing conditions", "setup comparison", "matching the cups' surroundings"],
            "Comparing co-varying conditions identifies the stated confound; the rejected question invents a measured three-degree difference.",
        ),
        (
            "Which cup lost more mass by tomorrow's weighing?",
            "What next-day mass for each labeled cup would you subtract from its starting mass to compare the losses?",
            "How would you explain why the cupboard cup lost the recorded 12 grams?",
            ["next-day mass", "each labeled cup", "starting mass"],
            "The preferred prompt requests measurements still to be taken; the rejected prompt asserts an unrecorded loss and location-specific outcome.",
        ),
    )
    result += _context(
        "science", "circuit-gap", "unsupported-premise",
        "The circuit sketch shows a battery, a bulb, and a wire path interrupted at an open switch. A note states that this bulb needs a complete conducting loop to light. The students have drawn the setup but have not assembled it or tested the battery and bulb.",
        (
            "What feature in the sketch prevents a complete conducting loop?",
            "The circuit sketch shows a battery, a bulb, and a wire path interrupted at an open switch. A note states that this bulb needs a complete conducting loop to light.",
            "Where does tracing the wire path from one battery terminal toward the other encounter an interruption in the sketch?",
            "How does the measured battery voltage prove the open switch is broken?",
            ["tracing the wire path", "battery terminal", "interruption"],
            "Tracing the diagram locates its stated gap; the rejection fabricates a voltage measurement and diagnoses a broken switch from it.",
        ),
        (
            "Did the bulb light when the students assembled the circuit and closed the switch?",
            "What observation during an assembled-circuit test with the switch closed would show whether this battery and bulb actually produced light?",
            "How would you explain the flickering that the students recorded after closing the switch?",
            ["assembled-circuit test", "switch closed", "actually produced light"],
            "An assembly test would supply the missing empirical outcome; the rejected completion invents a completed trial and flickering observation.",
        ),
    )
    result += _context(
        "science", "evaporation-lids", "wrong-scope",
        "The class sets two matching jars with equal amounts of water on the same shelf. One jar is left open and the other is sealed with a lid; air exposure is the planned difference. A weighing schedule is taped beside them, but the results cells for the next three days remain empty.",
        (
            "What planned difference separates the two jar conditions?",
            "One jar is left open and the other is sealed with a lid; air exposure is the planned difference.",
            "Which setup detail would you record in a separate column for each jar, and how could comparing those entries identify the condition being varied?",
            "What mineral hardness would you estimate by scratching the shelf with a stone?",
            ["setup detail", "separate column", "condition being varied"],
            "A setup-comparison table provides a way to identify the manipulated condition without naming it; shelf hardness is unrelated to the jar comparison.",
        ),
        (
            "How much water did the open jar lose during the three days?",
            "Which starting and day-three water masses for the open jar would you compare while accounting for the unchanged jar mass?",
            "What reflection angle could you measure by shining a light at the sealed jar's lid?",
            ["starting and day-three", "open jar", "unchanged jar mass"],
            "A mass comparison could quantify loss once measured; an optical measurement on the other jar cannot establish water loss.",
        ),
    )
    result += _context(
        "science", "pond-arrows", "wrong-scope",
        "A fictional pond diagram has an arrow from algae to snails and another from snails to fish. Its key says each arrow points from food to the organism that eats it. No counts of algae, snails, or fish are given, and the diagram reports no observations after changes to any population.",
        (
            "According to the diagram, what do the snails eat?",
            "A fictional pond diagram has an arrow from algae to snails and another from snails to fish. Its key says each arrow points from food to the organism that eats it.",
            "Which arrow ends at snails, and what does the diagram key tell you to look for at that arrow's starting point?",
            "What water depth would you calculate by averaging soundings from three points in the pond?",
            ["arrow ends at snails", "diagram key", "starting point"],
            "Reading an incoming arrow according to the supplied key identifies the food relationship; water depth does not interpret that arrow.",
        ),
        (
            "By how many individuals did the snail population change after fish were removed?",
            "What snail counts before and after a documented fish-removal event would let you calculate the population change for that interval?",
            "What colors would you record when sorting photographs of algae by their shade of green?",
            ["snail counts before and after", "documented fish-removal event", "population change"],
            "Dated counts tied to an actual removal would support a numerical change; color sorting cannot supply those counts or confirm a removal occurred.",
        ),
    )
    result += _context(
        "science", "shade-screen", "wrong-answerability",
        "The field plan says to put a mesh screen above bed A to test whether shade reduces soil temperature. Bed B will remain uncovered, with the same watering schedule. The plan has been signed, but installation and thermometer readings have not yet been logged.",
        (
            "What question is the planned screen treatment designed to investigate?",
            "The field plan says to put a mesh screen above bed A to test whether shade reduces soil temperature.",
            "Which proposed treatment and measured variable can you extract from the phrase beginning 'to test whether' in the field plan?",
            "What thermometer results must be collected before identifying the plan's research question?",
            ["proposed treatment", "measured variable", "'to test whether'"],
            "The plan explicitly states its research question; the rejected abstention incorrectly requires outcome measurements to identify an intended test.",
        ),
        (
            "Did screened bed A actually have cooler soil than uncovered bed B?",
            "What paired soil-temperature readings taken at matching depths and times after screen installation would let you compare the beds?",
            "How does the stated purpose of the screen establish that bed A had cooler soil?",
            ["paired soil-temperature readings", "matching depths and times", "after screen installation"],
            "Matched measurements after confirmed installation could establish the comparison; the rejected answer treats a study purpose as an observed effect.",
        ),
    )
    result += _context(
        "science", "sand-filter", "wrong-answerability",
        "The procedure instructs students to pour a sand-and-water mixture through filter paper and collect the liquid in a clean flask. It defines filtration as a way to separate suspended solid particles from a liquid. The group has read the procedure, but no flask contents or filter residue have been observed yet.",
        (
            "What separation process does the procedure tell the students to use?",
            "It defines filtration as a way to separate suspended solid particles from a liquid.",
            "How does the instruction to pass the sand-and-water mixture through filter paper match the procedure's definition of the separation process?",
            "What residue measurement is required before you can identify the process named in the procedure?",
            ["sand-and-water mixture", "filter paper", "definition"],
            "The process is stated and can be matched to the instructions without running them; the rejected abstention incorrectly withholds that known procedural fact.",
        ),
        (
            "How much sand did this group actually retain on the filter paper?",
            "What dry mass of the used filter and retained sand, compared with the dry unused filter's mass, would quantify the retained solid after the trial?",
            "How does the filtration definition establish the mass of sand retained in this group's trial?",
            ["dry mass", "unused filter's mass", "after the trial"],
            "A before-and-after dry-mass method could supply the missing quantity; a process definition cannot establish this group's unobserved yield.",
        ),
    )

    result += _context(
        "history", "guild-charter", "echo",
        "In an invented town archive, a guild charter grants voting rights to members who have completed two years of apprenticeship. The archive's meeting register dates ratification to 1841, while a clerk's summary gives 1843. Both refer to this charter, and no signed ratification sheet is included.",
        (
            "Who qualifies to vote under the charter's stated rule?",
            "In an invented town archive, a guild charter grants voting rights to members who have completed two years of apprenticeship.",
            "Which membership and apprenticeship conditions would you extract into an eligibility checklist from the charter clause?",
            "Who is allowed to vote under this rule?",
            ["membership and apprenticeship conditions", "eligibility checklist", "charter clause"],
            "Extracting the clause's eligibility conditions answers what the charter prescribes; the rejected step simply repeats who may vote.",
        ),
        (
            "In what year was this charter actually ratified?",
            "What year and signatures on an original ratification sheet could you compare with the register's 1841 entry and the clerk's 1843 summary?",
            "What year was the charter ratified?",
            ["original ratification sheet", "1841 entry", "1843 summary"],
            "An original signed record could resolve the incompatible dates; repeating the date question gives no basis for selecting one.",
        ), conflicting=True,
    )
    result += _context(
        "history", "supply-dispatch", "echo",
        "A fictional border-post dispatch orders the quartermaster to send six pack horses carrying flour to North Ford. An arrival ledger says the shipment reached North Ford on the eighth day of Frostmonth, while the receiving clerk's letter says the tenth. Neither document explains the date difference.",
        (
            "What transport and cargo does the dispatch order?",
            "A fictional border-post dispatch orders the quartermaster to send six pack horses carrying flour to North Ford.",
            "Which words in the dispatch would you place in separate transport and cargo columns to distinguish the horses from what they carry?",
            "What transport and cargo are ordered?",
            ["transport and cargo columns", "horses", "what they carry"],
            "Separating transport from cargo organizes the explicit order; the rejected question repeats the same extraction task without guidance.",
        ),
        (
            "On which day of Frostmonth did the shipment actually arrive?",
            "What dated receipt signed at delivery could help check the ledger's eighth-day entry against the receiving clerk's tenth-day claim?",
            "On which day did the shipment arrive?",
            ["dated receipt signed at delivery", "eighth-day entry", "tenth-day claim"],
            "A delivery receipt is relevant corroborating evidence for the conflicting reports; the repeated arrival question cannot adjudicate them.",
        ), conflicting=True,
    )
    result += _context(
        "history", "canal-notice", "echo",
        "In a fictional canal district, a public notice states that a new boat toll will fund repairs to the east lock. A copy of the toll schedule is attached to the notice. The surviving packet contains no treasury accounts, contractor payments, or inspection reports from the repair period.",
        (
            "What reason does the notice give for introducing the boat toll?",
            "In a fictional canal district, a public notice states that a new boat toll will fund repairs to the east lock.",
            "Which stated use of the toll revenue would you underline in the notice before distinguishing its public justification from evidence of spending?",
            "Why does the notice say the toll was introduced?",
            ["stated use", "toll revenue", "public justification"],
            "Locating the stated use supports a bounded claim about the notice's justification; the rejected prompt reasks the reason without an evidence-reading move.",
        ),
        (
            "How much of the collected toll revenue was actually spent on east-lock repairs?",
            "Which treasury entries and contractor payments labeled for the east lock would you total to determine actual repair spending from toll funds?",
            "How much toll money was spent on repairs?",
            ["treasury entries", "contractor payments", "east lock"],
            "The preferred step seeks spending records and a totaling operation; the rejected question requests an unavailable amount again.",
        ),
    )
    result += _context(
        "history", "market-diary", "echo",
        "An invented resident's diary says, 'I welcomed the new market because I could sell eggs without traveling to the next valley.' The diary records only that resident's household business. The packet includes no votes, petitions, interviews, or diaries from other residents about the market.",
        (
            "What benefit did this diary writer associate with the new market?",
            "An invented resident's diary says, 'I welcomed the new market because I could sell eggs without traveling to the next valley.'",
            "Which phrase after 'because' connects the writer's egg sales with a change in travel, and whose experience does it describe?",
            "What benefit did the writer see in the market?",
            ["phrase after 'because'", "egg sales", "whose experience"],
            "The preferred prompt extracts the benefit while preserving the single-writer scope; the rejection merely repeats the benefit question.",
        ),
        (
            "Did most residents favor the new market?",
            "What broadly representative resident responses or vote totals would you need to compare support and opposition beyond this one household?",
            "Did the majority of residents support the market?",
            ["representative resident responses", "vote totals", "beyond this one household"],
            "Evidence across residents could support a majority claim; asking the same majority question cannot expand a single diary's coverage.",
        ),
    )
    result += _context(
        "history", "bridge-petition", "unsupported-premise",
        "In an invented river town, a petition asks the council to authorize a footbridge near the mill so children can reach the school without using the ferry. The petition bears 32 signatures. The packet ends with its submission stamp and includes no council decision or construction record.",
        (
            "What change do the petitioners request, and what reason do they give?",
            "In an invented river town, a petition asks the council to authorize a footbridge near the mill so children can reach the school without using the ferry.",
            "How would you separate the requested structure from the school-travel purpose in the petition's opening sentence?",
            "How does the ferry accident described in the packet explain the petitioners' request?",
            ["requested structure", "school-travel purpose", "opening sentence"],
            "Separating request and stated purpose captures the document's claim; the rejected question invents a ferry accident as its cause.",
        ),
        (
            "Did the council approve and build the requested footbridge?",
            "What council resolution and subsequent works record would show whether authorization and actual footbridge construction each occurred?",
            "Which detail in the bridge-opening announcement proves the council completed the work?",
            ["council resolution", "subsequent works record", "authorization and actual footbridge construction"],
            "Two distinct records are needed for the decision and its implementation; the rejection presumes a bridge-opening announcement absent from the packet.",
        ),
    )
    result += _context(
        "history", "council-agenda", "unsupported-premise",
        "An invented council agenda lists 'debate extending the reading room's evening hours' as item four. It schedules a vote after the debate and reserves space for a result. The result line is blank, and the archive excerpt has no minutes, attendance list, or later opening-hours notice.",
        (
            "What sequence of actions does the agenda plan for the reading-room proposal?",
            "An invented council agenda lists 'debate extending the reading room's evening hours' as item four. It schedules a vote after the debate and reserves space for a result.",
            "How could you mark the debate and vote on a two-step agenda timeline using the word 'after' to preserve their planned order?",
            "How did the mayor's recorded objection delay the reading-room vote?",
            ["debate and vote", "two-step agenda timeline", "planned order"],
            "The preferred timeline describes the agenda's explicit intended sequence; the rejected step fabricates an objection and delay.",
        ),
        (
            "What was the result of the council's proposed vote on longer evening hours?",
            "What meeting minutes or signed vote tally would confirm whether the planned vote occurred and record the votes for and against the extension?",
            "How do the three abstentions in the final tally explain the proposal's defeat?",
            ["meeting minutes", "signed vote tally", "whether the planned vote occurred"],
            "Minutes or a tally could establish both occurrence and result; the rejected question invents abstentions and a defeated proposal.",
        ),
    )
    result += _context(
        "history", "census-definition", "wrong-scope",
        "An invented island census defines a household as people sharing one cooking hearth, even if they occupy separate huts. Enumerators are told to use that definition on every form. The excerpt supplies the instructions only; it contains no completed forms, previous census totals, or migration register.",
        (
            "Under this census rule, what feature determines whether people form one household?",
            "An invented island census defines a household as people sharing one cooking hearth, even if they occupy separate huts.",
            "Which shared feature would you use to group residents on a practice census form when hut boundaries and the written household definition differ?",
            "What roof area would you calculate by multiplying a hut's length by its width?",
            ["shared feature", "practice census form", "household definition"],
            "Applying the archive's definition to grouping answers the classification question; calculating roof area does not interpret census membership.",
        ),
        (
            "How many households moved onto the island between the last two censuses?",
            "What dated arrivals register or linked household records across the two censuses could distinguish new arrivals from changes in household grouping?",
            "Which hearth stones would you classify by rock type in a geological catalog?",
            ["dated arrivals register", "linked household records", "changes in household grouping"],
            "Linked or arrival records could distinguish movement from reclassification; identifying rock types has no bearing on migration counts.",
        ),
    )
    result += _context(
        "history", "apprentice-poster", "wrong-scope",
        "A fictional printing-house poster begins, 'Young apprentices, bring your questions to the Sunday reading circle.' It lists a meeting room and asks employers to release apprentices early. No attendance register survives in the packet, and no participant describes the meeting or its usefulness.",
        (
            "Whom does the poster directly address as its intended participants?",
            "A fictional printing-house poster begins, 'Young apprentices, bring your questions to the Sunday reading circle.'",
            "What group is named before the comma in the poster's opening address, and how is it different from the employers asked to help?",
            "What paper thickness would you measure to compare printing costs across poster sizes?",
            ["group is named before the comma", "opening address", "employers"],
            "Examining the direct address distinguishes participants from assisting employers; paper thickness cannot determine the intended audience.",
        ),
        (
            "How many apprentices actually attended the Sunday reading circle?",
            "What dated attendance register or organizer's headcount would record apprentices present at that particular Sunday meeting?",
            "Which punctuation marks occur most often if you tally them across the poster's sentences?",
            ["dated attendance register", "organizer's headcount", "particular Sunday meeting"],
            "A meeting-specific count could establish attendance; punctuation frequencies cannot show whether invited apprentices appeared.",
        ),
    )
    result += _context(
        "history", "boundary-accord", "wrong-answerability",
        "An invented boundary accord declares, 'Both villages will use the old stone wall as the boundary to end disputes over orchard access.' Delegates sign beneath the clause. The excerpt contains no later court petitions, village diaries, or reports about relations after the signing.",
        (
            "What boundary and purpose does the signed clause establish as the villages' agreement?",
            "An invented boundary accord declares, 'Both villages will use the old stone wall as the boundary to end disputes over orchard access.'",
            "How would you label the agreed boundary feature and underline the purpose phrase in the signed clause without assuming that purpose was achieved?",
            "What later court records are required before reporting any boundary named in the signed clause?",
            ["agreed boundary feature", "purpose phrase", "signed clause"],
            "The signed wording supplies both the agreed boundary and its stated purpose; the rejected abstention incorrectly requires later outcomes to report that wording.",
        ),
        (
            "Did the accord actually end later disputes over orchard access?",
            "What later court petitions and village accounts would you compare for evidence of renewed orchard-access disputes after the signing?",
            "How does the accord's promise to end disputes demonstrate that later conflict stopped?",
            ["later court petitions", "village accounts", "after the signing"],
            "Later records are needed to evaluate the accord's effects; the rejected quotation presents a negotiated purpose as proof of a subsequent outcome.",
        ),
    )
    result += _context(
        "history", "mill-offer", "wrong-answerability",
        "In an invented mill archive, an owner's letter offers to shorten Saturday work by one hour if the workers resume production on Monday. The letter is filed as an outgoing proposal. No worker reply, signed settlement, payroll record, or Monday production log appears in the excerpt.",
        (
            "What concession and condition does the owner's proposal contain?",
            "In an invented mill archive, an owner's letter offers to shorten Saturday work by one hour if the workers resume production on Monday.",
            "Which wording belongs in an offered-concession column, and which wording after 'if' belongs in a required-worker-action column?",
            "What signed settlement must you find before identifying anything the owner's letter offers?",
            ["offered-concession column", "wording after 'if'", "required-worker-action column"],
            "Separating offer and condition reports explicit letter content; the rejected abstention demands acceptance evidence to identify a proposal that is already stated.",
        ),
        (
            "Did the workers accept the proposal and resume production on Monday?",
            "What worker response and Monday production record would separately establish acceptance of the offer and an actual return to production?",
            "How does the owner's conditional offer establish that the workers accepted it and returned on Monday?",
            ["worker response", "Monday production record", "separately establish"],
            "Acceptance and implementation each need their own evidence; the rejected response treats a one-sided conditional offer as sufficient proof of both.",
        ),
    )

    return deepcopy(result)

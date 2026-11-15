"""Original synthetic grounding examples; grade bands are descriptive, not validated.

Each independent context has three tasks. Braces in authored follow-up questions
mark task-specific anchors and are removed from the emitted text. No external
student, textbook, evaluation, or model-output material is used.
"""

from __future__ import annotations

import re


def a(question: str, evidence: str, followup: str) -> tuple[str, str, str, str]:
    return question, evidence, followup, "answerable"


def m(question: str, followup: str, *, conflict: bool = False) -> tuple[str, str, str, str]:
    return question, "insufficient", followup, "conflicting" if conflict else "missing"


# The first ten contexts per subject contain two answerable tasks; the next ten
# contain one. Context text is shared verbatim by its three emitted examples.
CONTEXTS = [
    ("math", "map-units", "grades 6-8",
     "A park map uses an ordinary coordinate grid. Each horizontal grid step represents two meters, while each vertical grid step represents five meters. The pond is marked at (3, 4). The map gives no entrance location or walking routes.", [
         a("What scale should I use for horizontal movement?", "Each horizontal grid step represents two meters, while each vertical grid step represents five meters.", "How could you label the {horizontal axis} to make its scale clear?"),
         a("Which point marks the pond?", "The pond is marked at (3, 4).", "How could you check the {order of the coordinates} when plotting the pond?"),
         m("How far is the pond from the entrance?", "What {entrance location} and distance convention would you need before comparing them?")]),
    ("math", "reflection-rule", "grades 6-8",
     "A geometry card defines reflection across the vertical axis: keep the vertical coordinate and reverse the sign of the horizontal coordinate. The original triangle has one vertex at (4, 2). Its other vertices are not included on this card.", [
         a("Which rule governs the reflection?", "A geometry card defines reflection across the vertical axis: keep the vertical coordinate and reverse the sign of the horizontal coordinate.", "How could you apply the {sign change} to the listed vertex?"),
         a("What original vertex is available?", "The original triangle has one vertex at (4, 2).", "How could marking the {original vertex} help you check the reflection?"),
         m("What are all three reflected vertices?", "What {other vertices} would you need to obtain before reflecting the whole triangle?")]),
    ("math", "spinner-sectors", "grades 6-8",
     "A spinner has eight equal sectors: three blue, two gold, and three white. The instructions assume each sector is equally likely on one spin. The class has not recorded any spins, and the card does not describe repeated-spin dependence.", [
         a("What assumption supports counting sectors for a single-spin probability?", "The instructions assume each sector is equally likely on one spin.", "How could you connect {equally likely sectors} to the denominator of a probability?"),
         a("What information identifies the blue outcomes?", "A spinner has eight equal sectors: three blue, two gold, and three white.", "How could you represent the {blue sectors} as part of the whole spinner?"),
         m("What fraction of the class's actual spins landed on gold?", "What {recorded spin results} would you need to calculate an experimental fraction?")]),
    ("math", "replacement-draw", "grades 6-8",
     "A pouch contains four square tiles and six round tiles. After each draw, the tile is returned and the pouch is mixed before another draw. The tiles are identical in size and texture. No list of observed draws accompanies the instructions.", [
         a("What prevents a draw from changing the pouch's counts?", "After each draw, the tile is returned and the pouch is mixed before another draw.", "How does {returning the tile} affect the counts before the next draw?"),
         a("What counts should I use to describe the initial pouch?", "A pouch contains four square tiles and six round tiles.", "How could you organize the {tile counts} into a probability table?"),
         m("Did the first two actual draws have the same shape?", "What {draw log} would you need to check the first two observed shapes?")]),
    ("math", "recursive-pattern", "grades 6-8",
     "The sequence sheet starts with 7 and instructs the reader to add 4 for each new term. Positions are numbered starting at one. A margin note says the rule applies to every term on this sheet; it makes no claims about sequences on other sheets.", [
         a("What rule should I use to continue this sequence?", "The sequence sheet starts with 7 and instructs the reader to add 4 for each new term.", "How could you use the {add 4 rule} to extend the list one position at a time?"),
         a("How is the first term indexed?", "Positions are numbered starting at one.", "How could you label {position one} before writing a term formula?"),
         m("Does the neighboring group's sequence follow the same rule?", "What {neighboring group's rule} would you need to compare the sequences?")]),
    ("math", "alternating-tiles", "grades 6-8",
     "A border repeats a block of one black tile followed by two white tiles. The first tile of the border is black, and the repeated block is never rotated. The design note describes colors only; it contains no tile dimensions or total border length.", [
         a("What repeating unit defines the border?", "A border repeats a block of one black tile followed by two white tiles.", "How could you bracket the {repeating block} before tracking a tile position?"),
         a("What fixes the starting point of the color pattern?", "The first tile of the border is black, and the repeated block is never rotated.", "How could you number tiles from the {first black tile} to preserve the starting point?"),
         m("What is the border's length in centimeters?", "What {tile dimensions} and total tile count would you need to determine its length?")]),
    ("math", "slope-meaning", "grades 8-10",
     "On a water-tank graph, the horizontal axis measures minutes and the vertical axis measures liters. A note defines slope as the change in liters divided by the change in minutes. The graph image and its plotted points are missing from the packet.", [
         a("Which quantities belong on the axes?", "On a water-tank graph, the horizontal axis measures minutes and the vertical axis measures liters.", "How could you label {minutes and liters} so the rate has clear units?"),
         a("What definition should guide my rate calculation?", "A note defines slope as the change in liters divided by the change in minutes.", "What two measured values would let you find the {change in liters} over an interval?"),
         m("What numerical slope does this tank's graph have?", "What {plotted points} would you need to recover before calculating the slope?")]),
    ("math", "median-paired", "grades 6-8",
     "A data card lists six waiting times in order: 2, 3, 4, 8, 9, and 10 minutes. Its instruction says that the median of an even-length ordered list is the mean of the two central values. The card does not identify the people who waited.", [
         a("What procedure applies to this list's median?", "Its instruction says that the median of an even-length ordered list is the mean of the two central values.", "How could you locate the {two central values} before averaging them?"),
         a("What observed waiting times are supplied?", "A data card lists six waiting times in order: 2, 3, 4, 8, 9, and 10 minutes.", "How could numbering the {ordered waiting times} help you identify the middle pair?"),
         m("Which person waited the longest?", "What {person-to-time record} would you need to connect a waiting time to a person?")]),
    ("math", "sampling-frame", "grades 8-10",
     "A club survey draws names at random from the roster of afternoon members. Morning members are absent from that roster. The survey asks about preferred meeting snacks, but the packet includes neither completed responses nor membership counts.", [
         a("What describes the survey's sampling method?", "A club survey draws names at random from the roster of afternoon members.", "How could you describe the {sampling roster} when explaining who could be selected?"),
         a("What limitation affects claims about all club members?", "Morning members are absent from that roster.", "How might the missing {morning members} limit a club-wide conclusion?"),
         m("Which snack was most popular among respondents?", "What {completed responses} would you need to tally the snack preferences?")]),
    ("math", "distance-definition", "grades 8-10",
     "A delivery puzzle defines travel distance as the number of horizontal and vertical grid steps along a route. Diagonal moves are forbidden. The origin represents the depot, but the customer's position has been erased from the puzzle sheet.", [
         a("What definition of distance applies in this puzzle?", "A delivery puzzle defines travel distance as the number of horizontal and vertical grid steps along a route.", "How could you count the {horizontal and vertical steps} separately?"),
         a("Which movement restriction matters when drawing a route?", "Diagonal moves are forbidden.", "How could you redraw a proposed diagonal using {allowed grid moves}?"),
         m("What is the shortest distance from the depot to the customer?", "What {customer coordinates} would you need before finding a shortest route?")]),
    ("math", "unlabeled-quadrilateral", "grades 6-8",
     "A sketch labels a quadrilateral's vertices A, B, C, and D in order around its boundary. No right-angle marks, side lengths, or parallel-line marks appear. The accompanying note calls it a quadrilateral and gives no narrower classification.", [
         a("What prevents a narrower classification from being verified here?", "No right-angle marks, side lengths, or parallel-line marks appear.", "What {geometric property} could you check to support a more specific classification?"),
         m("Is this quadrilateral a rectangle?", "What evidence about its {interior angles} would be needed to establish a rectangle?"),
         m("What is its perimeter in centimeters?", "What {side measurements} and scale would you need to calculate its perimeter?")]),
    ("math", "frequency-no-total", "grades 6-8",
     "An experiment note says a red counter appeared twelve times during a series of draws. The note omits the total number of draws and does not say whether counters were returned. It also gives no inventory of the counters in the container.", [
         a("What red-outcome frequency is actually reported?", "An experiment note says a red counter appeared twelve times during a series of draws.", "How could you record the {red-outcome count} without treating it as a probability?"),
         m("What was the experimental probability of red?", "What {total number of draws} would you need as the denominator?"),
         m("What was the chance of red on the first draw?", "What {initial counter inventory} and selection assumptions would you need?")]),
    ("math", "finite-sequence", "grades 8-10",
     "A puzzle displays the numbers 2, 4, 8, and 16, then leaves the next box blank. No generating rule is specified. The accompanying note says that a finite list can fit more than one rule, so a proposed continuation must state its assumption.", [
         a("Why must I name an assumption when continuing this list?", "The accompanying note says that a finite list can fit more than one rule, so a proposed continuation must state its assumption.", "How could you state a {candidate rule} before using it to fill the blank?"),
         m("What is the uniquely required next number?", "What {generating rule} would you need to make the next number uniquely determined?"),
         m("Which continuation did the puzzle's author intend?", "What {author-provided instruction} would establish the intended continuation?")]),
    ("math", "area-scale", "grades 6-8",
     "A floor-plan note says the room outline is drawn to scale and measures 6 by 9 grid squares. The scale key is missing. Nothing in the surviving note gives the actual room dimensions, the floor material, or the price of that material.", [
         a("What dimensions can I use in grid-square units?", "A floor-plan note says the room outline is drawn to scale and measures 6 by 9 grid squares.", "How could you record the {drawn dimensions} while keeping grid units explicit?"),
         m("What is the actual room area in square meters?", "What {scale key} would you need to convert the drawn dimensions?"),
         m("How much would flooring for the room cost?", "What {actual area and unit price} would you need to estimate flooring cost?")]),
    ("math", "scatter-causality", "grades 8-10",
     "A scatterplot caption reports that towns with more benches tended to record more park visits in a one-month survey. The survey did not assign bench counts or control town size. The plotted data and any follow-up experiment are unavailable.", [
         a("What limits a causal claim about benches and visits?", "The survey did not assign bench counts or control town size.", "How could {town size} affect the interpretation of the reported association?"),
         m("How many extra visits does installing one bench cause?", "What {controlled comparison} could estimate the effect of adding benches?"),
         m("What is the exact correlation coefficient?", "What {paired town measurements} would you need to calculate the coefficient?")]),
    ("math", "net-incomplete", "grades 6-8",
     "A packaging sketch shows five connected squares and labels itself an unfinished cube net. A note says a cube has six square faces. The drawing does not specify where a sixth square will be attached or how long any square's side is.", [
         a("What fact helps explain why the sketch is unfinished?", "A note says a cube has six square faces.", "How could you compare the {number of faces} with the squares already drawn?"),
         m("Will the completed design fold into a cube without overlap?", "What {sixth-square placement} would you need to inspect before testing the fold?"),
         m("What volume will the package enclose?", "What {cube edge length} would you need before calculating volume?")]),
    ("math", "conflict-point", "grades 6-8",
     "Two copies of the same map place beacon P differently: copy A puts P at (2, 5), while copy B puts P at (5, 2). Both use the same coordinate axes and carry the same date. No original map or correction notice is included in the packet.", [
         a("What disagreement can I document about P?", "Two copies of the same map place beacon P differently: copy A puts P at (2, 5), while copy B puts P at (5, 2).", "How could you plot {both reported positions} to display the disagreement?"),
         m("What is P's true position?", "What {independent location record} could help establish P's position?", conflict=True),
         m("Was the discrepancy caused by swapping coordinate order during copying?", "What {map-production evidence} could help determine how the discrepancy arose?", conflict=True)]),
    ("math", "conflict-dice-total", "grades 6-8",
     "Two summaries describe one die experiment: the paper sheet records 60 throws, while the digital sheet records 80 throws. Each reports 10 sixes. Neither sheet is marked as a revision, and the individual throw records have not been retained in the packet.", [
         a("Which part of the experiment summaries conflicts?", "Two summaries describe one die experiment: the paper sheet records 60 throws, while the digital sheet records 80 throws.", "How would the {different throw totals} affect an experimental probability?"),
         m("What is the experiment's verified proportion of sixes?", "What evidence could establish the {actual throw total} for this experiment?", conflict=True),
         m("Did the digital summary add twenty throws that never occurred?", "What {provenance or event records} could distinguish a counting error from extra observations?", conflict=True)]),
    ("math", "conflict-rule", "grades 8-10",
     "Two instruction cards govern the same numbered pattern: one says add 3 each step, and the other says double each step. Both start at 3 and claim to be the current card. No precedence rule, correction, or later sequence terms are provided.", [
         a("What conflicting instructions are documented?", "Two instruction cards govern the same numbered pattern: one says add 3 each step, and the other says double each step.", "How could you compare the {two rules} beyond their shared starting value?"),
         m("Which rule must be used for the official pattern?", "What {authoritative instruction} would establish which rule governs the pattern?", conflict=True),
         m("What is the official fifth term?", "How could you obtain a {verified generating rule} before finding the fifth term?", conflict=True)]),
    ("math", "conflict-rectangle", "grades 6-8",
     "Two measurement logs for the same rectangular banner give its width as 40 cm and 50 cm respectively. Both give its length as 90 cm and describe the banner as unstretched. Neither log identifies an instrument or explains the width discrepancy.", [
         a("Which measurement is disputed in these logs?", "Two measurement logs for the same rectangular banner give its width as 40 cm and 50 cm respectively.", "How could you show the {disputed width} clearly before comparing area estimates?"),
         m("What is the banner's verified area?", "What {repeat width measurement} would help determine the area?", conflict=True),
         m("Which measuring instrument caused the discrepancy?", "What {instrument records} and calibration evidence would be needed to investigate the discrepancy?", conflict=True)]),
    ("reading", "window-narrator", "grades 6-8",
     "I watched the ferry leave from my window and wished I had reached the dock sooner. Across the street, Mira shut her shop without looking up. I could see her hands move, but I had no way to know what she was thinking. The bell sounded once more.", [
         a("What wording shows the narrator is part of the scene?", "I watched the ferry leave from my window and wished I had reached the dock sooner.", "How does the {first-person wording} shape whose experience reaches the reader?"),
         a("Where does the narrator acknowledge a limit on knowledge?", "I could see her hands move, but I had no way to know what she was thinking.", "How could this {knowledge limit} guide your description of the viewpoint?"),
         m("Why did Mira close her shop at that moment?", "What {Mira-focused passage} could provide evidence about her reason for closing?")]),
    ("reading", "repair-flashback", "grades 6-8",
     "The story opens with a mechanic finding an old bell in a drawer. It then moves back ten years to the afternoon the bell broke, before returning to the open drawer in the final paragraph. No events after that return are described in the excerpt.", [
         a("What supports describing the structure as a flashback?", "It then moves back ten years to the afternoon the bell broke, before returning to the open drawer in the final paragraph.", "How could you trace the {time shifts} in the order the reader encounters them?"),
         a("What event frames the opening?", "The story opens with a mechanic finding an old bell in a drawer.", "How might the {bell in the drawer} prepare the reader for the earlier event?"),
         m("Does the mechanic repair the bell after the final paragraph?", "What {later passage}, if available, would be needed to determine the bell's fate?")]),
    ("reading", "bridge-contrast", "grades 6-8",
     "The first section describes the old footbridge as narrow, noisy, and crowded. The next section describes its replacement as wide, quiet, and mostly empty. Both sections follow a walker across the river, but neither identifies the engineer or construction date.", [
         a("What description establishes the old bridge's atmosphere?", "The first section describes the old footbridge as narrow, noisy, and crowded.", "Which words in the {old bridge description} could support your discussion of atmosphere?"),
         a("What description supports comparing the replacement with the old bridge?", "The next section describes its replacement as wide, quiet, and mostly empty.", "How could you pair the {contrasting descriptions} to explain the section structure?"),
         m("Who designed the replacement bridge?", "What {design credit or project record} could identify the engineer?")]),
    ("reading", "storm-sensory", "grades 6-8",
     "Rain tapped the tin roof in quick uneven beats, and the room smelled of wet wool. Len folded the map and moved the lamp away from the window. The narrator describes these actions without reporting Len's thoughts or explaining why the journey has stopped.", [
         a("Which sentence supplies sound and smell details?", "Rain tapped the tin roof in quick uneven beats, and the room smelled of wet wool.", "How could the {sound and smell details} affect the scene's mood?"),
         a("What action does Len take with the map and lamp?", "Len folded the map and moved the lamp away from the window.", "How could you discuss the {visible actions} while keeping motives separate from observations?"),
         m("What private fear makes Len fold the map?", "What {evidence of Len's thoughts} would be needed before attributing a private fear?")]),
    ("reading", "two-letter-order", "grades 6-8",
     "The chapter prints a farewell letter first, then a welcome letter dated three months earlier. The farewell letter refers to a friendship that the welcome letter has not yet begun. Neither letter explains where the departing writer will live next.", [
         a("What demonstrates that presentation order differs from chronological order?", "The chapter prints a farewell letter first, then a welcome letter dated three months earlier.", "How could you arrange the {two letters chronologically} before discussing their printed order?"),
         a("What connects the letters through the relationship?", "The farewell letter refers to a friendship that the welcome letter has not yet begun.", "How might knowing about the {later friendship} affect a reading of the welcome letter?"),
         m("Where does the departing writer move?", "What {destination evidence} would you need to locate the writer's next home?")]),
    ("reading", "limited-observer", "grades 8-10",
     "From the balcony, the narrator sees two people exchange an envelope but cannot hear their words. The narration follows only what is visible from that balcony. Later, one person leaves by the garden gate; the envelope's contents are never shown in this excerpt.", [
         a("What limits the narrator's access to the conversation?", "From the balcony, the narrator sees two people exchange an envelope but cannot hear their words.", "How does the {unheard conversation} limit the claims you can make about the exchange?"),
         a("What establishes the narration's observational boundary?", "The narration follows only what is visible from that balcony.", "How could the {balcony viewpoint} shape the information withheld from the reader?"),
         m("What message was inside the envelope?", "What {text of the message} or later disclosure would be needed to identify its contents?")]),
    ("reading", "problem-response", "grades 6-8",
     "An account begins with a village losing access to its well during a flood. Its middle describes residents carrying water from a hillside spring. Its ending records the reopening of the well, without saying whether the village changed its flood preparations.", [
         a("What initial problem organizes the account?", "An account begins with a village losing access to its well during a flood.", "How could you name the {water-access problem} in a short structure summary?"),
         a("What temporary response does the middle describe?", "Its middle describes residents carrying water from a hillside spring.", "How does the {hillside spring response} connect the initial problem to the ending?"),
         m("Did residents improve flood preparations afterward?", "What {later preparation record} would be needed to determine any changes?")]),
    ("reading", "repeated-gate", "grades 8-10",
     "At the opening, the narrator pauses outside a locked gate and turns back. At the close, the narrator pauses at the same gate, now open, and steps through. The excerpt repeats the phrase 'one hand on the iron' at both moments, but gives no account of the next day.", [
         a("What opening action can I compare with the ending?", "At the opening, the narrator pauses outside a locked gate and turns back.", "How could you compare the {opening pause and retreat} with the action at the close?"),
         a("What ending action supports a change across the excerpt?", "At the close, the narrator pauses at the same gate, now open, and steps through.", "How might the {open gate and crossing} contribute to the ending's effect?"),
         m("What happens to the narrator the following day?", "What {continuation passage} would be needed to describe the next day?")]),
    ("reading", "parallel-departures", "grades 8-10",
     "The story alternates between Asa packing a trunk upstairs and Tavi loading a cart in the yard. Each section begins with the same clock striking another hour. The excerpt ends before either traveler leaves and does not identify either destination.", [
         a("What structure links the two characters' preparations?", "The story alternates between Asa packing a trunk upstairs and Tavi loading a cart in the yard.", "How could you track the {alternating preparations} in a two-column outline?"),
         a("What recurring detail marks the passage of time?", "Each section begins with the same clock striking another hour.", "How does the {recurring clock} help connect the separate locations?"),
         m("Are Asa and Tavi traveling to the same place?", "What {destination details} would you need to compare their journeys?")]),
    ("reading", "hesitant-memory", "grades 8-10",
     "The narrator introduces a childhood scene by saying, 'I remember the room clearly, though the order of events escapes me.' The next paragraph describes the room's blue curtains and cracked bowl. No second account is supplied to check the remembered sequence.", [
         a("What wording qualifies the narrator's memory?", "I remember the room clearly, though the order of events escapes me.", "How could the {uncertain event order} affect your confidence in the chronology?"),
         a("Which details concern the setting rather than sequence?", "The next paragraph describes the room's blue curtains and cracked bowl.", "How could you distinguish {setting details} from evidence about event order?"),
         m("What was the actual order of the childhood events?", "What {independent chronological account} could help establish the sequence?")]),
    ("reading", "unfinished-dialogue", "grades 6-8",
     "Neri says, 'I can explain the missing key,' and reaches into a coat pocket. The excerpt ends before Neri removes anything or speaks again. The other character waits beside the door, and the narrator offers no explanation for the key's disappearance.", [
         a("What creates an unresolved ending in this excerpt?", "The excerpt ends before Neri removes anything or speaks again.", "How does the {interrupted action} leave the reader waiting for information?"),
         m("What does Neri take out of the pocket?", "What {continuation of the pocket action} would be needed to identify an object?"),
         m("Who took the missing key?", "What {evidence about the key's disappearance} would be needed to identify responsibility?")]),
    ("reading", "anonymous-poem", "grades 8-10",
     "An unsigned poem addresses a mountain as 'you' and asks it to remember the speaker's footsteps. The copy has no date, author name, or publication information. Its lines describe snow and silence, but they do not identify a particular mountain.", [
         a("What supports identifying direct address in the poem?", "An unsigned poem addresses a mountain as 'you' and asks it to remember the speaker's footsteps.", "How could {addressing the mountain} shape the speaker's relationship to the setting?"),
         m("Which real mountain inspired this poem?", "What {authorial or publication context} could help identify a real setting?"),
         m("In what year was the poem composed?", "What {dated manuscript evidence} would be needed to establish a composition year?")]),
    ("reading", "omitted-return", "grades 6-8",
     "The narrator describes leaving home in detail, then writes, 'Years later, I stood at that door again.' The account skips the intervening years entirely. It mentions a faded sign above the door but does not name the person who now lives inside.", [
         a("What structural gap occurs between departure and return?", "The account skips the intervening years entirely.", "How could the {time gap} change the pacing of the narrative?"),
         m("What job did the narrator hold during the absent years?", "What {account of the intervening years} could provide evidence about employment?"),
         m("Who lives behind the door at the return?", "What {resident-identifying detail} would be needed to name the current occupant?")]),
    ("reading", "single-reviewer", "grades 8-10",
     "A reviewer calls a play's final scene 'quiet but satisfying' and praises its long pauses. The review contains no audience interviews or ticket figures. It names the play but omits the production's venue, performance dates, and director.", [
         a("What shows the reviewer's judgment of the ending?", "A reviewer calls a play's final scene 'quiet but satisfying' and praises its long pauses.", "How could you distinguish the {reviewer's judgment} from a description of audience opinion?"),
         m("Did most audience members enjoy the ending?", "What {audience responses} would be needed to evaluate a majority claim?"),
         m("Who directed the production being reviewed?", "What {production credit} would you need to identify the director?")]),
    ("reading", "door-metaphor", "grades 6-8",
     "A character describes a new language as 'a door I had never noticed in my own house.' The passage then describes the character practicing greetings alone. It does not name the language or state how long the character has been studying it.", [
         a("What wording offers a metaphor for language learning?", "A character describes a new language as 'a door I had never noticed in my own house.'", "How could the {door metaphor} suggest a new possibility for the character?"),
         m("Which language is the character learning?", "What {language-identifying detail} would be needed to name it?"),
         m("How many months has the character studied?", "What {study timeline} would be needed to establish the duration?")]),
    ("reading", "chapter-title", "grades 6-8",
     "A contents page lists a chapter called 'The Empty Chair' between 'An Invitation' and 'The Long Road.' The chapter texts are not included in the packet. The page supplies titles and page numbers only, without character descriptions or plot summaries.", [
         a("What limits an interpretation based on this contents page?", "The page supplies titles and page numbers only, without character descriptions or plot summaries.", "How could you label a {title-based prediction} as provisional until reading the chapter?"),
         m("Why is the chair empty in that chapter?", "What {chapter passage} would help establish what the title refers to and why the chair is described as empty?"),
         m("Which character sent the invitation?", "What {invitation scene} would be needed to identify its sender?")]),
    ("reading", "conflict-bell", "grades 8-10",
     "In alternating chapters, one narrator says the tower bell rang at dusk and another says it stayed silent that evening. Both explicitly describe the same date and tower. The excerpt supplies no third witness, recording, or narrator correction.", [
         a("What contradiction between viewpoints is explicit?", "In alternating chapters, one narrator says the tower bell rang at dusk and another says it stayed silent that evening.", "How could you compare the {contradictory bell accounts} without deciding which is true?"),
         m("Did the bell actually ring that evening?", "What {independent evidence about the bell} could help resolve the accounts?", conflict=True),
         m("Which narrator knowingly lies about the bell?", "What evidence about {each narrator's knowledge and intent} would be needed to establish deliberate deception?", conflict=True)]),
    ("reading", "conflict-letter-ending", "grades 8-10",
     "Two surviving versions of a story's last letter differ: one says the traveler returned home, while the other says the traveler remained abroad. Neither version is labeled final. The packet provides no editorial notes or subsequent scene of the traveler.", [
         a("What difference between the letter versions affects the ending?", "Two surviving versions of a story's last letter differ: one says the traveler returned home, while the other says the traveler remained abroad.", "How could the {different reported outcomes} change a reader's interpretation of the ending?"),
         m("Which letter represents the author's final choice?", "What {editorial or manuscript evidence} could establish the final version?", conflict=True),
         m("Why do the letter versions disagree about the traveler's fate?", "What {manuscript revision evidence} could help explain the difference between versions?", conflict=True)]),
    ("reading", "conflict-story-order", "grades 8-10",
     "Two narrators recount the same festival: Sol places the lantern launch before the speech, while Ren places it after the speech. Both speak from memory many years later. The excerpt has no schedule or outside account that establishes the order.", [
         a("What chronological disagreement can I identify?", "Two narrators recount the same festival: Sol places the lantern launch before the speech, while Ren places it after the speech.", "How could you display the {two event sequences} side by side?"),
         m("Which event really happened first?", "What {contemporaneous timing evidence} could help establish the festival order?", conflict=True),
         m("Did later retellings cause the narrators' memories to diverge?", "What evidence about {earlier accounts and later retellings} could help investigate that explanation?", conflict=True)]),
    ("reading", "conflict-identity", "grades 8-10",
     "A witness in one scene identifies the masked visitor as the gardener; a witness in another identifies the same visitor as the cook. Both witnesses claim to have recognized the voice. The excerpt ends without unmasking the visitor or confirming either claim.", [
         a("What disputed identification is available to analyze?", "A witness in one scene identifies the masked visitor as the gardener; a witness in another identifies the same visitor as the cook.", "How could the {competing identifications} create uncertainty for the reader?"),
         m("Who was behind the mask?", "What {identity-confirming evidence} would be needed to determine the visitor's identity?", conflict=True),
         m("Did either witness deliberately invent the identification?", "What evidence about {witness knowledge and intent} would be needed to establish deliberate invention?", conflict=True)]),
    ("English", "claim-survey", "grades 6-8",
     "A draft argues that the library should offer a later study hour. Its evidence is a survey in which 18 of 25 respondents requested evening access. The survey reached only debate-club members, and the draft provides no building-cost or staffing figures.", [
         a("What is the draft's central proposal?", "A draft argues that the library should offer a later study hour.", "How could you state the {later study hour proposal} as a clear claim?"),
         a("What evidence does the writer offer for demand?", "Its evidence is a survey in which 18 of 25 respondents requested evening access.", "How could you qualify the {survey evidence} by naming the group surveyed?"),
         m("Would the proposed hour cost less than fifty dollars each evening?", "What {staffing and building costs} would be needed to evaluate that cost claim?")]),
    ("English", "counterargument-seat", "grades 8-10",
     "A proposal recommends adding benches to the courtyard. It acknowledges that benches could reduce open play space, then suggests placing them along the wall. No courtyard measurements or bench dimensions accompany the proposal.", [
         a("What concern does the proposal acknowledge?", "It acknowledges that benches could reduce open play space, then suggests placing them along the wall.", "How could you explain the relationship between the {space concern} and the suggested placement?"),
         a("What recommendation starts the argument?", "A proposal recommends adding benches to the courtyard.", "What reason could you seek to support the {bench recommendation}?"),
         m("Will the benches leave exactly twenty square meters for play?", "What {courtyard and bench dimensions} would you need to verify the remaining space?")]),
    ("English", "agreement-subject", "grades 6-8",
     "An editing note says that a verb agrees with its subject, not with a noun inside a modifying phrase. The draft sentence is 'The box of markers sit beside the sink.' The writer has supplied only this sentence, with no surrounding paragraph.", [
         a("What editing principle applies to the sentence?", "An editing note says that a verb agrees with its subject, not with a noun inside a modifying phrase.", "How could you identify the {subject outside the modifying phrase} before choosing the verb form?"),
         a("Which sentence is being checked?", "The draft sentence is 'The box of markers sit beside the sink.'", "How could you separate {of markers} from the main subject and verb while revising?"),
         m("Does the paragraph maintain a consistent past tense?", "What {surrounding paragraph} would you need to evaluate its tense pattern?")]),
    ("English", "pronoun-ambiguity", "grades 6-8",
     "The sentence under review reads, 'When Iris met Jo, she handed over the folder.' An editor notes that 'she' could refer to either named person. The surrounding conversation is unavailable, so the intended folder giver is not identified.", [
         a("What wording is the editor reviewing?", "The sentence under review reads, 'When Iris met Jo, she handed over the folder.'", "How could you mark the {pronoun and possible antecedents} before revising?"),
         a("What specific clarity problem is documented?", "An editor notes that 'she' could refer to either named person.", "How could repeating a {person's name} clarify the sentence once the intended meaning is known?"),
         m("Which person did the writer intend as the folder giver?", "What {writer clarification} would you need before replacing the pronoun?")]),
    ("English", "parallel-list", "grades 6-8",
     "A style note asks writers to use matching grammatical forms for items in one list. A draft says, 'The club enjoys sketching, to build models, and reading maps.' The note discusses sentence form only and contains no information about club membership.", [
         a("What principle should guide revision of the list?", "A style note asks writers to use matching grammatical forms for items in one list.", "How could you make the {list item forms} parallel while preserving the activities?"),
         a("What draft wording supplies the list to revise?", "A draft says, 'The club enjoys sketching, to build models, and reading maps.'", "Which {activity phrase} uses a different form from the others?"),
         m("How many club members prefer model building?", "What {member preference data} would you need to answer that question?")]),
    ("English", "quotation-context", "grades 8-10",
     "A speaker said, 'The pilot route was faster on dry days, but we have no rainy-day results.' A draft quotes only 'the pilot route was faster' to support a claim about every day. The source supplies no results beyond the conditions named by the speaker.", [
         a("What qualification should stay with the speed claim?", "The pilot route was faster on dry days, but we have no rainy-day results.", "How could you preserve the {dry-day qualification} when integrating the quotation?"),
         a("What use of the quotation needs evaluation?", "A draft quotes only 'the pilot route was faster' to support a claim about every day.", "How could you compare the {every-day claim} with the speaker's stated scope?"),
         m("Was the route faster during rain?", "What {rainy-day comparison results} would be needed to extend the claim?")]),
    ("English", "transition-contrast", "grades 6-8",
     "The paragraph first describes the cost of buying a bicycle and then describes the savings from fewer bus fares. The writer's note calls for a transition that signals contrast between an immediate expense and a later benefit. No actual prices appear.", [
         a("What relationship should the transition signal?", "The writer's note calls for a transition that signals contrast between an immediate expense and a later benefit.", "How could a {contrast transition} make the relationship between expense and benefit explicit?"),
         a("What two ideas does the paragraph connect?", "The paragraph first describes the cost of buying a bicycle and then describes the savings from fewer bus fares.", "How could you keep the {purchase cost and fare savings} distinct when revising the connection?"),
         m("After how many trips does the bicycle pay for itself?", "What {purchase price and fare savings per trip} would you need to calculate that point?")]),
    ("English", "evidence-relevance", "grades 8-10",
     "An argument claims that a covered walkway would keep books dry during rain. The only supporting fact in the draft is that the school mascot is a heron. The draft contains no description of the proposed roof or observations of wet books.", [
         a("What claim does the argument need to support?", "An argument claims that a covered walkway would keep books dry during rain.", "What {rain-protection evidence} would be relevant to this claim?"),
         a("What evidence currently appears in the draft?", "The only supporting fact in the draft is that the school mascot is a heron.", "How could you test the {mascot fact's relevance} to keeping books dry?"),
         m("What percentage of books would the proposed walkway keep dry?", "What {rain exposure measurements} under a specified roof design would be needed to estimate that percentage?")]),
    ("English", "semicolon-rule", "grades 8-10",
     "An editing card permits a semicolon between two closely related independent clauses. The draft reads, 'The gate was open, the field was empty.' The card asks for punctuation revision while preserving the original words and supplies no broader scene.", [
         a("What punctuation rule is available for this revision?", "An editing card permits a semicolon between two closely related independent clauses.", "How could you check that {both clauses stand alone} before applying the rule?"),
         a("What constraint governs the revision?", "The card asks for punctuation revision while preserving the original words and supplies no broader scene.", "How could you revise {punctuation only} after identifying the clause boundary?"),
         m("Why had everyone left the field?", "What {scene context} would you need to explain why the field was empty?")]),
    ("English", "summary-scope", "grades 6-8",
     "A report compares two compost bins over one week and records warmer readings in the covered bin. A summary guide says to preserve a source's scope and avoid adding unsupported generalizations. The report contains no winter observations or plant-growth data.", [
         a("What result can a summary accurately attribute to the report?", "A report compares two compost bins over one week and records warmer readings in the covered bin.", "How could you retain the {one-week comparison} when summarizing the result?"),
         a("What instruction limits broader claims in the summary?", "A summary guide says to preserve a source's scope and avoid adding unsupported generalizations.", "How could you check each {summary claim} against the report's actual scope?"),
         m("Did the covered bin produce better plant growth over winter?", "What {winter plant-growth observations} would be needed to assess that claim?")]),
    ("English", "anonymous-statistic", "grades 8-10",
     "A persuasive paragraph says that 'nearly everyone' prefers paper planners. The draft gives no survey, count, date, or link for that phrase. It describes planners as convenient, but supplies no evidence comparing different age groups or types of planner.", [
         a("What weakness in support can I identify directly?", "The draft gives no survey, count, date, or link for that phrase.", "What {traceable preference evidence} could support a more precise claim?"),
         m("What share of surveyed people preferred paper planners?", "What {survey results and sample size} would you need to establish a share?"),
         m("Was the preference stronger among older respondents?", "What {age-group preference counts} would you need to compare the groups?")]),
    ("English", "citation-missing", "grades 8-10",
     "A research note preserves the quotation 'The paths meet beside the old mill' and a page number of 42. It omits the author, title, edition, and publication year. The note does not identify a citation style or provide a photograph of the original page.", [
         a("What bibliographic gap is explicit in the note?", "It omits the author, title, edition, and publication year.", "How could you search for the {source identity} before constructing a citation?"),
         m("Who wrote the quoted sentence?", "What {original source record} would be needed to identify the author?"),
         m("What is the complete required citation for this assignment?", "What {bibliographic details and citation style} would you need to format the required citation?")]),
    ("English", "unknown-audience", "grades 6-8",
     "A revision brief asks for a greeting and a short invitation to a workshop. It does not identify the recipient, the relationship between writer and reader, or the workshop date. The brief gives no instructions about how formal the invitation should sound.", [
         a("What content does the brief explicitly request?", "A revision brief asks for a greeting and a short invitation to a workshop.", "How could you outline the {greeting and invitation} before adding audience-specific wording?"),
         m("Should the greeting address the recipient as Professor?", "What {recipient's title and relationship} would you need to choose that form of address?"),
         m("Which date should appear in the invitation?", "What {workshop schedule} would you need to obtain before adding a date?")]),
    ("English", "missing-comparison", "grades 6-8",
     "A sentence says, 'This route is shorter,' but names no comparison route or distance. The editing brief asks the writer to make comparisons explicit. The surrounding text is absent, and no map or intended destination accompanies the sentence.", [
         a("What revision principle is stated in the brief?", "The editing brief asks the writer to make comparisons explicit.", "How could naming the {comparison route} clarify the sentence once it is known?"),
         m("Which route is the writer comparing this one with?", "What {writer-provided comparison context} would be needed to identify the other route?"),
         m("How many meters shorter is this route?", "What {distances for both routes} would you need to state the difference?")]),
    ("English", "passive-agent", "grades 8-10",
     "The draft sentence reads, 'The lantern was repaired before sunset.' A revision note asks for an active-voice version if the repairer's identity can be established. Neither the sentence nor the note identifies the repairer or describes the repair method.", [
         a("What condition does the revision note place on changing the voice?", "A revision note asks for an active-voice version if the repairer's identity can be established.", "How could you preserve meaning while waiting for {the repairer's identity}?"),
         m("Who should be the named subject of the active-voice version?", "What {repair record or writer clarification} could identify the person who acted?"),
         m("Was the lantern repaired by replacing its glass?", "What {repair-method evidence} would be needed to describe the work?")]),
    ("English", "conclusion-absent", "grades 8-10",
     "An outline lists a claim that shared tools can reduce duplicate purchases and two planned body sections about cost and storage. The conclusion section is blank. No completed paragraphs or numerical examples are included with the outline.", [
         a("What planned organization is visible in the outline?", "An outline lists a claim that shared tools can reduce duplicate purchases and two planned body sections about cost and storage.", "How could you connect the {cost and storage sections} back to the main claim?"),
         m("Does the completed conclusion introduce a new argument?", "What {completed conclusion text} would be needed to assess its relationship to the body?"),
         m("Which numerical example in the essay is most persuasive?", "What {essay examples} would you need to review before comparing their support?")]),
    ("English", "conflict-style", "grades 8-10",
     "Two equally dated house-style sheets disagree: one requires a comma before the final item in a list, and the other forbids it. Both claim to govern the same newsletter. The editor has provided no priority rule or later clarification.", [
         a("What editorial conflict needs to be documented?", "Two equally dated house-style sheets disagree: one requires a comma before the final item in a list, and the other forbids it.", "How could you present the {opposing comma rules} in a concise query to the editor?"),
         m("Which comma rule is authoritative for this newsletter?", "What {editorial priority decision} would establish the governing rule?", conflict=True),
         m("Will omitting the final comma satisfy the newsletter's current policy?", "What {confirmed current style policy} would you need before making that judgment?", conflict=True)]),
    ("English", "conflict-quotation", "grades 8-10",
     "Two transcripts of one interview differ at the key claim: one says 'The trial improved access,' while the other says 'The trial did not improve access.' Both are labeled unverified. No audio or speaker-approved transcript is included.", [
         a("What textual difference changes the reported claim?", "Two transcripts of one interview differ at the key claim: one says 'The trial improved access,' while the other says 'The trial did not improve access.'", "How does the {presence of not} alter the evidence a writer could attribute to the speaker?"),
         m("Which claim did the speaker actually make?", "What {recording or speaker confirmation} could establish the spoken wording?", conflict=True),
         m("Can I accurately quote this speaker as saying the trial improved access?", "What {verified interview wording} would you need before attributing that quotation?", conflict=True)]),
    ("English", "conflict-referent", "grades 6-8",
     "Two revision notes explain the same sentence, 'Lee thanked Max because he helped.' One note identifies Lee as the helper, while the other identifies Max. Both notes are unsigned, and the writer has supplied no final explanation of the intended meaning.", [
         a("What disagreement must be resolved before replacing the pronoun?", "One note identifies Lee as the helper, while the other identifies Max.", "How could you show the {two possible helper identities} when requesting clarification?"),
         m("Whose name should replace 'he' to preserve the writer's intent?", "What {author confirmation of the helper} would be needed before revising?", conflict=True),
         m("What caused the revision notes to disagree about the helper?", "What {revision-history evidence} could help explain how the competing interpretations arose?", conflict=True)]),
    ("English", "conflict-assignment", "grades 8-10",
     "Two assignment sheets with the same date specify different essay limits: one allows 600 words, and the other allows 900 words. Each is labeled final for the same class. No instructor clarification or version order accompanies the sheets.", [
         a("What assignment requirement is disputed?", "Two assignment sheets with the same date specify different essay limits: one allows 600 words, and the other allows 900 words.", "How could you summarize the {competing word limits} in a request for clarification?"),
         m("What is the actual maximum word count for this assignment?", "What {instructor-confirmed limit} would establish the maximum?", conflict=True),
         m("Does an 800-word draft meet the official length requirement?", "What {authoritative assignment version} would you need to evaluate the draft's length?", conflict=True)]),
    ("science", "cart-force", "grades 6-8",
     "A lab card defines net force as the vector sum of the forces acting on an object. Its cart diagram shows a pull to the right and friction to the left. The diagram gives no force magnitudes, cart mass, or measurements of the cart's motion.", [
         a("What concept should guide combining the cart's forces?", "A lab card defines net force as the vector sum of the forces acting on an object.", "How could you choose a {positive direction} before combining the forces?"),
         a("Which force directions are shown?", "Its cart diagram shows a pull to the right and friction to the left.", "How could you represent the {opposing forces} with labeled arrows?"),
         m("What is the cart's acceleration?", "What {force magnitudes and cart mass} would you need to calculate acceleration?")]),
    ("science", "closed-water", "grades 6-8",
     "A sealed jar contains water and air, with droplets forming on the cooler lid. The lab note defines condensation as water vapor changing into liquid water. The jar remains sealed throughout the observation, and no temperature or mass readings are recorded.", [
         a("What definition helps explain droplets forming from vapor?", "The lab note defines condensation as water vapor changing into liquid water.", "How could the {cooler lid} relate to the change of state?"),
         a("What feature defines the observed system boundary?", "The jar remains sealed throughout the observation, and no temperature or mass readings are recorded.", "How could a {sealed system boundary} guide a discussion of water moving within the jar?"),
         m("How many grams of water condensed on the lid?", "What {condensed-water measurement} would be needed to determine the amount?")]),
    ("science", "insulation-control", "grades 6-8",
     "Two cups begin with equal volumes of water at the same temperature. One cup receives a wool sleeve while the other stays uncovered, and both remain in the same room. The procedure specifies readings every minute, but no results table accompanies it.", [
         a("What starting conditions are held equal?", "Two cups begin with equal volumes of water at the same temperature.", "How could these {equal starting conditions} help isolate the sleeve's effect?"),
         a("What treatment differs between the cups?", "One cup receives a wool sleeve while the other stays uncovered, and both remain in the same room.", "How could you identify the {wool sleeve} as the variable changed by the procedure?"),
         m("How much warmer was the sleeved cup after ten minutes?", "What {ten-minute temperature readings} would you need to compare the cups?")]),
    ("science", "food-web", "grades 6-8",
     "A pond food-web key says arrows point from food to consumer. In the diagram, algae point to snails, and snails point to fish. The accompanying description lists feeding links only; it contains no population counts or measurements after environmental change.", [
         a("What convention should I use to read the arrows?", "A pond food-web key says arrows point from food to consumer.", "How could you follow the {food-to-consumer direction} through one pathway?"),
         a("What feeding links are documented?", "In the diagram, algae point to snails, and snails point to fish.", "How could you describe the {algae-snail-fish pathway} using the key?"),
         m("How many fish remained after algae declined?", "What {fish counts after an algae decline} would be needed to report an observed outcome?")]),
    ("science", "quadrat-boundary", "grades 8-10",
     "A field protocol counts a plant only when its rooted stem lies inside the square sampling frame. Leaves crossing the frame edge do not determine inclusion. The notes explain the counting rule but supply no sampled plots, plant counts, or habitat-area estimate.", [
         a("What criterion decides whether a plant belongs in the sample?", "A field protocol counts a plant only when its rooted stem lies inside the square sampling frame.", "How could you apply the {rooted-stem criterion} consistently near the frame edge?"),
         a("What feature does the rule exclude from the inclusion decision?", "Leaves crossing the frame edge do not determine inclusion.", "How could you avoid counting a plant twice based on {overhanging leaves}?"),
         m("What is the estimated plant population across the habitat?", "What {sample counts and habitat area} would you need to estimate the population?")]),
    ("science", "measurement-resolution", "grades 6-8",
     "A ruler has marks spaced one millimeter apart and begins at an intact zero line. The procedure directs observers to align the object's left edge with zero. The object itself is not shown, and the worksheet has no recorded position for its right edge.", [
         a("What information describes the ruler's marked resolution?", "A ruler has marks spaced one millimeter apart and begins at an intact zero line.", "How could you use the {millimeter spacing} when reporting a measured length?"),
         a("How should the object be positioned for measurement?", "The procedure directs observers to align the object's left edge with zero.", "How could you check the {zero alignment} before reading the other edge?"),
         m("What is the object's length?", "What {right-edge reading} would you need after aligning the left edge?")]),
    ("science", "series-circuit", "grades 6-8",
     "A circuit card defines a series circuit as a single continuous path for current. Its diagram places a battery, switch, and lamp along that one path. The card has no component ratings or observations showing whether the assembled switch is open or closed.", [
         a("What definition identifies the circuit arrangement?", "A circuit card defines a series circuit as a single continuous path for current.", "How could you trace the {single current path} through the diagram?"),
         a("Which components are included in the diagram?", "Its diagram places a battery, switch, and lamp along that one path.", "How could you label the {battery, switch, and lamp} when sketching the arrangement?"),
         m("Is the lamp currently glowing in the assembled circuit?", "What {switch-state and lamp observations} would you need to determine the current condition?")]),
    ("science", "dissolving-variable", "grades 6-8",
     "An experiment compares the time for equal masses of sugar to dissolve in equal volumes of water. Water temperature is the only intentionally changed condition, and stirring is kept at the same rate. The plan contains no recorded dissolving times.", [
         a("What is the measured outcome in this experiment?", "An experiment compares the time for equal masses of sugar to dissolve in equal volumes of water.", "How could you define a consistent {dissolving-time endpoint} before collecting results?"),
         a("Which variable is intentionally changed?", "Water temperature is the only intentionally changed condition, and stirring is kept at the same rate.", "How could you label {water temperature} and dissolving time in a results table?"),
         m("How many seconds faster did sugar dissolve in warmer water?", "What {paired dissolving times} would you need to calculate a difference?")]),
    ("science", "erosion-deposition", "grades 6-8",
     "A stream model carries loose sand down a sloped tray into a flat basin. The lesson card defines deposition as transported material settling out of motion. The model has not yet been run, so the notes include no map of where sand actually accumulates.", [
         a("What definition distinguishes deposition in this model?", "The lesson card defines deposition as transported material settling out of motion.", "What visible sign could help you identify {sand settling} during a run?"),
         a("What physical layout does the model use?", "A stream model carries loose sand down a sloped tray into a flat basin.", "How could you mark the {sloped tray and flat basin} on an observation diagram?"),
         m("Where did the thickest sand deposit form in the run?", "What {post-run deposit measurements} would be needed to identify the thickest area?")]),
    ("science", "repeatability", "grades 8-10",
     "A pendulum protocol measures the time for ten swings on each trial and then repeats the same setup five times. A note says repeated trials help reveal variation in measurements. No trial timings or clock specifications appear in the protocol.", [
         a("What is timed on each trial?", "A pendulum protocol measures the time for ten swings on each trial and then repeats the same setup five times.", "How could you keep the {ten-swing counting rule} consistent across trials?"),
         a("What stated purpose do repeated trials serve?", "A note says repeated trials help reveal variation in measurements.", "How could you compare {variation across trials} after collecting the timings?"),
         m("What was the average time for ten swings?", "What {five trial timings} would you need to calculate the average?")]),
    ("science", "single-seedling", "grades 6-8",
     "One seedling grew two centimeters during a week on a bright windowsill. The observer kept no shaded comparison plant and did not record watering or temperature. The notebook contains this one growth interval and no additional seedlings.", [
         a("What limits a claim that light alone caused the growth?", "The observer kept no shaded comparison plant and did not record watering or temperature.", "How could a {controlled light comparison} help investigate the cause of growth?"),
         m("How much more would this seedling grow in bright light than in shade?", "What {comparable shaded-growth observations} would be needed to estimate the difference?"),
         m("What temperature did the seedling experience?", "What {temperature record} would be needed to describe its growing conditions?")]),
    ("science", "unidentified-metal", "grades 6-8",
     "A sample is shiny and bends when pressed. The observation sheet records these properties but contains no mass, volume, composition test, or sample label. Several candidate materials remain possible, and no reference table accompanies the sheet.", [
         a("Which observations can I report without naming the material?", "A sample is shiny and bends when pressed.", "How could you separate the {observed properties} from a tentative material identification?"),
         m("What is the sample's density?", "What {mass and volume measurements} would you need to determine density?"),
         m("Is the sample pure aluminum?", "What {composition evidence} would be needed to establish material identity and purity?")]),
    ("science", "sound-distance", "grades 6-8",
     "A field note describes hearing a bell after seeing its striker move across a field. The note records neither the distance to the bell nor the delay between sight and sound. It gives no weather measurements or information about timing equipment.", [
         a("What observed sequence is actually documented?", "A field note describes hearing a bell after seeing its striker move across a field.", "How could you distinguish the {observed sequence} from a measured travel time?"),
         m("What speed of sound does this observation yield?", "What {distance and delay measurements} would you need to estimate the speed?"),
         m("Was the recorded delay exactly half a second?", "What {timed delay record} would be needed to check that value?")]),
    ("science", "lake-single-sample", "grades 8-10",
     "A lake-water sample was collected at the north dock at noon on one day. The field plan labels it a single-location sample and lists no other sampling sites or times. No chemical analysis results or whole-lake survey accompany the collection note.", [
         a("What spatial and temporal scope is documented for collection?", "A lake-water sample was collected at the north dock at noon on one day.", "How could the {single place and time} limit claims about the entire lake?"),
         m("What was the sample's dissolved oxygen concentration?", "What {oxygen analysis result} would be needed to report the concentration?"),
         m("Was oxygen concentration uniform throughout the lake that day?", "What {measurements from multiple lake sites} would you need to assess uniformity?")]),
    ("science", "spring-extension", "grades 6-8",
     "An apparatus sketch shows a spring hanging beside a vertical ruler, with a hook for adding masses. The procedure calls for measuring extension from the spring's unloaded position. No unloaded length, loaded length, or attached mass is written down.", [
         a("What reference point defines extension in this procedure?", "The procedure calls for measuring extension from the spring's unloaded position.", "How could you mark the {unloaded position} before adding a mass?"),
         m("What extension occurred when the mass was added?", "What {unloaded and loaded readings} would you need to calculate extension?"),
         m("What force was applied by the hanging mass?", "What {attached mass measurement} and gravitational field value would you need?")]),
    ("science", "habitat-return", "grades 8-10",
     "A restoration plan proposes replacing a paved patch with native shrubs and monitoring visiting insects. The document is a plan written before any planting occurred. It lists no baseline insect counts, planting completion date, or follow-up observations.", [
         a("What prevents treating this document as evidence of a restoration outcome?", "The document is a plan written before any planting occurred.", "How could you distinguish the {proposed intervention} from an observed result?"),
         m("Did insect visits increase after the restoration?", "What {before-and-after insect counts} would be needed to evaluate a change?"),
         m("How many shrubs survived the first winter?", "What {planting inventory and survival survey} would be needed to determine winter survival?")]),
    ("science", "conflict-thermometers", "grades 6-8",
     "Two thermometers placed together in the same stirred bath read 21 C and 26 C at the recorded time. Both readings are copied clearly into the log. No calibration check, reference thermometer, or explanation for the difference is supplied.", [
         a("What measurement conflict can be reported directly?", "Two thermometers placed together in the same stirred bath read 21 C and 26 C at the recorded time.", "How could you record the {thermometer disagreement} without selecting a preferred reading?"),
         m("What was the bath's verified temperature?", "What {calibrated reference measurement} could help establish the bath temperature?", conflict=True),
         m("Which thermometer had an offset error?", "What {calibration results for both instruments} would be needed to identify an offset?", conflict=True)]),
    ("science", "conflict-nest-count", "grades 8-10",
     "Two observers' sheets for the same marked nesting area and time report 14 occupied nests and 19 occupied nests. Both sheets use the same written occupancy definition. No photographs, nest-by-nest records, or repeat count are available.", [
         a("What discrepancy appears in the field records?", "Two observers' sheets for the same marked nesting area and time report 14 occupied nests and 19 occupied nests.", "How could you flag the {occupied-nest count discrepancy} in a summary table?"),
         m("How many nests were actually occupied at that time?", "What {time-matched verification evidence} could help establish the occupied count?", conflict=True),
         m("Which observer counted empty nests as occupied?", "What {nest-level observation evidence} would be needed to investigate each observer's classifications?", conflict=True)]),
    ("science", "conflict-cooling-log", "grades 8-10",
     "Two logs for one cooling trial disagree about the ten-minute reading: one records 38 C and the other records 48 C. Both name the same cup and sensor. The raw sensor file is absent, and neither log identifies itself as corrected.", [
         a("What value is disputed between these records?", "Two logs for one cooling trial disagree about the ten-minute reading: one records 38 C and the other records 48 C.", "How could you mark the {ten-minute reading} as unresolved in a graph?"),
         m("What was the cup's actual temperature at ten minutes?", "What {raw sensor evidence} could verify the ten-minute temperature?", conflict=True),
         m("Had the cup cooled below 40 C by the ten-minute observation?", "What {verified ten-minute measurement} would you need to assess that threshold?", conflict=True)]),
    ("science", "conflict-germination", "grades 6-8",
     "Two final summaries of the same seed tray disagree: one lists 12 germinated seeds and the other lists 17. They use the same germination criterion and final observation date. The tray has been dismantled, and no photographs or original tally sheets are included.", [
         a("What result is inconsistent across the summaries?", "Two final summaries of the same seed tray disagree: one lists 12 germinated seeds and the other lists 17.", "How could you document the {conflicting germination counts} before discussing the experiment?"),
         m("What was the verified final germination count?", "What {original observation evidence} could help verify the final count?", conflict=True),
         m("Did more than fifteen seeds germinate by the final date?", "What {verified tray tally} would be needed to evaluate the threshold claim?", conflict=True)]),
    ("history", "council-petition", "grades 6-8",
     "An invented archive packet contains a petition dated 1842 asking the town council to repair a market bridge. Twelve merchants signed the petition. The packet contains the request only, with no council decision, repair contract, or record of completed work.", [
         a("What purpose is documented for the petition?", "An invented archive packet contains a petition dated 1842 asking the town council to repair a market bridge.", "How could the {repair request} guide your interpretation of the petition's purpose?"),
         a("Whose participation is directly documented?", "Twelve merchants signed the petition.", "How could you distinguish the {merchant signatories} from the town's broader population?"),
         m("Did the council repair the bridge after receiving the petition?", "What {council decision or work record} would be needed to establish a repair outcome?")]),
    ("history", "chronology-ledger", "grades 6-8",
     "A fictional harbor ledger records a warehouse opening in 1810 and a new pier opening in 1814. Both entries were written during the year of the event they describe. The surviving pages contain no account of why either construction project began.", [
         a("What dated evidence supports ordering the two openings?", "A fictional harbor ledger records a warehouse opening in 1810 and a new pier opening in 1814.", "How could you place the {warehouse and pier openings} on a timeline?"),
         a("What makes these entries contemporary to their reported events?", "Both entries were written during the year of the event they describe.", "How could the {timing of the entries} affect your evaluation of the source?"),
         m("Was the pier built because the warehouse increased trade?", "What {planning or trade evidence} would be needed to investigate that causal claim?")]),
    ("history", "artifact-context", "grades 6-8",
     "A museum exercise describes a clay lamp recovered from a sealed household layer beneath a later stone floor. The catalog records soot inside the lamp's nozzle. No inscription names its maker or owner, and the exercise gives no laboratory date.", [
         a("What find context is documented for the lamp?", "A museum exercise describes a clay lamp recovered from a sealed household layer beneath a later stone floor.", "How could the {layer beneath the floor} help establish a relative sequence?"),
         a("What physical trace could support an interpretation of use?", "The catalog records soot inside the lamp's nozzle.", "How could you connect the {soot trace} to a cautious claim about the lamp's use?"),
         m("Who owned this lamp?", "What {ownership inscription or associated record} could help identify an owner?")]),
    ("history", "travel-diary", "grades 8-10",
     "A fictional travel diary describes one visitor's two-day stay in a mountain town in 1871. The visitor writes mostly about the inn and the central market. No residents' accounts appear in the packet, and the diary gives no information about other seasons.", [
         a("What limits the time and viewpoint covered by the diary?", "A fictional travel diary describes one visitor's two-day stay in a mountain town in 1871.", "How could the {brief visitor perspective} limit a general description of town life?"),
         a("Which places dominate the visitor's observations?", "The visitor writes mostly about the inn and the central market.", "How could the {inn and market focus} influence which activities the diary records?"),
         m("Did residents share the visitor's opinion of winter life there?", "What {visitor and resident winter accounts}, if available, would you need before comparing their views?")]),
    ("history", "poster-purpose", "grades 8-10",
     "A fictional railway poster advertises cheap holiday fares and urges readers to buy tickets before Friday. Its small print identifies the railway company as the publisher. The archive exercise includes no passenger totals, sales records, or traveler reviews.", [
         a("What wording supports identifying the poster's persuasive purpose?", "A fictional railway poster advertises cheap holiday fares and urges readers to buy tickets before Friday.", "How could the {ticket-purchase appeal} shape the poster's presentation of the journey?"),
         a("Who produced this source?", "Its small print identifies the railway company as the publisher.", "How could the {company's role as publisher} matter when evaluating the advertised benefits?"),
         m("How many travelers bought tickets because of this poster?", "What {sales and attribution evidence} would be needed to estimate the poster's effect?")]),
    ("history", "oral-history-time", "grades 8-10",
     "An invented oral-history transcript was recorded in 1980 and describes the speaker's childhood work in 1930. The interviewer asked mainly about daily tasks rather than wages. The packet includes no payroll records or interviews with the speaker's coworkers.", [
         a("What dates distinguish recollection from the events recalled?", "An invented oral-history transcript was recorded in 1980 and describes the speaker's childhood work in 1930.", "How could the {interval before recording} inform your assessment of remembered detail?"),
         a("What interview focus shapes the transcript's coverage?", "The interviewer asked mainly about daily tasks rather than wages.", "How could the {interviewer's questions} explain gaps in the transcript?"),
         m("What exact weekly wage did the speaker earn?", "What {wage record or explicit recollection} would be needed to establish the amount?")]),
    ("history", "map-boundary", "grades 6-8",
     "A fictional estate map marks cultivated fields with green shading and woodland with dotted shading. Its legend says dashed lines show proposed roads. The map has a date but no scale bar, and the packet includes no later survey showing which roads were built.", [
         a("How can I distinguish the mapped land uses?", "A fictional estate map marks cultivated fields with green shading and woodland with dotted shading.", "How could you use the {land-use shading} to compare the mapped areas?"),
         a("What does a dashed road line establish?", "Its legend says dashed lines show proposed roads.", "How could you keep {proposed roads} distinct from evidence of completed roads?"),
         m("Which proposed roads were actually completed?", "What {later survey or construction record} would be needed to determine completion?")]),
    ("history", "coin-evidence", "grades 6-8",
     "An artifact exercise describes a coin bearing a ruler's name on one face and a ship on the other. The coin was found in a mixed soil layer disturbed by later gardening. The description gives no mint date or chain of ownership before discovery.", [
         a("What visible features can be recorded from the description?", "An artifact exercise describes a coin bearing a ruler's name on one face and a ship on the other.", "How could the {name and ship image} guide questions for further artifact research?"),
         a("What limits dating nearby objects by association with this coin?", "The coin was found in a mixed soil layer disturbed by later gardening.", "How could the {disturbed soil context} weaken claims about objects sharing an original deposit?"),
         m("In what exact year was the coin minted?", "What {minting evidence} would be needed to establish an exact year?")]),
    ("history", "law-and-practice", "grades 8-10",
     "A fictional town ordinance from 1902 requires market stalls to close at sunset. The surviving copy records the rule but includes no enforcement reports or merchant testimony. Its final clause assigns inspections to the market clerk.", [
         a("What formal requirement does the ordinance establish?", "A fictional town ordinance from 1902 requires market stalls to close at sunset.", "How could you distinguish the {closing-time rule} from evidence of everyday compliance?"),
         a("Which official is assigned an enforcement role?", "Its final clause assigns inspections to the market clerk.", "How could the {market clerk's role} guide a search for relevant administrative records?"),
         m("Did all merchants obey the sunset closing rule?", "What {inspection reports or merchant accounts} would be needed to investigate actual compliance?")]),
    ("history", "shipping-manifest", "grades 6-8",
     "A fictional ship manifest lists wool, pottery, and dried fruit as cargo leaving a coastal port in 1763. The document was prepared for a harbor fee assessment. It does not describe the goods' buyers, selling prices, or arrival condition at the destination.", [
         a("What cargo categories are documented?", "A fictional ship manifest lists wool, pottery, and dried fruit as cargo leaving a coastal port in 1763.", "How could you organize the {listed cargo categories} when describing the trade evidence?"),
         a("What administrative purpose shaped the manifest?", "The document was prepared for a harbor fee assessment.", "How could the {fee-assessment purpose} affect which details the document records?"),
         m("Were the goods sold at a profit after arrival?", "What {purchase costs and destination sales records} would be needed to assess profit?")]),
    ("history", "undated-photograph", "grades 6-8",
     "An archive exercise presents an undated photograph of a crowd beside a stone fountain. The image has no caption, location mark, or photographer credit. Clothing and signs can be seen, but the signs are too blurred to read in the supplied reproduction.", [
         a("What documentation limits identification of this photograph?", "The image has no caption, location mark, or photographer credit.", "How could you list the {missing provenance details} before proposing an identification?"),
         m("Which town is shown in the photograph?", "What {identifiable landmark or archive record} could help establish the location?"),
         m("What event brought the crowd together?", "What {event-identifying caption or contemporary account} would be needed to explain the gathering?")]),
    ("history", "fragment-treaty", "grades 8-10",
     "A fictional treaty fragment preserves a clause allowing merchants to cross a river toll-free. The surviving piece omits the title, signatures, date, and surrounding clauses. Nothing in the packet establishes whether the agreement was ratified or enforced.", [
         a("What provision survives in the fragment?", "A fictional treaty fragment preserves a clause allowing merchants to cross a river toll-free.", "How could you state the {surviving toll provision} while acknowledging the fragment's limits?"),
         m("Which governments signed this agreement?", "What {signature or treaty-identification evidence} would be needed to name the parties?"),
         m("Did merchants actually receive the promised toll exemption?", "What {implementation records} would be needed to establish the provision's practical effect?")]),
    ("history", "unlocated-tool", "grades 6-8",
     "A catalog exercise describes an iron blade donated without a find location or excavation record. The donor called it a farming tool, but supplied no evidence for that identification. No laboratory analysis, associated objects, or dated images appear in the entry.", [
         a("What provenance problem limits interpretation of the blade?", "A catalog exercise describes an iron blade donated without a find location or excavation record.", "How could the {missing find context} limit conclusions about the blade's date and use?"),
         m("Was the blade used for farming rather than another activity?", "What {wear evidence or contextual comparison} would be needed to evaluate its use?"),
         m("Which century does the blade come from?", "What {reliable dating evidence} would be needed to assign a century?")]),
    ("history", "population-boundary", "grades 8-10",
     "A fictional census summary counts 640 residents inside a town wall in 1850. It explicitly excludes the settlements outside the wall. The packet contains no earlier census, no later census, and no count for the excluded settlements.", [
         a("What population boundary limits this census figure?", "It explicitly excludes the settlements outside the wall.", "How could you label the {inside-wall population} so readers understand the figure's scope?"),
         m("What was the total population including the outer settlements?", "What {outer-settlement count} would be needed to establish the wider total?"),
         m("Did the town's population grow between 1840 and 1850?", "What {comparable 1840 census} would you need to assess growth?")]),
    ("history", "building-reuse", "grades 8-10",
     "A site description records a doorway blocked with bricks different from the surrounding stone wall. The report interprets this as evidence that the opening was changed after the wall was built. It provides no date, named builder, or written explanation for the alteration.", [
         a("What relative sequence does the report support?", "The report interprets this as evidence that the opening was changed after the wall was built.", "How could you represent the {wall-before-blocking sequence} without assigning exact dates?"),
         m("In what year was the doorway blocked?", "What {dated evidence for the alteration} would be needed to assign a year?"),
         m("Was the doorway blocked to defend against an attack?", "What {evidence of the alteration's purpose} would be needed to evaluate that explanation?")]),
    ("history", "copied-chronicle", "grades 8-10",
     "A fictional chronicle survives only in a copy made two centuries after the events it describes. The copyist states that the original manuscript was damaged. The packet includes neither the damaged original nor another copy for comparison.", [
         a("What transmission issue should be considered when evaluating the text?", "The copyist states that the original manuscript was damaged.", "How could the {damaged original} affect confidence in the surviving wording?"),
         m("Which specific words did the copyist omit?", "What {independent textual witness} would be needed to identify possible omissions?"),
         m("Does the surviving copy reproduce every event date accurately?", "What {corroborating dated sources} would be needed to assess the copied dates?")]),
    ("history", "conflict-inauguration", "grades 8-10",
     "Two fictional civic records date the opening of the same town hall differently: the register gives 1886, while a commemorative plaque gives 1888. Neither distinguishes a ceremony from a public opening. No construction file or contemporary news account is supplied.", [
         a("What date conflict is documented?", "Two fictional civic records date the opening of the same town hall differently: the register gives 1886, while a commemorative plaque gives 1888.", "How could you record the {two reported opening years} without silently choosing one?"),
         m("In which year did the town hall actually open?", "What {contemporary opening evidence} could help resolve the reported dates?", conflict=True),
         m("Was the plaque's date simply a carving mistake?", "What {plaque-production and event records} would be needed to investigate the discrepancy?", conflict=True)]),
    ("history", "conflict-cargo", "grades 8-10",
     "Two fictional harbor copies of one ship's departure manifest disagree: one lists 30 grain sacks, while the other lists 50. Both name the same ship, date, and destination. The original manifest and any loading receipts are missing from the exercise packet.", [
         a("What cargo discrepancy should a source comparison identify?", "Two fictional harbor copies of one ship's departure manifest disagree: one lists 30 grain sacks, while the other lists 50.", "How could you compare the {grain-sack totals} while preserving each source's claim?"),
         m("How many grain sacks actually left on the ship?", "What {independent loading evidence} could help establish the cargo count?", conflict=True),
         m("Did a clerk intentionally inflate the cargo total?", "What {record-production evidence and evidence of intent} would be needed to evaluate deliberate alteration?", conflict=True)]),
    ("history", "conflict-road-direction", "grades 6-8",
     "Two maps in a fictional archive show the same 1820 boundary road on opposite sides of a mill: one to the east and one to the west. Both maps have north arrows and identical labels. No survey notes, field markers, or explanation for the disagreement survive in the packet.", [
         a("What spatial disagreement can be stated from the maps?", "Two maps in a fictional archive show the same 1820 boundary road on opposite sides of a mill: one to the east and one to the west.", "How could you mark the {east-versus-west disagreement} on a comparison sketch?"),
         m("Which side of the mill did the boundary road actually follow?", "What {survey or physical-route evidence} could help establish its location?", conflict=True),
         m("Was one map copied with east and west reversed?", "What {map-making or copying evidence} would be needed to investigate a directional reversal?", conflict=True)]),
    ("history", "conflict-vote", "grades 8-10",
     "Two fictional minutes for the same council session report opposite outcomes: one says a canal proposal passed, while the other says it was rejected. Both are signed copies with the same session date. The packet has no vote tally or later implementation record.", [
         a("What disagreement concerns the recorded decision?", "Two fictional minutes for the same council session report opposite outcomes: one says a canal proposal passed, while the other says it was rejected.", "How could you summarize the {opposite recorded outcomes} as an unresolved source problem?"),
         m("Did the council approve the canal proposal?", "What {verified vote record} could establish the decision?", conflict=True),
         m("Why do the signed minutes record opposite outcomes?", "What {minute-production or correction records} could help explain the disagreement?", conflict=True)]),
]


def rows() -> list[dict]:
    """Return newly constructed training rows without reading any other dataset."""
    result = []
    for subject, slug, level, source, tasks in CONTEXTS:
        family = f"train-r2b-{subject.lower()}-{slug}"
        for number, (question, evidence, marked_next, answerability) in enumerate(tasks, 1):
            anchors = re.findall(r"\{([^{}]+)\}", marked_next)
            followup = re.sub(r"\{([^{}]+)\}", r"\1", marked_next)
            abstains = answerability != "answerable"
            result.append({
                "id": f"{family}-{number}",
                "family": family,
                "contextId": family,
                "subject": subject,
                "level": level,
                "source": source,
                "question": question,
                "target": f"EVIDENCE: {evidence}\nNEXT: {followup}",
                "expectedAbstention": abstains,
                "acceptedQuotes": [] if abstains else [evidence],
                "nextStepAnchors": anchors,
                "answerability": answerability,
            })
    return result

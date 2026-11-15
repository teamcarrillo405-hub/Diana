"""Original synthetic grounding practice, revision A.

Written for this continuation, without consulting other datasets or model results.
Grade bands are author estimates, not validated curriculum classifications.
Each context has three independently authored task/question pairs. Evidence indices
select complete source sentences; -1 denotes missing data and -2 unresolved conflict.
"""

CONTEXTS = []


def C(subject, slug, facts, tasks):
    CONTEXTS.append({"subject": subject, "slug": slug, "facts": facts, "tasks": tasks})


# Mathematics: estimation, representation, measurement, and reasoning.
C("math", "ramp-measurement", [
    "The builder's sheet gives the ramp a length of 240 centimeters, while the survey sheet gives it a length of 260 centimeters.",
    "Both sheets label their measurement as the full sloping surface of the same ramp.",
    "Neither sheet records a measurement date or explains the difference."
], [
    ("What is the disagreement about the ramp?", 0, "How could the shared description of the sloping surface help you compare the two measurements?"),
    ("Why can the dates not settle which ramp measurement is newer?", 2, "What date information would be needed to compare the builder's sheet with the survey sheet?"),
    ("Which ramp length should I use as the verified length?", -2, "What new measurement or documented correction could establish the ramp's length?")
])
C("math", "bus-tally", [
    "One tally lists 18 buses entering the depot before noon; a second tally lists 21 buses for that same interval.",
    "Each tally counts entries, so a bus returning twice would contribute two entries.",
    "No arrival log or correction accompanies the two totals."
], [
    ("What does an entry mean in these tallies?", 1, "How could repeated visits affect the difference between entries and distinct buses?"),
    ("How many entries actually occurred before noon?", -2, "What time-stamped arrival evidence would help check the competing totals of 18 and 21?"),
    ("How many distinct buses visited?", -1, "What bus identifiers would you need alongside the entry times to count distinct buses?")
])
C("math", "tile-area", [
    "The installation drawing labels the floor area as 36 square meters, but the purchasing form labels the same floor as 40 square meters.",
    "The form separates spare tiles from floor coverage, so its area field is not labeled as an allowance for waste.",
    "No dimensions or approved revision identify which area is accurate."
], [
    ("Which statement shows the conflicting areas?", 0, "How could you record both area claims while keeping their document sources clear?"),
    ("Does the purchasing form explicitly include spare tiles in its area field?", 1, "How could separating spare tiles from coverage guide your comparison of the two area fields?"),
    ("What is the true area of this floor?", -2, "What floor dimensions or approved correction would allow you to check the 36 and 40 square meter claims?")
])
C("math", "spinner-trials", [
    "A notebook says the spinner landed on blue in 12 of 30 trials; a summary card says blue occurred in 15 of the same 30 trials.",
    "The trial-by-trial marks were not attached to either record.",
    "The spinner diagram shows four sectors, but gives no sector angles."
], [
    ("What prevents checking the recorded blue counts?", 1, "What trial-by-trial information would let you compare the notebook with the summary card?"),
    ("What experimental fraction for blue is verified?", -2, "What record of the 30 outcomes would help establish the blue count before forming a fraction?"),
    ("What is the theoretical probability of blue?", -1, "What sector angles and blue-sector labels would you need from the spinner diagram?")
])
C("math", "garden-scale", [
    "On the garden plan, one centimeter represents two meters along the ground.",
    "A rectangular bed is drawn with sides of three centimeters and five centimeters.",
    "The plan includes a north arrow but supplies no planting density or seed-packet information."
], [
    ("What scale conversion should I use?", 0, "How could you apply the two meters per centimeter scale to each drawn side?"),
    ("Which drawn dimensions describe the bed?", 1, "How could you label the three-centimeter and five-centimeter sides before converting them?"),
    ("How many seeds will fill the bed?", -1, "What planting density for the chosen seeds would you need after finding the bed's ground area?")
])
C("math", "museum-median", [
    "The museum recorded daily visitor counts of 22, 31, 24, 40, and 28 over five open days.",
    "Its worksheet defines the median as the middle value after the values are ordered.",
    "The record contains neither ticket prices nor revenue figures for those days."
], [
    ("What definition helps me find the median?", 1, "How would you order the five museum visitor counts to locate the middle value?"),
    ("What was the museum's revenue on the busiest day?", -1, "What ticket and revenue information would you need for the day with 40 visitors?"),
    ("Did attendance grow compared with the prior week?", -1, "What comparable visitor counts from the prior week would let you assess attendance change?")
])
C("math", "recipe-ratio", [
    "A paint recipe combines two cups of white paint with three cups of blue paint.",
    "The instructions say to preserve this ratio when changing the total batch size.",
    "The label names the two colors but provides no drying time, price, or coverage estimate."
], [
    ("What is the original white-to-blue ratio?", 0, "How could you represent the two cups of white and three cups of blue as equal-size parts?"),
    ("What stays fixed when I make a larger batch?", 1, "How could multiplying both paint quantities by the same factor preserve the recipe?"),
    ("How much wall area can one batch cover?", -1, "What coverage rate for this mixed paint would you need to connect batch volume to wall area?")
])
C("math", "elevator-graph", [
    "The elevator graph places elapsed seconds on the horizontal axis and height above the lobby on the vertical axis.",
    "A horizontal segment runs from second 8 to second 12 at a height of six meters.",
    "The graph contains no labels for passengers, destinations, or door movements."
], [
    ("What does the horizontal axis represent?", 0, "How could the elapsed-seconds axis help you describe the interval from 8 to 12 seconds?"),
    ("How many passengers entered during the flat segment?", -1, "What passenger count record for seconds 8 through 12 would be needed to answer that?"),
    ("Which floor button was pressed first?", -1, "What button-event record would connect a requested destination to the elevator's motion?")
])
C("math", "coupon-order", [
    "The shop applies its ten-percent coupon to the item price before adding the fixed delivery charge.",
    "The order lists an item price of 70 dollars and a delivery charge of six dollars.",
    "No sales-tax rate or statement about tax exemption appears on the order."
], [
    ("Which part of the order receives the percentage discount?", 0, "How could you mark the item price as the coupon base before considering delivery?"),
    ("Which amounts are given for the item and delivery?", 1, "How could you keep the 70-dollar item price separate from the six-dollar delivery charge in your setup?"),
    ("What is the final total including sales tax?", -1, "What tax rate and taxable-charge rule would you need for this discounted item and delivery charge?")
])
C("math", "negative-temperature", [
    "The thermometer log gives a morning reading of minus four degrees Celsius and an afternoon reading of three degrees Celsius.",
    "The worksheet asks for a signed change from morning to afternoon.",
    "It does not record any readings during the night."
], [
    ("Which readings define the requested temperature change?", 0, "How could you place minus four and three on a number line to represent the change?"),
    ("What was the lowest temperature overnight?", -1, "What overnight thermometer readings would be needed to identify the lowest recorded temperature?"),
    ("At what time did the temperature cross zero?", -1, "What timed readings between morning and afternoon could locate when the temperature crossed zero?")
])
C("math", "triangle-test", [
    "The workshop rule says that the sum of any two side lengths must exceed the third length for a triangle to form.",
    "A student is testing rigid strips measuring four, seven, and twelve centimeters.",
    "The strips have no angle markings, and no assembled shape is pictured."
], [
    ("Which rule should I use to test the strips?", 0, "How could you compare the sum of the two shorter strips with the longest strip?"),
    ("What lengths am I testing?", 1, "How could you organize the four-, seven-, and twelve-centimeter lengths before checking the triangle rule?"),
    ("What angle did the student measure between the strips?", -1, "What recorded angle measurement or assembly observation would be needed for the student's strips?")
])
C("math", "data-sampling", [
    "To estimate cafeteria preferences, the club surveyed only students waiting in the vegetarian lunch line.",
    "The form offered three meal choices and allowed each respondent to select one.",
    "No responses from the other lunch lines or the full student population were collected."
], [
    ("What feature of the sample could limit a school-wide conclusion?", 0, "How could surveying the vegetarian lunch line influence which meal preferences are represented?"),
    ("Which meal does the whole school prefer?", -1, "What broader sampling evidence would you need beyond the vegetarian lunch line?"),
    ("What percentage of surveyed students chose soup?", -1, "What response totals for soup and all respondents would you need from the cafeteria survey?")
])
C("math", "fraction-bench", [
    "A bench board is marked into eight equal sections, and five sections are painted green.",
    "The worksheet defines the denominator as the number of equal sections in the whole board.",
    "The board's physical length and the amount of paint used are not recorded."
], [
    ("What defines the denominator for this board?", 1, "How could you use the eight equal sections to label the denominator?"),
    ("What fact tells me the painted portion?", 0, "How could you show the five green sections relative to all eight sections in a fraction model?"),
    ("How many centimeters of board are green?", -1, "What total board length would you need to convert the green fraction into centimeters?")
])
C("math", "rounding-weight", [
    "The shipping form instructs the clerk to round each parcel's mass up to the next whole kilogram for billing.",
    "A scale reading on the example parcel is 2.3 kilograms.",
    "The form includes spaces for an address and tracking code, but no price-per-kilogram schedule."
], [
    ("Which rounding direction does the form require?", 0, "How could you locate 2.3 kilograms between whole kilograms and apply the form's upward rule?"),
    ("How much does shipping this parcel cost?", -1, "What billing rate or price schedule would you need after rounding the parcel's mass?"),
    ("When will the parcel arrive?", -1, "What service and delivery estimate would you need for the parcel in addition to its mass?")
])
C("math", "pattern-machine", [
    "The machine card says to multiply an input by three and then subtract two.",
    "The practice table contains inputs of one, four, and six, with all output cells left blank.",
    "A separate challenge mentions another machine, but gives no rule or input-output pairs for it."
], [
    ("What operation order does the first machine use?", 0, "How could you write the multiply-then-subtract steps for the input four?"),
    ("Which inputs are available for practice?", 1, "How could you organize one, four, and six in a table that keeps each input beside its working?"),
    ("What is the other machine's rule?", -1, "What rule statement or input-output evidence would be needed for the separate challenge machine?")
])
C("math", "circle-string", [
    "The activity defines a circle's radius as the distance from its center to any point on its edge.",
    "Students are given a circular lid and a string, and are asked to explain which distance their diagram represents.",
    "The instructions include no measured distances for the lid."
], [
    ("Which definition should guide my radius diagram?", 0, "How could you mark the center and an edge point on the lid to show a radius?"),
    ("What is the lid's radius in centimeters?", -1, "What center-to-edge measurement would you need from the circular lid?"),
    ("How long a string was used around the lid?", -1, "What activity record could show whether the string was wrapped around the lid and, if so, what length was recorded?")
])
C("math", "train-unit-rate", [
    "The route card states that a train traveled 90 kilometers during a recorded interval of one and a half hours.",
    "The task asks for average distance traveled per hour across that entire interval.",
    "The card does not separate moving time from stops or provide moment-by-moment speeds."
], [
    ("Which distance and duration belong in my rate setup?", 0, "How could you align 90 kilometers with one and a half hours before finding a per-hour rate?"),
    ("Should my average describe the whole recorded interval?", 1, "How could the phrase entire interval guide which duration you use?"),
    ("What was the train's maximum speed?", -1, "What detailed speed measurements would you need beyond the route's total distance and duration?")
])
C("math", "net-folding", [
    "The folding card defines a net as a flat arrangement of faces that can fold into a three-dimensional solid.",
    "It asks students to mark matching edges before folding a supplied paper pattern.",
    "The text does not reproduce the pattern or list its face shapes."
], [
    ("What does net mean in this task?", 0, "How could marking matching edges help you test whether the supplied pattern forms a solid?"),
    ("How many square faces does this pattern have?", -1, "What view or face list of the supplied paper pattern would let you count square faces?"),
    ("Which solid does the supplied pattern make?", -1, "What face arrangement and edge connections would you need from the paper pattern to identify the solid?")
])
C("math", "coordinate-treasure", [
    "The map convention says to move along the horizontal axis first and then along the vertical axis when locating an ordered pair.",
    "The treasure marker is labeled with the ordered pair three, negative two.",
    "The map text provides no distances in meters and identifies no starting position for a traveler."
], [
    ("Which coordinate should I use first?", 0, "How could you trace the horizontal move before the vertical move for the treasure marker?"),
    ("What ordered pair identifies the treasure?", 1, "How could you interpret negative two as a direction on the vertical axis?"),
    ("How many meters must the traveler walk to the treasure?", -1, "What starting position and map distance scale would you need to plan a walk to the treasure?")
])
C("math", "boxplot-reading", [
    "The chart note defines the interquartile range as the third quartile minus the first quartile.",
    "The class is asked to compare the spread of two groups using their boxplots.",
    "The accompanying text contains the definition but omits both plots and all numerical quartile values."
], [
    ("Which definition helps compare the middle spread?", 0, "How could you use the first and third quartiles to compare each group's middle spread?"),
    ("Which group has the larger interquartile range?", -1, "What first and third quartile values would you need for both groups?"),
    ("What is the first group's median?", -1, "What median label or boxplot position would you need for the first group?")
])


# Reading: source reliability, sequence, characterization, and practical texts.
C("reading", "station-witnesses", [
    "The station attendant recalled that the suitcase was red, while the passenger described the same suitcase as gray.",
    "Both accounts place the suitcase beside the ticket window just before closing.",
    "The folder contains no photograph or later statement reconciling the color descriptions."
], [
    ("What detail differs between the accounts?", 0, "How could you organize the red and gray descriptions under the witnesses who supplied them?"),
    ("Where do the two accounts agree the suitcase was?", 1, "How could the shared ticket-window location help you distinguish agreement from disagreement?"),
    ("What color was the suitcase actually?", -2, "What independent evidence could help check the suitcase's color when the witnesses disagree?")
])
C("reading", "trail-signs", [
    "A printed trail leaflet says the ridge path is open, while a notice dated the same day says that the ridge path is closed.",
    "Neither item lists an hour of publication, and no ranger update is included.",
    "Both direct visitors to the main trailhead for posted safety information."
], [
    ("What shared direction do both items give visitors?", 2, "How could checking the main trailhead information help you investigate the two ridge-path notices?"),
    ("Was the ridge path open that day?", -2, "What authoritative update with a time would clarify the ridge path's status that day?"),
    ("Which notice was published later?", -1, "What publication-time evidence would establish the order of the two same-day notices?")
])
C("reading", "rehearsal-accounts", [
    "Mira's diary says the rehearsal began with a song, while the stage manager's notes say that the same rehearsal began with a lighting check.",
    "Both accounts describe a power interruption before the performers went home.",
    "The archive provides no recording or explanation for the different opening sequences."
], [
    ("Which opening detail conflicts across the accounts?", 0, "How could you compare the diary's song opening with the stage manager's lighting-check opening?"),
    ("What event appears in both accounts?", 1, "How could the shared power interruption serve as a point of agreement in your comparison?"),
    ("What activity definitely began the rehearsal?", -2, "What evidence of the rehearsal's first activity could help resolve the song and lighting-check accounts?")
])
C("reading", "ferry-memory", [
    "A travel letter says the ferry departed at dawn, but a harbor diary places that same departure after sunset.",
    "Both documents identify the vessel as the Willow and name the eastern dock.",
    "The collection supplies no dated sailing register and does not identify any passenger's age."
], [
    ("What identifying details do the documents share?", 1, "How could the Willow name and eastern dock help you check whether the accounts concern the same trip?"),
    ("When did the Willow actually depart?", -2, "What dated sailing evidence could help distinguish the dawn claim from the after-sunset claim?"),
    ("How old was the letter writer?", -1, "What biographical evidence would establish the travel letter writer's age at the time?")
])
C("reading", "orchard-decision", [
    "When the wind rose, Lena tied the young orchard trees to their supports before returning to the house.",
    "She left her unfinished sketch on the porch and asked her brother to bring it inside.",
    "The scene ends as the first drops of rain reach the steps, without showing the next morning."
], [
    ("What action shows Lena responding to the wind?", 0, "How could tying the young trees to supports reveal what Lena prioritizes as the weather changes?"),
    ("What does Lena ask her brother to do?", 1, "How could her request about the unfinished sketch help you explain the order of her actions?"),
    ("Did all the trees survive the storm?", -1, "What later observation of the orchard would you need to determine whether the trees survived?")
])
C("reading", "market-flyer", [
    "The market flyer invites neighbors to bring usable household items to a free exchange on Saturday morning.",
    "It asks donors to place damaged electrical items in a separate collection area for inspection.",
    "The flyer gives instructions for the event but includes no attendance report or inspection results."
], [
    ("Which sentence states the flyer's main invitation?", 0, "How could the invitation to a free exchange guide your description of the flyer's purpose?"),
    ("How many neighbors attended the exchange?", -1, "What attendance record from the Saturday exchange would you need?"),
    ("Were any donated electrical items unsafe?", -1, "What inspection findings would be needed to assess the electrical items collected separately?")
])
C("reading", "quiet-library", [
    "Arun reached for the squeaking chair, paused, and chose a stool beside the library window instead.",
    "Across the room, a child was asleep with an open picture book resting on her lap.",
    "The narrator reports what Arun does but does not state his thoughts or describe any earlier visit."
], [
    ("What action could support an inference that Arun is being considerate?", 0, "How could the sleeping child make Arun's choice of the stool meaningful?"),
    ("What nearby detail is relevant to interpreting Arun's choice?", 1, "How could you connect the sleeping child to the squeaking chair while labeling your interpretation as an inference?"),
    ("What had Arun done on his previous library visit?", -1, "What earlier-visit account would be needed to compare Arun's behavior across visits?")
])
C("reading", "seed-envelope", [
    "The envelope tells gardeners to keep the seeds dry until planting and to label the planting date on the packet.",
    "A handwritten note adds that these seeds came from the courtyard garden.",
    "Neither the printed instructions nor the note names the plant species or predicts the flowers' color."
], [
    ("What handling instructions does the envelope provide?", 0, "How could the dry-storage instruction and planting-date label help you plan the next steps?"),
    ("What species will grow from the seeds?", -1, "What identification information would you need for the seeds from the courtyard garden?"),
    ("What color will their flowers be?", -1, "What variety or flowering evidence would be needed before predicting the courtyard seeds' flower color?")
])
C("reading", "bridge-letter", [
    "The letter asks the council to add a handrail to the footbridge so people carrying bags can steady themselves.",
    "Its writer describes holding a grocery sack in one hand while crossing on a windy afternoon.",
    "The letter requests a change but includes no council reply or construction schedule."
], [
    ("What change does the writer want?", 0, "How could the handrail request help you state the letter's purpose?"),
    ("What personal example supports the request?", 1, "How could carrying a grocery sack during a windy crossing support the writer's handrail argument?"),
    ("When will the council install the handrail?", -1, "What council decision and installation schedule would you need for the requested handrail?")
])
C("reading", "night-watch", [
    "The night watch report says a light appeared in the closed greenhouse at eleven and disappeared a minute later.",
    "The watchkeeper remained by the gate and could not see inside the building.",
    "The report records the light but names no person and supplies no explanation for it."
], [
    ("What limits the watchkeeper's account?", 1, "How could staying by the gate limit what the watchkeeper can conclude about the greenhouse light?"),
    ("Who turned on the light?", -1, "What evidence from inside the greenhouse would be needed to identify who, if anyone, caused the light?"),
    ("Why did the light disappear?", -1, "What information about the greenhouse light's source would help explain its disappearance?")
])
C("reading", "bread-sequence", [
    "Before opening the bakery, Noor wiped the counter, stacked the paper bags, and then placed the bread in the display.",
    "Only after arranging the display did she unlock the street door.",
    "The paragraph follows her morning actions and says nothing about sales or closing time."
], [
    ("Which sentence gives the order of Noor's preparation tasks?", 0, "How could you turn the counter, bags, and bread actions into a short sequence?"),
    ("What action is stated to precede unlocking the door?", 1, "How could the phrase only after help you place the display and door actions on a timeline?"),
    ("How much bread did Noor sell that day?", -1, "What sales record would be needed after Noor opened the bakery?")
])
C("reading", "river-metaphor", [
    "The narrator calls the narrow river a silver thread stitching the farms together.",
    "The following sentence describes fields on both banks and small bridges linking their paths.",
    "The passage uses an image to describe the landscape but gives no river length or water-quality measurements."
], [
    ("Which image compares the river to a thread?", 0, "How could the fields and connecting bridges help you explain the image of stitching farms together?"),
    ("How long is the river?", -1, "What map scale and marked start and end points could help you measure the river described as a silver thread?"),
    ("Is the river water safe to drink?", -1, "What water-quality evidence would be needed beyond the passage's landscape description?")
])
C("reading", "repair-manual", [
    "The repair card instructs users to disconnect the lamp from the power outlet before removing its shade.",
    "It then tells users to support the shade with one hand while loosening the retaining ring.",
    "The card covers removal only and does not identify a replacement bulb or diagnose any lamp fault."
], [
    ("What must happen before removing the shade?", 0, "How could you place disconnecting the lamp at the beginning of your removal checklist?"),
    ("How should the shade be held during removal?", 1, "How could supporting the shade affect the order in which you handle the retaining ring?"),
    ("Which replacement bulb does the lamp require?", -1, "What lamp specification would you need to identify a compatible replacement bulb?")
])
C("reading", "audition-ending", [
    "After the audition, Ellis folded the music carefully and waited beside the door without speaking.",
    "The panel thanked the final performer and said its decision would be posted the following afternoon.",
    "The story stops before the posting and gives no access to the panel's private discussion."
], [
    ("Which detail establishes that the decision is still pending?", 1, "How could the next-afternoon posting shape your reading of Ellis's wait by the door?"),
    ("Did Ellis receive the part?", -1, "What decision notice from the following afternoon would be needed to learn Ellis's result?"),
    ("Which judge liked Ellis best?", -1, "What individual panel feedback would be needed to compare the judges' reactions to Ellis?")
])
C("reading", "raincoat-choice", [
    "Tess packed a raincoat even though the sky was clear, remembering the sudden showers on her last hill walk.",
    "Her friend packed a sun hat and pointed to the bright morning outside the window.",
    "Their conversation ends before they leave, so the day's weather on the hill is not described."
], [
    ("What experience explains Tess's packing choice?", 0, "How could the earlier sudden showers explain why Tess prepares for rain under a clear sky?"),
    ("What observation supports the friend's packing choice?", 1, "How could you compare the friend's current-weather observation with Tess's remembered experience?"),
    ("Did it rain during this hill walk?", -1, "What account of the weather during their walk would you need after they leave?")
])
C("reading", "archive-label", [
    "The archive label identifies the displayed letter as an unsigned copy made several years after the original was lost.",
    "The copy describes a family moving between two villages and includes several place names.",
    "No handwriting sample or chain of copying is provided with the display."
], [
    ("Which statement limits what this document can establish about the original?", 0, "How could an unsigned later copy affect the certainty of claims about the lost letter?"),
    ("Who wrote the original letter?", -1, "What authorship evidence would be needed for the lost original behind this unsigned copy?"),
    ("Did the copy preserve every word accurately?", -1, "What comparison evidence would help assess the wording of the copy when the original is lost?")
])
C("reading", "festival-summary", [
    "The festival report describes volunteers guiding visitors, musicians performing under a canopy, and cooks serving soup.",
    "Its closing sentence says that many kinds of work supported the shared celebration.",
    "The report emphasizes cooperation but provides no budget or numerical visitor total."
], [
    ("Which sentence directly states the report's central idea?", 1, "How could you choose examples of volunteer work that support the idea of a shared celebration?"),
    ("What details support a summary about people working together?", 0, "How could you group guiding, performing, and cooking under the report's idea of cooperation?"),
    ("How much profit did the festival make?", -1, "What income and expense records would you need for the festival described in the report?")
])
C("reading", "lost-key-note", [
    "A note on the workshop door asks anyone finding a small brass key to leave it with the caretaker.",
    "The note explains that the key opens the supply cupboard and was last seen beside the sink.",
    "There is no follow-up message, finder name, or report that the cupboard has been opened."
], [
    ("What action does the note request from a finder?", 0, "How could the caretaker instruction guide a response if someone finds the small brass key?"),
    ("Who found the key?", -1, "What follow-up report would be needed to establish whether anyone found the brass key and who it was?"),
    ("Where is the key now?", -1, "What current sighting or handover record would be needed beyond the key's last location beside the sink?")
])
C("reading", "two-garden-voices", [
    "The gardener describes the overgrown corner as shelter for beetles, while the visitor calls that corner untidy.",
    "Both speakers notice the same pile of leaves beneath the wall, but attach different value to it.",
    "The scene reports their views without saying whether either person later changes an opinion."
], [
    ("Which sentence shows the speakers' different perspectives?", 0, "How could beetle shelter and tidiness reflect different priorities about the same garden corner?"),
    ("What observation do the speakers share?", 1, "How could a shared leaf pile help you explain why different interpretations need not require different observations?"),
    ("Did the visitor eventually agree with the gardener?", -1, "What later statement from the visitor would be needed to establish any change of opinion?")
])
C("reading", "clock-refrain", [
    "At the end of each scene, the narrator repeats that the hall clock kept ticking.",
    "Between these repetitions, different neighbors arrive carrying tools for a repair afternoon.",
    "The passage gives no clock readings and ends before anyone describes the completed repairs."
], [
    ("What repeated detail could I examine for its effect?", 0, "How could the repeated ticking shape the sense of time as the neighbors arrive?"),
    ("How many hours did the repairs take?", -1, "What start and finish times would be needed to measure the repair afternoon's duration?"),
    ("Which repairs were completed?", -1, "What completion report would be needed after the neighbors arrive with their tools?")
])


# English: sentence construction, revision planning, and editorial evidence.
C("English", "style-title", [
    "The club's style sheet requires sentence case for article titles, while its revision memo requires title case for the same titles.",
    "Both documents carry the same date and neither says it replaces the other.",
    "The editor has supplied no ruling about which capitalization policy is current."
], [
    ("What editorial conflict must I identify?", 0, "How could you describe the sentence-case and title-case requirements without choosing a policy prematurely?"),
    ("Why does the printed date not establish priority?", 1, "What version or replacement information would help compare the two same-date documents?"),
    ("Which capitalization policy is the club's current rule?", -2, "What editor ruling or documented supersession would establish the current article-title policy?")
])
C("English", "speaker-attribution", [
    "The interview transcript assigns the sentence about the new park to Robin, while the editor's annotation assigns that sentence to Jo.",
    "Both files refer to the same interview, and neither includes the audio recording.",
    "The disputed sentence is intended for a quotation in the neighborhood newsletter."
], [
    ("Which source limitation matters before attributing the quotation?", 1, "How could access to the interview audio help you check the Robin and Jo attributions?"),
    ("Who actually said the sentence about the park?", -2, "What speaker-identifying evidence from the interview would help settle the quotation's attribution?"),
    ("Did Jo approve the newsletter's final wording?", -1, "What approval record from Jo would be needed for the newsletter quotation?")
])
C("English", "pronoun-editor", [
    "One editing note says the pronoun they refers to the gardeners, while a second note says it refers to the visiting artists.",
    "The sentence names both groups before using they, and the draft gives no further identifying description.",
    "No author clarification accompanies the two editing notes."
], [
    ("What interpretations disagree in the editing notes?", 0, "How could you mark the gardeners and visiting artists as competing possible antecedents?"),
    ("What feature of the draft creates the ambiguity?", 1, "How could naming a group explicitly make the sentence's reference clearer?"),
    ("Which group did the author intend they to mean?", -2, "What author clarification would establish whether they means the gardeners or the visiting artists?")
])
C("English", "word-limit", [
    "The contest poster sets a maximum of 500 words, but the entry form sets a maximum of 700 words for the same story category.",
    "The entry form and poster have no version number, and the organizer has issued no clarification in this packet.",
    "A submitted story's word count and judging result are also absent."
], [
    ("What prevents choosing the newer contest instruction?", 1, "What version information could help you compare the poster with the entry form?"),
    ("What is the binding maximum word count?", -2, "What organizer clarification would resolve the 500-word and 700-word limits?"),
    ("Was the submitted story over the limit?", -1, "What story word count and confirmed category limit would be needed to check compliance?")
])
C("English", "active-subject", [
    "The editing guide says that in active voice the grammatical subject performs the action named by the verb.",
    "Its example sentence is: The porter carried the trunk upstairs.",
    "The guide asks writers to identify the subject and action before deciding whether a revision is useful."
], [
    ("What definition should I use to recognize active voice?", 0, "How could you check whether the porter performs the action in the example sentence?"),
    ("Which example can I examine for subject and action?", 1, "How could you mark the subject and the carrying action before discussing voice?"),
    ("Does my separate paragraph overuse passive voice?", -1, "What sentences from your separate paragraph would you need to examine for subjects and actions?")
])
C("English", "comma-list", [
    "The house guide uses commas to separate three or more items in a list, including a comma before the final conjunction.",
    "The editor asks for a punctuation check on a packing list of tools, supplies, and protective equipment.",
    "The actual packing-list sentence is not reproduced in the request."
], [
    ("What list-punctuation rule does this guide use?", 0, "How could you check a three-item list against the guide's comma-before-the-final-conjunction rule?"),
    ("Where is the comma missing in my packing sentence?", -1, "What exact packing-list sentence would let you check whether any comma is missing?"),
    ("How many punctuation changes does the packing sentence need?", -1, "What wording and punctuation from the packing sentence would you need to count necessary changes?")
])
C("English", "transition-cause", [
    "The paragraph explains that heavy rain softened the footpath and that the event was moved indoors because of the unsafe ground.",
    "The revision note asks for a transition that makes the cause-and-result relationship explicit.",
    "The packet includes no later account of attendance or participant reactions."
], [
    ("What relationship should my transition show?", 1, "How could you choose a transition that links softened ground to moving the event indoors?"),
    ("Which source facts form that cause-and-result link?", 0, "How could you identify the cause and the resulting event change before choosing a transition?"),
    ("Did moving indoors increase attendance?", -1, "What attendance evidence would be needed to evaluate the effect of moving the event indoors?")
])
C("English", "audience-note", [
    "The brief asks for a welcome note addressed to first-time volunteers who have never visited the animal shelter.",
    "It says to explain where volunteers should report before describing any tasks.",
    "The brief does not supply the reporting location, staff contact, or a finished welcome note."
], [
    ("Who is the intended audience?", 0, "How could first-time volunteers' unfamiliarity with the shelter guide the note's opening information?"),
    ("Which room should the welcome note send volunteers to?", -1, "What instructions from the shelter coordinator could confirm the reporting location for first-time volunteers?"),
    ("Does the finished note put task details before directions?", -1, "What finished welcome-note text would let you check the order of directions and task details?")
])
C("English", "thesis-focus", [
    "The planning card defines a thesis as the central claim an essay will develop and support.",
    "The proposed topic is whether the public courtyard should have more shaded seating.",
    "The writer has not supplied a thesis sentence, supporting observations, or a completed essay."
], [
    ("What role should a thesis serve?", 0, "How could you narrow a central claim about shaded seating so it can be supported with evidence?"),
    ("What issue should my planned claim address?", 1, "How could you decide which aspect of adding shaded seating your claim will focus on?"),
    ("Is my current thesis supported by the essay?", -1, "What thesis sentence and supporting essay passages would be needed to assess that connection?")
])
C("English", "verb-time", [
    "The narration plan places the main scene yesterday and asks the writer to maintain a consistent past-time frame.",
    "A later memory scene is planned, but no sentence from either scene has been drafted in the packet.",
    "The editor will review verb choices once the sentences are available."
], [
    ("What time frame governs the main scene?", 0, "How could the yesterday setting guide your verb choices in the main scene?"),
    ("Which drafted verb breaks the past-time frame?", -1, "What drafted scene sentences would allow you to check whether any verb breaks the past-time frame?"),
    ("Is the memory scene's timing clear to readers?", -1, "What wording from the memory scene and its transition would you need to assess time clarity?")
])
C("English", "precise-wording", [
    "The revision card asks the writer to replace vague descriptions with observable details when those details are known.",
    "Its sample note says the suitcase was heavy but gives no mass, carrying action, or visible strain.",
    "The card cautions writers to request missing details instead of inventing them."
], [
    ("What kind of detail does the revision card request?", 0, "How could an observed carrying action make the suitcase description more specific if such an observation is available?"),
    ("What should I do when a precise detail is unknown?", 2, "What observation about the suitcase could you request before revising the vague description?"),
    ("What exact mass should I put in the revised sentence?", -1, "What scale reading and unit, recorded for this suitcase, could justify adding a mass to the sentence?")
])
C("English", "dialogue-paragraphs", [
    "The fiction guide starts a new paragraph whenever the speaker changes in dialogue.",
    "A revision request mentions a conversation between a baker and a customer but supplies no dialogue lines.",
    "The request asks the editor to check paragraph breaks after the conversation has been transcribed."
], [
    ("What rule governs dialogue paragraph breaks here?", 0, "How could tracking the baker and customer as speakers guide paragraph breaks in the transcript?"),
    ("Which line needs a new paragraph?", -1, "What dialogue lines and speaker attributions would let you locate any needed paragraph break?"),
    ("How many times does the customer speak?", -1, "What complete conversation transcript would let you count the customer's speaking turns?")
])
C("English", "quotation-omission", [
    "The publication policy says that an omission within a quotation must not change the speaker's meaning.",
    "The proposed article discusses a resident's comment about keeping the playground open during repairs.",
    "The policy packet includes neither the resident's full comment nor the shortened quotation."
], [
    ("What constraint applies when shortening the quotation?", 0, "How could comparing a shortened quotation with the full playground comment help protect the speaker's meaning?"),
    ("What is the quoted comment's subject?", 1, "How could the playground-repair topic guide which surrounding context you look for in the full comment?"),
    ("Did the shortened quotation distort the resident's meaning?", -1, "What full comment and proposed shortened quotation would you need to check for a change in meaning?")
])
C("English", "parallel-headings", [
    "The design note asks for section headings with parallel grammatical forms so readers can scan them easily.",
    "The booklet covers preparing soil, planting bulbs, and caring for new growth.",
    "Only these subject descriptions are supplied; the draft's actual heading text is not included."
], [
    ("Why does the design note request parallel headings?", 0, "How could consistent grammatical forms help readers scan the soil, bulb, and growth sections?"),
    ("Which actual heading breaks the pattern?", -1, "What exact draft headings would you need to check whether any heading breaks grammatical parallelism?"),
    ("How many headings need rewriting?", -1, "What complete heading list would let you assess the extent of revision for the booklet?")
])
C("English", "counterargument-plan", [
    "The outline defines a counterargument as an opposing claim that a writer considers while developing an argument.",
    "The draft plan supports longer library opening hours and reserves a section for concerns about staffing.",
    "No staff budget, staffing estimate, or completed response paragraph accompanies the outline."
], [
    ("What is a counterargument in this outline?", 0, "How could a staffing concern provide an opposing claim to consider in the library-hours argument?"),
    ("What concern has the plan reserved space to address?", 1, "How could you plan a fair presentation of staffing concerns before evaluating a response?"),
    ("Would the longer hours require hiring two more staff members?", -1, "What staffing schedule and coverage estimate would be needed to evaluate hiring for longer library hours?")
])
C("English", "fragment-check", [
    "The editing checklist says that a sentence fragment lacks the structure needed to stand alone as a complete sentence in its context.",
    "An author requests a fragment check for a trail guide introduction.",
    "The checklist is available, but the introduction's sentences have not been provided."
], [
    ("What concept guides a fragment check?", 0, "How could you examine each trail-guide sentence for the structure needed to stand alone?"),
    ("Which fragment appears in my introduction?", -1, "What exact introduction text would you need to check whether it contains a fragment?"),
    ("How should I join the fragment to the previous sentence?", -1, "What suspected fragment and preceding sentence would let you assess whether joining them is appropriate?")
])
C("English", "definition-boundary", [
    "The glossary defines habitat as the place where an organism lives and obtains the resources it needs.",
    "The writing brief asks for a short explanation of a pond habitat for visitors to a nature center.",
    "No pond survey or list of organisms at this particular center is included."
], [
    ("Which definition should my explanation use?", 0, "How could you organize a pond-habitat explanation around living space and needed resources?"),
    ("Who will read this planned explanation?", 1, "How could the nature-center visitor audience guide the amount of explanation you provide?"),
    ("Which frog species should I name as living in this pond?", -1, "What verified pond survey would you need before naming resident frog species?")
])
C("English", "revision-feedback", [
    "The editor's note says the opening moves from the train platform to the rooftop without a transition explaining the change of place.",
    "It asks for a connection that helps readers follow the move.",
    "The note does not include a later revision or any reader response to revised wording."
], [
    ("What issue does the editor identify?", 0, "How could you plan a transition that makes the move from platform to rooftop clear?"),
    ("Did the author fix the transition?", -1, "What revised opening would you need to check the connection between the platform and rooftop?"),
    ("Did readers find the revision clear?", -1, "What reader feedback on the revised opening would be needed to assess clarity?")
])
C("English", "summary-boundary", [
    "The assignment note asks for a summary of the proposal's main points without adding the summarizer's opinion.",
    "The proposal recommends more benches, a drinking fountain, and clearer route signs in the park.",
    "The packet includes the proposal topics but neither a drafted summary nor a public vote result."
], [
    ("What boundary separates this summary task from an opinion response?", 0, "How could you check each planned summary point for a connection to the proposal rather than your own judgment?"),
    ("Which proposal topics belong in my summary plan?", 1, "How could you organize benches, a drinking fountain, and route signs into the proposal's main points?"),
    ("Did the public vote in favor of the proposal?", -1, "What vote result would be needed to report public approval of the park proposal?")
])
C("English", "register-request", [
    "The message brief asks for a courteous request to a building manager about reserving a shared room.",
    "It says to make the requested action clear and give the information needed to respond.",
    "The brief contains no desired reservation date, room capacity, or draft message for review."
], [
    ("What communicative purpose should the message serve?", 0, "How could you state the shared-room reservation request clearly while keeping a courteous tone?"),
    ("Which date should I put in the request?", -1, "What event schedule and room-availability information could help you confirm the intended reservation date?"),
    ("Is my current message too abrupt?", -1, "What draft message would let you assess the tone of the request to the building manager?")
])


# Science: observation, operational definitions, and limits of experiments.
C("science", "water-probes", [
    "Two probes placed in the same stirred water sample at the same time reported temperatures of 18 and 23 degrees Celsius.",
    "The lab sheet contains no calibration check for either probe.",
    "The investigator retained both readings and did not designate either one as the accepted temperature."
], [
    ("What conflicting measurements should I report?", 0, "How could you present both probe readings while making their shared sample and timing clear?"),
    ("What instrument information is missing?", 1, "How could a calibration check help investigate the difference between the two probes?"),
    ("What was the sample's actual temperature?", -2, "What calibrated temperature measurement could help establish the stirred sample's temperature?")
])
C("science", "seedling-ledgers", [
    "The tray ledger records nine sprouted seeds on day six, while the photograph log records eleven for the same tray and day.",
    "The photograph itself is missing, and no seed-by-seed count sheet is attached.",
    "Neither document specifies the number of seeds initially planted in the tray."
], [
    ("What evidence is unavailable for checking the counts?", 1, "How could a tray photograph or seed-by-seed count help compare the nine and eleven reports?"),
    ("How many seeds had actually sprouted by day six?", -2, "What direct day-six evidence could resolve the sprout-count difference for this tray?"),
    ("What percentage of the planted seeds sprouted?", -1, "What initial planting total and verified day-six sprout count would be needed for a sprouting percentage?")
])
C("science", "rock-identification", [
    "One field label identifies the collected stone as limestone, while a second label identifies that same numbered specimen as sandstone.",
    "The bag contains the stone, but the packet records no hardness, grain, or reaction tests.",
    "No later identification or correction resolves the competing labels."
], [
    ("What disagreement exists in the specimen labels?", 0, "How could you preserve the limestone and sandstone claims as separate hypotheses for the numbered specimen?"),
    ("Which observations are absent from the packet?", 1, "How could recorded grain or reaction observations help evaluate the two rock labels?"),
    ("Which rock type is the specimen actually?", -2, "What diagnostic observations or tests would help distinguish the limestone and sandstone identifications?")
])
C("science", "battery-readings", [
    "The experiment sheet lists the battery voltage as 1.2 volts, while the instrument export lists 1.5 volts for the same trial.",
    "The report includes no explanation of the discrepancy and no retained meter display image.",
    "It also omits the circuit's current and the duration of the trial."
], [
    ("What limits checking the conflicting voltage records?", 1, "How could an original meter record help compare the experiment sheet with the instrument export?"),
    ("What voltage is verified for this trial?", -2, "What instrument evidence or documented correction would establish the voltage for the disputed trial?"),
    ("How much electrical energy did the trial use?", -1, "What verified voltage, current, and trial duration would be needed to estimate electrical energy use?")
])
C("science", "evaporation-trays", [
    "The evaporation test places equal volumes of water in a wide tray and a narrow cup in the same room.",
    "The plan changes the exposed water surface area while keeping the starting volume and room location matched.",
    "The test has not yet produced final water-volume measurements."
], [
    ("What variable does the plan deliberately change?", 1, "How could comparing a wide tray with a narrow cup help test the effect of exposed surface area?"),
    ("How are the starting water amounts controlled?", 0, "How could equal starting volumes make the tray and cup comparison easier to interpret?"),
    ("Which container lost more water in this test?", -1, "What final water-volume measurements from both containers would you need to compare water loss?")
])
C("science", "shadow-tracking", [
    "The observation plan measures one pole's shadow every hour from the same marked point on the pavement.",
    "Each entry is supposed to include the time, shadow length, and direction.",
    "Only the plan is supplied; no entries, weather notes, or pole-height measurement are attached."
], [
    ("What information should each shadow entry contain?", 1, "How could recording time with length and direction help you compare the pole's shadow over the day?"),
    ("When was the shortest shadow observed?", -1, "What hourly shadow-length entries would be needed to identify the shortest observed shadow?"),
    ("How tall is the pole?", -1, "What pole-height measurement or suitable geometric observations would be needed to establish its height?")
])
C("science", "food-web", [
    "In this food-web key, an arrow points from the organism being eaten toward the organism receiving food energy.",
    "The diagram description lists an arrow from grass to rabbit and another from rabbit to fox.",
    "The description gives no population counts or observations from other seasons."
], [
    ("What does an arrow mean in this food web?", 0, "How could the arrow key guide your explanation of the grass-to-rabbit connection?"),
    ("Which feeding connections are supplied?", 1, "How could you trace the listed arrows to show the route of food energy?"),
    ("How many foxes lived here last winter?", -1, "What winter population survey would you need for the foxes in this food web?")
])
C("science", "soil-drainage", [
    "The procedure pours the same amount of water into equal-size containers of sand and clay, then measures water collected below each.",
    "The containers have matching drainage holes and start with equally dry samples.",
    "The worksheet includes no collected-water readings or sample masses."
], [
    ("Which setup details help make this comparison fair?", 1, "How could matching drainage holes and starting dryness help isolate differences between sand and clay?"),
    ("Which sample drained more water in this experiment?", -1, "What collected-water readings for sand and clay would let you compare their drainage?"),
    ("Which soil sample had greater mass?", -1, "What balance readings in the same unit, with container mass excluded, would let you compare the sand and clay samples?")
])
C("science", "magnet-sort", [
    "For this activity, attracted means that an object moves toward the magnet when the magnet is brought near without touching it.",
    "The materials tray contains a steel washer, a wooden bead, and a plastic button.",
    "The activity sheet lists the materials but has no recorded trials or movement observations."
], [
    ("How does the activity define attracted?", 0, "How could you observe movement without contact to apply this definition during a trial?"),
    ("Which objects are available for the test?", 1, "How could you set up a record with separate entries for the washer, bead, and button?"),
    ("Which objects moved in the completed trials?", -1, "What movement observations from each object's trial would be needed to report the observed results?")
])
C("science", "sound-comparison", [
    "The investigation varies the length of a plucked string while keeping the string material and tension fixed.",
    "The plan asks observers to compare the pitch after each length adjustment.",
    "No sound recordings, pitch measurements, or record of which lengths were tested are included."
], [
    ("What is the investigation's changed variable?", 0, "How could fixed material and tension help you study the effect of string length on pitch?"),
    ("What pitch did the longest tested string produce?", -1, "What tested lengths and corresponding pitch measurements would be needed for the longest string condition?"),
    ("Did all observers agree about the pitch change?", -1, "What individual observer reports would you need to compare judgments after the length adjustments?")
])
C("science", "dissolving-control", [
    "The dissolving plan compares equal masses of sugar in equal volumes of warm and cool water.",
    "Both cups are stirred at the same planned rate, and the timer stops when no sugar crystals are visible.",
    "The record contains the method only, with no completion times or measured water temperatures."
], [
    ("What endpoint does the procedure use?", 1, "How could using the same no-visible-crystals endpoint make the two timed trials comparable?"),
    ("Which starting quantities are matched?", 0, "How could equal sugar masses and water volumes support the warm-versus-cool comparison?"),
    ("How much faster did the sugar dissolve in warm water?", -1, "What completion times for the warm and cool cups would you need to determine whether and by how much their durations differ?")
])
C("science", "bird-survey", [
    "The bird survey records sightings from a single bench during ten minutes after sunrise.",
    "Observers count only birds they can see and do not identify unseen birds by their calls.",
    "The form contains no evening survey, all-day tracking, or estimate of birds hidden in the trees."
], [
    ("What rule limits which birds enter the count?", 1, "How could counting only visible birds affect what the bench survey represents?"),
    ("How many birds used the whole park that day?", -1, "What broader spatial and all-day observations would be needed beyond the ten-minute bench survey?"),
    ("Were there more birds in the evening?", -1, "What comparable evening observations would you need before comparing bird numbers by time of day?")
])
C("science", "insulation-design", [
    "The design wraps one cup in felt and leaves an otherwise matching cup unwrapped.",
    "Both cups begin with equal volumes of water at the same temperature, and temperature will be recorded every five minutes.",
    "The design document has no temperature results or room-temperature record."
], [
    ("What comparison tests the wrapping?", 0, "How could the unwrapped cup provide a comparison for the felt-wrapped cup?"),
    ("What starting conditions does the design match?", 1, "How could matched starting water volume and temperature help you interpret later readings?"),
    ("Did the felt keep the water warmer after twenty minutes?", -1, "What twenty-minute temperature readings from both cups would be needed to evaluate the felt wrapping?")
])
C("science", "cloud-log", [
    "The weather log defines cloud cover as the fraction of the visible sky obscured by clouds at the observation time.",
    "Observers are asked to sketch the sky from the same open courtyard each afternoon.",
    "The instructions contain no completed sketches, rainfall amounts, or forecasts."
], [
    ("What does cloud cover measure here?", 0, "How could a courtyard sky sketch help estimate the fraction obscured by clouds?"),
    ("How cloudy was it yesterday afternoon?", -1, "What yesterday-afternoon sketch or cloud-cover observation would be needed from the courtyard?"),
    ("Will it rain tomorrow?", -1, "What forecast evidence would be needed beyond the cloud-cover logging instructions?")
])
C("science", "filter-comparison", [
    "The filter test sends equal volumes of visibly muddy water through cloth and paper filters.",
    "Its observation sheet compares visible particles in the collected water and does not test for dissolved chemicals or microbes.",
    "The provided packet contains the setup and observation categories but no completed results."
], [
    ("What does the observation sheet actually assess?", 1, "How could you distinguish visible-particle observations from evidence about chemicals or microbes?"),
    ("What volumes are matched in the filter setup?", 0, "How could equal input volumes help compare cloth and paper filters?"),
    ("Is the filtered water safe to drink?", -1, "What suitable water-safety test evidence would be needed beyond visible-particle observations?")
])
C("science", "moon-sketches", [
    "The moon journal asks observers to shade the dark part of the visible disk and record the date beside each sketch.",
    "It specifies viewing from the same yard when the moon is visible.",
    "The packet contains blank journal pages and no dated observations or local viewing times."
], [
    ("What should each moon sketch record?", 0, "How could dating the shaded-disk sketches help you compare visible appearance across nights?"),
    ("What phase did the observer see last Tuesday?", -1, "What dated observation or sketch from last Tuesday would be needed for the observer's view?"),
    ("At what time did the moon rise at this yard yesterday?", -1, "What local date, location, and moonrise information would be needed for yesterday's viewing site?")
])
C("science", "pendulum-plan", [
    "The pendulum procedure defines one full swing as travel from a starting side to the opposite side and back to the starting side.",
    "The observer times ten full swings together to reduce the influence of a single start or stop reaction.",
    "No measured duration or string length is reported in the procedure."
], [
    ("What counts as one full swing?", 0, "How could you follow the side-to-side-and-back definition when counting swings?"),
    ("Why does the procedure time ten swings together?", 1, "How could a counting plan help keep the ten-swing interval consistent while timing?"),
    ("What was the average duration of one swing in the trial?", -1, "What measured duration for ten full swings would you need before finding an average per swing?")
])
C("science", "leaf-surfaces", [
    "The leaf investigation applies a thin coating to the upper surface of one leaf and the lower surface of another matched leaf.",
    "The plan records mass change over the same time interval while keeping light exposure matched.",
    "No initial or final leaf masses are supplied."
], [
    ("Which condition does the leaf investigation change?", 0, "How could upper-surface and lower-surface coatings be compared using the planned mass measurements?"),
    ("Which leaf lost more mass?", -1, "What initial and final masses for both coated leaves would you need to compare mass loss?"),
    ("How many grams did the upper-coated leaf lose?", -1, "What initial and final mass readings would be needed for the leaf coated on its upper surface?")
])
C("science", "mixture-definition", [
    "The lab card defines a mixture as two or more substances together without requiring them to form a new substance.",
    "Its sorting activity provides dry rice mixed with paper clips and asks students to plan a separation method.",
    "The card contains no counts or masses of either component."
], [
    ("What definition should guide the mixture discussion?", 0, "How could you describe the rice and paper clips as distinct components using the mixture definition?"),
    ("Which components does the separation task involve?", 1, "How could differences between rice and paper clips guide a separation plan?"),
    ("What percentage of the mixture's mass is paper clips?", -1, "What paper-clip mass and total mixture mass would be needed for that percentage?")
])
C("science", "fair-ramp", [
    "The rolling-ball plan releases the same ball without pushing from several marked heights on one ramp.",
    "It measures the distance traveled across the same level surface after each release.",
    "The packet gives the planned method but omits the marked height values and all distance results."
], [
    ("What release procedure is kept consistent?", 0, "How could using the same ball without a push support a comparison across release heights?"),
    ("Which release height produced the longest travel?", -1, "What paired release-height and travel-distance results would be needed to find the longest travel?"),
    ("How far did the ball travel from the lowest mark?", -1, "How could a results table pairing marked heights with travel distances help you identify the lowest marked release and read its distance?")
])


# History: invented archival scenarios, not claims about actual historical events.
C("history", "mill-opening", [
    "A town notice dates the opening of the Cedar Mill to spring 1842, while a mill ledger dates the same opening to autumn 1843.",
    "Both records name the same riverside building and the same mill owner.",
    "The archive contains no explanation distinguishing an initial opening from a later reopening."
], [
    ("What opening-date conflict appears in the sources?", 0, "How could you display the spring 1842 and autumn 1843 claims with their source labels?"),
    ("What shared details link the records to the same mill?", 1, "How could the riverside building and owner details help you compare the two opening records?"),
    ("When did Cedar Mill actually open?", -2, "What corroborating opening record or documented explanation could resolve the two dates?")
])
C("history", "petition-signatures", [
    "The council abstract reports 64 signatures on the bridge petition, but the newspaper reports 81 signatures on that same petition.",
    "The petition sheets are not preserved in the supplied collection.",
    "Neither account explains its counting method or identifies the occupations of the signers."
], [
    ("What missing source limits checking the totals?", 1, "How could the original petition sheets help test the council and newspaper signature totals?"),
    ("How many people actually signed the petition?", -2, "What signature-level evidence or documented count correction could resolve the 64 and 81 totals?"),
    ("What share of the signers were carpenters?", -1, "What verified signer list and occupational information would be needed to calculate the carpenters' share?")
])
C("history", "ship-cargo", [
    "The customs copy lists wool as the only textile cargo aboard Juniper, while the harbor inventory lists cotton as the vessel's only textile cargo for the same arrival.",
    "Both documents record docking at the west quay on the same date.",
    "No inspection report or corrected cargo list accompanies the two documents."
], [
    ("What cargo descriptions conflict?", 0, "How could you distinguish the customs wool claim from the harbor cotton claim in your notes?"),
    ("Which arrival details agree?", 1, "How could the matching west-quay date help establish the basis for comparing the inventories?"),
    ("Which textile did the Juniper actually carry on that arrival?", -2, "What inspection evidence or corrected cargo record could clarify the Juniper's textile cargo?")
])
C("history", "meeting-vote", [
    "The meeting minutes describe a unanimous vote for a new market site, while a delegate's diary records three votes against at the same meeting.",
    "No roll-call list or ballot record appears in the packet.",
    "Neither document says whether the market was ultimately built or gives its construction cost."
], [
    ("What record is missing for checking the vote accounts?", 1, "How could a roll-call list help compare the unanimous claim with the diary's three opposing votes?"),
    ("Was the vote actually unanimous?", -2, "What vote-by-vote evidence would help resolve the minutes and diary accounts?"),
    ("How much did constructing the market cost?", -1, "What evidence that construction occurred and what expense records would be needed for the proposed market?")
])
C("history", "canal-letter", [
    "A merchant's letter praises the proposed canal because carts often arrived late with goods after heavy rain.",
    "The letter was written to investors while money for the canal was still being sought.",
    "The packet includes no canal traffic figures or evidence that construction was completed."
], [
    ("What reason does the merchant give for supporting the canal?", 0, "How could rain-delayed cart deliveries explain the merchant's interest in the canal proposal?"),
    ("What audience and timing might shape the letter's presentation?", 1, "How could writing to potential investors affect which canal benefits the merchant emphasizes?"),
    ("Did the canal reduce shipping delays after opening?", -1, "What evidence of an opening and comparable shipping times would be needed to assess the proposed canal's effect?")
])
C("history", "household-census", [
    "The village census lists each household head and the number of residents in that household.",
    "It does not name other residents, record their work, or state how household roles were assigned.",
    "The archivist presents it as a count of households at one point in time, with no later census attached."
], [
    ("What information does the census directly record?", 0, "How could household heads and resident totals support a limited description of village households?"),
    ("What jobs did the unnamed residents hold?", -1, "What occupational records would be needed for residents omitted by name from the census?"),
    ("Did the village population grow over the next decade?", -1, "What comparable later population count would you need to assess change after this census?")
])
C("history", "union-pamphlet", [
    "The workers' pamphlet calls for shorter shifts and invites factory employees to a meeting in the assembly hall.",
    "Its closing appeal asks employees to sign a shared request to the factory owner.",
    "The collection contains the pamphlet but no attendance list, owner response, or revised shift schedule."
], [
    ("What demand does the pamphlet promote?", 0, "How could the shorter-shift demand help you explain why the pamphlet calls a meeting?"),
    ("What collective action does its closing appeal request?", 1, "How could the shared request to the owner reveal the pamphlet's organizing purpose?"),
    ("Did the factory shorten its shifts afterward?", -1, "What later shift schedule or owner decision would be needed to assess the pamphlet's outcome?")
])
C("history", "pottery-fragment", [
    "The excavation note records a pottery fragment found beneath a collapsed wall in the courtyard trench.",
    "The note includes its depth and position but no date for the wall's collapse or the pottery's manufacture.",
    "No inscription, maker's mark, or laboratory analysis is included in the packet."
], [
    ("What find context does the excavation note provide?", 0, "How could the fragment's position beneath the wall guide questions about the site's sequence?"),
    ("In which year was this pottery made?", -1, "What dating evidence would be needed for the pottery fragment beyond its position beneath the wall?"),
    ("Who made this particular vessel?", -1, "What maker-identifying evidence would be needed for the pottery fragment described in the excavation note?")
])
C("history", "oral-market", [
    "In a recorded interview, an older resident recalls taking vegetables to the riverside market with her grandmother as a child.",
    "She says the account is based on her own memories rather than a diary kept at the time.",
    "The interview extract gives no exact years or complete list of market sellers."
], [
    ("What experience does the resident describe?", 0, "How could the childhood visits provide a personal perspective on the riverside market?"),
    ("What is the stated basis of her account?", 1, "How could you distinguish remembered experience from a contemporary diary when describing this source?"),
    ("How many sellers operated at the market each year?", -1, "What market registers or comparable annual counts would be needed beyond the resident's memories?")
])
C("history", "school-rule", [
    "The school board's circular instructs teachers to keep a daily attendance register beginning the next term.",
    "It explains that the board wants comparable records from each school in the district.",
    "The circular contains the instruction but no completed registers or reports of teachers' compliance."
], [
    ("What purpose does the board give for the new register?", 1, "How could daily registers support comparisons among schools in the district?"),
    ("Did every teacher follow the circular?", -1, "What completed registers or implementation reports would be needed to assess teacher compliance?"),
    ("What was district attendance in the first week?", -1, "What first-week attendance records from the district's schools would be needed?")
])
C("history", "map-boundaries", [
    "The estate map outlines fields belonging to the landowner and labels the main road and river crossing.",
    "Its legend says the map was prepared to record property boundaries for a lease agreement.",
    "The map description contains no tenant testimony or account of daily travel through the estate."
], [
    ("Why was this map prepared?", 1, "How could a lease-boundary purpose shape which estate features the map emphasizes?"),
    ("What features does the map description include?", 0, "How could the road and river crossing help orient the fields shown on the estate map?"),
    ("Did tenants consider the boundary arrangement fair?", -1, "What tenant testimony or recorded objections would be needed to assess views of the estate boundaries?")
])
C("history", "ration-notice", [
    "The town notice limits each household's weekly lamp-oil purchase and asks sellers to record purchases in a shared ledger.",
    "It states that delayed deliveries have reduced the available oil supply.",
    "No seller ledgers, enforcement records, or later supply figures are included."
], [
    ("What reason does the notice give for limiting purchases?", 1, "How could delayed deliveries explain the town's concern about household oil purchases?"),
    ("How many households exceeded their limit?", -1, "What purchase and limit records would be needed to determine whether any households exceeded the oil allowance?"),
    ("Did the rule eliminate the oil shortage?", -1, "What later supply and demand evidence would be needed to assess the purchase limit's effect?")
])
C("history", "railway-advert", [
    "The railway advertisement promises comfortable travel and calls the new route the quickest way to the seaside.",
    "The railway company paid for the advertisement in a regional newspaper.",
    "The extract includes no timetable comparison, passenger survey, or actual journey log."
], [
    ("What claims does the advertisement make?", 0, "How could you separate the comfort and speed claims when analyzing the advertisement?"),
    ("Who funded this message?", 1, "How could the railway company's role as sponsor affect your evaluation of its quickest-route claim?"),
    ("Was this route truly quicker than every alternative?", -1, "What comparable journey-time evidence for the railway and alternatives would be needed to test that claim?")
])
C("history", "migration-register", [
    "The arrival register lists newcomers' names, arrival dates, and places of departure at the northern port.",
    "Its columns do not ask why people moved or where they planned to settle after arrival.",
    "The packet contains no personal letters or follow-up residence records for those newcomers."
], [
    ("What limits using this register to explain migration motives?", 1, "How could you distinguish recorded departure places from evidence about reasons for moving?"),
    ("Why did the listed newcomers leave their homes?", -1, "What personal accounts or other motive evidence would be needed for the newcomers in the arrival register?"),
    ("Which neighborhood did the newcomers settle in?", -1, "What later residence records would be needed to trace settlement after arrival at the northern port?")
])
C("history", "hospital-report", [
    "The hospital report counts beds occupied at noon on the first day of each month.",
    "Its introduction explains that these snapshots were collected to plan future space needs.",
    "It gives no individual patient outcomes, lengths of stay, or counts of admissions between snapshot dates."
], [
    ("What exactly does the report count?", 0, "How could a noon snapshot differ from counting all admissions during a month?"),
    ("What purpose does the report state?", 1, "How could occupied-bed snapshots inform questions about future hospital space?"),
    ("What proportion of patients recovered that year?", -1, "What patient outcome totals and a defined patient group would be needed to calculate a recovery proportion?")
])
C("history", "photo-street", [
    "The photograph caption identifies a street-cleaning crew standing beside carts outside the municipal depot.",
    "The archive dates the photograph to a broad decade but gives no day, photographer, or interview with the workers.",
    "No wage ledger or working-hours record accompanies the image."
], [
    ("What subject does the caption identify?", 0, "How could you separate what the caption identifies from details that would require other records?"),
    ("What were the crew's daily wages?", -1, "What wage ledger or pay agreement would be needed for the street-cleaning crew?"),
    ("How did the workers feel when the photograph was taken?", -1, "What worker testimony would be needed to support a claim about feelings during the depot photograph?")
])
C("history", "forest-proposal", [
    "The forester's report recommends reserving the upper woodland to reduce damage to the town's water supply.",
    "A separate paragraph notes that several families collect fuelwood in the proposed reserve.",
    "The packet contains neither an adopted ordinance nor testimony from the fuelwood collectors."
], [
    ("What reason supports the forester's recommendation?", 0, "How could concern for the water supply explain the proposed upper-woodland reserve?"),
    ("What existing use could be relevant when evaluating the proposal?", 1, "How could fuelwood collection guide questions about people affected by a woodland reserve?"),
    ("Did the families support the adopted reserve rules?", -1, "What adopted rules and collector testimony would be needed to assess family views of any reserve policy?")
])
C("history", "postal-routes", [
    "The postal schedule lists planned departure days for riders serving the hill settlements.",
    "Its heading identifies the entries as scheduled service rather than confirmations of completed journeys.",
    "The collection includes no rider diaries, delivery receipts, or reports of weather interruptions."
], [
    ("Why should I avoid treating the schedule as proof of completed trips?", 1, "How could you distinguish planned departure days from evidence that riders reached the hill settlements?"),
    ("Did the rider complete the Tuesday route?", -1, "What rider log or delivery receipt would be needed to verify the Tuesday journey?"),
    ("Which trips were canceled because of snow?", -1, "What cancellation and weather records would be needed to establish whether snow prevented any scheduled trips?")
])
C("history", "craft-apprentice", [
    "The apprenticeship contract requires the workshop master to provide instruction and lodging for a three-year term.",
    "It requires the apprentice to attend the workshop on the agreed working days.",
    "The archive preserves the signed agreement but no progress reports or account of how the term ended."
], [
    ("What obligations does the contract place on the master?", 0, "How could you organize instruction and lodging as the master's stated obligations?"),
    ("What attendance obligation does the apprentice accept?", 1, "How could you compare the apprentice's attendance duty with the master's responsibilities?"),
    ("Did the apprentice successfully complete the three-year term?", -1, "What completion or departure record would be needed to establish how the apprenticeship ended?")
])
C("history", "memorial-speech", [
    "The anniversary speech praises volunteers who restored the village fountain and describes the project as a shared achievement.",
    "It was delivered at a ceremony honoring the restoration committee several years after the work.",
    "The extract names no disagreements and includes neither meeting minutes nor financial accounts."
], [
    ("What occasion might shape the speech's emphasis?", 1, "How could an honoring ceremony help explain the speech's emphasis on shared achievement?"),
    ("Did all villagers agree about the restoration?", -1, "What evidence of villagers' views would be needed beyond the committee-honoring speech?"),
    ("How much money was spent restoring the fountain?", -1, "What project expense accounts would be needed to establish the fountain restoration's cost?")
])


# Author-selected lexical anchors identify the local task without requiring a
# future model to reproduce the entire NEXT sentence. They are not grading rubrics.
NEXT_ANCHORS = {
    "ramp-measurement": ("sloping surface", "date information", "ramp's length"),
    "bus-tally": ("repeated visits", "18 and 21", "bus identifiers"),
    "tile-area": ("area claims", "spare tiles", "floor dimensions"),
    "spinner-trials": ("trial-by-trial", "30 outcomes", "sector angles"),
    "garden-scale": ("two meters per centimeter", "five-centimeter sides", "planting density"),
    "museum-median": ("museum visitor counts", "40 visitors", "prior week"),
    "recipe-ratio": ("white and three cups of blue", "paint quantities", "coverage rate"),
    "elevator-graph": ("8 to 12 seconds", "passenger count record", "button-event record"),
    "coupon-order": ("coupon base", "delivery charge", "taxable-charge rule"),
    "negative-temperature": ("minus four and three", "overnight thermometer", "crossed zero"),
    "triangle-test": ("two shorter strips", "twelve-centimeter", "angle measurement"),
    "data-sampling": ("vegetarian lunch line", "broader sampling", "response totals for soup"),
    "fraction-bench": ("eight equal sections", "five green sections", "total board length"),
    "rounding-weight": ("2.3 kilograms", "billing rate", "delivery estimate"),
    "pattern-machine": ("input four", "one, four, and six", "challenge machine"),
    "circle-string": ("center and an edge point", "center-to-edge", "whether the string was wrapped"),
    "train-unit-rate": ("90 kilometers", "entire interval", "speed measurements"),
    "net-folding": ("matching edges", "square faces", "edge connections"),
    "coordinate-treasure": ("horizontal move", "negative two", "map distance scale"),
    "boxplot-reading": ("first and third quartiles", "quartile values", "median label"),
    "station-witnesses": ("red and gray", "ticket-window location", "suitcase's color"),
    "trail-signs": ("main trailhead", "ridge path's status", "publication-time"),
    "rehearsal-accounts": ("lighting-check opening", "power interruption", "rehearsal's first activity"),
    "ferry-memory": ("Willow name", "dawn claim", "letter writer's age"),
    "orchard-decision": ("young trees", "unfinished sketch", "orchard"),
    "market-flyer": ("free exchange", "Saturday exchange", "inspection findings"),
    "quiet-library": ("sleeping child", "squeaking chair", "earlier-visit account"),
    "seed-envelope": ("dry-storage", "courtyard garden", "flower color"),
    "bridge-letter": ("handrail request", "grocery sack", "installation schedule"),
    "night-watch": ("by the gate", "if anyone", "light's source"),
    "bread-sequence": ("counter, bags, and bread", "display and door", "sales record"),
    "river-metaphor": ("stitching farms together", "silver thread", "water-quality evidence"),
    "repair-manual": ("disconnecting the lamp", "retaining ring", "replacement bulb"),
    "audition-ending": ("next-afternoon posting", "Ellis's result", "individual panel feedback"),
    "raincoat-choice": ("sudden showers", "remembered experience", "weather during their walk"),
    "archive-label": ("unsigned later copy", "authorship evidence", "original is lost"),
    "festival-summary": ("volunteer work", "guiding, performing, and cooking", "income and expense"),
    "lost-key-note": ("if someone finds", "whether anyone found", "handover record"),
    "two-garden-voices": ("beetle shelter", "shared leaf pile", "later statement"),
    "clock-refrain": ("repeated ticking", "start and finish times", "completion report"),
    "style-title": ("title-case requirements", "same-date documents", "documented supersession"),
    "speaker-attribution": ("Robin and Jo", "speaker-identifying", "approval record from Jo"),
    "pronoun-editor": ("possible antecedents", "naming a group", "author clarification"),
    "word-limit": ("entry form", "500-word and 700-word", "story word count"),
    "active-subject": ("porter performs", "carrying action", "separate paragraph"),
    "comma-list": ("three-item list", "whether any comma is missing", "packing sentence"),
    "transition-cause": ("softened ground", "resulting event change", "attendance evidence"),
    "audience-note": ("first-time volunteers", "reporting location", "finished welcome-note"),
    "thesis-focus": ("shaded seating", "adding shaded seating", "supporting essay passages"),
    "verb-time": ("yesterday setting", "whether any verb", "memory scene"),
    "precise-wording": ("if such an observation", "suitcase", "scale reading and unit"),
    "dialogue-paragraphs": ("baker and customer", "speaker attributions", "customer's speaking turns"),
    "quotation-omission": ("full playground comment", "surrounding context", "full comment"),
    "parallel-headings": ("grammatical forms", "whether any heading", "complete heading list"),
    "counterargument-plan": ("staffing concern", "fair presentation", "coverage estimate"),
    "fragment-check": ("trail-guide sentence", "whether it contains a fragment", "suspected fragment"),
    "definition-boundary": ("needed resources", "nature-center visitor", "verified pond survey"),
    "revision-feedback": ("platform to rooftop", "revised opening", "reader feedback"),
    "summary-boundary": ("planned summary point", "route signs", "vote result"),
    "register-request": ("courteous tone", "reservation date", "draft message"),
    "water-probes": ("shared sample and timing", "calibration check", "calibrated temperature"),
    "seedling-ledgers": ("seed-by-seed count", "day-six evidence", "initial planting total"),
    "rock-identification": ("separate hypotheses", "grain or reaction", "diagnostic observations"),
    "battery-readings": ("original meter record", "documented correction", "trial duration"),
    "evaporation-trays": ("exposed surface area", "equal starting volumes", "final water-volume"),
    "shadow-tracking": ("length and direction", "hourly shadow-length", "pole-height measurement"),
    "food-web": ("grass-to-rabbit", "food energy", "winter population survey"),
    "soil-drainage": ("drainage holes", "collected-water readings", "balance readings"),
    "magnet-sort": ("movement without contact", "washer, bead, and button", "movement observations"),
    "sound-comparison": ("fixed material and tension", "pitch measurements", "individual observer reports"),
    "dissolving-control": ("no-visible-crystals", "equal sugar masses", "whether and by how much"),
    "bird-survey": ("visible birds", "all-day observations", "comparable evening observations"),
    "insulation-design": ("unwrapped cup", "starting water volume", "twenty-minute temperature"),
    "cloud-log": ("fraction obscured", "yesterday-afternoon sketch", "forecast evidence"),
    "filter-comparison": ("visible-particle observations", "equal input volumes", "water-safety test"),
    "moon-sketches": ("shaded-disk sketches", "last Tuesday", "moonrise information"),
    "pendulum-plan": ("side-to-side-and-back", "ten-swing interval", "ten full swings"),
    "leaf-surfaces": ("lower-surface coatings", "both coated leaves", "upper surface"),
    "mixture-definition": ("distinct components", "rice and paper clips", "total mixture mass"),
    "fair-ramp": ("without a push", "paired release-height", "lowest marked release"),
    "mill-opening": ("1842 and autumn 1843", "riverside building", "corroborating opening record"),
    "petition-signatures": ("original petition sheets", "64 and 81", "occupational information"),
    "ship-cargo": ("harbor cotton claim", "west-quay date", "inspection evidence"),
    "meeting-vote": ("three opposing votes", "vote-by-vote evidence", "evidence that construction occurred"),
    "canal-letter": ("rain-delayed cart deliveries", "potential investors", "evidence of an opening"),
    "household-census": ("resident totals", "occupational records", "later population count"),
    "union-pamphlet": ("shorter-shift demand", "shared request", "later shift schedule"),
    "pottery-fragment": ("beneath the wall", "dating evidence", "maker-identifying"),
    "oral-market": ("childhood visits", "contemporary diary", "annual counts"),
    "school-rule": ("daily registers", "implementation reports", "first-week attendance"),
    "map-boundaries": ("lease-boundary purpose", "river crossing", "tenant testimony"),
    "ration-notice": ("delayed deliveries", "whether any households", "later supply and demand"),
    "railway-advert": ("comfort and speed", "company's role as sponsor", "comparable journey-time"),
    "migration-register": ("departure places", "motive evidence", "later residence records"),
    "hospital-report": ("noon snapshot", "hospital space", "patient outcome totals"),
    "photo-street": ("caption identifies", "wage ledger", "worker testimony"),
    "forest-proposal": ("water supply", "fuelwood collection", "any reserve policy"),
    "postal-routes": ("planned departure days", "delivery receipt", "whether snow prevented"),
    "craft-apprentice": ("instruction and lodging", "attendance duty", "completion or departure record"),
    "memorial-speech": ("honoring ceremony", "villagers' views", "project expense accounts"),
}


def rows():
    """Return fresh dictionaries so callers cannot mutate the authored manifest."""
    result = []
    for context in CONTEXTS:
        source = " ".join(context["facts"])
        for index, (question, evidence, next_question) in enumerate(context["tasks"], 1):
            quote = context["facts"][evidence] if evidence >= 0 else None
            result.append({
                "id": f"train-r2a-{context['slug']}-{index}",
                "family": f"train-r2a-{context['slug']}",
                "contextId": f"train-r2a-{context['slug']}",
                "subject": context["subject"],
                "level": "grades 6-8 (author estimate; not validated)",
                "source": source,
                "question": question,
                "target": f"EVIDENCE: {quote if quote is not None else 'insufficient'}\nNEXT: {next_question}",
                "expectedAbstention": quote is None,
                "acceptedQuotes": [quote] if quote is not None else [],
                "nextStepAnchors": [NEXT_ANCHORS[context["slug"]][index - 1]],
                "answerability": "answerable" if evidence >= 0 else ("conflicting" if evidence == -2 else "missing"),
            })
    return result

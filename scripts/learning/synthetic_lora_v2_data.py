"""Original research fixtures. No student records, textbook text or review claims."""
from prepare_synthetic_lora import SYSTEM


def record(identifier, family, source, question, quote, hint, anchors):
    return {"id": identifier, "family": family, "source": source, "question": question,
            "expectedAbstention": quote == "insufficient", "nextStepAnchors": anchors,
            "messages": [{"role": "system", "content": SYSTEM},
                         {"role": "user", "content": f"SOURCE: {source}\nQUESTION: {question}"},
                         {"role": "assistant", "content": f"EVIDENCE: {quote}\nNEXT: {hint}"}]}


def datasets():
    train = []
    for index in range(8):
        n = index + 2
        examples = [
            ("equal-groups", f"There are {n} bags, each with {n+3} beads. Multiplication combines equal groups.", "How can I start counting the beads?", "Multiplication combines equal groups", "Which two numbers describe the groups and the beads in each group?", ["group", "bag"]),
            ("fraction-denominator", f"A whole strip is split into {n+4} equal pieces. The denominator counts all the equal pieces in one whole.", "How should I choose a denominator?", "denominator counts all the equal pieces", "How many equal pieces make the whole strip?", ["piece", "strip"]),
            ("measurement-unit", f"A tray contains {n} liters of water. One liter is one thousand milliliters.", "How can I begin converting the volume?", "One liter is one thousand milliliters", "What conversion factor connects liters to milliliters?", ["liter", "conversion"]),
            ("pronoun-reference", f"Tala gave a notebook to Kiran because he requested it. The name Kiran is the antecedent of he in this sentence.", "Where should I look to identify who he refers to?", "Kiran is the antecedent of he", "Which name does the sentence connect to the pronoun he?", ["name", "pronoun"]),
            ("claim-reason", f"The speaker recommends planting trees because their shade cools the playground. This statement gives a claim and a supporting reason.", "Which words help identify the supporting reason?", "their shade cools the playground", "How does the shade explain the recommendation to plant trees?", ["shade", "reason"]),
            ("fair-test", f"Group A receives {n} hours of light and group B receives {n+2} hours. Both groups receive the same water and soil.", "Which conditions should I compare to check fairness?", "same water and soil", "Which conditions stay the same while the light changes?", ["condition", "water", "soil"]),
            ("thermal-direction", f"A cup at {n+50} degrees touches a plate at {n+20} degrees. Thermal energy moves from warmer objects to cooler objects.", "What rule helps me trace thermal energy?", "from warmer objects to cooler objects", "Which object is warmer and which is cooler?", ["warmer", "cooler", "temperature"]),
            ("historical-purpose", f"An invented town notice urges residents to repair a bridge. It was written to persuade residents to contribute labor.", "How can I identify why the notice was written?", "persuade residents to contribute labor", "What action does the notice ask residents to take?", ["action", "resident", "labor"]),
        ]
        for family, source, question, quote, hint, anchors in examples:
            # Distinct source context for each repeated skill, with no claim of
            # semantic independence between within-family variants.
            source = f"Practice record {index+1}. {source}"
            train.append(record(f"train-{family}-{index}", family, source, question, quote, hint, anchors))
        # Matched evidence-present and evidence-absent questions on the same
        # source teach that the QUESTION determines whether evidence suffices.
        source = f"A fictional boat traveled {n+10} kilometers. Its travel time was {n} hours. No passenger count was recorded."
        train.append(record(f"train-available-{index}", "evidence-contrast", source,
                            "Where can I find the duration for a speed calculation?", f"travel time was {n} hours",
                            "Which recorded number gives the travel time?", ["time", "hour"]))
        train.append(record(f"train-missing-{index}", "evidence-contrast", source,
                            "How many passengers traveled on the boat?", "insufficient",
                            "What source could help us check this?", ["source"]))
    # New contexts fixed before training. They are machine-authored tests, not
    # independent expert benchmarks. Prior v1 test cases are never imported.
    validation_cases = [
        ("ratio", "The recipe uses two cups of oats for each cup of seeds. A ratio compares the two ingredient amounts.", "What quantities should I compare?", "two cups of oats for each cup of seeds", "Which amount belongs to oats and which belongs to seeds?", ["oat", "seed", "amount"]),
        ("perimeter", "The fence follows the outside edge of a garden. Perimeter adds the lengths of all boundary sides.", "How can I plan a perimeter calculation?", "adds the lengths of all boundary sides", "Which boundary side lengths do you need to add?", ["side", "length", "add"]),
        ("main-idea", "Each paragraph explains how wetlands hold water during storms. The repeated topic is water storage in wetlands.", "Where should I look for the main idea?", "water storage in wetlands", "What idea about wetlands appears across the paragraphs?", ["wetland", "paragraph"]),
        ("opposing-views", "One writer supports a longer lunch break. Another writer argues for more classroom time instead.", "How should I begin comparing their positions?", "more classroom time instead", "How does classroom time contrast with the longer lunch break?", ["classroom", "lunch", "contrast"]),
        ("density", "Density compares mass with volume. The sample has a measured mass and a measured volume.", "What measurements matter for density?", "compares mass with volume", "Which measurement is mass and which is volume?", ["mass", "volume"]),
        ("evaporation", "Water molecules escape from a liquid surface into the air during evaporation.", "What should I track when water evaporates?", "from a liquid surface into the air", "Where do the water molecules move from and to?", ["water", "molecule", "move"]),
        ("timeline", "An invented diary entry dated April comes before an invented entry dated June in the same year.", "What evidence helps order the entries?", "April comes before", "Which month appears earlier in the same year?", ["month", "april", "date"]),
        ("author-access", "A fictional witness stood inside the station. The witness could describe the station interior but could not see the street.", "What limits this witness's account?", "could not see the street", "Which location was outside the witness's view?", ["view", "street", "see"]),
    ]
    test_cases = [
        ("unit-rate", "A printer makes thirty pages in five minutes. A unit rate expresses pages for one minute.", "What does the unit rate need to express?", "pages for one minute", "How would you compare pages with a single minute?", ["page", "minute"]),
        ("negative-product", "The product of a negative number and a positive number is negative. The expression is negative four times three.", "Which sign rule should guide my first step?", "negative number and a positive number is negative", "What are the signs of the two factors?", ["sign", "factor", "negative"]),
        ("median", "The ordered measurements are one, four, six, eight, and nine. A median occupies the middle position in ordered data.", "How should I locate the median?", "middle position in ordered data", "Which position is in the middle of the ordered list?", ["middle", "position", "order"]),
        ("graph-axis", "The horizontal axis records elapsed seconds and the vertical axis records distance in meters.", "How do I identify what each graph axis measures?", "horizontal axis records elapsed seconds", "Which axis shows time and which shows distance?", ["axis", "time", "distance"]),
        ("tone", "The narrator calls the new room welcoming and bright. These descriptions suggest a favorable attitude toward the room.", "Which words could support a claim about tone?", "welcoming and bright", "What attitude do welcoming and bright suggest?", ["attitude", "welcoming", "bright"]),
        ("contrast-signal", "The passage says the trail was steep; however, the hikers continued. However introduces a contrast between ideas.", "What does the transition word signal?", "However introduces a contrast", "Which two ideas are contrasted by however?", ["contrast", "however", "idea"]),
        ("revision-detail", "The draft says the animal moved. A revision can replace a general verb with a more precise action verb.", "What part of this sentence could become more precise?", "general verb with a more precise action verb", "Which action verb could describe how the animal moved?", ["verb", "action", "move"]),
        ("quoted-support", "The essay claims the setting is noisy. The supplied passage describes carts rattling over stones.", "Which textual detail could support the claim?", "carts rattling over stones", "How does the rattling detail relate to a noisy setting?", ["rattling", "noisy", "sound"]),
        ("force-balance", "Two equal forces push a cart in opposite directions. Balanced forces have a net force of zero.", "What should I compare before finding net force?", "equal forces push a cart in opposite directions", "How do the sizes and directions of the forces compare?", ["force", "direction", "size"]),
        ("cell-boundary", "The cell membrane regulates substances entering and leaving a cell.", "What function should I inspect when studying the membrane?", "regulates substances entering and leaving", "Which substances are entering or leaving the cell?", ["substance", "enter", "leav"]),
        ("earth-rotation", "Earth rotates about its axis. This rotation makes different locations face toward or away from sunlight.", "What motion helps explain the day-night pattern?", "rotates about its axis", "How does rotation change which locations face sunlight?", ["rotat", "sunlight", "face"]),
        ("sampling", "The survey questioned only members of a chess club. It did not sample all students at the school.", "What limits how widely I can generalize this survey?", "only members of a chess club", "Who was included in the sample and who was left out?", ["sample", "include", "club"]),
        ("archive-audience", "A fictional council report was addressed to local merchants. The intended audience was the town's traders.", "What helps me identify the report's audience?", "addressed to local merchants", "Who was expected to read the report?", ["read", "who", "audience"]),
        ("corroboration", "Two invented accounts describe a flooded road on the same day. Their agreement supports checking the event against another record.", "How can I investigate agreement between these accounts?", "checking the event against another record", "What additional record could help check the shared claim?", ["record", "check", "claim"]),
        ("map-key", "The map key says dashed lines mark walking paths. Solid lines mark vehicle roads.", "Where should I look to interpret a dashed line?", "dashed lines mark walking paths", "What feature does the key associate with dashed lines?", ["key", "dash", "path"]),
        ("source-date", "The invented photograph was taken after the station renovation. It cannot directly show the station before renovation.", "What time limit matters when using this photograph?", "cannot directly show the station before renovation", "Does the photograph show the time period you want to study?", ["time", "period", "before", "after"]),
    ]
    missing_validation = [("A map marks three bridges.", "Who designed the oldest bridge?"), ("A jar contains red and blue beads.", "What is the probability of drawing red without counts?"), ("An invented character walks into a library.", "What is the character's birth year?"), ("A report records the height of a tree.", "What is the soil acidity?")]
    missing_test = [("A package has a mass of two kilograms.", "What is its volume?"), ("A fictional letter gives its writer's hometown.", "What is the writer's age?"), ("The graph records temperature over time.", "What was the wind speed?"), ("A paragraph describes a blue door.", "Who painted the door?")]
    def split(name, cases, missing):
        result = [record(f"{name}-{family}", family, source, question, quote, hint, anchors) for family, source, question, quote, hint, anchors in cases]
        result += [record(f"{name}-missing-{i}", f"{name}-missing-{i}", source, question, "insufficient", "What source could help us check this?", ["source"]) for i, (source, question) in enumerate(missing)]
        return result
    return train, split("validation", validation_cases, missing_validation), split("test", test_cases, missing_test)

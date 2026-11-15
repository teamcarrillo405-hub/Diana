"""Development-only corrections declared before v3 adapter outputs existed.

The final evaluation remains sealed and is never imported by this module.
"""
from copy import deepcopy
from synthetic_lora_v3_data import datasets as v3_datasets, SYSTEM
from synthetic_lora_v4_data import training_cases


def datasets():
    train, validation = deepcopy(v3_datasets())
    for row in train:
        if row["family"] == "train-v3-topic-6":
            row["source"] = row["source"].replace("An exponent tells", "A positive integer exponent tells")
            row["messages"][1]["content"] = f"SOURCE: {row['source']}\nQUESTION: {row['question']}"
    # Scope of these alternatives was independently documented before v3
    # adapter validation outputs. Do not add post-hoc favorable alternatives.
    additions = {
        "validation-v3-13-present": "Enzymes speed up chemical reactions",
        "validation-v3-7-present": "the controlling idea that the paragraph develops",
        "validation-v3-10-present": "explains why its own claim remains supported",
    }
    for row in validation:
        if row["id"] in additions:
            row["acceptedQuotes"].append(additions[row["id"]])
    for row in training_cases():
        copied = deepcopy(row)
        copied["messages"] = [{"role":"system","content":SYSTEM},
                              {"role":"user","content":f"SOURCE: {copied['source']}\nQUESTION: {copied['question']}"},
                              {"role":"assistant","content":copied["target"]}]
        train.append(copied)
    return train, validation

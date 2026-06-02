export type AlgorithmMode = "bubble_sort" | "binary_search" | "linked_list";

export type AlgorithmStep = {
  label: string;
  values: number[];
  activeIndices: number[];
  note: string;
};

export function parseNumberList(input: string, max = 12): number[] {
  return input
    .split(/[\s,]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
    .slice(0, max);
}

export function buildAlgorithmSteps(
  mode: AlgorithmMode,
  values: number[],
  target: number,
): AlgorithmStep[] {
  if (mode === "binary_search") return binarySearchSteps(values, target);
  if (mode === "linked_list") return linkedListTraversalSteps(values);
  return bubbleSortSteps(values);
}

export function bubbleSortSteps(values: number[]): AlgorithmStep[] {
  const arr = values.slice(0, 10);
  const steps: AlgorithmStep[] = [
    { label: "Start", values: [...arr], activeIndices: [], note: "Read the list from left to right." },
  ];
  for (let pass = 0; pass < arr.length - 1; pass += 1) {
    for (let i = 0; i < arr.length - pass - 1; i += 1) {
      steps.push({
        label: `Compare ${i} and ${i + 1}`,
        values: [...arr],
        activeIndices: [i, i + 1],
        note: arr[i]! > arr[i + 1]! ? "Swap because the left value is larger." : "Keep the order.",
      });
      if (arr[i]! > arr[i + 1]!) {
        const temp = arr[i]!;
        arr[i] = arr[i + 1]!;
        arr[i + 1] = temp;
        steps.push({
          label: "After swap",
          values: [...arr],
          activeIndices: [i, i + 1],
          note: "The larger value moved one position right.",
        });
      }
      if (steps.length >= 32) return steps;
    }
  }
  steps.push({ label: "Sorted", values: [...arr], activeIndices: [], note: "No more adjacent swaps are needed." });
  return steps;
}

export function binarySearchSteps(values: number[], target: number): AlgorithmStep[] {
  const arr = [...values].sort((a, b) => a - b).slice(0, 16);
  const steps: AlgorithmStep[] = [
    { label: "Sorted input", values: [...arr], activeIndices: [], note: "Binary search starts with sorted values." },
  ];
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = arr[mid]!;
    steps.push({
      label: `Check middle index ${mid}`,
      values: [...arr],
      activeIndices: [left, mid, right].filter((value, index, list) => list.indexOf(value) === index),
      note: `${midValue} ${midValue === target ? "matches" : midValue < target ? "is below" : "is above"} the target ${target}.`,
    });
    if (midValue === target) {
      steps.push({ label: "Found", values: [...arr], activeIndices: [mid], note: "The middle value is the target." });
      return steps;
    }
    if (midValue < target) left = mid + 1;
    else right = mid - 1;
  }
  steps.push({ label: "Not found", values: [...arr], activeIndices: [], note: "The search window is empty." });
  return steps;
}

export function linkedListTraversalSteps(values: number[]): AlgorithmStep[] {
  const arr = values.slice(0, 12);
  if (arr.length === 0) {
    return [{ label: "Empty list", values: [], activeIndices: [], note: "There is no head node to visit." }];
  }
  return arr.map((value, index) => ({
    label: index === 0 ? "Head" : `Next ${index}`,
    values: [...arr],
    activeIndices: [index],
    note: index === arr.length - 1
      ? `Visit ${value}; next is null.`
      : `Visit ${value}; follow next to ${arr[index + 1]}.`,
  }));
}

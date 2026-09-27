import type { Child } from "@/contexts/SelectedChildContext";

const CHILD_COLORS = ["#4C6EF5", "#18864B", "#3973B8", "#0F8B8D", "#C43D48"];

export function withChildColors(children: Child[]) {
  return children.map((child, index) => ({
    ...child,
    color: child.color || CHILD_COLORS[index % CHILD_COLORS.length],
  }));
}

export function reconcileSelectedChild(
  children: Child[],
  stored: Child | null,
) {
  if (children.length === 0) return null;
  return (
    children.find(
      (child) => child.id_estudiante === stored?.id_estudiante,
    ) ?? children[0]
  );
}

export function updateChildAvatarState(
  children: Child[],
  selectedChild: Child | null,
  studentId: number,
  avatarUrl: string | null,
) {
  const update = (child: Child) =>
    child.id_estudiante === studentId
      ? { ...child, avatar_url: avatarUrl }
      : child;

  return {
    children: children.map(update),
    selectedChild: selectedChild ? update(selectedChild) : null,
  };
}

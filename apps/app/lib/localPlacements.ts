const localRotations = new Map<string, number>();

export function setLocalRotation(placementId: string, rotationDeg: number): void {
  localRotations.set(placementId, rotationDeg);
}

export function getLocalRotation(placementId: string): number | undefined {
  return localRotations.get(placementId);
}

/**
 * Computes display dimensions that fit within a container while preserving
 * the original aspect ratio (object-fit: contain behavior).
 *
 * The result maximizes one axis to fill the container as much as possible
 * without exceeding container bounds.
 */
export function computeFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const containerAspect = containerWidth / containerHeight;

  if (sourceAspect > containerAspect) {
    // Source is wider relative to container — constrain by width
    return {
      width: containerWidth,
      height: containerWidth / sourceAspect,
    };
  } else {
    // Source is taller relative to container — constrain by height
    return {
      width: containerHeight * sourceAspect,
      height: containerHeight,
    };
  }
}

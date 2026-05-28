/**
 * Computes display dimensions for a flashcard image, maintaining the original
 * aspect ratio with a maximum height of 60% of the viewport height.
 *
 * The image is scaled to fit within the available width while never exceeding
 * the max height constraint.
 */
export function flashcardImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { width: number; height: number } {
  const maxHeight = viewportHeight * 0.6;
  const aspectRatio = naturalWidth / naturalHeight;

  // Start by fitting to the available width
  let width = viewportWidth;
  let height = viewportWidth / aspectRatio;

  // If height exceeds the max, constrain by height instead
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return { width, height };
}

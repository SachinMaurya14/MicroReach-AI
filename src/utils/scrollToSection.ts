export function scrollToSection(sectionId: string): void {
  const cleanId = sectionId.startsWith('#') ? sectionId.slice(1) : sectionId;
  const target = document.getElementById(cleanId);
  if (!target) return;

  const headerOffset = 88;
  const elementPosition = target.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = Math.max(0, elementPosition - headerOffset);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: offsetPosition,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

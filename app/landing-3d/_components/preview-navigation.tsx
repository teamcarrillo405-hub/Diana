import styles from "./preview-navigation.module.css";

export const PREVIEW_NAVIGATION = [
  { label: "Lobby", href: "/landing-3d/today-now-assets?character=relit" },
  { label: "Work", href: "/landing-3d/work-concept-review" },
  { label: "Classes", href: "/landing-3d/classes-concept-review" },
  { label: "Calendar", href: "/landing-3d/calendar-concept-review" },
  { label: "More", href: "/landing-3d/more-concept-review" },
] as const;

export type PreviewDestination = typeof PREVIEW_NAVIGATION[number]["label"];

/** One navigation contract across the connected, local student previews. */
export function PreviewNavigation({ active, onLobby }: { active: PreviewDestination; onLobby?: () => void }) {
  return <header className={styles.navigation} data-preview-navigation>
    <a className={styles.brand} href={PREVIEW_NAVIGATION[0].href} aria-label="Diana Lobby" onClick={onLobby ? event => { event.preventDefault(); onLobby(); } : undefined}>
      <img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" width="140" height="46" />
    </a>
    <nav aria-label="Primary">
      {PREVIEW_NAVIGATION.map(item => <a key={item.label} href={item.href} aria-current={active === item.label ? "page" : undefined} onClick={item.label === "Lobby" && onLobby ? event => { event.preventDefault(); onLobby(); } : undefined}>{item.label}</a>)}
    </nav>
    <a href="/landing-3d/settings-concept-review" className={styles.account} aria-label="Settings"><span aria-hidden="true">AM</span></a>
  </header>;
}

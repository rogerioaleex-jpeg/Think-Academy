import * as React from 'react';

// Ícones inline (lucide-style) — sem dependência de fonte externa.
const P: Record<string, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  menu_book: '<path d="M12 7v13"/><path d="M4 5h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5v13h-5a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4z"/>',
  terminal: '<path d="M5 17l6-5-6-5"/><path d="M12 19h7"/>',
  my_location: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  monitor_heart: '<path d="M3 12h3l2 5 4-11 2 6h7"/>',
  build: '<path d="M14.5 6.5a4 4 0 0 1-5.2 5.2L4 17.3V20h2.7l5.6-5.3a4 4 0 0 1 5.2-5.2l-2.6 2.6-2-.5-.5-2z"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 4 2.5c-.9.5-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none"/>',
  leaderboard: '<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="10"/>',
  military_tech: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5"/>',
  radar: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 12l6-4"/>',
  badge: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.9-2 3-2s2.4.6 3 2"/><line x1="14" y1="10" x2="18" y2="10"/><line x1="14" y1="14" x2="18" y2="14"/>',
  workspace_premium: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13L7 21l5-3 5 3-1.5-8"/>',
  notifications: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 6 2.5 8H3.5C3.5 15 6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  groups: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.6c1.8.6 3 2 3.5 4"/>',
  insights: '<path d="M4 16l5-5 3 3 6-7"/><path d="M18 5h3v3"/>',
  payments: '<line x1="12" y1="3" x2="12" y2="21"/><path d="M16.5 7H9.8a2.8 2.8 0 0 0 0 5.6h4.4a2.8 2.8 0 0 1 0 5.6H7"/>',
  group_add: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3 3-4.5 5.5-4.5c1 0 1.9.2 2.7.6"/><line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/>',
  security: '<path d="M12 2.5l7.5 3.5v5.5c0 4.7-3.2 7.6-7.5 9.5-4.3-1.9-7.5-4.8-7.5-9.5V6z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 6 2.5 8H3.5C3.5 15 6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>',
};

export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}
      dangerouslySetInnerHTML={{ __html: P[name] ?? P.dashboard }}
    />
  );
}

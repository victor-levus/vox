export interface Reaction {
  id: string;
  emoji: string;
}

interface ReactionOverlayProps {
  reactions: Reaction[];
}

export function ReactionOverlay({ reactions }: ReactionOverlayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => {
        // Derive a pseudo-random horizontal position from the id so multiple
        // simultaneous reactions don't stack exactly on top of each other.
        const xPct = 20 + (r.id.charCodeAt(r.id.length - 1) % 60);
        return (
          <span
            key={r.id}
            className="absolute text-3xl"
            style={{
              bottom: '40px',
              left: `${xPct}%`,
              animation: 'reaction-float 3s ease-out forwards',
            }}
          >
            {r.emoji}
          </span>
        );
      })}
    </div>
  );
}

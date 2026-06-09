import { useState, useMemo } from 'react';
import { VideoTile } from './VideoTile';
import type { Participant, User } from '@/types';

interface TileData {
  key: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isHandRaised: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localUser: User;
  isLocalAudioEnabled: boolean;
  isLocalVideoEnabled: boolean;
  isLocalHandRaised: boolean;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
}

function gridColsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count <= 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
}

export function VideoGrid({
  localStream,
  localUser,
  isLocalAudioEnabled,
  isLocalVideoEnabled,
  isLocalHandRaised,
  remoteStreams,
  participants,
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const tiles: TileData[] = useMemo(() => {
    const list: TileData[] = [
      {
        key: 'local',
        stream: localStream,
        name: localUser.name,
        isLocal: true,
        isAudioEnabled: isLocalAudioEnabled,
        isVideoEnabled: isLocalVideoEnabled,
        isHandRaised: isLocalHandRaised,
      },
    ];

    for (const [socketId, stream] of remoteStreams) {
      const p = participants.find((x) => x.socketId === socketId);
      list.push({
        key: socketId,
        stream,
        name: p?.user.name ?? 'Participant',
        isLocal: false,
        isAudioEnabled: p?.isAudioEnabled ?? true,
        isVideoEnabled: p?.isVideoEnabled ?? true,
        isHandRaised: p?.isHandRaised ?? false,
      });
    }

    return list;
  }, [localStream, localUser, isLocalAudioEnabled, isLocalVideoEnabled, isLocalHandRaised, remoteStreams, participants]);

  const count = tiles.length;
  const pinnedTile = pinnedId ? tiles.find((t) => t.key === pinnedId) ?? null : null;

  // Spotlight layout: one large pinned tile + strip of others
  if (pinnedTile) {
    const otherTiles = tiles.filter((t) => t.key !== pinnedId);
    return (
      <div className="flex h-full flex-col gap-2 p-2">
        <div className="min-h-0 flex-1">
          <VideoTile {...pinnedTile} isPinned onTogglePin={() => setPinnedId(null)} />
        </div>
        {otherTiles.length > 0 && (
          <div className="flex h-28 shrink-0 gap-2 overflow-x-auto">
            {otherTiles.map((tile) => (
              <div key={tile.key} className="h-full w-44 shrink-0">
                <VideoTile {...tile} onTogglePin={() => setPinnedId(tile.key)} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout: equal tiles
  return (
    <div
      className={`grid h-full auto-rows-fr gap-2 p-2 ${gridColsClass(count)} ${
        count > 9 ? 'overflow-y-auto' : ''
      }`}
    >
      {tiles.map((tile) => (
        <VideoTile key={tile.key} {...tile} onTogglePin={() => setPinnedId(tile.key)} />
      ))}
    </div>
  );
}

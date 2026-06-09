import { useState, useMemo } from 'react';
import { VideoTile } from './VideoTile';
import type { Reaction } from './ReactionOverlay';
import type { Participant, User } from '@/types';
import { useAppSelector } from '@/store';

interface TileData {
  key: string;
  userId: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  reactions: Reaction[];
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localUser: User;
  isLocalAudioEnabled: boolean;
  isLocalVideoEnabled: boolean;
  isLocalHandRaised: boolean;
  isLocalScreenSharing: boolean;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  reactionsByUserId: Map<string, Reaction[]>;
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
  isLocalScreenSharing,
  remoteStreams,
  participants,
  reactionsByUserId,
}: VideoGridProps) {
  // undefined = no manual choice; string = manually pinned; null = explicitly unpinned
  const [manualPinnedId, setManualPinnedId] = useState<string | null | undefined>(undefined);

  const meetingLayout = useAppSelector((s) => s.ui.meetingLayout);
  const audioOutputId = useAppSelector((s) => s.ui.audioOutputId);

  const tiles: TileData[] = useMemo(() => {
    const list: TileData[] = [
      {
        key: 'local',
        userId: localUser.id,
        stream: localStream,
        name: localUser.name,
        isLocal: true,
        isAudioEnabled: isLocalAudioEnabled,
        isVideoEnabled: isLocalVideoEnabled,
        isHandRaised: isLocalHandRaised,
        isScreenSharing: isLocalScreenSharing,
        reactions: reactionsByUserId.get(localUser.id) ?? [],
      },
    ];

    for (const [socketId, stream] of remoteStreams) {
      const p = participants.find((x) => x.socketId === socketId);
      const uid = p?.userId ?? socketId;
      list.push({
        key: socketId,
        userId: uid,
        stream,
        name: p?.user.name ?? 'Participant',
        isLocal: false,
        isAudioEnabled: p?.isAudioEnabled ?? true,
        isVideoEnabled: p?.isVideoEnabled ?? true,
        isHandRaised: p?.isHandRaised ?? false,
        isScreenSharing: p?.isScreenSharing ?? false,
        reactions: reactionsByUserId.get(uid) ?? [],
      });
    }

    return list;
  }, [localStream, localUser, isLocalAudioEnabled, isLocalVideoEnabled, isLocalHandRaised, isLocalScreenSharing, remoteStreams, participants, reactionsByUserId]);

  // Screen share always takes priority
  const screenShareTile = useMemo(() => tiles.find((t) => t.isScreenSharing), [tiles]);

  // In spotlight layout preference, auto-pin the first remote tile when no manual choice
  const autoSpotlightKey = useMemo(() => {
    if (meetingLayout !== 'spotlight') return null;
    return tiles.find((t) => !t.isLocal)?.key ?? null;
  }, [meetingLayout, tiles]);

  const effectivePinnedId =
    screenShareTile?.key ?? (manualPinnedId !== undefined ? manualPinnedId : autoSpotlightKey);

  const pinnedTile = effectivePinnedId
    ? tiles.find((t) => t.key === effectivePinnedId) ?? null
    : null;

  const count = tiles.length;

  // Spotlight layout: one large pinned tile + horizontal strip of others
  if (pinnedTile) {
    const otherTiles = tiles.filter((t) => t.key !== effectivePinnedId);
    return (
      <div className="flex h-full flex-col gap-2 p-2">
        <div className="min-h-0 flex-1">
          <VideoTile
            {...pinnedTile}
            isPinned
            audioOutputId={pinnedTile.isLocal ? undefined : audioOutputId}
            onTogglePin={screenShareTile ? undefined : () => setManualPinnedId(null)}
          />
        </div>
        {otherTiles.length > 0 && (
          <div className="flex h-28 shrink-0 gap-2 overflow-x-auto">
            {otherTiles.map((tile) => (
              <div key={tile.key} className="h-full w-44 shrink-0">
                <VideoTile
                  {...tile}
                  audioOutputId={tile.isLocal ? undefined : audioOutputId}
                  onTogglePin={screenShareTile ? undefined : () => setManualPinnedId(tile.key)}
                />
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
        <VideoTile
          key={tile.key}
          {...tile}
          audioOutputId={tile.isLocal ? undefined : audioOutputId}
          onTogglePin={() => setManualPinnedId(tile.key)}
        />
      ))}
    </div>
  );
}

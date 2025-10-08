import React, { useEffect, useMemo, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import {
  HighlightControllerLike,
  HighlightSnapshot,
} from './types';
import './highlight.css';

export function useHighlightSnapshot(controller: HighlightControllerLike): HighlightSnapshot {
  return useSyncExternalStore(
    controller.subscribe.bind(controller),
    controller.getSnapshot.bind(controller),
    controller.getSnapshot.bind(controller)
  );
}

interface HighlightLayerProps {
  controller: HighlightControllerLike;
  className?: string;
  style?: React.CSSProperties;
}

export function HighlightLayer({ controller, className, style }: HighlightLayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshot = useHighlightSnapshot(controller);

  useEffect(() => {
    controller.setHost(hostRef.current);
    return () => controller.setHost(null);
  }, [controller]);

  const classNames = useMemo(() => {
    const base = 'highlight-layer';
    if (!className) return base;
    return `${base} ${className}`;
  }, [className]);

  return (
    <div ref={hostRef} className={classNames} style={style} aria-hidden>
      {snapshot.items.map((item) => {
        const styleForItem: React.CSSProperties = {
          transform: `translate3d(${item.rect.x}px, ${item.rect.y}px, 0)`,
          width: `${item.rect.width}px`,
          height: `${item.rect.height}px`,
        };
        const radius = Math.max(4, item.rect.radius);
        return (
          <div
            key={`${item.id}-${item.activatedAt}`}
            className="highlight-layer__ring"
            data-role={item.role}
            data-accent={item.accent}
            style={styleForItem}
          >
            <span
              className="highlight-layer__halo"
              style={{ borderRadius: `${radius}px` }}
            />
          </div>
        );
      })}
      {snapshot.tethers.map((tether) => {
        const left = Math.min(tether.from.x, tether.to.x);
        const width = Math.max(2, Math.abs(tether.to.x - tether.from.x));
        const top = Math.max(tether.from.y, tether.to.y);
        return (
          <span
            key={`${tether.id}-${tether.activatedAt}`}
            className="highlight-layer__tether"
            style={{
              transform: `translate3d(${left}px, ${top}px, 0)`,
              width: `${width}px`,
            }}
          />
        );
      })}
    </div>
  );
}

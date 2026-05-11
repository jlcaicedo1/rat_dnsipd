import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";

type TableScrollFrameProps = {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
};

export function TableScrollFrame({
  children,
  className,
  maxHeight = "68vh",
}: TableScrollFrameProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railSyncRef = useRef(false);
  const viewportSyncRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    let frameId = 0;

    const syncMeasurements = () => {
      const nextScrollWidth = viewport.scrollWidth;
      const nextClientWidth = viewport.clientWidth;

      setScrollWidth(nextScrollWidth);
      setHasOverflow(nextScrollWidth > nextClientWidth + 1);

      if (railRef.current) {
        railRef.current.scrollLeft = viewport.scrollLeft;
      }
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncMeasurements);
    };

    scheduleSync();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleSync) : null;

    resizeObserver?.observe(viewport);

    const table = viewport.querySelector("table");
    if (table) {
      resizeObserver?.observe(table);
    }

    window.addEventListener("resize", scheduleSync);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [children]);

  const handleViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    if (railSyncRef.current) {
      railSyncRef.current = false;
      return;
    }

    if (railRef.current) {
      viewportSyncRef.current = true;
      railRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  const handleRailScroll = (event: UIEvent<HTMLDivElement>) => {
    if (viewportSyncRef.current) {
      viewportSyncRef.current = false;
      return;
    }

    if (viewportRef.current) {
      railSyncRef.current = true;
      viewportRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="table-scroll-shell">
      {hasOverflow ? (
        <div
          ref={railRef}
          className="table-scroll-rail"
          aria-label="Desplazamiento horizontal de la tabla"
          onScroll={handleRailScroll}
        >
          <div className="table-scroll-rail-content" style={{ width: scrollWidth }} />
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={["table-wrapper", "table-wrapper-viewport", className]
          .filter(Boolean)
          .join(" ")}
        onScroll={handleViewportScroll}
        data-max-height={maxHeight}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PADDING = 24;

export function usePdfEditorStage(pdfUrl: string, pageNumber = 1) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef({ width: 0, height: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfPageRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);

  const [pageCount, setPageCount] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);

  const renderPdf = useCallback(async () => {
    const viewport = viewportRef.current;
    const page = pdfPageRef.current;
    const canvas = canvasRef.current;
    const pageSize = pageSizeRef.current;

    if (!viewport || !page || !canvas || pageSize.width <= 0) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw < 120 || vh < 120) return;

    const fitScale = Math.min(
      (vw - PADDING) / pageSize.width,
      (vh - PADDING) / pageSize.height,
    );
    if (fitScale <= 0) return;

    const pdfViewport = page.getViewport({ scale: fitScale });
    const context = canvas.getContext("2d");
    if (!context) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore cancelled render
      }
    }

    canvas.width = pdfViewport.width;
    canvas.height = pdfViewport.height;

    const task = page.render({
      canvas,
      canvasContext: context,
      viewport: pdfViewport,
    });
    renderTaskRef.current = task;

    try {
      await task.promise;
    } catch (err) {
      const name =
        err instanceof Error
          ? err.name
          : typeof err === "object" && err !== null && "name" in err
            ? String(err.name)
            : "";
      if (name !== "RenderingCancelledException") throw err;
      return;
    }

    setStageSize({ width: pdfViewport.width, height: pdfViewport.height });
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setPageReady(false);
    setStageSize({ width: 0, height: 0 });
    setPageCount(1);
    pdfDocRef.current = null;
    pdfPageRef.current = null;
    pageSizeRef.current = { width: 0, height: 0 };

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjs.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setPageCount(Math.max(1, pdf.numPages || 1));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "PDF se nepodařilo načíst.",
        );
        setLoading(false);
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancelled render
        }
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (loading || loadError || !pdfDocRef.current) return;

    let cancelled = false;
    setPageReady(false);
    setStageSize({ width: 0, height: 0 });

    async function loadPage() {
      try {
        const pdf = pdfDocRef.current;
        const total = Math.max(1, pdf.numPages || 1);
        const target = Math.min(Math.max(1, pageNumber), total);
        const page = await pdf.getPage(target);
        const baseViewport = page.getViewport({ scale: 1 });

        if (cancelled) return;

        pageSizeRef.current = {
          width: baseViewport.width,
          height: baseViewport.height,
        };
        pdfPageRef.current = page;
        setPageReady(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Stránku PDF se nepodařilo načíst.",
        );
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [loading, loadError, pageNumber]);

  useEffect(() => {
    if (loading || loadError || !pageReady) return;

    let resizeTimer = 0;
    let frame = 0;

    const scheduleRender = () => {
      void renderPdf();
    };

    frame = requestAnimationFrame(() => {
      requestAnimationFrame(scheduleRender);
    });

    const viewport = viewportRef.current;
    if (!viewport) {
      return () => cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scheduleRender, 100);
    });

    observer.observe(viewport);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [loading, loadError, pageReady, pageNumber, renderPdf]);

  return {
    canvasRef,
    stageRef,
    viewportRef,
    stageSize,
    pageCount,
    loading,
    loadError,
  };
}

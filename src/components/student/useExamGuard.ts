import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const LEAVE_WARNING = "Dilarang keluar/membuka tab lain selama ujian!";
export const BACK_WARNING = "Dilarang menggunakan tombol Back saat ujian berlangsung!";

export function useExamGuard(iframeRef: RefObject<HTMLIFrameElement>, onViolation: () => void) {
  const [violations, setViolations] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(() => Boolean(document.fullscreenElement));
  const leavingRef = useRef(false);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    const raise = (message: string) => {
      if (leavingRef.current) return;
      setViolations((count) => count + 1);
      setWarningMessage(message);
      onViolationRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") raise(LEAVE_WARNING);
    };

    const onWindowBlur = () => {
      window.setTimeout(() => {
        if (document.visibilityState === "hidden") return;
        if (document.activeElement === iframeRef.current) return;
        raise(LEAVE_WARNING);
      }, 0);
    };

    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (!active) raise(LEAVE_WARNING);
    };

    const onPopState = () => {
      if (leavingRef.current) return;
      window.history.pushState({ examGuard: true }, "");
      raise(BACK_WARNING);
    };

    window.history.pushState({ examGuard: true }, "");
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, [iframeRef]);

  const requestFullscreen = useCallback(() => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  const returnToExam = useCallback(() => {
    setWarningMessage(null);
    requestFullscreen();
  }, [requestFullscreen]);

  const markLeaving = useCallback(() => {
    leavingRef.current = true;
  }, []);

  return { violations, warningMessage, fullscreenActive, requestFullscreen, returnToExam, markLeaving };
}

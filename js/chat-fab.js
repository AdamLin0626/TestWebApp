const DEFAULT_STORAGE_KEY = "playroom.chat-fab.position.v1";
const DEFAULT_SIZE = 54;
const SNAP_MARGIN = 20;
const DRAG_THRESHOLD = 5;
const SNAP_TRANSITION = "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)";

export function mountDraggableFab(button, {
  storageKey = DEFAULT_STORAGE_KEY,
  onClick: onActivate = () => {},
  onPositionChange = () => {},
  size = DEFAULT_SIZE,
  edgeMargin = SNAP_MARGIN,
  dragThreshold = DRAG_THRESHOLD
} = {}) {
  if (!button || typeof button.addEventListener !== "function") {
    throw new TypeError("mountDraggableFab requires a button element.");
  }
  if (typeof onActivate !== "function" || typeof onPositionChange !== "function") {
    throw new TypeError("Draggable FAB callbacks must be functions.");
  }

  const document = button.ownerDocument;
  const window = document.defaultView;
  const cleanups = [];
  let drag = null;
  let ignoreNextClick = false;
  let ignoreClickTimer = 0;
  let saveTimer = 0;
  let ignoreMouseUntil = 0;

  const add = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };

  function metrics() {
    const rect = button.getBoundingClientRect();
    const width = rect.width || button.offsetWidth || size;
    const height = rect.height || button.offsetHeight || size;
    return {
      rect,
      width,
      height,
      maxLeft: Math.max(0, window.innerWidth - width),
      maxTop: Math.max(0, window.innerHeight - height)
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function setPosition(left, top, transition = "none") {
    const bounds = metrics();
    const safeLeft = clamp(left, 0, bounds.maxLeft);
    const safeTop = clamp(top, 0, bounds.maxTop);
    button.style.transition = transition;
    button.style.left = `${safeLeft}px`;
    button.style.top = `${safeTop}px`;
    button.style.right = "auto";
    button.style.bottom = "auto";
    return { left: safeLeft, top: safeTop };
  }

  function notifyPositionChange() {
    try {
      onPositionChange(button.getBoundingClientRect());
    } catch (error) {
      console.error("Draggable FAB position callback failed:", error);
    }
  }

  function persistPosition() {
    const rect = button.getBoundingClientRect();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }));
    } catch (error) {
      console.warn("Could not save the chat button position:", error);
    }
  }

  function scheduleSave(delay = 350) {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = 0;
      persistPosition();
      button.style.transition = "";
    }, delay);
  }

  function restorePosition() {
    let saved;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    } catch {
      return;
    }
    if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return;

    const bounds = metrics();
    const isVisible = saved.left >= 0 && saved.top >= 0 &&
      saved.left <= bounds.maxLeft && saved.top <= bounds.maxTop;
    if (!isVisible) return;
    setPosition(saved.left, saved.top);
    window.requestAnimationFrame(notifyPositionChange);
  }

  function beginDrag(source, clientX, clientY, event, touchId = null) {
    if (source === "mouse" && Date.now() < ignoreMouseUntil) return;
    if (source === "mouse" && event.button !== 0) return;
    if (drag) return;
    if (ignoreNextClick) {
      ignoreNextClick = false;
      if (ignoreClickTimer) window.clearTimeout(ignoreClickTimer);
      ignoreClickTimer = 0;
    }

    if (saveTimer) {
      window.clearTimeout(saveTimer);
      saveTimer = 0;
    }
    const bounds = metrics();
    const left = clamp(bounds.rect.left, 0, bounds.maxLeft);
    const top = clamp(bounds.rect.top, 0, bounds.maxTop);
    drag = {
      source,
      touchId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      startLeft: left,
      startTop: top,
      left,
      top,
      originalStyle: {
        left: button.style.left,
        top: button.style.top,
        right: button.style.right,
        bottom: button.style.bottom,
        transition: button.style.transition
      }
    };
    button.classList.add("is-dragging");
    setPosition(left, top, "none");
    if (source === "touch") ignoreMouseUntil = Date.now() + 800;
  }

  function moveDrag(clientX, clientY, event) {
    if (!drag) return 0;
    drag.currentX = clientX;
    drag.currentY = clientY;
    const distance = Math.hypot(clientX - drag.startX, clientY - drag.startY);
    const position = setPosition(
      drag.startLeft + clientX - drag.startX,
      drag.startTop + clientY - drag.startY,
      "none"
    );
    drag.left = position.left;
    drag.top = position.top;
    if (drag.source === "mouse" && distance > 0) event.preventDefault();
    notifyPositionChange();
    return distance;
  }

  function finishDrag(clientX, clientY) {
    if (!drag) return false;
    const current = drag;
    const endX = Number.isFinite(clientX) ? clientX : current.currentX;
    const endY = Number.isFinite(clientY) ? clientY : current.currentY;
    const distance = Math.hypot(endX - current.startX, endY - current.startY);
    const bounds = metrics();
    current.left = clamp(current.startLeft + endX - current.startX, 0, bounds.maxLeft);
    current.top = clamp(current.startTop + endY - current.startY, 0, bounds.maxTop);
    drag = null;
    button.classList.remove("is-dragging");

    if (distance < dragThreshold) {
      button.style.left = current.originalStyle.left;
      button.style.top = current.originalStyle.top;
      button.style.right = current.originalStyle.right;
      button.style.bottom = current.originalStyle.bottom;
      button.style.transition = current.originalStyle.transition;
      notifyPositionChange();
      return false;
    }

    ignoreNextClick = true;
    if (ignoreClickTimer) window.clearTimeout(ignoreClickTimer);
    ignoreClickTimer = window.setTimeout(() => {
      ignoreNextClick = false;
      ignoreClickTimer = 0;
    }, 800);

    const centerX = current.left + bounds.width / 2;
    const targetLeft = centerX < window.innerWidth / 2
      ? edgeMargin
      : window.innerWidth - bounds.width - edgeMargin;
    const minTop = Math.min(edgeMargin, bounds.maxTop);
    const maxTop = Math.max(minTop, window.innerHeight - bounds.height - edgeMargin);
    const targetTop = clamp(current.top, minTop, maxTop);
    setPosition(targetLeft, targetTop, SNAP_TRANSITION);
    notifyPositionChange();
    scheduleSave();
    return true;
  }

  function onMouseDown(event) {
    beginDrag("mouse", event.clientX, event.clientY, event);
  }

  function onMouseMove(event) {
    if (drag?.source === "mouse") moveDrag(event.clientX, event.clientY, event);
  }

  function onMouseUp(event) {
    if (drag?.source === "mouse") finishDrag(event.clientX, event.clientY);
  }

  function findTouch(list, touchId) {
    return Array.from(list || []).find((touch) => touch.identifier === touchId);
  }

  function onTouchStart(event) {
    const touch = event.changedTouches[0] || event.touches[0];
    if (touch) beginDrag("touch", touch.clientX, touch.clientY, event, touch.identifier);
  }

  function onTouchMove(event) {
    if (drag?.source !== "touch") return;
    const touch = findTouch(event.touches, drag.touchId);
    if (touch) moveDrag(touch.clientX, touch.clientY, event);
  }

  function onTouchEnd(event) {
    if (drag?.source !== "touch") return;
    const touch = findTouch(event.changedTouches, drag.touchId);
    if (touch) finishDrag(touch.clientX, touch.clientY);
  }

  function handleClick(event) {
    if (ignoreNextClick && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ignoreNextClick = false;
      if (ignoreClickTimer) window.clearTimeout(ignoreClickTimer);
      ignoreClickTimer = 0;
      return;
    }
    onActivate(event);
  }

  function onResize() {
    if (drag) return;
    if (!button.style.left || !button.style.top) {
      notifyPositionChange();
      return;
    }
    const oldLeft = Number.parseFloat(button.style.left);
    const oldTop = Number.parseFloat(button.style.top);
    const position = setPosition(
      oldLeft,
      oldTop,
      ""
    );
    if (position.left !== oldLeft || position.top !== oldTop) scheduleSave(0);
    notifyPositionChange();
  }

  add(button, "mousedown", onMouseDown);
  add(document, "mousemove", onMouseMove);
  add(document, "mouseup", onMouseUp);
  add(button, "touchstart", onTouchStart, { passive: true });
  add(document, "touchmove", onTouchMove, { passive: true });
  add(document, "touchend", onTouchEnd, { passive: true });
  add(document, "touchcancel", onTouchEnd, { passive: true });
  add(button, "click", handleClick);
  add(window, "resize", onResize);
  restorePosition();

  return {
    destroy() {
      if (drag) button.classList.remove("is-dragging");
      drag = null;
      for (const cleanup of cleanups.splice(0)) cleanup();
      if (ignoreClickTimer) window.clearTimeout(ignoreClickTimer);
      if (saveTimer) window.clearTimeout(saveTimer);
      ignoreClickTimer = 0;
      saveTimer = 0;
    },
    getPosition() {
      const rect = button.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }
  };
}

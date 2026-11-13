function resolveLocale(language) {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("zh")) {
    return /^(zh-(tw|hk|mo)|zh-hant)/i.test(language) ? "zh-Hant" : "zh-Hans";
  }
  if (normalized.startsWith("ja")) return "ja";
  return "en";
}

export async function initializeI18n(documentRef = document, navigatorRef = navigator) {
  let locale = resolveLocale(navigatorRef.language || navigatorRef.languages?.[0] || "en");
  let messages;
  const originals = new WeakMap();
  let templateEntries = [];

  const loadLocaleMessages = async (targetLocale) => {
    const response = await fetch(new URL(`../Lanuage/${targetLocale}.json`, import.meta.url));
    if (!response.ok) throw new Error(`Could not load ${targetLocale} translations (${response.status}).`);
    const baseMessages = (await response.json()).messages;
    const overlayResponse = await fetch(new URL(`../Lanuage/${targetLocale}-games.json`, import.meta.url));
    if (!overlayResponse.ok) throw new Error(`Could not load ${targetLocale} game translations (${overlayResponse.status}).`);
    const overlayMessages = (await overlayResponse.json()).messages;
    if (!baseMessages || !overlayMessages || typeof baseMessages !== "object" || typeof overlayMessages !== "object") {
      throw new TypeError(`Invalid ${targetLocale} translation bundle.`);
    }
    return { ...baseMessages, ...overlayMessages };
  };

  const loadMessages = async (targetLocale) => {
    try {
      messages = await loadLocaleMessages(targetLocale);
      locale = targetLocale;
    } catch (error) {
      console.error(error);
      if (targetLocale === "en") throw error;
      messages = await loadLocaleMessages("en");
      locale = "en";
    }
    templateEntries = Object.entries(messages)
      .filter(([source]) => source.includes("{"))
      .map(([source, translated]) => ({
        regex: new RegExp(`^${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{[^}]+\\\}/g, "(.+?)")}$`),
        translated
      }));
  };
  await loadMessages(locale);

  const translate = (source, params = {}) => {
    let translated = Object.hasOwn(messages, source) ? messages[source] : null;
    if (translated !== null) {
      return translated.replace(/\{([^}]+)\}/g, (placeholder, key) =>
        Object.hasOwn(params, key) ? params[key] : placeholder);
    }
    for (const entry of templateEntries) {
      const match = source.match(entry.regex);
      if (match) {
        let index = 1;
        translated = entry.translated.replace(/\{([^}]+)\}/g, (placeholder, key) =>
          Object.hasOwn(params, key) ? params[key] : match[index++] || placeholder);
        return translated;
      }
    }
    return source;
  };

  const localizeNode = (node) => {
    if (node.nodeType === 3) {
      if (node.parentElement?.closest("[data-no-i18n]")) return;
      let original = originals.get(node);
      if (!original || node.nodeValue !== original.translated) {
        original = { source: node.nodeValue, translated: "" };
        originals.set(node, original);
      }
      const leading = original.source.match(/^\s*/)[0];
      const trailing = original.source.match(/\s*$/)[0];
      const content = original.source.slice(leading.length, original.source.length - trailing.length || undefined);
      const localized = translate(content);
      const needsSpacing = locale === "en" || !/[\u3040-\u30ff\u3400-\u9fff]/.test(localized);
      const translated = `${leading}${localized}${needsSpacing ? trailing : ""}`;
      original.translated = translated;
      if (node.nodeValue !== translated) node.nodeValue = translated;
      return;
    }
    if (node.nodeType !== 1 || node.closest("[data-no-i18n]")) return;
    for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
      if (!node.hasAttribute(attribute)) continue;
      let saved = originals.get(node);
      if (!saved) {
        saved = {};
        originals.set(node, saved);
      }
      let original = saved[attribute];
      if (!original || node.getAttribute(attribute) !== original.translated) {
        original = { source: node.getAttribute(attribute), translated: "" };
        saved[attribute] = original;
      }
      original.translated = translate(original.source);
      if (node.getAttribute(attribute) !== original.translated) {
        node.setAttribute(attribute, original.translated);
      }
    }
    for (const child of node.childNodes) localizeNode(child);
  };

  const apply = () => {
    documentRef.documentElement.lang = locale;
    documentRef.title = translate("playroom — 1A2B");
    localizeNode(documentRef.body);
  };

  apply();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") localizeNode(record.target);
      else if (record.type === "attributes") localizeNode(record.target);
      else for (const node of record.addedNodes) localizeNode(node);
    }
  });
  observer.observe(documentRef.body, {
    attributes: true,
    attributeFilter: ["placeholder", "aria-label", "title"],
    characterData: true,
    childList: true,
    subtree: true
  });

  documentRef.defaultView?.addEventListener("languagechange", async () => {
    const nextLocale = resolveLocale(navigatorRef.language || navigatorRef.languages?.[0] || "en");
    if (nextLocale === locale) return;
    await loadMessages(nextLocale);
    apply();
    documentRef.defaultView?.dispatchEvent(new Event("playroom:localechange"));
  });

  return {
    get locale() {
      return locale;
    },
    t: translate,
    apply
  };
}

import {defaultLocale, locales} from "@/i18n/constants";

// Helper functions for working with cookies
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + name + "=([^;]+)")
  );
  return match ? match[2] : null;
}

function setCookie(name, value) {
  document.cookie =
    name + "=" + value + ";path=/;max-age=31536000;SameSite=Lax";
}

// Get language from cookie
function getLanguageCookie() {
  const cookieValue = getCookie("preferred_lang");
  return cookieValue && locales.includes(cookieValue) ? cookieValue : null;
}

// Get browser language that matches our supported locales
function getBrowserLanguage() {
  // Try to match navigator.languages array first (more specific)
  if (navigator.languages && navigator.languages.length) {
    for (const lang of navigator.languages) {
      const browserLang = lang.split("-")[0]; // Get base language code (e.g., 'en' from 'en-US')
      if (locales.includes(browserLang)) {
        return browserLang;
      }
    }
  }

  // Fall back to navigator.language
  if (navigator.language) {
    const browserLang = navigator.language.split("-")[0];
    if (locales.includes(browserLang)) {
      return browserLang;
    }
  }

  return null;
}

// Get preferred language using the fallback chain
function getPreferredLanguage() {
  // Check cookie first
  const cookieLang = getLanguageCookie();
  if (cookieLang) return cookieLang;

  // Then check browser language
  const browserLang = getBrowserLanguage();
  if (browserLang) return browserLang;

  // Fall back to default
  return defaultLocale;
}

// Initialize language settings
function initializeLanguage() {
  // PART 1: Persistence - Save browser language to cookie if not already set
  if (!getLanguageCookie()) {
    const browserLang = getBrowserLanguage();
    if (browserLang) {
      setCookie("preferred_lang", browserLang);
    } else {
      setCookie("preferred_lang", defaultLocale);
    }
  }

  // PART 2: Redirection - Only on root path
  if (window.location.pathname === "/") {
    const preferredLanguage = getPreferredLanguage();

    // Only redirect if preferred language is not default
    if (preferredLanguage !== defaultLocale) {
      window.location.href = "/" + preferredLanguage + window.location.search;
    }
  }
}

// Execute language initialization when the script runs
initializeLanguage();

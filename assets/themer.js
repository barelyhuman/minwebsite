listenToSystemTheme();

function enableDarkMode() {
  document.documentElement.classList.add("dark");
}
function disableDarkMode() {
  document.documentElement.classList.remove("dark");
}

function getSystemThemePref() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
}

function listenToSystemTheme() {
  getSystemThemePref().addEventListener("change", (e) => {
    if (!e.matches) {
      disableDarkMode();
      return;
    }

    enableDarkMode();
    return;
  });
}

function getSystemTheme() {
  const preference = getSystemThemePref();
  if (preference.matches) {
    return "dark";
  } else {
    return "light";
  }
}

const currTheme = getSystemTheme();
if (currTheme === "dark") {
  enableDarkMode();
} else {
  disableDarkMode();
}

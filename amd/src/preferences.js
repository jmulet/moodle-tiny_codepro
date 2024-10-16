const preferences = {
    theme: "light", /** Light vs dark themes */
    wrap: "false", /** Wrap long lines */
    fs: "false", /** Fullscreen mode */
    prettify: false, /** Apply htmlfy when editor opens */
};

/**
 * @param {string} key The preference key
 * @param {*} [def] The default value (optional)
 * @returns the preference value
 */
const getPref = (key, def) => {
    const stored = localStorage.getItem("tiny-codepro");
    if (stored) {
        Object.assign(preferences, JSON.parse(stored));
    }
    return preferences[key] ?? def;
};

/**
 * Saves the preferences
 */
const savePrefs = () => {
    localStorage.setItem("tiny-codepro", JSON.stringify(preferences));
};

/**
 * @param {*} key The preference key
 * @param {*} value The preference value
 * @param {*} save Whether to save the preference or not (optional)
 */
const setPref = (key, value, save) => {
    preferences[key] = value;
    if (save) {
        savePrefs();
    }
};

export {getPref, setPref, savePrefs};

const preferences = {
    theme: "light", /** Light vs dark themes */
    wrap: "true", /** Wrap long lines */
    fs: "false", /** Fullscreen mode */
    view: undefined, /** Apply htmlfy when editor opens */
};

/**
 * @param {string} key The preference key
 * @param {*} [def] The default value (optional)
 * @returns the preference value
 */
const getPref = (key, def) => {
    const stored = localStorage.getItem("tiny-codepro");
    if (stored) {
        let storedParsed = {};
        try {
            storedParsed = JSON.parse(stored);
        } catch (ex) {
            // eslint-disable-next-line no-console
            console.error("Cannot parse JSON", stored);
        }
        Object.assign(preferences, storedParsed);
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

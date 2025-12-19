
/** @ts-ignore */
/* eslint-disable */

/**
 * @type {import('htmlfy').Config}
 */
const CONFIG = {
  content_wrap: 0,
  ignore: [],
  ignore_with: '!i-£___£%_',
  strict: false,
  tab_size: 2,
  tag_wrap: 0,
  trim: []
};

const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 
  'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
];

/**
 * Defined by state.js and configuration.
 * 
 * CONTENT_IGNORE_PLACEHOLDER
 * SELF_CLOSING_PLACEHOLDER
 * ATTRIBUTE_IGNORE_PLACEHOLDER
 */

/**
 * @typedef {object} Constants
 * @property {string} CONTENT_IGNORE_PLACEHOLDER
 * @property {string} SELF_CLOSING_PLACEHOLDER
 * @property {string} ATTRIBUTE_IGNORE_PLACEHOLDER
 */
/**
 * @typedef {object} State
 * @property {boolean} checked_html - If passed in HTML has been checked for HTML within it.
 * @property {import("htmlfy").Config} config - Validated configuration.
 * @property {boolean} ignored
 * @property {Constants} constants - Constant strings, influenced by ignore_with.
 */

/**
 * @type State
 * 
 * `constants` prefixes and suffixes must be in sync with those in utils.js
 */
const state = {
  checked_html: false,
  config: { ...CONFIG },
  ignored: false,
  constants: {
    CONTENT_IGNORE_PLACEHOLDER: `${CONFIG.ignore_with}_`,
    SELF_CLOSING_PLACEHOLDER: `${CONFIG.ignore_with}/_>`,
    ATTRIBUTE_IGNORE_PLACEHOLDER: `${CONFIG.ignore_with}=_`
  }
};

/**
 * 
 * @returns {State}
 */
const getState = () => state;

/**
 * 
 * @param {Partial<State>} new_state 
 */
const setState = (new_state) => Object.assign(state, new_state);

/**
 * Checks if content contains at least one HTML element or custom HTML element.
 * 
 * The first regex matches void and self-closing elements.
 * The second regex matches normal HTML elements, plus they can have a namespace.
 * The third regex matches custom HTML elemtns, plus they can have a namespace.
 * 
 * HTML elements should begin with a letter, and can end with a letter or number.
 * 
 * Custom elements must begin with a letter, and can end with a letter, number,
 * hyphen, underscore, or period. However, all letters must be lowercase.
 * They must have at least one hyphen, and can only have periods and underscores if there is a hyphen.
 * 
 * These regexes are based on
 * https://w3c.github.io/html-reference/syntax.html#tag-name
 * and
 * https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 * respectively.
 * 
 * @param {string} content Content to evaluate.
 * @returns {boolean} A boolean.
 */
const isHtml = (content) => {
  setState({ checked_html: true });

  return /<(?:[A-Za-z]+[A-Za-z0-9]*)(?:\s+.*?)*?\/{0,1}>/.test(content) ||
  /<(?<Element>(?:[A-Za-z]+[A-Za-z0-9]*:)?(?:[A-Za-z]+[A-Za-z0-9]*))(?:\s+.*?)*?>(?:.|\n)*?<\/{1}\k<Element>>/.test(content) || 
  /<(?<Element>(?:[a-z][a-z0-9._]*:)?[a-z][a-z0-9._]*-[a-z0-9._-]+)(?:\s+.*?)*?>(?:.|\n)*?<\/{1}\k<Element>>/.test(content)
};

/**
 * Generic utility which merges two objects.
 * 
 * @param {any} current Original object.
 * @param {any} updates Object to merge with original.
 * @returns {any}
 */
const mergeObjects = (current, updates) => {
  if (!current || !updates)
    throw new Error("Both 'current' and 'updates' must be passed-in to mergeObjects()")

  /**
   * @type {any}
   */
  let merged;
  
  if (Array.isArray(current)) {
    merged = structuredClone(current).concat(updates);
  } else if (typeof current === 'object') {
    merged = { ...current };
    for (let key of Object.keys(updates)) {
      if (typeof updates[key] !== 'object') {
        merged[key] = updates[key];
      } else {
        /* key is an object, run mergeObjects again. */
        merged[key] = mergeObjects(merged[key] || {}, updates[key]);
      }
    }
  }

  return merged
};

/**
 * Merge a user config with the default config.
 * 
 * @param {import('htmlfy').Config} default_config The default config.
 * @param {import('htmlfy').UserConfig} config The user config.
 * @returns {import('htmlfy').Config}
 */
const mergeConfig = (default_config, config) => {
  const validated_config = mergeObjects(default_config, config);

  /* Below `constants` prefixes and suffixes must be in sync with those in state.js */
  setState({ 
    config: validated_config,
    constants: {
      CONTENT_IGNORE_PLACEHOLDER: `${validated_config.ignore_with}_`,
      SELF_CLOSING_PLACEHOLDER: `${validated_config.ignore_with}/_>`,
      ATTRIBUTE_IGNORE_PLACEHOLDER: `${validated_config.ignore_with}=_`
    }
  });
  return validated_config
};

/**
 * 
 * @param {string} html 
 */
const protectAttributes = (html) => {
  const { constants } = getState();

  html = html.replace(/<[\w:\-]+([^>]*[^\/])>/g, (/** @type {string} */match, /** @type {any} */capture) => {
    return match.replace(capture, (match) => {
      return match
        .replace(/\n/g, constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'nl!')
        .replace(/\r/g, constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'cr!')
        .replace(/\s/g, constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'ws!')
    })
  });

  return html
};

/**
 * 
 * @param {string} html 
 */
const protectContent = (html) => {
  const { constants } = getState();

  return html
    .replace(/\n/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'nl!')
    .replace(/\r/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'cr!')
    .replace(/\s/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'ws!')
};

/**
 * 
 * @param {string} html 
 */
const finalProtectContent = (html) => {
  const regex = /\s*<([a-zA-Z0-9:-]+)[^>]*>\n\s*<\/\1>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n)|<([a-zA-Z0-9:-]+)[^>]*>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n\s*)<\/\3>/g; 
  const { constants } = getState();

  return html
    .replace(regex, (/** @type {string} */match, p1, p2, p3, p4) => {
      const text_to_protect = p2 || p4;

      if (!text_to_protect)
        return match

      const protected_text = text_to_protect
       .replace(/\n/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'nl!')
       .replace(/\r/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'cr!')
       .replace(/\s/g, constants.CONTENT_IGNORE_PLACEHOLDER + "ws!");

      return match.replace(text_to_protect, protected_text)
    })
};

/**
 * Replace html brackets with ignore string.
 * 
 * @param {string} html 
 * @returns {string}
 */
const setIgnoreAttribute = (html) => {
  const regex = /<([A-Za-z][A-Za-z0-9]*|[a-z][a-z0-9._]*-[a-z0-9._-]+)((?:\s+[A-Za-z0-9_-]+="[^"]*"|\s*[a-z]*)*)>/g; 
  const { constants } = getState();

  html = html.replace(regex, (/** @type {string} */match, p1, p2) => {
    return match.replace(p2, (match) => {
      return match
        .replace(/</g, constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'lt!')
        .replace(/>/g, constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'gt!')
    })
  });
  
  return html
};

/**
 * Trim leading and trailing whitespace characters.
 * 
 * @param {string} html
 * @param {string[]} trim
 * @returns {string}
 */
const trimify = (html, trim) => {
  for (let e = 0; e < trim.length; e++) {
    /* Whitespace character must be escaped with '\' or RegExp() won't include it. */
    const leading_whitespace = new RegExp(`(<${trim[e]}[^>]*>)\\s+`, "g");
    const trailing_whitespace = new RegExp(`\\s+(</${trim[e]}>)`, "g");

    html = html
      .replace(leading_whitespace, '$1')
      .replace(trailing_whitespace, '$1');
  }

  return html
};

/**
 * 
 * @param {string} html 
 */
const unprotectAttributes = (html) => {
  const { constants } = getState();

  html = html.replace(/<[\w:\-]+([^>]*[^\/])>/g, (/** @type {string} */match, /** @type {any} */capture) => {
    return match.replace(capture, (match) => {
      return match
        .replace(new RegExp(constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'nl!', "g"), '\n')
        .replace(new RegExp(constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'cr!', "g"), '\r')
        .replace(new RegExp(constants.ATTRIBUTE_IGNORE_PLACEHOLDER + 'ws!', "g"), ' ')
    })
  });

  return html
};

/**
 * 
 * @param {string} html 
 */
const unprotectContent = (html) => {
  const { constants } = getState();

  html = html.replace(new RegExp(`.*${constants.CONTENT_IGNORE_PLACEHOLDER}[a-z]{2}!.*`, "g"), (/** @type {string} */match) => {
    return match.replace(new RegExp(`${constants.CONTENT_IGNORE_PLACEHOLDER}[a-z]{2}!`, "g"), (match) => {
      return match
        .replace(new RegExp(constants.CONTENT_IGNORE_PLACEHOLDER + 'nl!', "g"), '\n')
        .replace(new RegExp(constants.CONTENT_IGNORE_PLACEHOLDER + 'cr!', "g"), '\r')
        .replace(new RegExp(constants.CONTENT_IGNORE_PLACEHOLDER + 'ws!', "g"), ' ')
    })
  });

  return html
};

/**
 * Replace ignore string with html brackets.
 * 
 * @param {string} html 
 * @returns {string}
 */
const unsetIgnoreAttribute = (html) => {
  /* Regex to find opening tags and capture their attributes. */
  const tagRegex = /<([\w:\-]+)([^>]*)>/g;
  const { constants } = getState();
  const escapedIgnoreString = constants.ATTRIBUTE_IGNORE_PLACEHOLDER.replace(
    /[-\/\\^$*+?.()|[\]{}]/g,
    "\\$&"
  );
  const ltPlaceholderRegex = new RegExp(escapedIgnoreString + "lt!", "g");
  const gtPlaceholderRegex = new RegExp(escapedIgnoreString + "gt!", "g");

  return html.replace(
    tagRegex,
    (
      /** @type {string} */ fullMatch,
      /** @type {string} */ tagName,
      /** @type {string} */ attributesCapture
    ) => {
      const processedAttributes = attributesCapture
        .replace(ltPlaceholderRegex, "<")
        .replace(gtPlaceholderRegex, ">");

      /* Reconstruct the tag. */
      return `<${tagName}${processedAttributes}>`
    }
  )
};

/**
 * Validate any passed-in config options and merge with CONFIG.
 * 
 * @param {import('htmlfy').UserConfig} config A user config.
 * @returns {import('htmlfy').Config} A validated config.
 */
const validateConfig = (config) => {
  if (typeof config !== 'object') throw new Error('Config must be an object.')
  
  const default_config = { ...CONFIG };

  const config_empty = !(
    Object.hasOwn(config, 'content_wrap') ||
    Object.hasOwn(config, 'ignore') || 
    Object.hasOwn(config, 'ignore_with') || 
    Object.hasOwn(config, 'strict') || 
    Object.hasOwn(config, 'tab_size') || 
    Object.hasOwn(config, 'tag_wrap') || 
    Object.hasOwn(config, 'trim')
  );

  if (config_empty) {
    setState({ config: default_config });
    return default_config
  }

  let tab_size = config.tab_size;

  if (tab_size) {
    if (typeof tab_size !== 'number') throw new Error(`tab_size must be a number, not ${typeof config.tab_size}.`)

    const safe = Number.isSafeInteger(tab_size);
    if (!safe) throw new Error(`Tab size ${tab_size} is not safe. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger for more info.`)

    /** 
     * Round down, just in case a safe floating point,
     * like 4.0, was passed.
     */
    tab_size = Math.floor(tab_size);
    if (tab_size < 1 || tab_size > 16) throw new Error('Tab size out of range. Expecting 1 to 16.')
  
    config.tab_size = tab_size;
  }

  if (Object.hasOwn(config, 'content_wrap') && typeof config.content_wrap !== 'number')
    throw new Error(`content_wrap config must be a number, not ${typeof config.content_wrap}.`)

  if (Object.hasOwn(config, 'ignore') && (!Array.isArray(config.ignore) || !config.ignore?.every((e) => typeof e === 'string')))
    throw new Error('Ignore config must be an array of strings.')

  if (Object.hasOwn(config, 'ignore_with')) {
    if (typeof config.ignore_with !== 'string')
      throw new Error(`ignore_with must be a string, not ${typeof config.ignore_with}.`)
    else if (config.ignore_with.startsWith('_'))
      /**
       * This negatively affects processing of preserved tag attributes,
       * because tag names can end with an underscore, so the regex
       * does not capture them.
       */
      throw new Error(`ignore_with cannot start with an underscore.`)
  }

  if (Object.hasOwn(config, 'strict') && typeof config.strict !== 'boolean')
    throw new Error(`Strict config must be a boolean, not ${typeof config.strict}.`)
  
  if (Object.hasOwn(config, 'tag_wrap') && typeof config.tag_wrap !== 'number')
    throw new Error(`tag_wrap config must be a number, not ${typeof config.tag_wrap}.`)

  if (Object.hasOwn(config, 'trim') && (!Array.isArray(config.trim) || !config.trim?.every((e) => typeof e === 'string')))
    throw new Error('Trim config must be an array of strings.')

  return mergeConfig(default_config, config)

};

/**
 * 
 * @param {string} text 
 * @param {number} width 
 * @param {string} indent
 */
const wordWrap = (text, width, indent) => {
  const words = text.trim().split(/\s+/);
  
  if (words.length === 0 || (words.length === 1 && words[0] === ''))
    return ""

  const lines = [];
  let current_line = "";
  const padding_string = indent;

  words.forEach((word) => {
    if (word === "") return

    if (word.length >= width) {
      /* If there's content on the current line, push it first with correct padding. */
      if (current_line !== "")
        lines.push(lines.length === 0 ? indent + current_line : padding_string + current_line);

      /* Push a long word on its own line with correct padding. */
      lines.push(lines.length === 0 ? indent + word : padding_string + word);
      current_line = ""; // Reset current line
      return // Move to the next word
    }

    /* Check if adding the next word exceeds the wrap width. */
    const test_line = current_line === "" ? word : current_line + " " + word;

    if (test_line.length <= width) {
      current_line = test_line;
    } else {
      /* Word doesn't fit, finish the current line and push it. */
      if (current_line !== "") {
         /* Add padding based on whether it's the first line added or not. */
         lines.push(lines.length === 0 ? indent + current_line : padding_string + current_line);
      }
      /* Start a new line with the current word. */
      current_line = word;
    }
  });

  /* Add the last remaining line with appropriate padding. */
  if (current_line !== "")
    lines.push(lines.length === 0 ? indent + current_line : padding_string + current_line);

  const result = lines.join("\n");

  return protectContent(result)
};

/**
 * Extract any HTML blocks to be ignored,
 * and replace them with a placeholder
 * for re-insertion later.
 * 
 * @param {string} html 
 * @returns {{ html_with_markers: string, extracted_map: Map<any,any> }}
 */
function extractIgnoredBlocks(html) {
  setState({ ignored: true });
  const config = (getState()).config;
  let current_html = html;
  const extracted_blocks = new Map();
  let marker_id = 0;
  const MARKER_PREFIX = "___HTMLFY_SPECIAL_IGNORE_MARKER_";

  for (const tag of config.ignore) {
    /* Ensure tag is escaped if it can contain regex special chars. */
    const safe_tag_name = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    const regex = new RegExp(
      `(<\\s*${safe_tag_name}[^>]*>)(.*?)(<\\s*\/\\s*${safe_tag_name}\\s*>)`,
      "gs" // global and dotAll
    );

    /** @type RegExpExecArray | null */
    let match;

    /**
     * @type {{ start: number; end: number; marker: string }[]}
     */
    const replacements = [];

    while ((match = regex.exec(current_html)) !== null) {
      const marker = `${MARKER_PREFIX}${marker_id++}___`;

      /* Only store content, and minify tags later. */
      extracted_blocks.set(marker, match[2]);
      
      replacements.push({
        start: match.index + match[1].length, // start of content
        end: match.index + match[1].length + match[2].length, // end of content
        marker: marker,
      });
    }

    /* Apply replacements from the end to the beginning to keep indices valid. */
    for (let i = replacements.length - 1; i >= 0; i--) {
      const rep = replacements[i];
      current_html =
        current_html.substring(0, rep.start) +
        rep.marker +
        current_html.substring(rep.end);
    }
  }

  return { html_with_markers: current_html, extracted_map: extracted_blocks }
}

/**
 * Re-insert ignored HTML blocks.
 * 
 * @param {string} html_with_markers 
 * @param {Map<any,any>} extracted_map 
 * @returns 
 */
function reinsertIgnoredBlocks(html_with_markers, extracted_map) {
  setState({ ignored: false });
  let final_html = html_with_markers;

  for (const [marker, original_block] of extracted_map) {
    final_html = final_html.split(marker).join(original_block);
  }
  return final_html
}

const void_element_regex = new RegExp(`<(${VOID_ELEMENTS.join("|")})(?:\\s(?:[^/>]|/(?!>))*)*>`, 'g');

/**
 * Add a placeholder for void elements that are not self-closing.
 * This is for internal processing only.
 * 
 * @param {string} html 
 * @returns 
 */
function setSelfClosing(html) {
  const { constants } = getState();

  return html.replace(
    // match only void elements that are not self-closing
    void_element_regex,
    match => match.replace(/>$/, constants.SELF_CLOSING_PLACEHOLDER)
  )
}

/**
 * Remove internal placeholder for non-native self-closing void elements.
 * 
 * @param {string} html 
 * @returns 
 */
function unsetSelfClosing(html) {
  const { constants } = getState();

  return html.replace(constants.SELF_CLOSING_PLACEHOLDER, ">")
}

/**
 * Enforce entity characters for textarea content.
 * To also minifiy tags, pass `minify` as `true`.
 * 
 * @param {string} html The HTML string to evaluate.
 * @param {boolean} [minify] Minifies the textarea tags themselves. 
 * Defaults to `false`. We recommend a value of `true` if you're running `entify()` 
 * as a standalone function.
 * @returns {string}
 * @example <textarea>3 > 2</textarea> => <textarea>3&nbsp;&gt;&nbsp;2</textarea>
 * @example With minify.
 * <textarea  >3 > 2</textarea> => <textarea>3&nbsp;&gt;&nbsp;2</textarea>
 */
const entify = (html, minify = false) => {
  /** 
   * Use entities inside textarea content.
   */
  html = html.replace(/<\s*textarea[^>]*>((.|\n)*?)<s*\/\s*textarea\s*>/g, (match, capture) => {
    return match.replace(capture, (match) => {
      return match
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;')
        .replace(/\s/g, '&nbsp;')
    })
  });

  if (minify) {
    html = html.replace(/<\s*textarea[^>]*>(.|\n)*?<\s*\/\s*textarea\s*>/g, (match) => {
      /* This only affects the html tags, since everything else has been entified. */
      return match
        .replace(/\s+/g, ' ')
        .replace(/\s>/g, '>')
        .replace(/>\s/g, '>')
        .replace(/\s</g, '<')
        .replace(/<\s/g, '<')
        .replace(/<\/\s/g, '<\/')
        .replace(/class=["']\s/g, (match) => match.replace(/\s/g, ''))
        .replace(/(class=.*)\s(["'])/g, '$1'+'$2')
    });
  }

  return html
};

/**
 * Remove entity characters for textarea content.
 * Currently internal use only.
 * 
 * @param {string} html The HTML string to evaluate.
 * @returns {string}
 * @example <textarea>3&nbsp;&gt;&nbsp;2</textarea> => <textarea>3 > 2</textarea>
 */
const dentify = (html) => {
  /** 
   * Remove entities inside textarea content.
   */
  return html = html.replace(/<textarea[^>]*>((.|\n)*?)<\/textarea>/g, (match, capture) => {
    return match.replace(capture, (match) => {
      match = match
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#10;/g, '\n')
        .replace(/&#13;/g, '\r')
        .replace(/&nbsp;/g, ' ')
        // Ensure we collapse consecutive spaces, or they'll be completely removed later.
        .replace(/\s+/g, ' ');

      return match
    })
  })
};

/**
 * @type {Map<any,any>}
 */
let ignore_map$1;

/**
 * Creates a single-line HTML string
 * by removing line returns, tabs, and relevant spaces.
 * 
 * @param {string} html The HTML string to minify.
 * @param {import('htmlfy').UserConfig} [config] A user configuration object.
 * @returns {string} A minified HTML string.
 */
const minify = (html, config) => {
  let reinsert_ignored = false;
  const { checked_html, ignored, constants } = getState();

  if (!checked_html && !isHtml(html)) return html

  const validated_config = (getState()).config;
  const ignore = validated_config.ignore.length > 0;

  /* Extract ignored elements. Skipped if prettify has already ignored blocks. */
  if (!ignored && ignore) {
    const { html_with_markers, extracted_map } = extractIgnoredBlocks(html);
    html = html_with_markers;
    ignore_map$1 = extracted_map;
    reinsert_ignored = true;
  }

  /**
   * Ensure textarea content is protected
   * before general minification.
   */
  html = entify(html, true);

  /* All other minification. */
  // Remove ALL newlines and tabs explicitly.
  html = html.replace(/\n|\t/g, '');

  // Remove whitespace ONLY between tags.
  html = html.replace(/>\s+</g, "><");

  // Collapse any remaining multiple spaces to single spaces.
  html = html.replace(/ {2,}/g, ' ');

  // Protect space between text content and an opening tag (e.g., "text <a>")
  html = html.replace(
    /(\S) (<[a-zA-Z][a-zA-Z0-9_:-]*)/g,
    `$1___MINIFY-PROTECTED-SPACE___$2`
  );

  // Protect space between a closing tag and text content (e.g., "</a> text")
  html = html.replace(
    /(<\/[a-zA-Z][a-zA-Z0-9_:-]*>) (\S)/g,
    `$1___MINIFY-PROTECTED-SPACE___$2`
  );

  // Remove specific single spaces between tags and whitespace within tags.
  html = html.replace(/ >/g, ">");   // <tag > -> <tag>
  html = html.replace(/ </g, "<");   // leading space before tag
  html = html.replace(/> /g, ">");   // trailing space after tag
  html = html.replace(/< /g, "<");   // < tag> -> <tag>
  html = html.replace(/<\s+\//g, '</'); // < /tag> -> </tag>
  html = html.replace(/<\/\s+/g, '</'); // </ tag> -> </tag>

  // Unprotect space around inner tags
  html = html.replace(new RegExp('___MINIFY-PROTECTED-SPACE___', 'g'), ' ');

  // Trim spaces around equals signs in attributes (run before value trim)
  //    This handles `attr = "value"` -> `attr="value"`
  html = html.replace(/ = /g, "=");
  // Consider safer alternatives if needed (e.g., / = "/g, '="')

  // Trim whitespace inside attribute values
  html = html.replace(
    /([a-zA-Z0-9_-]+)=(['"])(.*?)\2/g,
    (match, attr_name, quote, value) => {
      // value.trim() handles both leading/trailing spaces
      // and cases where the value is only whitespace (becomes empty string)
      const trimmed_value = value.trim();
      return `${attr_name}=${quote}${trimmed_value}${quote}`
    }
  );

  // Final trim for the whole string
  html = html.trim();

  /* Remove protective entities. */
  html = dentify(html);

  /* Re-insert ignored elements. Skipped unless minify did the ignore. */
  if (reinsert_ignored) {
    html = reinsertIgnoredBlocks(html, ignore_map$1);
  }

  return html
};

/**
 * @type {{ line: Record<string,string>[] }}
 */
const convert = {
  line: []
};

/**
 * @type {Map<any,any>}
 */
let ignore_map;

/**
 * Isolate tags, content, and comments.
 * 
 * @param {string} html The HTML string to evaluate.
 * @example <div>Hello World!</div> => 
 *  [#-# : 0 : <div> : #-#]
 *  Hello World!
 *  [#-# : 1 : </div> : #-#]
 */
const enqueue = (html) => {
  convert.line = [];
  let i = -1;
  /* Regex to find tags OR text content between tags. */
  const regex = /(<[^>]+>)|([^<]+)/g;

  html.replace(regex, (match, c1, c2) => {
    if (c1) {
      convert.line.push({ type: "tag", value: match });
    } else if (c2 && c2.trim().length > 0) {
      /* It's text content (and not just whitespace). */
      convert.line.push({ type: "text", value: match });
    }

    i++;
    return `\n[#-# : ${i} : ${match} : #-#]\n`
  });
};

/**
 * Process enqueued content.
 *  
 * @returns {string}
 */
const process = () => {
  const { config, constants } = getState();
  const step = " ".repeat(config.tab_size);
  const tag_wrap = config.tag_wrap;
  const content_wrap = config.content_wrap;
  const strict = config.strict;

  /* Track current number of indentations needed. */
  let indents = '';

  /** @type string[] */
  const output_lines = [];
  const tag_regex = /<[A-Za-z]+\b[^>]*(?:.|\n)*?\/?>/g; /* Is opening tag or void element. */
  const attribute_regex = /\s{1}[A-Za-z-]+(?:=".*?")?/g; /* Matches all tag/element attributes. */

  /* Process lines and indent. */
  convert.line.forEach((source, index) => {
    let current_line_value = source.value;

    const is_ignored_content =
      current_line_value.startsWith('___HTMLFY_SPECIAL_IGNORE_MARKER_');

    let subtrahend = 0;
    const prev_line_data = convert.line[index - 1];
    const prev_line_value = prev_line_data?.value ?? ""; // Use empty string if no prev line

    /**
     * Arbitratry character, to keep track of the string's length.
     */
    indents += '0';

    if (index === 0) subtrahend++;
    /* We're processing a closing tag. */
    if (current_line_value.trim().startsWith("</")) subtrahend++;
    /* prevLine is a doctype declaration. */
    if (prev_line_value.trim().startsWith("<!doctype")) subtrahend++;
    /* prevLine is a comment. */
    if (prev_line_value.trim().startsWith("<!--")) subtrahend++;
    /* prevLine is a void element. */
    if (
      prev_line_value.trim().endsWith("/>") // native self-closing
      ||
      prev_line_value.trim().endsWith(constants.SELF_CLOSING_PLACEHOLDER) // synthetic self-closing
    ) subtrahend++;
    /* prevLine is a closing tag. */
    if (prev_line_value.trim().startsWith("</")) subtrahend++;
    /* prevLine is text. */
    if (prev_line_data?.type === "text") subtrahend++;

    /* Determine offset for line indentation. */
    const offset = Math.max(0, indents.length - subtrahend);
    /* Correct indent level for *this* line's content */
    const current_indent_level = offset; // Store the level for this line

    indents = indents.substring(0, current_indent_level); // Adjust for *next* round

    /**
     * Starts with a single punctuation character.
     * Add punctuation to end of previous line.
     */
    if (source.type === 'text' && /^[!,;\.]/.test(current_line_value)) {
      if (current_line_value.length === 1) {
        output_lines[output_lines.length - 1] = 
          output_lines.at(-1) + current_line_value;
        return
      } else {
        output_lines[output_lines.length - 1] = 
          output_lines.at(-1) + current_line_value.charAt(0);
        current_line_value = current_line_value.slice(1).trim();

        /* If nothing left after extracting punctuation, skip this line. */
        if (current_line_value.length === 0) return
      }
    }

    const padding = step.repeat(current_indent_level);

    if (is_ignored_content) {
      /* Stop processing this line, as it's set to be ignored. */
      output_lines.push(current_line_value);
    } else {
      /* Remove comment. */
      if (strict && current_line_value.trim().startsWith("<!--"))
        return

      let result = current_line_value;

      /* Remove self-closing placeholder, if needed. */
      result = unsetSelfClosing(result);

      if (
        source.type === 'text' && 
        content_wrap > 0 && 
        result.length >= content_wrap
      ) {
        result = wordWrap(result, content_wrap, padding);
      }
      /* Wrap the attributes of open tags and void elements. */
      else if (
        tag_wrap > 0 &&
        result.length > tag_wrap &&
        tag_regex.test(result)
      ) {
        tag_regex.lastIndex = 0; // Reset stateful regex
        attribute_regex.lastIndex = 0; // Reset stateful regex

        const tag_parts = result.split(attribute_regex).filter(Boolean);

        if (tag_parts.length >= 2) {
          const attributes = result.matchAll(attribute_regex);
          const inner_padding = padding + step;
          let wrapped_tag = padding + tag_parts[0] + "\n";

          for (const a of attributes) {
            const attribute_string = a[0].trim();
            wrapped_tag += inner_padding + attribute_string + "\n";
          }

          const tag_name_match = tag_parts[0].match(/<([A-Za-z_:-]+)/);
          const tag_name = tag_name_match ? tag_name_match[1] : "";
          const is_self_closing = tag_parts.at(-1)?.endsWith("/>") && VOID_ELEMENTS.includes(tag_name);
          const closing_part = tag_parts[1].trim();
          const closing_padding = padding + (strict && is_self_closing ? " " : "");

          wrapped_tag += closing_padding + closing_part;

          result = wrapped_tag; // Assign the fully wrapped string
        } else {
          result = padding + result;
        }
      } else {
        /* Apply simple indentation (if no wrapping occurred) */
        result = padding + result;
      }

      /* Add the processed line (or lines if wordWrap creates them) to the output */
      output_lines.push(result);
    }
  });

  /* Join all processed lines into the final HTML string */
  let final_html = output_lines.join("\n");

  /* Preserve wrapped attributes. */
  if (tag_wrap > 0) final_html = protectAttributes(final_html);

  /* Extra preserve wrapped content. */
  if (content_wrap > 0 && new RegExp(`/\\n[ ]*[^\\n]*${constants.CONTENT_IGNORE_PLACEHOLDER}[^\\n]*\\n/`).test(final_html))
    final_html = finalProtectContent(final_html);

  /* Remove line returns, tabs, and consecutive spaces within html elements or their content. */
  final_html = final_html.replace(
    /<(?<Element>[^>\s]+)[^>]*>[^<]*?[^><\/\s][^<]*?<\/\k<Element>>|<script[^>]*>[\s]*<\/script>|<([\w:\._-]+)([^>]*)><\/\2>|<([\w:\._-]+)([^>]*)>[\s]+<\/\4>/g,
    match => {
      // Check if this contains placeholder
      if (match.includes(constants.SELF_CLOSING_PLACEHOLDER) || match.includes(constants.CONTENT_IGNORE_PLACEHOLDER)) {
        return match // Don't modify if it contains the placeholder
      }

      return match.replace(/\n|\t|\s{2,}/g, '')
    }
  );

  /* Revert wrapped content. */
  if (content_wrap > 0) final_html = unprotectContent(final_html);

  /* Revert wrapped attributes. */
  if (tag_wrap > 0) final_html = unprotectAttributes(final_html);

  /* Remove self-closing nature of void elements. */
  if (strict) final_html = final_html.replace(/\s\/>|\/>/g, '>');

  /* Trim leading and/or trailing line returns. */
  if (final_html.startsWith("\n")) final_html = final_html.substring(1);
  if (final_html.endsWith("\n")) final_html = final_html.substring(0, final_html.length - 1);

  return final_html
};

/**
 * Format HTML with line returns and indentations.
 * 
 * @param {string} html The HTML string to prettify.
 * @param {import('htmlfy').UserConfig} [config] A user configuration object.
 * @returns {string} A well-formed HTML string.
 */
const prettify = (html, config) => {
  let reinsert_ignored = false;
  const { checked_html, ignored } = getState();

  /* Return content as-is if it does not contain any HTML elements. */
  if (!checked_html && !isHtml(html)) return html

  /* Runs setState for config. */
  const validated_config = validateConfig(config || {});

  const ignore = validated_config.ignore.length > 0;

  /* Allows you to trimify before ignoring. */
  if (validated_config.trim.length > 0) html = trimify(html, validated_config.trim);

  /* Extract ignored elements. */
  if (!ignored && ignore) {
    const { html_with_markers, extracted_map } = extractIgnoredBlocks(html);
    html = html_with_markers;
    ignore_map = extracted_map;
    reinsert_ignored = true;
  }

  /* Preserve html text within attribute values. */
  html = setIgnoreAttribute(html);

  /* Insert placeholder for void elements that aren't self-closing. */
  html = setSelfClosing(html);

  html = minify(html);
  enqueue(html);
  html = process();

  /* Revert html text within attribute values. */
  html = unsetIgnoreAttribute(html);

  /* Re-insert ignored elements. */
  if (reinsert_ignored) {
    html = reinsertIgnoredBlocks(html, ignore_map);
  }

  return html
};

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

export { prettify as default };

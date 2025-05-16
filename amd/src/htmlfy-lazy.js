
/** @ts-ignore */
/* eslint-disable */

/**
 * @type {import('htmlfy').Config}
 */
const CONFIG = {
  content_wrap: 0,
  ignore: [],
  ignore_with: '_!i-£___£%_',
  strict: false,
  tab_size: 2,
  tag_wrap: 0,
  tag_wrap_width: 80,
  trim: []
};

const CONTENT_IGNORE_STRING = '__!i-£___£%__';
const IGNORE_STRING = '!i-£___£%_';

const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 
  'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
];

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
const isHtml = (content) => 
  /<(?:[A-Za-z]+[A-Za-z0-9]*)(?:\s+.*?)*?\/{0,1}>/.test(content) ||
  /<(?<Element>(?:[A-Za-z]+[A-Za-z0-9]*:)?(?:[A-Za-z]+[A-Za-z0-9]*))(?:\s+.*?)*?>(?:.|\n)*?<\/{1}\k<Element>>/.test(content) || 
  /<(?<Element>(?:[a-z][a-z0-9._]*:)?[a-z][a-z0-9._]*-[a-z0-9._-]+)(?:\s+.*?)*?>(?:.|\n)*?<\/{1}\k<Element>>/.test(content);

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
 * @param {import('htmlfy').Config} dconfig The default config.
 * @param {import('htmlfy').UserConfig} config The user config.
 * @returns {import('htmlfy').Config}
 */
const mergeConfig = (dconfig, config) => {
  /**
   * We need to make a deep copy of `dconfig`,
   * otherwise we end up altering the original `CONFIG` because `dconfig` is a reference to it.
   */
  return mergeObjects(structuredClone(dconfig), config)
};

/**
 * 
 * @param {string} html 
 */
const protectAttributes = (html) => {
  html = html.replace(/<[\w:\-]+([^>]*[^\/])>/g, (/** @type {string} */match, /** @type {any} */capture) => {
    return match.replace(capture, (match) => {
      return match
        .replace(/\n/g, IGNORE_STRING + 'nl!')
        .replace(/\r/g, IGNORE_STRING + 'cr!')
        .replace(/\s/g, IGNORE_STRING + 'ws!')
    })
  });

  return html
};

/**
 * 
 * @param {string} html 
 */
const protectContent = (html) => {
  return html
    .replace(/\n/g, CONTENT_IGNORE_STRING + 'nl!')
    .replace(/\r/g, CONTENT_IGNORE_STRING + 'cr!')
    .replace(/\s/g, CONTENT_IGNORE_STRING + 'ws!')
};

/**
 * 
 * @param {string} html 
 */
const finalProtectContent = (html) => {
  const regex = /\s*<([a-zA-Z0-9:-]+)[^>]*>\n\s*<\/\1>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n)|<([a-zA-Z0-9:-]+)[^>]*>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n\s*)<\/\3>/g;
  return html
    .replace(regex, (/** @type {string} */match, p1, p2, p3, p4) => {
      const text_to_protect = p2 || p4;

      if (!text_to_protect)
        return match

      const protected_text = text_to_protect
       .replace(/\n/g, CONTENT_IGNORE_STRING + 'nl!')
       .replace(/\r/g, CONTENT_IGNORE_STRING + 'cr!')
       .replace(/\s/g, CONTENT_IGNORE_STRING + "ws!");

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

  html = html.replace(regex, (/** @type {string} */match, p1, p2) => {
    return match.replace(p2, (match) => {
      return match
        .replace(/</g, IGNORE_STRING + 'lt!')
        .replace(/>/g, IGNORE_STRING + 'gt!')
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
  html = html.replace(/<[\w:\-]+([^>]*[^\/])>/g, (/** @type {string} */match, /** @type {any} */capture) => {
    return match.replace(capture, (match) => {
      return match
        .replace(new RegExp(IGNORE_STRING + 'nl!', "g"), '\n')
        .replace(new RegExp(IGNORE_STRING + 'cr!', "g"), '\r')
        .replace(new RegExp(IGNORE_STRING + 'ws!', "g"), ' ')
    })
  });

  return html
};

/**
 * 
 * @param {string} html 
 */
const unprotectContent = (html) => {
  html = html.replace(/.*__!i-£___£%__[a-z]{2}!.*/g, (/** @type {string} */match) => {
    return match.replace(/__!i-£___£%__[a-z]{2}!/g, (match) => {
      return match
        .replace(new RegExp(CONTENT_IGNORE_STRING + 'nl!', "g"), '\n')
        .replace(new RegExp(CONTENT_IGNORE_STRING + 'cr!', "g"), '\r')
        .replace(new RegExp(CONTENT_IGNORE_STRING + 'ws!', "g"), ' ')
    })
  });

  return html
};

const escapedIgnoreString = IGNORE_STRING.replace(
  /[-\/\\^$*+?.()|[\]{}]/g,
  "\\$&"
);
const ltPlaceholderRegex = new RegExp(escapedIgnoreString + "lt!", "g");
const gtPlaceholderRegex = new RegExp(escapedIgnoreString + "gt!", "g");

/**
 * Replace ignore string with html brackets.
 * 
 * @param {string} html 
 * @returns {string}
 */
const unsetIgnoreAttribute = (html) => {
  /* Regex to find opening tags and capture their attributes. */
  const tagRegex = /<([\w:\-]+)([^>]*)>/g;

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

  const config_empty = !(
    Object.hasOwn(config, 'content_wrap') ||
    Object.hasOwn(config, 'ignore') || 
    Object.hasOwn(config, 'ignore_with') || 
    Object.hasOwn(config, 'strict') || 
    Object.hasOwn(config, 'tab_size') || 
    Object.hasOwn(config, 'tag_wrap') || 
    Object.hasOwn(config, 'tag_wrap_width') || 
    Object.hasOwn(config, 'trim')
  );

  if (config_empty) return CONFIG

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
    throw new Error(`content_wrap config must be a number, not ${typeof config.tag_wrap_width}.`)

  if (Object.hasOwn(config, 'ignore') && (!Array.isArray(config.ignore) || !config.ignore?.every((e) => typeof e === 'string')))
    throw new Error('Ignore config must be an array of strings.')

  if (Object.hasOwn(config, 'ignore_with') && typeof config.ignore_with !== 'string')
    throw new Error(`Ignore_with config must be a string, not ${typeof config.ignore_with}.`)

  if (Object.hasOwn(config, 'strict') && typeof config.strict !== 'boolean')
    throw new Error(`Strict config must be a boolean, not ${typeof config.strict}.`)

  /* TODO remove in v0.9.0 */
  if (Object.hasOwn(config, 'tag_wrap') && typeof config.tag_wrap === 'boolean') {
    console.warn('tag_wrap as a boolean is deprecated, and will not be supported in v0.9.0+. Use `tag_wrap: <number>` instead; where <number> is the max character width acceptable before wrapping attributes.');
    if (config.tag_wrap_width)
      config.tag_wrap = config.tag_wrap_width;
    else
      config.tag_wrap = CONFIG.tag_wrap_width;
  }
  
  if (Object.hasOwn(config, 'tag_wrap') && typeof config.tag_wrap !== 'number')
    throw new Error(`tag_wrap config must be a number, not ${typeof config.tag_wrap}.`)

  /* TODO remove in v0.9.0 */
  if (Object.hasOwn(config, 'tag_wrap_width'))
    console.warn('tag_wrap_width is deprecated, and will not be supported in v0.9.0+. Use `tag_wrap: <number>` instead; where <number> is the max character width acceptable before wrapping attributes.');

  /* TODO remove in v0.9.0 */
  if (Object.hasOwn(config, 'tag_wrap_width') && typeof config.tag_wrap_width !== 'number')
    throw new Error(`tag_wrap_width config must be a number, not ${typeof config.tag_wrap_width}.`)

  if (Object.hasOwn(config, 'trim') && (!Array.isArray(config.trim) || !config.trim?.every((e) => typeof e === 'string')))
    throw new Error('Trim config must be an array of strings.')

  return mergeConfig(CONFIG, config)

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
 * @param {import('htmlfy').Config} config 
 * @returns {{  html_with_markers: string, extracted_map: Map<any,any> }}
 */
function extractIgnoredBlocks(html, config) {
  let current_html = html;
  const extracted_blocks = new Map();
  let marker_id = 0;
  const MARKER_PREFIX = "___HTMLFY_SPECIAL_IGNORE_MARKER_";

  for (const tag of config.ignore) {
    /* Ensure tag is escaped if it can contain regex special chars. */
    const safe_tag_name = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    const regex = new RegExp(
      `<${safe_tag_name}[^>]*>.*?<\/${safe_tag_name}>`,
      "gs" // global and dotAll
    );

    let match;
    const replacements = []; // Store [startIndex, endIndex, marker]

    while ((match = regex.exec(current_html)) !== null) {
      const marker = `${MARKER_PREFIX}${marker_id++}___`;
      extracted_blocks.set(marker, match[0]); // Store the full original match
      replacements.push({
        start: match.index,
        end: regex.lastIndex,
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
  let final_html = html_with_markers;

  for (const [marker, original_block] of extracted_map) {
    final_html = final_html.split(marker).join(original_block);
  }
  return final_html
}

/**
 * Ensure void elements are "self-closing".
 * 
 * @param {string} html The HTML string to evaluate.
 * @param {boolean} check_html Check to see if the content contains any HTML, before processing.
 * @returns {string}
 * @example <br> => <br />
 */
const closify = (html, check_html = true) => {
  if (check_html && !isHtml(html)) return html
  
  return html.replace(/<([a-zA-Z\-0-9:]+)[^>]*>/g, (match, name) => {
    if (VOID_ELEMENTS.indexOf(name) > -1)
      return (`${match.substring(0, match.length - 1)} />`).replace(/\/\s\//g, '/')

    return match.replace(/[\s]?\/>/g, `></${name}>`)
  })
};

/**
 * Enforce entity characters for textarea content.
 * To also minifiy, pass `minify` as `true`.
 * 
 * @param {string} html The HTML string to evaluate.
 * @param {boolean} [minify] Fully minifies the content of textarea elements. 
 * Defaults to `false`. We recommend a value of `true` if you're running `entify()` 
 * as a standalone function.
 * @returns {string}
 * @example <textarea>3 > 2</textarea> => <textarea>3 &gt; 2</textarea>
 */
const entify = (html, minify = false) => {
  /** 
   * Use entities inside textarea content.
   */
  html = html.replace(/<textarea[^>]*>((.|\n)*?)<\/textarea>/g, (match, capture) => {
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

  /* Typical minification, but only for textareas. */
  if (minify) {
    html = html.replace(/<textarea[^>]*>((.|\n)*?)<\/textarea>/g, (match, capture) => {
      /* Replace things inside the textarea content. */
      match = match.replace(capture, (match) => {
        return match
          .replace(/\n|\t/g, '')
          .replace(/[a-z]+="\s*"/ig, '')
          .replace(/>\s+</g, '><')
          .replace(/\s+/g, ' ')
      });

      /* Replace things in the entire element */
      match = match
        .replace(/\s+/g, ' ')
        .replace(/\s>/g, '>')
        .replace(/>\s/g, '>')
        .replace(/\s</g, '<')
        .replace(/class=["']\s/g, (match) => match.replace(/\s/g, ''))
        .replace(/(class=.*)\s(["'])/g, '$1'+'$2');
      return match
    });
  }

  return html
};

/**
 * Creates a single-line HTML string
 * by removing line returns, tabs, and relevant spaces.
 * 
 * @param {string} html The HTML string to minify.
 * @param {boolean} check_html Check to see if the content contains any HTML, before processing.
 * @returns {string} A minified HTML string.
 */
const minify = (html, check_html = true) => {
  if (check_html && !isHtml(html)) return html

  /**
   * Ensure textarea content is specially minified and protected
   * before general minification.
   */
  html = entify(html);

  /* All other minification. */
  // Remove ALL newlines and tabs explicitly.
  html = html.replace(/\n|\t/g, '');

  // Remove whitespace ONLY between tags.
  html = html.replace(/>\s+</g, "><");

  // Collapse any remaining multiple spaces to single spaces.
  html = html.replace(/ {2,}/g, ' ');

  // Remove specific single spaces OR whitespace within closing tags.
  html = html.replace(/ >/g, ">");   // <tag > -> <tag>
  html = html.replace(/ </g, "<");   // Text < -> Text< (Also handles leading space before tag)
  html = html.replace(/> /g, ">");   // > Text -> >Text
  html = html.replace(/<\s*\//g, '</'); // < /tag -> </tag>

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

  return html
};

/**
 * @type {boolean}
 */
let strict;

/**
 * @type {string[]}
 */
let trim;

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
 * @returns {string}
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

  html = html.replace(regex, (match, c1, c2) => {
    if (c1) {
      convert.line.push({ type: "tag", value: match });
    } else if (c2 && c2.trim().length > 0) {
      /* It's text content (and not just whitespace). */
      convert.line.push({ type: "text", value: match });
    }

    i++;
    return `\n[#-# : ${i} : ${match} : #-#]\n`
  });

  return html
};

/**
 * Preprocess the HTML.
 * 
 * @param {string} html The HTML string to preprocess.
 * @returns {string}
 */
const preprocess = (html) => {
  html = closify(html, false);

  if (trim.length > 0) html = trimify(html, trim);

  html = minify(html, false);
  html = enqueue(html);

  return html
};

/**
 * 
 * @param {string} html The HTML string to process.
 * @param {import('htmlfy').Config} config 
 * @returns {string}
 */
const process = (html, config) => {
  const step = " ".repeat(config.tab_size);
  const tag_wrap = config.tag_wrap;
  const content_wrap = config.content_wrap;
  const ignore_with = config.ignore_with;
  const placeholder_template = `-${ignore_with}`;

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
      current_line_value.startsWith(placeholder_template + "lt--") ||
      current_line_value.startsWith(placeholder_template + "gt--") ||
      current_line_value.startsWith(placeholder_template + "nl--") ||
      current_line_value.startsWith(placeholder_template + "cr--") ||
      current_line_value.startsWith(placeholder_template + "ws--") ||
      current_line_value.startsWith(placeholder_template + "tab--");

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
    /* prevLine is a self-closing tag. */
    if (prev_line_value.trim().endsWith("/>")) subtrahend++;
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
     * 
     * TODO - Implement inline groups instead?
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
          const is_void = VOID_ELEMENTS.includes(tag_name);
          const closing_part = tag_parts[1].trim();
          const closing_padding = padding + (strict && is_void ? " " : ""); // Add space if void/strict

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
  if (content_wrap > 0 && /\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n/.test(final_html))
    final_html = finalProtectContent(final_html);

  /* Remove line returns, tabs, and consecutive spaces within html elements or their content. */
  final_html = final_html.replace(
    /<(?<Element>.+).*>[^<]*?[^><\/\s][^<]*?<\/{1}\k<Element>|<script[^>]*>\s+<\/script>|<(\w+)>\s+<\/(\w+)|<(?:([\w:\._-]+)|([\w:\._-]+)[^>]*[^\/])>\s+<\/([\w:\._-]+)>/g,
    match => match.replace(/\n|\t|\s{2,}/g, '')
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
  /* Return content as-is if it does not contain any HTML elements. */
  if (!isHtml(html)) return html

  const validated_config = config ? validateConfig(config) : CONFIG;
  strict = validated_config.strict;

  const ignore = validated_config.ignore.length > 0;
  trim = validated_config.trim;

  /* Extract ignored elements. */
  if (ignore) {
    const { html_with_markers, extracted_map } = extractIgnoredBlocks(html, validated_config);
    html = html_with_markers;
    ignore_map = extracted_map;
  }

  /* Preserve html text within attribute values. */
  html = setIgnoreAttribute(html);

  html = preprocess(html);
  html = process(html, validated_config);

  /* Revert html text within attribute values. */
  html = unsetIgnoreAttribute(html);

  /* Re-insert ignored elements. */
  if (ignore) {
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

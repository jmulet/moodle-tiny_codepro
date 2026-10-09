
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
 * Defined per formatting operation from configuration.
 * 
 * CONTENT_IGNORE_PLACEHOLDER
 * SELF_CLOSING_PLACEHOLDER
 * ATTRIBUTE_IGNORE_PLACEHOLDER
 */

/**
 * @typedef {object} HtmlfyConstants
 * @property {string} CONTENT_IGNORE_PLACEHOLDER
 * @property {string} SELF_CLOSING_PLACEHOLDER
 * @property {string} ATTRIBUTE_IGNORE_PLACEHOLDER
 */

/**
 * Create the placeholders used during one formatting operation.
 *
 * @param {string} [ignore_with]
 * @returns {HtmlfyConstants}
 */
const createConstants = (ignore_with = CONFIG.ignore_with) => ({
  CONTENT_IGNORE_PLACEHOLDER: `${ignore_with}_`,
  SELF_CLOSING_PLACEHOLDER: `${ignore_with}/_>`,
  ATTRIBUTE_IGNORE_PLACEHOLDER: `${ignore_with}=_`
});

const DEFAULT_CONSTANTS = createConstants();

/**
 * Visit complete tags without treating brackets inside quoted attributes as boundaries.
 * Returning true from the visitor stops the scan.
 *
 * @param {string} content
 * @param {(tag: string, start: number, end: number) => boolean | void} visitor
 * @returns {boolean}
 */
const scanTags = (content, visitor) => {
  let tag_start = -1;
  let quote = '';

  for (let index = 0; index < content.length; index++) {
    const character = content[index];

    if (tag_start === -1) {
      if (character === '<') tag_start = index;
      continue
    }

    if (quote) {
      if (character === quote) quote = '';
      continue
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '<') {
      tag_start = index;
    } else if (character === '>') {
      if (visitor(content.slice(tag_start, index + 1), tag_start, index + 1)) return true
      tag_start = -1;
    }
  }

  return false
};

/**
 * Parse the name of an opening tag and return its end offset within the tag.
 *
 * @param {string} tag
 * @returns {{ name: string, name_end: number } | undefined}
 */
const getOpeningTag = (tag) => {
  let name_start = 1;
  while (/\s/.test(tag[name_start] || '')) name_start++;
  if (!/[A-Za-z]/.test(tag[name_start] || '')) return

  let name_end = name_start + 1;
  while (name_end < tag.length && !/[\s/>]/.test(tag[name_end])) name_end++;

  const name = tag.slice(name_start, name_end);
  if (!/^[A-Za-z][A-Za-z0-9:._-]*$/.test(name)) return

  return { name, name_end }
};

/**
 * Transform complete opening tags while preserving all content between them.
 *
 * @param {string} content
 * @param {(tag: string, name: string, name_end: number) => string} transform
 * @returns {string}
 */
const transformOpeningTags = (content, transform) => {
  const chunks = [];
  let previous_end = 0;

  scanTags(content, (tag, start, end) => {
    const opening_tag = getOpeningTag(tag);
    if (!opening_tag) return

    chunks.push(
      content.slice(previous_end, start),
      transform(tag, opening_tag.name, opening_tag.name_end)
    );
    previous_end = end;
  });

  if (chunks.length === 0) return content
  chunks.push(content.slice(previous_end));
  return chunks.join('')
};

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
  const paired_elements = new Set();
  const standard_element = /^[A-Za-z][A-Za-z0-9]*$/;
  const namespaced_element = /^(?:[A-Za-z][A-Za-z0-9]*:)[A-Za-z][A-Za-z0-9]*$/;
  const custom_element = /^(?:[a-z][a-z0-9._]*:)?[a-z][a-z0-9._]*-[a-z0-9._-]+$/;

  return scanTags(content, (tag) => {
    if (tag.startsWith('</')) {
      const name = tag.slice(2, -1);
      return paired_elements.has(name)
    }

    const opening_tag = getOpeningTag(tag);
    if (!opening_tag) return false

    const suffix_start = tag[opening_tag.name_end];
    if (!(suffix_start === '>' || /\s/.test(suffix_start) || (suffix_start === '/' && tag[opening_tag.name_end + 1] === '>')))
      return false

    if (standard_element.test(opening_tag.name)) return true
    if (namespaced_element.test(opening_tag.name) || custom_element.test(opening_tag.name))
      paired_elements.add(opening_tag.name);

    return false
  })
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
  return mergeObjects(default_config, config)
};

/**
 * 
 * @param {string} html
 * @param {HtmlfyConstants} [constants]
 */
const protectAttributes = (html, constants = DEFAULT_CONSTANTS) => {
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
 * @param {HtmlfyConstants} [constants]
 */
const protectContent = (html, constants = DEFAULT_CONSTANTS) => {
  return html
    .replace(/\n/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'nl!')
    .replace(/\r/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'cr!')
    .replace(/\s/g, constants.CONTENT_IGNORE_PLACEHOLDER + 'ws!')
};

/**
 * 
 * @param {string} html
 * @param {HtmlfyConstants} [constants]
 */
const finalProtectContent = (html, constants = DEFAULT_CONSTANTS) => {
  const regex = /\s*<([a-zA-Z0-9:-]+)[^>]*>\n\s*<\/\1>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n)|<([a-zA-Z0-9:-]+)[^>]*>(?=\n[ ]*[^\n]*__!i-£___£%__[^\n]*\n)(\n[ ]*\S[^\n]*\n\s*)<\/\3>/g; 

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
 * @param {HtmlfyConstants} [constants]
 * @returns {string}
 */
const setIgnoreAttribute = (html, constants = DEFAULT_CONSTANTS) => {
  // Most documents do not contain HTML-like brackets inside attribute values.
  if (!/=\s*(?:"[^"]*[<>][^"]*"|'[^']*[<>][^']*')/.test(html)) return html

  return transformOpeningTags(html, (tag, name, name_end) => {
    let quote = '';
    let previous_end = 0;
    const chunks = [];

    for (let index = name_end; index < tag.length - 1; index++) {
      const character = tag[index];

      if (!quote && (character === '"' || character === "'")) {
        quote = character;
      } else if (quote && character === quote) {
        quote = '';
      } else if (quote && (character === '<' || character === '>')) {
        chunks.push(
          tag.slice(previous_end, index),
          constants.ATTRIBUTE_IGNORE_PLACEHOLDER + (character === '<' ? 'lt!' : 'gt!')
        );
        previous_end = index + 1;
      }
    }

    if (chunks.length === 0) return tag
    chunks.push(tag.slice(previous_end));
    return chunks.join('')
  })
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
 * @param {HtmlfyConstants} [constants]
 */
const unprotectAttributes = (html, constants = DEFAULT_CONSTANTS) => {
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
 * @param {HtmlfyConstants} [constants]
 */
const unprotectContent = (html, constants = DEFAULT_CONSTANTS) => {
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
 * @param {HtmlfyConstants} [constants]
 * @returns {string}
 */
const unsetIgnoreAttribute = (html, constants = DEFAULT_CONSTANTS) => {
  /* Regex to find opening tags and capture their attributes. */
  const tagRegex = /<([\w:\-]+)([^>]*)>/g;
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

  config = { ...config };
  
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
 * @param {HtmlfyConstants} [constants]
 */
const wordWrap = (text, width, indent, constants = DEFAULT_CONSTANTS) => {
  const words = text.trim().split(/\s+/);
  
  if (words.length === 0 || (words.length === 1 && words[0] === ''))
    return ""

  /** @type {string[]} */
  const lines = [];
  /** @type {string[]} */
  const current_words = [];
  let current_length = 0;

  const flushLine = () => {
    if (current_words.length === 0) return
    lines.push(indent + current_words.join(' '));
    current_words.length = 0;
    current_length = 0;
  };

  for (const word of words) {
    if (word === "") continue

    if (word.length >= width) {
      flushLine();
      lines.push(indent + word);
      continue
    }

    const next_length = current_length + (current_words.length === 0 ? 0 : 1) + word.length;
    if (next_length <= width) {
      current_words.push(word);
      current_length = next_length;
    } else {
      flushLine();
      current_words.push(word);
      current_length = word.length;
    }
  }

  flushLine();

  const result = lines.join("\n");

  return protectContent(result, constants)
};

const IGNORE_MARKER_PREFIX = "___HTMLFY_SPECIAL_IGNORE_MARKER_";
const IGNORE_MARKER_REGEX = /___HTMLFY_SPECIAL_IGNORE_MARKER_\d+___/g;
const TEXTAREA_MARKER_PREFIX = "___HTMLFY_TEXTAREA_MARKER_";
const TEXTAREA_MARKER_REGEX = /___HTMLFY_TEXTAREA_MARKER_\d+___/g;

/**
 * Extract the contents of matching elements in one traversal.
 *
 * @param {string} html
 * @param {Set<string>} names
 * @param {string} marker_prefix
 * @param {(content: string) => string} [transform]
 * @returns {{ html_with_markers: string, extracted_map: Map<string,string> }}
 */
const extractBlocks = (html, names, marker_prefix, transform = content => content) => {
  const extracted_blocks = new Map();
  const chunks = [];
  let marker_id = 0;
  let previous_end = 0;

  /** @type {{ name: string, content_start: number } | undefined} */
  let active_block;
  let tag_start = -1;
  let quote = '';

  for (let index = 0; index < html.length; index++) {
    const character = html[index];

    if (active_block) {
      if (character !== '<') continue

      let closing_index = index + 1;
      while (/\s/.test(html[closing_index] || '')) closing_index++;
      if (html[closing_index] !== '/') continue

      closing_index++;
      while (/\s/.test(html[closing_index] || '')) closing_index++;
      if (!html.startsWith(active_block.name, closing_index)) continue

      closing_index += active_block.name.length;
      while (/\s/.test(html[closing_index] || '')) closing_index++;
      if (html[closing_index] !== '>') continue

      const marker = `${marker_prefix}${marker_id++}___`;
      chunks.push(html.slice(previous_end, active_block.content_start), marker);
      extracted_blocks.set(marker, transform(html.slice(active_block.content_start, index)));
      previous_end = index;
      active_block = undefined;
      index = closing_index;
      continue
    }

    if (tag_start === -1) {
      if (character === '<') tag_start = index;
      continue
    }

    if (quote) {
      if (character === quote) quote = '';
      continue
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '<') {
      tag_start = index;
    } else if (character === '>') {
      const opening_tag = getOpeningTag(html.slice(tag_start, index + 1));
      if (opening_tag && names.has(opening_tag.name)) {
        active_block = { name: opening_tag.name, content_start: index + 1 };
      }
      tag_start = -1;
    }
  }

  if (extracted_blocks.size === 0)
    return { html_with_markers: html, extracted_map: extracted_blocks }

  chunks.push(html.slice(previous_end));
  return { html_with_markers: chunks.join(''), extracted_map: extracted_blocks }
};

/**
 * Extract any HTML blocks to be ignored,
 * and replace them with a placeholder for re-insertion later.
 *
 * @param {string} html
 * @param {string[]} ignore
 * @returns {{ html_with_markers: string, extracted_map: Map<string,string> }}
 */
function extractIgnoredBlocks(html, ignore) {
  return extractBlocks(html, new Set(ignore), IGNORE_MARKER_PREFIX)
}

/**
 * Protect textarea contents without expanding them into entities.
 *
 * @param {string} html
 * @returns {{ html_with_markers: string, extracted_map: Map<string,string> }}
 */
function extractTextareaBlocks(html) {
  return extractBlocks(html, new Set(['textarea']), TEXTAREA_MARKER_PREFIX, content => content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
  )
}

/**
 * Re-insert ignored HTML blocks.
 * 
 * @param {string} html_with_markers 
 * @param {Map<any,any>} extracted_map 
 * @returns 
 */
function reinsertIgnoredBlocks(html_with_markers, extracted_map) {
  return html_with_markers.replace(IGNORE_MARKER_REGEX, marker => extracted_map.get(marker) ?? marker)
}

/**
 * Re-insert protected textarea contents in one pass.
 *
 * @param {string} html_with_markers
 * @param {Map<string,string>} extracted_map
 * @returns {string}
 */
function reinsertTextareaBlocks(html_with_markers, extracted_map) {
  return html_with_markers.replace(TEXTAREA_MARKER_REGEX, marker => extracted_map.get(marker) ?? marker)
}

const void_element_regex = new RegExp(`<(${VOID_ELEMENTS.join("|")})(?:\\s(?:[^/>]|/(?!>))*)*>`, 'g');

/**
 * Add a placeholder for void elements that are not self-closing.
 * This is for internal processing only.
 * 
 * @param {string} html
 * @param {HtmlfyConstants} [constants]
 * @returns 
 */
function setSelfClosing(html, constants = DEFAULT_CONSTANTS) {
  return html.replace(
    // match only void elements that are not self-closing
    void_element_regex,
    match => match.replace(/>$/, constants.SELF_CLOSING_PLACEHOLDER)
  )
}

/**
 * Minify HTML using configuration already validated by the caller.
 *
 * @param {string} html
 * @param {import('htmlfy').Config} validated_config
 * @param {boolean} extract_ignored
 * @returns {string}
 */
const minifyHtml = (html, validated_config, extract_ignored) => {
  /** @type {Map<string,string> | undefined} */
  let textarea_map;
  validated_config.ignore.length > 0;

  /* Keep textarea markup out of the general minification passes. */
  if (!validated_config.ignore.includes('textarea') && html.includes('textarea')) {
    const { html_with_markers, extracted_map } = extractTextareaBlocks(html);
    html = html_with_markers;
    textarea_map = extracted_map;
  }

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

  // Trim whitespace inside quoted attribute values when any are padded.
  if (/=["']\s|\s["']/.test(html)) {
    html = transformOpeningTags(html, (tag, name, name_end) => {
      const chunks = [];
      let previous_end = 0;
      let index = name_end;

      while (index < tag.length - 1) {
        while (/\s/.test(tag[index] || '')) index++;

        const attribute_start = index;
        while (/[a-zA-Z0-9_-]/.test(tag[index] || '')) index++;
        if (index === attribute_start || tag[index] !== '=') {
          index++;
          continue
        }

        const quote = tag[index + 1];
        if (quote !== '"' && quote !== "'") {
          index++;
          continue
        }

        const value_start = index + 2;
        const value_end = tag.indexOf(quote, value_start);
        if (value_end === -1) break

        const value = tag.slice(value_start, value_end);
        const trimmed_value = value.trim();
        if (trimmed_value !== value) {
          chunks.push(tag.slice(previous_end, value_start), trimmed_value);
          previous_end = value_end;
        }
        index = value_end + 1;
      }

      if (chunks.length === 0) return tag
      chunks.push(tag.slice(previous_end));
      return chunks.join('')
    });
  }

  // Final trim for the whole string
  html = html.trim();

  if (textarea_map) {
    html = reinsertTextareaBlocks(html, textarea_map);
  }

  return html
};

/**
 * Minify HTML that has already been checked and had ignored blocks extracted.
 *
 * @param {string} html
 * @param {import('htmlfy').Config} config
 * @returns {string}
 */
const minifyKnownHtml = (html, config) => minifyHtml(html, config);

const VOID_ELEMENT_SET = new Set(VOID_ELEMENTS);
const TOKEN_CLOSING = 1;
const TOKEN_COMMENT = 2;
const TOKEN_DOCTYPE = 4;
const TOKEN_IGNORED = 8;
const TOKEN_SELF_CLOSING = 16;
const TOKEN_SYNTHETIC_SELF_CLOSING = 32;
const TOKEN_INLINE = 64;

/**
 * @typedef {object} Token
 * @property {'tag' | 'text'} type
 * @property {string} value
 * @property {number} flags
 */

/**
 * Isolate tags, content, and comments.
 * 
 * @param {string} html The HTML string to evaluate.
 * @param {import('./utils.js').HtmlfyConstants} constants
 * @returns {Token[]}
 */
const enqueue = (html, constants) => {
  /** @type {Token[]} */
  const lines = [];
  /* Regex to find tags OR text content between tags. */
  const regex = /<[^>]+>|[^<]+/g;

  /* Use replace for callback iteration, but avoid constructing the old marker output. */
  html.replace(regex, (value) => {
    const type = value.startsWith('<') ? 'tag' : 'text';

    if (type === 'text') {
      if (value.trim().length > 0) {
        lines.push({
          type,
          value,
          flags: value.startsWith('___HTMLFY_SPECIAL_IGNORE_MARKER_') ? TOKEN_IGNORED : 0,
        });
      }
      return ''
    }

    const trimmed = value.trim();
    const synthetic_self_closing = trimmed.endsWith(constants.SELF_CLOSING_PLACEHOLDER);
    let flags = 0;
    if (trimmed.startsWith('</')) flags |= TOKEN_CLOSING;
    if (trimmed.startsWith('<!--')) flags |= TOKEN_COMMENT;
    if (trimmed.startsWith('<!doctype')) flags |= TOKEN_DOCTYPE;
    if (trimmed.endsWith('/>') || synthetic_self_closing) flags |= TOKEN_SELF_CLOSING;
    if (synthetic_self_closing) flags |= TOKEN_SYNTHETIC_SELF_CLOSING;

    lines.push({
      type,
      value,
      flags,
    });
    return ''
  });

  return lines
};

/**
 * Collapse the same simple element pairs handled by the final output regex.
 *
 * @param {Token[]} lines
 * @returns {Token[]}
 */
const collapseInlineTokens = (lines) => {
  /** @type {Token[]} */
  const collapsed = [];

  for (let index = 0; index < lines.length; index++) {
    const opening = lines[index];

    if (opening.type === 'tag' && !(opening.flags & (
      TOKEN_CLOSING |
      TOKEN_COMMENT |
      TOKEN_DOCTYPE |
      TOKEN_SELF_CLOSING
    ))) {
      const name_match = opening.value.match(/^<([^>\s]+)[^>]*>$/);
      const name = name_match?.[1];
      const content = lines[index + 1];
      const possible_closing = content?.type === 'text' ? lines[index + 2] : content;

      if (name && possible_closing?.value === `</${name}>`) {
        const empty_pair = content?.type === 'tag' && /^[\w:._-]+$/.test(name);
        const text_pair = content?.type === 'text' && /[^><\/\s]/.test(content.value);

        if (empty_pair || text_pair) {
          collapsed.push({
            type: 'tag',
            value: opening.value + (text_pair ? content.value.trim() : '') + possible_closing.value,
            flags: TOKEN_INLINE,
          });
          index += text_pair ? 2 : 1;
          continue
        }
      }
    }

    collapsed.push(opening);
  }

  return collapsed
};

/**
 * Process enqueued content.
 *  
 * @param {Token[]} lines
 * @param {import('htmlfy').Config} config
 * @param {import('./utils.js').HtmlfyConstants} constants
 * @returns {string}
 */
const process = (lines, config, constants) => {
  const step = " ".repeat(config.tab_size);
  const tag_wrap = config.tag_wrap;
  const content_wrap = config.content_wrap;
  const strict = config.strict;

  /* Track current number of indentations needed. */
  let indent_level = 0;

  /** @type string[] */
  const output_lines = [];
  const tag_regex = /<[A-Za-z]+\b[^>]*(?:.|\n)*?\/?>/; /* Is opening tag or void element. */
  const attribute_regex = /\s{1}[A-Za-z:@#*?$()\[\].-]+(?:=".*?")?/g; /* Matches all tag/element attributes. */

  /* Process lines and indent. */
  lines.forEach((source, index) => {
    let current_line_value = source.value;

    let subtrahend = 0;
    const prev_line_data = lines[index - 1];

    indent_level++;

    if (index === 0) subtrahend++;
    /* We're processing a closing tag. */
    if (source.flags & TOKEN_CLOSING) subtrahend++;
    /* prevLine is a doctype declaration. */
    if (prev_line_data && (prev_line_data.flags & TOKEN_DOCTYPE)) subtrahend++;
    /* prevLine is a comment. */
    if (prev_line_data && (prev_line_data.flags & TOKEN_COMMENT)) subtrahend++;
    /* prevLine is a void element. */
    if (prev_line_data && (prev_line_data.flags & TOKEN_SELF_CLOSING)) subtrahend++;
    /* prevLine is a closing tag. */
    if (prev_line_data && (prev_line_data.flags & TOKEN_CLOSING)) subtrahend++;
    /* prevLine opens and closes on the same line. */
    if (prev_line_data && (prev_line_data.flags & TOKEN_INLINE)) subtrahend++;
    /* prevLine is text. */
    if (prev_line_data?.type === "text") subtrahend++;

    /* Determine offset for line indentation. */
    const offset = Math.max(0, indent_level - subtrahend);
    /* Correct indent level for *this* line's content */
    const current_indent_level = offset; // Store the level for this line

    indent_level = current_indent_level;

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

    if (source.flags & TOKEN_IGNORED) {
      /* Stop processing this line, as it's set to be ignored. */
      output_lines.push(current_line_value);
    } else {
      /* Remove comment. */
      if (strict && (source.flags & TOKEN_COMMENT))
        return

      let result = current_line_value;

      /* Remove self-closing placeholder, if needed. */
      if (source.flags & TOKEN_SYNTHETIC_SELF_CLOSING)
        result = result.replace(constants.SELF_CLOSING_PLACEHOLDER, '>');

      if (
        source.type === 'text' && 
        content_wrap > 0 && 
        result.length >= content_wrap
      ) {
        result = wordWrap(result, content_wrap, padding, constants);
      }
      /* Wrap the attributes of open tags and void elements. */
      else if (
        tag_wrap > 0 &&
        result.length > tag_wrap &&
        tag_regex.test(result)
      ) {
        attribute_regex.lastIndex = 0; // Reset stateful regex

        const attributes = [];
        let first_attribute_start = -1;
        let last_attribute_end = -1;
        let attribute_match;

        while ((attribute_match = attribute_regex.exec(result)) !== null) {
          if (first_attribute_start === -1) first_attribute_start = attribute_match.index;
          last_attribute_end = attribute_regex.lastIndex;
          attributes.push(attribute_match[0].trim());
        }

        if (attributes.length > 0) {
          const opening_part = result.slice(0, first_attribute_start);
          const closing_part = result.slice(last_attribute_end).trim();
          const inner_padding = padding + step;
          const wrapped_tag = [padding + opening_part];

          for (const attribute of attributes) {
            wrapped_tag.push(inner_padding + attribute);
          }

          const tag_name_match = opening_part.match(/<([A-Za-z_:-]+)/);
          const tag_name = tag_name_match ? tag_name_match[1] : "";
          const is_self_closing = result.endsWith("/>") && VOID_ELEMENT_SET.has(tag_name);
          const closing_padding = padding + (strict && is_self_closing ? " " : "");

          wrapped_tag.push(closing_padding + closing_part);
          result = wrapped_tag.join('\n');
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
  if (tag_wrap > 0) final_html = protectAttributes(final_html, constants);

  /* Extra preserve wrapped content. */
  if (content_wrap > 0 && new RegExp(`/\\n[ ]*[^\\n]*${constants.CONTENT_IGNORE_PLACEHOLDER}[^\\n]*\\n/`).test(final_html))
    final_html = finalProtectContent(final_html, constants);

  /* Remove line returns, tabs, and consecutive spaces within html elements or their content. */
  if (tag_wrap > 0 || content_wrap > 0) {
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
  }

  /* Revert wrapped content. */
  if (content_wrap > 0) final_html = unprotectContent(final_html, constants);

  /* Revert wrapped attributes. */
  if (tag_wrap > 0) final_html = unprotectAttributes(final_html, constants);

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

  const validated_config = validateConfig(config || {});
  const constants = createConstants(validated_config.ignore_with);

  const ignore = validated_config.ignore.length > 0;

  /** @type {Map<any,any> | undefined} */
  let ignore_map;

  /* Allows you to trimify before ignoring. */
  if (validated_config.trim.length > 0) html = trimify(html, validated_config.trim);

  /* Extract ignored elements. */
  if (ignore) {
    const { html_with_markers, extracted_map } = extractIgnoredBlocks(html, validated_config.ignore);
    html = html_with_markers;
    ignore_map = extracted_map;
  }

  /* Preserve html text within attribute values. */
  html = setIgnoreAttribute(html, constants);

  /* Insert placeholder for void elements that aren't self-closing. */
  html = setSelfClosing(html, constants);

  html = minifyKnownHtml(html, validated_config);
  let lines = enqueue(html, constants);
  if (validated_config.tag_wrap === 0 && validated_config.content_wrap === 0)
    lines = collapseInlineTokens(lines);
  html = process(lines, validated_config, constants);

  /* Revert html text within attribute values. */
  html = unsetIgnoreAttribute(html, constants);

  /* Re-insert ignored elements. */
  if (ignore_map) {
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

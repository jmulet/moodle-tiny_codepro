
/** @ts-ignore */
/* eslint-disable */

/**
 * @type {import('types').DefaultConfig}
 */
const CONFIG = {
  ignore: [],
  strict: false,
  tab_size: 2,
  trim: []
};

/**
 * Checks if content contains at least one HTML element.
 * 
 * @param {string} content Content to evaluate.
 * @returns {boolean} A boolean.
 */
const isHtml = (content) => {
  const regex = /<(?<Element>[A-Za-z]+\b)[^>]*(?:.|\n)*?<\/{1}\k<Element>>/;
  return regex.test(content)
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
    throw new Error("Both 'current' and 'updates' must be passed-in to merge()")

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
 * @param {import('types').DefaultConfig} dconfig The default config.
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
 * Ignores elements by protecting or unprotecting their entities.
 * 
 * @param {string} html 
 * @param {string[]} ignore
 * @param {string} [mode]
 * @returns {string}
 */
const ignoreElement = (html, ignore, mode = 'protect') => {
  for (let e = 0; e < ignore.length; e++) {
    const regex = new RegExp(`<${ignore[e]}[^>]*>((.|\n)*?)<\/${ignore[e]}>`, "g");
    html = html.replace(regex, mode === 'protect' ? protectElement : unprotectElement);
  }

  return html
};

/**
 * Protect an element by inserting entities.
 * 
 * @param {string} match 
 * @param {any} capture 
 * @returns 
 */
const protectElement = (match, capture) => {
  return match.replace(capture, (match) => {
    return match
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
      .replace(/\s/g, '&nbsp;')
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
 * Unprotect an element by removing entities.
 * 
 * @param {string} match 
 * @param {any} capture 
 * @returns 
 */
const unprotectElement = (match, capture) => {
  return match.replace(capture, (match) => {
    return match
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '\r')
      .replace(/&nbsp;/g, ' ')
  })
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
    Object.hasOwn(config, 'tab_size') || 
    Object.hasOwn(config, 'strict') || 
    Object.hasOwn(config, 'ignore') || 
    Object.hasOwn(config, 'trim'));
  if (config_empty) return CONFIG

  let tab_size = config.tab_size;

  if (tab_size) {
    if (typeof tab_size !== 'number') throw new Error('Tab size must be a number.')
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

  if (Object.hasOwn(config, 'strict') && typeof config.strict !== 'boolean')
    throw new Error('Strict config must be a boolean.')
  if (Object.hasOwn(config, 'ignore') && (!Array.isArray(config.ignore) || !config.ignore?.every((e) => typeof e === 'string')))
    throw new Error('Ignore config must be an array of strings.')
  if (Object.hasOwn(config, 'trim') && (!Array.isArray(config.trim) || !config.trim?.every((e) => typeof e === 'string')))
    throw new Error('Trim config must be an array of strings.')

  return mergeConfig(CONFIG, config)

};

const void_elements = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 
  'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
];

/**
 * Ensure void elements are "self-closing".
 * 
 * @param {string} html The HTML string to evaluate.
 * @param {boolean} html_check Check to see if the content contains any HTML, before processing.
 * @returns {string}
 * @example <br> => <br />
 */
const closify = (html, html_check = true) => {
  if (html_check)
    if (!isHtml(html)) return html
  
  return html.replace(/<([a-zA-Z\-0-9]+)[^>]*>/g, (match, name) => {
    if (void_elements.indexOf(name) > -1) {
      return (`${match.substring(0, match.length - 1)} />`).replace(/\/\s\//g, '/')
    }

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
 * @param {boolean} html_check Check to see if the content contains any HTML, before processing.
 * @returns {string} A minified HTML string.
 */
const minify = (html, html_check = true) => {
  if (html_check)
    if (!isHtml(html)) return html

  /**
   * Ensure textarea content is specially minified and protected
   * before general minification.
   */
  html = entify(html);

  /* All other minification. */
  return html
    .replace(/\n|\t/g, '')
    .replace(/[a-z]+="\s*"/ig, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/\s>/g, '>')
    .replace(/<\s\//g, '</')
    .replace(/>\s/g, '>')
    .replace(/\s</g, '<')
    .replace(/class=["']\s/g, (match) => match.replace(/\s/g, ''))
    .replace(/(class=.*)\s(["'])/g, '$1'+'$2')
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
 * @type {{ line: string[] }}
 */
const convert = {
  line: []
};

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

  html = html.replace(/<[^>]*>/g, (match) => {
    convert.line.push(match);
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

  if (trim.length > 0)
    html = trimify(html, trim);

  html = minify(html, false);
  html = enqueue(html);

  return html
};

/**
 * 
 * @param {string} html The HTML string to process.
 * @param {number} step 
 * @returns {string}
 */
const process = (html, step) => {
  /* Track current number of indentations needed. */
  let indents = '';

  /* Process lines and indent. */
  convert.line.forEach((source, index) => {
    html = html
      .replace(/\n+/g, '\n') /* Replace consecutive line returns with singles. */
      .replace(`[#-# : ${index} : ${source} : #-#]`, (match) => {
        let subtrahend = 0;
        const prevLine = `[#-# : ${index - 1} : ${convert.line[index - 1]} : #-#]`;

        /**
         * Arbitratry character, to keep track of the string's length.
         */
        indents += '0';
        
        if (index === 0) subtrahend++;

        /* We're processing a closing tag. */
        if (match.indexOf(`#-# : ${index} : </`) > -1) subtrahend++;

        /* prevLine is a doctype declaration. */
        if (prevLine.indexOf('<!doctype') > -1) subtrahend++;

        /* prevLine is a comment. */
        if (prevLine.indexOf('<!--') > -1) subtrahend++;

        /* prevLine is a self-closing tag. */
        if (prevLine.indexOf('/> : #-#') > -1) subtrahend++;

        /* prevLine is a closing tag. */
        if (prevLine.indexOf(`#-# : ${index - 1} : </`) > -1) subtrahend++;

        /* Determine offset for line indentation. */
        const offset = indents.length - subtrahend;

        /* Adjust for the next round. */
        indents = indents.substring(0, offset);

        /* Remove comment. */
        if (strict && match.indexOf('<!--') > -1) return ''

        /* Remove the prefix and suffix, leaving the content. */
        const result = match
          .replace(`[#-# : ${index} : `, '')
          .replace(' : #-#]', '');

        /* Pad the string with spaces and return. */
        return result.padStart(result.length + (step * offset))
      });
  });

  /* Remove line returns, tabs, and consecutive spaces within html elements or their content. */
  html = html.replace(/>[^<]*?[^><\/\s][^<]*?<\/|>\s+[^><\s]|<script[^>]*>\s+<\/script>|<(\w+)>\s+<\/(\w+)|<([\w\-]+)[^>]*[^\/]>\s+<\/([\w\-]+)>/g,
    match => match.replace(/\n|\t|\s{2,}/g, '')
  );

  /* Remove self-closing nature of void elements. */
  if (strict) html = html.replace(/\s\/>/g, '>');

  const lead_newline_check = html.substring(0, 1);
  const tail_newline_check = html.substring(html.length - 1);

  /**
   * Remove single leading and trailing new line, if they exist.
   * These will be `false` if the "html" being processed is only plain text. 
   */
  if (lead_newline_check === '\n') html = html.substring(1, html.length);
  if (tail_newline_check === '\n') html = html.substring(0, html.length - 1);

  return html
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

  /* Protect ignored elements. */
  if (ignore) {
    html = ignoreElement(html, validated_config.ignore);
  }

  html = preprocess(html);
  html = process(html, validated_config.tab_size);

  /* Unprotect ignored elements. */
  if (ignore) {
    html = ignoreElement(html, validated_config.ignore, 'unprotect');
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

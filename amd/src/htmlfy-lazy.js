
/** @ts-ignore */
/* eslint-disable */

/**
 * @type {import('htmlfy').Config}
 */
const CONFIG = {
  ignore: [],
  ignore_with: '_!i-£___£%_',
  strict: false,
  tab_size: 2,
  tag_wrap: false,
  tag_wrap_width: 80,
  trim: []
};

/**
 * Checks if content contains at least one HTML element.
 * 
 * @param {string} content Content to evaluate.
 * @returns {boolean} A boolean.
 */
const isHtml = (content) => /<(?<Element>[A-Za-z]+\b)[^>]*(?:.|\n)*?<\/{1}\k<Element>>/.test(content);

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
 * Replace entities with ignore string.
 * 
 * @param {string} html 
 * @param {import('htmlfy').Config} config
 * @returns {string}
 */
const setIgnoreElement = (html, config) => {
  const ignore = config.ignore;
  const ignore_string = config.ignore_with;

  for (let e = 0; e < ignore.length; e++) {
    const regex = new RegExp(`<${ignore[e]}[^>]*>((.|\n)*?)<\/${ignore[e]}>`, "g");

    html = html.replace(regex, (/** @type {string} */match, /** @type {any} */capture) => {
      return match.replace(capture, (match) => {
        return match
          .replace(/</g, '-' + ignore_string + 'lt-')
          .replace(/>/g, '-' + ignore_string + 'gt-')
          .replace(/\n/g, '-' + ignore_string + 'nl-')
          .replace(/\r/g, '-' + ignore_string + 'cr-')
          .replace(/\s/g, '-' + ignore_string + 'ws-')
      })
    });
  }
  
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
 * Replace ignore string with entities.
 * 
 * @param {string} html 
 * @param {import('htmlfy').Config} config
 * @returns {string}
 */
const unsetIgnoreElement = (html, config) => {
  const ignore = config.ignore;
  const ignore_string = config.ignore_with;

  for (let e = 0; e < ignore.length; e++) {
    const regex = new RegExp(`<${ignore[e]}[^>]*>((.|\n)*?)<\/${ignore[e]}>`, "g");

    html = html.replace(regex, (/** @type {string} */match, /** @type {any} */capture) => {
      return match.replace(capture, (match) => {
        return match
          .replace(new RegExp('-' + ignore_string + 'lt-', "g"), '<')
          .replace(new RegExp('-' + ignore_string + 'gt-', "g"), '>')
          .replace(new RegExp('-' + ignore_string + 'nl-', "g"), '\n')
          .replace(new RegExp('-' + ignore_string + 'cr-', "g"), '\r')
          .replace(new RegExp('-' + ignore_string + 'ws-', "g"), ' ')
      })
    });
  }
  
  return html
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

  if (Object.hasOwn(config, 'ignore') && (!Array.isArray(config.ignore) || !config.ignore?.every((e) => typeof e === 'string')))
    throw new Error('Ignore config must be an array of strings.')

  if (Object.hasOwn(config, 'ignore_with') && typeof config.ignore_with !== 'string')
    throw new Error(`Ignore_with config must be a string, not ${typeof config.ignore_with}.`)

  if (Object.hasOwn(config, 'strict') && typeof config.strict !== 'boolean')
    throw new Error(`Strict config must be a boolean, not ${typeof config.strict}.`)

  if (Object.hasOwn(config, 'tag_wrap') && typeof config.tag_wrap !== 'boolean')
    throw new Error(`tag_wrap config must be a boolean, not ${typeof config.tag_wrap}.`)

  if (Object.hasOwn(config, 'tag_wrap_width') && typeof config.tag_wrap_width !== 'number')
    throw new Error(`tag_wrap_width config must be a number, not ${typeof config.tag_wrap_width}.`)

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
 * @param {boolean} check_html Check to see if the content contains any HTML, before processing.
 * @returns {string}
 * @example <br> => <br />
 */
const closify = (html, check_html = true) => {
  if (check_html && !isHtml(html)) return html
  
  return html.replace(/<([a-zA-Z\-0-9]+)[^>]*>/g, (match, name) => {
    if (void_elements.indexOf(name) > -1)
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
  const step = config.tab_size;
  const wrap = config.tag_wrap;
  const wrap_width = config.tag_wrap_width;

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
        
        const tag_regex = /<[A-Za-z]+\b[^>]*(?:.|\n)*?\/?>/g; /* Is opening tag or void element. */

        /* Wrap the attributes of open tags and void elements. */
        if (wrap && tag_regex.test(source) && source.length > wrap_width) {
          const attribute_regex = /\s{1}[A-Za-z-]+(?:=".*?")?/g; /* Matches all tag/element attributes. */
          const tag_parts = source.split(attribute_regex).filter(Boolean);
          const attributes = source.matchAll(attribute_regex);
          const padding = step * offset;
          const inner_padding = padding + step;

          let wrapped = tag_parts[0].padStart(tag_parts[0].length + padding) + `\n`;
          for (const a of attributes) {
            /* Must declare separately so we can pad this string before adding it to `wrapped`. */
            const a_string = a[0].trim().padStart(a[0].trim().length + inner_padding) + `\n`;
            wrapped += a_string;
          }
          const e_string = tag_parts[1].padStart(tag_parts[1].trim().length + padding + (strict ? 1 : 0));
          wrapped += e_string;

          return wrapped
        } else {
          /* Pad the string with spaces and return. */
          return result.padStart(result.length + (step * offset))
        }
      });
  });

  /* Remove line returns, tabs, and consecutive spaces within html elements or their content. */
  html = html.replace(
    />[^<]*?[^><\/\s][^<]*?<\/|>\s+[^><\s]|<script[^>]*>\s+<\/script>|<(\w+)>\s+<\/(\w+)|<([\w\-]+)[^>]*[^\/]>\s+<\/([\w\-]+)>/g,
    match => match.replace(/\n|\t|\s{2,}/g, '')
  );

  /* Remove self-closing nature of void elements. */
  if (strict) html = html.replace(/\s\/>|\/>/g, '>');

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

  /* Preserve ignored elements. */
  if (ignore) html = setIgnoreElement(html, validated_config);

  html = preprocess(html);
  html = process(html, validated_config);

  /* Revert ignored elements. */
  if (ignore) html = unsetIgnoreElement(html, validated_config);

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

# Source Code Pro for TinyMCE Editor

A Moodle plugin for the TinyMCE editor that enhances the built-in source code editor. 
This plugin leverages [CodeMirror](https://codemirror.net/) version 6 to provide features such as syntax highlighting, 
autocompletion, block folding, and more.

## Compatibility

- **Moodle 4.1 – 4.3**: It replaces the default plain text source code editor.
- **Moodle 4.4 and beyond**: It provides advanced features compared to the default HTML code editor.

## Features

- Syntax highlighting with line numbers
- Search and replace functionality
- Code formatting
- Cursor position synchronization with TinyMCE (since v1.1.4)
- Light and dark themes
- Toggle fullscreen mode
- **New in v2.0**:
  - Dialog and panel UI modes
  - Configurable font size
  - Improved cursor synchronization
  - Color picker
  - VSCode-like minimap

<img src="./pix/pict04.gif" alt="CodePro in action" style="max-width:350px;">

## UI Modes

The code editor can be displayed in two different modes:

1. **Dialog Mode**: A single editor instance is displayed in a modal. Changes must be explicitly confirmed or rejected.
2. **Panel Mode**: Multiple editor instances can be used simultaneously, with changes applied automatically. (Available from Moodle 4.3)

An administrator setting allows choosing the default mode or enabling users to switch between both modes.

<img src="./pix/pict05.png" alt="UI in panel mode" style="max-width:350px;">



## Key Bindings

> Note: On macOS, `Alt` corresponds to the `Option` key.

| Shortcut | Action |
|----------|--------|
| `Shift-Alt-M` | Toggle minimap |
| `Shift-Alt-W` | Toggle line wrapping* |
| `Shift-Alt-T` | Toggle theme (light/dark) |
| `Shift-Alt-P` | Format code |
| `Shift-Alt-D` | Save preferences as defaults |
| `Shift-Alt-A` | Accept changes |
| `Shift-Alt-C` | Cancel changes |

*Please note that line wrapping can only be toggled in panel mode when in fullscreen mode.

## Installation

1. Navigate to **Site Administration** → **Plugins** → **Install plugins** → **Install plugin from ZIP file**.
2. Once installed:
   - The menu item "Source Code" will be replaced by "Source Code Pro."
   - A new toolbar button will be added in the first position.

<img src="./pix/pict01.png" alt="CodePro plugin button" style="max-width:350px;">

The source code editor (in dialog mode) opens in a modal dialog that can expand to fit the full window. It supports both light and dark themes and includes a toggle for line wrapping.

<img src="./pix/pict02.png" alt="CodePro light theme" style="max-width:350px;">

<img src="./pix/pict03.png" alt="CodePro dark theme" style="max-width:350px;">

The plugin also integrates with the [htmlfy](https://github.com/j4w8n/htmlfy#readme) library for automatic code formatting.


## Configuration


### Admin Settings

This section describes the configurable admin settings available for the Tiny CodePro plugin, which enable fine-grained control over valid HTML structures, element nesting, and custom elements in the editor.

<img src="./pix/pict06.png" alt="Administrator options" style="max-width:350px;">

For more information, you can read the [Content filtering options](https://www.tiny.cloud/docs/tinymce/latest/content-filtering/) in TinyMCE documentation page.

---

#### 🔧 `tiny_codepro | extendedvalidelements`

**Default:**  
```
*[*],svg[*],math[*],script[*],style[*]
```

**Description:**  
Specifies which HTML elements and attributes are considered valid in the editor. Use the format:  
`tag[attr1|attr2|...],tag[*]` to allow specific attributes, or `[*]` to allow all.

**Example:**  
```
*[*],svg[*],math[*],script[*]
```

This example allows all attributes on all tags, as well as unrestricted use of `<svg>`, `<math>`, and `script` elements.

> **Note:** Even though `script` is included as a valid element, TinyMCE will remove it if it appears at the very top of the content. Placing it elsewhere in the code is fine.

---

#### 🧱 `tiny_codepro | validchildren`

**Default:**  
```
+body[script],+button[div|p|span|strong|em],+p[tiny-svg-block],+span[tiny-svg-block]
```

**Description:**  
Specifies which HTML elements are allowed as children of specific parent tags.  
Use the format:  
`+parentTag[childTag]` or `+parentTag[child1|child2|...]`.

**Example:**  
```
+body[script],+button[div|p|span|strong|em],+p[tiny-svg-block],+span[tiny-svg-block]
```

This allows:

- `script` inside `<body>`
- Elements like `<div>`, `<p>`, `<span>`, `<strong>`, `<em>` inside `<button>`
- Custom `<tiny-svg-block>` inside `<p>` and `<span>`

---

#### 🧩 `tiny_codepro | customelements`

**Default:**  
```
script,~svg,~tiny-svg-block
```

**Description:**  
Defines custom HTML elements to be recognized by the editor. Separate each element by a comma.  
Prefixing an element with `~` indicates a custom or non-standard element (e.g., SVG-based blocks).

**Example:**  
```
script,~svg,~tiny-svg-block
```

This example allows:

- Standard `script` elements
- Custom or extended `<svg>` elements
- The `<tiny-svg-block>` component

> #### ⚠️ Warning
> Even though the `script` tag is a block-level element, TinyMCE's filtering policy may remove it if it is placed at the beginning of the document. To prevent this, you should either wrap the tag in a `<div>` or move it to another part of the content. Keep in mind that allowing `script` tags can introduce security vulnerabilities, particularly through cross-site scripting (XSS) attacks.


### Plugin visibility

Additionally, the capability `tiny/codepro:viewplugin` determines which user roles can see and use the plugin.
If the plugin is disabled, users will still have access to the default code editor provided by TinyMCE. For example, you can use this setting to ensure that students use the basic code editor instead of the plugin.

The admin setting "Disable on pages" allows you to specify a regular expression that matches the body element's ID on pages where the plugin should be disabled. For example, the regular expression:

**^page-mod-(assign-grader|forum)**

will match the grader page for assignments and all forum pages. On these matched pages, the plugin will be disabled, and the default TinyMCE code editor will be shown instead.


### Frontend configuration

Regular users can configure:

- **Default UI Mode**: Choose between "Dialog" and "Panel" mode.
- **User Mode Switching**: Allow users to switch UI modes (if the administrator choose one of the user:... options).
- **Theme Selection**: Set a default theme or allow users to toggle between light and dark modes.
- **Font Size Configuration**: Adjust font sizes for better readability.

## Build & Development

### Generate AMD Modules

To compile source files from `/amd/src` into `/amd/build`, run:

```sh
npx grunt amd
```

### Build CodeMirror with custom features

Refer to the documentation in `libs/codemirror` for details on modifying the CodeMirror dependency.

## Credits

Thanks to CodeMirror and the awesome CodeMirror plugins developed by [Replit](https://github.com/orgs/replit/repositories?q=codemirror). All icons are obtained from FontAwesome 6 free plugins. Many thanks also to the developers of the [htmlfy](https://www.npmjs.com/package/htmlfy) npm module.

---

Enjoy coding with **Source Code Pro**!

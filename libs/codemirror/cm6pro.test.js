/**
 * @jest-environment jsdom
 */
import CodeProEditor from './cm6pro.mjs';
// Make the marker visible
CodeProEditor.MARKER = '@';
const marker = CodeProEditor.MARKER;
const htmlMarker = `<span class="${CodeProEditor.TINY_MARKER_CLASS}">&nbsp;</span>`;
console.log("Using marker", marker);


describe('CodeProEditor', () => {
  let container, commands;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    commands = {
        minimap: () => true,
        prettify: () => true,
        linewrapping: () => true,
        theme: () => true,
        accept: () => true,
        savePrefs: () => true,
        cancel: () => true,
      }
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should initialize with default configuration', () => {
    const editor = new CodeProEditor(container, {
      doc: '<p>Hello</p>',
      commands
    });

    expect(container.querySelector('.cm-editor')).not.toBeNull();
    expect(editor.getFontsize()).toBe(11);
    editor.destroy();
  });

  it('should set and get value correctly', () => {
    const editor = new CodeProEditor(container, {
      doc: '<p>Initial</p>',
      commands
    });

    editor.setValue('<p>Updated</p>');
    expect(editor.getValue()).toBe('<p>Updated</p>');
    editor.destroy();
  });

  it('should toggle theme correctly', () => {
    const editor = new CodeProEditor(container, {
      commands
    });

    const newTheme = editor.toggleTheme();
    expect('dark').toBe(newTheme);
    editor.destroy();
  });

  it('should insert marker at cursor position', () => {
    const editor = new CodeProEditor(container, {
      doc: '<div>Test</div>',
      commands
    });

    // Move cursor to a known position (inside <div>)
    editor.setSelection({ anchor: 5 });

    const htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atCursor);
    expect(htmlWithMarker).toContain(marker);
    expect(htmlWithMarker).toBe(`<div>${marker}Test</div>`);
    editor.destroy();
  });

  it('should insert marker at closest element to cursor 1', () => {
    const editor = new CodeProEditor(container, {
      doc: '<p><span>batch</span> is a nice element</p>',
      commands
    });

    // Move cursor inside the <span>Text</span>
    editor.setSelection({ anchor: 25 });

    let htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atCursor);
    expect(htmlWithMarker).toBe(`<p><span>batch</span> is ${marker}a nice element</p>`,);
    expect(editor.cursorSync._getCurrentNodeType()).toBe('Text');
    htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atElement);
    // Should insert NULL marker
    expect(htmlWithMarker).toBe(`<p><span>batch</span> is ${htmlMarker}a nice element</p>`);
    expect(htmlWithMarker.indexOf(htmlMarker)).toBeGreaterThan(-1);
    
    editor.destroy();
  });

  it('should insert marker at closest element to cursor 2', () => {
    const editor = new CodeProEditor(container, {
      doc: '<section><div><span>Text</span></div></section>',
      commands
    });

    // Move cursor inside the <span>Text</span>
    editor.setSelection({ anchor: 25 });

    let htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atCursor);
    expect(htmlWithMarker).toBe(`<section><div><span>Text<${marker}/span></div></section>`);
    htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atElement);
    expect(htmlWithMarker).toBe(`<section><div><span>Text${htmlMarker}</span></div></section>`);
    // Should insert NULL marker before a tag, likely <span>
    expect(htmlWithMarker.indexOf(htmlMarker)).toBeGreaterThan(-1);
    
    editor.destroy();
  });

  it('should return raw value when no marker is requested', () => {
    const editor = new CodeProEditor(container, {
      doc: '<p>Hello</p>',
      commands
    });

    expect(editor.getValue()).toBe('<p>Hello</p>');
    editor.destroy();
  });

  it('should move caret to marker position and remove the marker', () => {
    const doc = `<div>Hello W${marker}orld</div>`;
    const editor = new CodeProEditor(container, {
      doc,
      commands
    });

    // After constructor, scrollToCaretPosition is already called
    const updatedDoc = editor.getValue();
    expect(updatedDoc).toBe('<div>Hello World</div>');

    // Now check that the caret was moved to correct position
    const state = editor.editorView.state;
    const cursorPos = state.selection.main.from;

    // Cursor should be at the position where the marker was inserted (i.e., after W)
    expect(cursorPos).toBe(doc.indexOf(marker)); //

    editor.destroy();
  });

  it('should not crash or move caret if no marker exists', () => {
    const doc = `<p>Hello</p>`;
    const editor = new CodeProEditor(container, {
      doc,
      commands
    });

    const beforeState = editor.editorView.state.selection.main.from;

    // Manually trigger scrollToCaretPosition
    editor.cursorSync.scrollToCaretPosition();

    const afterState = editor.editorView.state.selection.main.from;
    expect(afterState).toBe(beforeState); // Cursor should not move

    editor.destroy();
  });
});


describe('CodeProEditor - Marker Insertion (atElement)', () => {
  let editor;

  const createEditor = (doc, pos) => {
    const container = document.createElement('div');
    editor = new CodeProEditor(container, { doc, commands: {} });
    editor.setSelection({ anchor: pos });
    return editor;
  };

  const destroyEditor = () => editor?.destroy();

  const expectMarker = (html, posPresent = -1, expectedHtml = null) => {
    if (posPresent >= 0) {
      expect(html.indexOf(marker)).toBe(posPresent);
      if (expectedHtml) {
        expect(html).toBe(expectedHtml);
      }
    } else {
      expect(html.indexOf(marker)).toBe(-1);
    }
  };

  afterEach(() => {
    destroyEditor();
  });
  
  const tests = [
    {
      name: 'cursor at beginning of doc',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world</div>`,
      pos: 0,
      tagName: 'Document'
    },
    {
      name: 'cursor at end of doc',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world</div>${htmlMarker}`,
      pos: 22, // end of the doc
      tagName: 'EndTag'
    },
    {
      name: 'cursor at beginning of element content',
      doc: '<div>Hello world</div>',
      expected: `<div>${htmlMarker}Hello world</div>`,
      pos: 5, // start of "Hello"
      tagName: 'EndTag'
    },
    {
      name: 'cursor at StartCloseTag',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world${htmlMarker}</div>`,
      pos: 17, // over /
      tagName: 'StartCloseTag'
    },
    {
      name: 'cursor at CloseTag',
      doc: '<div>Hello world</div>',
      expected: `${htmlMarker}<div>Hello world</div>`,
      pos: 19, // over /div
      tagName: 'TagName'
    },
    {
      name: 'cursor at end of element content',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world${htmlMarker}</div>`,
      pos: 16, // end of "Hello world"
      tagName: 'Text'
    },
    {
      name: 'cursor at tag boundary before open tag',
      doc: '<div><span>text</span></div>',
      pos: 5, // right before <span>
      expected: `<div>${htmlMarker}<span>text</span></div>`
    },
     {
      name: 'span into span',
      doc: '<p><span> an text of</span></p>',
      expected: `<p><span> a${htmlMarker}n text of</span></p>`,
      pos: 11, // over a|n
    },
    {
      name: 'cursor between open and close tags',
      doc: '<div><span>text</span></div>',
      expected: `<div><span>text</span>${htmlMarker}</div>`,
      pos: 22, // between </span><
    },
    {
      name: 'cursor inside open tag',
      doc: '<div><span>text</span></div>',
      expected: `<div>${htmlMarker}<span>text</span></div>`,
      pos: 7,  
    },
    {
      name: 'cursor inside close tag',
      doc: '<div><span>text</span></div>',
      expected: `<div><span>text</span>${htmlMarker}</div>`,
      pos: 19, 
    },
    {
      name: 'cursor on comment boundary',
      doc: '<div><span>text <!--comment--></span></div>',
      expected: `<div><span>text ${htmlMarker}<!--comment--></span></div>`,
      pos: 29, 
    },
    {
      name: 'cursor inside a comment',
      doc: '<div><span>text <!--comment--></span></div>',
      expected: `<div><span>text ${htmlMarker}<!--comment--></span></div>`,
      pos: 21, 
    },
    {
      name: 'cursor inside comment (should skip)',
      doc: '<div> test <!-- comment --></div>',
      expected: `<div> test ${htmlMarker}<!-- comment --></div>`,
      pos: 14,
    },
    {
      name: 'cursor inside tag name (should skip)',
      doc: '<div><he></he></div>',
      expected: `<div>${htmlMarker}<he></he></div>`,
      pos: 6, // inside <he>
      tagName: 'StartTag'
    },
     {
      name: 'cursor inside tag name (should skip)',
      doc: '<div><he></he></div>',
      expected: `<div>${htmlMarker}<he></he></div>`,
      pos: 7, // inside <he>
      tagName: 'TagName'
    },
    {
      name: 'cursor inside attribute (should skip)',
      doc: '<div class="abc"></div>',
      expected: `${htmlMarker}<div class="abc"></div>`,
      pos: 10,
      tagName: 'AttributeName'
    },
    {
      name: 'cursor inside attribute (should skip)',
      doc: '<div class="abc"></div>',
      expected: `${htmlMarker}<div class="abc"></div>`,
      pos: 12,
      tagName: 'AttributeValue'
    },
    {
      name: 'cursor inside attribute value',
      doc: '<div>as <p class="abc">text</p></div>',
      expected: `<div>as ${htmlMarker}<p class="abc">text</p></div>`,
      pos: 18,
      tagName: 'AttributeValue'
    },
    {
      name: 'cursor at attribute name (embeded)',
      doc: '<div>as <p class="abc">text</p></div>',
      expected: `<div>as ${htmlMarker}<p class="abc">text</p></div>`,
      pos: 13,
      tagName: 'AttributeName'
    },
    {
      name: 'cursor inside <script> (should skip)',
      doc: '<div></div>\n<script>var x = 5;</script>',
      expected: `<div></div>\n${htmlMarker}<script>var x = 5;</script>`,
      pos: 23,
    },
    {
      name: 'cursor at <script> (should skip)',
      doc: '<div></div>\n<script>var x = 5;</script>',
      expected: `<div></div>\n${htmlMarker}<script>var x = 5;</script>`,
      pos: 15,
    },
    {
      name: 'cursor inside <style> (should skip)',
      doc: '<style>.x { color: red; }</style>\n<p>first <b>bold</b><br/></p>',
      expected: `${htmlMarker}<style>.x { color: red; }</style>\n<p>first <b>bold</b><br/></p>`,
      pos: 10,
    },
    {
      name: 'cursor just before closing tag',
      doc: '<div><b>Bold</b></div>',
      expected: `<div><b>Bold${htmlMarker}</b></div>`,
      pos: 14, // right before </b>
      tagName: 'StartCloseTag'
    },
     // Additional tests for disallowed span containers
    {
      name: 'cursor inside <svg> (should skip)',
      doc: '<div><svg><circle cx="50" cy="50" r="40" /></svg></div>',
      expected: `<div>${htmlMarker}<svg><circle cx="50" cy="50" r="40" /></svg></div>`,
      pos: 15
    },
    {
      name: 'cursor inside <math> (should skip)',
      doc: '<div><math><mi>x</mi></math></div>',
      expected: `<div>${htmlMarker}<math><mi>x</mi></math></div>`,
      pos: 12
    },
    {
      name: 'inside nested valid tag but wrapped in <title> (should skip 1)',
      doc: '<title><div><p>text</p></div></title>',
      expected: `${htmlMarker}<title><div><p>text</p></div></title>`,
      pos: 18
    },
     {
      name: 'inside nested valid tag but wrapped in <title> (should skip 2)',
      doc: '<title><div><p>text</p></div></title>',
      expected: `${htmlMarker}<title><div><p>text</p></div></title>`,
      pos: 20
    },
    {
      name: 'deep inside nested <script> (should skip)',
      doc: '<div><p><script>var x = 1;</script></p></div>',
      expected: `<div><p>${htmlMarker}<script>var x = 1;</script></p></div>`,
      pos: 20
    },
    {
      name: 'fallback to before <script> tag',
      doc: '<div>abc<script>console.log("x")</script></div>',
      expected: `<div>abc${htmlMarker}<script>console.log("x")</script></div>`,
      pos: 10
    },
    {
      name: 'cursor in safe tag but within attribute (should fallback)',
      doc: '<div><p class="x">test</p></div>',
      expected: `<div>${htmlMarker}<p class="x">test</p></div>`,
      pos: 12
    },
    // More self-closing cases
    {
      name: 'cursor at self-closing tag <br/>',
      doc: '<div>line<br/>next</div>',
      expected: `<div>line${htmlMarker}<br/>next</div>`,
      pos: 11,
      tagName: 'TagName'
    },
    {
      name: 'cursor at empty container',
      doc: '<div></div>',
      expected: `<div>${htmlMarker}</div>`,
      pos: 5,
      tagName: 'EndTag'
    },
    {
      name: 'cursor inside nested disallowed tags (script in title)',
      doc: '<title><script><b>skip this</b></script></title>',
      expected: `${htmlMarker}<title><script><b>skip this</b></script></title>`,
      pos: 25,
    },
    {
      name: 'cursor between sibling paragraphs',
      doc: '<div><p>first</p><p>second</p></div>',
      expected: `<div><p>first</p>${htmlMarker}<p>second</p></div>`,
      pos: 17,
      tagName: 'EndTag'
    },
    {
      name: 'document already contains marker (gets removed when doc set) 1',
      doc: `<div>@a</div>`,
      expected: `<div>${htmlMarker}a</div>`,
      pos: 5,
    },
    {
      name: 'document already contains marker (gets removed when doc set) 2',
      doc: `<div>@</div>`,
      expected: `<div>${htmlMarker}</div>`,
      pos: 2,
    }
  ];

  tests.forEach(({ name, doc, pos, posPresent, expected, tagName }) => {
    it(`cursor at ${pos}: ${name}`, () => {
      const editor = createEditor(doc, pos);
      const html = editor.getValue(CodeProEditor.MarkerType.atElement);
      if (tagName) {
        expect(editor.cursorSync._getCurrentNodeType()).toBe(tagName);
      }
      if (expected) {
        posPresent = expected.indexOf(marker);
      }
      expectMarker(html, posPresent, expected, tagName);
    });
  });
});


describe('CodeProEditor - Advanced Marker Insertion (atElement)', () => {
  let editor;
  const htmlMarker = `<span class="${CodeProEditor.TINY_MARKER_CLASS}">&nbsp;</span>`;

  const createEditor = (doc, pos) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    editor = new CodeProEditor(container, { doc, commands: {} });
    editor.setSelection({ anchor: pos });
    return editor;
  };

  const destroyEditor = () => editor?.destroy();

  afterEach(() => {
    destroyEditor();
  });

  const newTests = [
    // --- Strict tables tests ---
    {
      name: 'cursor inside <td>',
      doc: '<table><tbody><tr><td>Cell 1</td></tr></tbody></table>',
      pos: 26, // <table><tbody><tr><td>Cell| 1</td></tr></tbody></table>
      expected: `<table><tbody><tr><td>Cell${htmlMarker} 1</td></tr></tbody></table>`
    },
    {
      name: 'cursor between <td> and </td> (should place before closing tag)',
      doc: '<table><tbody><tr><td>Cell 1</td></tr></tbody></table>',
      pos: 29, // <table><tbody><tr><td>Cell 1<|/td></tr></tbody></table>
      expected: `<table><tbody><tr><td>Cell 1${htmlMarker}</td></tr></tbody></table>`
    },
    {
      name: 'cursor between <tr> and <td> (invalid position, should find nearest valid)',
      doc: '<table><tbody><tr><td>Cell 1</td></tr></tbody></table>',
      pos: 19, // <table><tbody><tr><|td>Cell 1</td></tr></tbody></table>
      expected: `<table><tbody><tr><td>${htmlMarker}Cell 1</td></tr></tbody></table>`
    },
    {
      name: 'cursor between </tr> and </tbody> (invalid position, should find nearest valid)',
      doc: '<table><tbody><tr><td>Cell 1</td></tr></tbody></table>',
      pos: 35, // <table><tbody><tr><td>Cell 1</td></|tr></tbody></table>
      expected: `<table><tbody><tr><td>Cell 1${htmlMarker}</td></tr></tbody></table>`
    },

    // --- Tests with lists ---
    {
      name: 'cursor inside <li>',
      doc: '<ul><li>Item 1</li><li>Item 2</li></ul>',
      pos: 10, // <ul><li>It|em 1</li><li>Item 2</li></ul>
      expected: `<ul><li>It${htmlMarker}em 1</li><li>Item 2</li></ul>`
    },
    {
      name: 'cursor between <li> tags (should place after first item)',
      doc: '<ul><li>Item 1</li><li>Item 2</li></ul>',
      pos: 18, // <ul><li>Item 1</li|><li>Item 2</li></ul>
      expected: `<ul><li>Item 1${htmlMarker}</li><li>Item 2</li></ul>`
    },
    {
      name: 'cursor inside invalid <ul> position (should place before first li)',
      doc: '<ul><li>Item 1</li></ul>',
      pos: 4, // <ul>|<li>Item 1</li></ul>
      expected: `<ul><li>${htmlMarker}Item 1</li></ul>`
    },

    // --- Tests with selfclosing tags ---
    {
      name: 'cursor after an <img> tag',
      doc: '<p>Some text <img src="..."/> and more.</p>',
      pos: 27, // <p>Some text <img src="..."|/> and more.</p>
      expected: `<p>Some text ${htmlMarker}<img src="..."> and more.</p>`
    },
    {
      name: 'cursor before an <input> tag',
      doc: '<p>Name: <input type="text"/></p>',
      pos: 10, // <p>Name: <|input type="text"/></p>
      expected: `<p>Name: ${htmlMarker}<input type="text"></p>`
    },

    // --- Bad formatted HTML ---
    {
      name: 'unclosed <p> tag',
      doc: '<p>First paragraph<p>Second paragraph',
      pos: 20, // <p>First paragraph<p|>Second paragraph
      expected: `<p>First paragraph${htmlMarker}</p><p>Second paragraph</p>`
    },
    {
      name: 'cursor after unclosed <p> tag',
      doc: '<div><p>unclosed tag</div>',
      pos: 20, // <div><p>unclosed tag|</div>
      expected: `<div><p>unclosed tag${htmlMarker}</p></div>`
    },

    // --- Tests including white spaces and line breaks ---
    {
      name: 'lots of whitespace between elements',
      doc: '<div>\n  <p>\n    Hello\n  </p>\n</div>',
      pos: 16, // Before "Hello"
      expected: `<div>\n  <p>\n    ${htmlMarker}Hello\n  </p>\n</div>`
    },
    {
      name: 'cursor on a blank line between tags',
      doc: '<div>\n  <p>First</p>\n  \n  <p>Second</p>\n</div>',
      pos: 22, //<div>\n  <p>First</p>\n | \n  <p>Second</p>\n</div>
      expected: `<div>\n  <p>First</p>\n ${htmlMarker} \n  <p>Second</p>\n</div>`
    },
    
    // --- Tests with definition lists (dl, dt, dd) ---
    {
        name: 'cursor inside <dt>',
        doc: '<dl><dt>Term</dt><dd>Definition</dd></dl>',
        pos: 10, // <dl><dt>Te|rm</dt><dd>Definition</dd></dl>
        expected: `<dl><dt>Te${htmlMarker}rm</dt><dd>Definition</dd></dl>`
    },
    {
        name: 'cursor between <dt> and <dd> (invalid, should place after dt)',
        doc: '<dl><dt>Term</dt><dd>Definition</dd></dl>',
        pos: 17, // <dl><dt>Term</dt>|<dd>Definition</dd></dl>
        expected: `<dl><dt>Term${htmlMarker}</dt><dd>Definition</dd></dl>`
    },
    {
        name: 'cursor between <dt> and <dd> (invalid, should place inside dd)',
        doc: '<dl><dt></dt><dd>Definition</dd></dl>',
        pos: 15, // <dl><dt></dt><d|d>Definition</dd></dl>
        expected: `<dl><dt></dt><dd>${htmlMarker}Definition</dd></dl>`
    },
    // --- Tests within textarea ---
    {
        name: 'cursor inside textarea',
        doc: '<textarea> Some text here!</textarea>',
        pos: 15, // <textarea> Some| text here!</textarea>
        expected: `${htmlMarker}<textarea> Some text here!</textarea>`
    },
  ];

  newTests.forEach(({ name, doc, pos, expected }) => {
    it(`should handle: ${name}`, () => {
      const editor = createEditor(doc, pos);
      const htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atElement);
      expect(htmlWithMarker).toBe(expected);
    });
  });
});

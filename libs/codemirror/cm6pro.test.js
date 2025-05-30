/**
 * @jest-environment jsdom
 */
import CodeProEditor from './cm6pro.mjs';
// Make the marker visible
CodeProEditor.Marker = '@';
const marker = CodeProEditor.Marker;
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
    expect(editor._getCurrentNodeType()).toBe('Text');
    htmlWithMarker = editor.getValue(CodeProEditor.MarkerType.atElement);
    console.log(htmlWithMarker)
    // Should insert NULL marker
    expect(htmlWithMarker).toBe(`<p><span>batch</span> is ${marker}a nice element</p>`);
    expect(htmlWithMarker.indexOf(marker)).toBeGreaterThan(-1);
    
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

    // Should insert NULL marker before a tag, likely <span>
    expect(htmlWithMarker.indexOf(marker)).toBeGreaterThan(-1);
    expect(htmlWithMarker).toBe(`<section><div><span>Text${marker}</span></div></section>`);
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
    const state = editor._editorView.state;
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

    const beforeState = editor._editorView.state.selection.main.from;

    // Manually trigger scrollToCaretPosition
    editor.scrollToCaretPosition();

    const afterState = editor._editorView.state.selection.main.from;
    expect(afterState).toBe(beforeState); // Cursor should not move

    editor.destroy();
  });
});
 

describe('CodeProEditor - Marker Insertion (atElement)', () => {
  const marker = CodeProEditor.Marker;
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
      expected: `${marker}<div>Hello world</div>`,
      pos: 0,
      tagName: 'Document'
    },
    {
      name: 'cursor at end of doc',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world</div>${marker}`,
      pos: 22, // end of the doc
      tagName: 'EndTag'
    },
    {
      name: 'cursor at beginning of element content',
      doc: '<div>Hello world</div>',
      expected: `<div>${marker}Hello world</div>`,
      pos: 5, // start of "Hello"
      tagName: 'EndTag'
    },
    {
      name: 'cursor at StartCloseTag',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world${marker}</div>`,
      pos: 17, // over /
      tagName: 'StartCloseTag'
    },
    {
      name: 'cursor at CloseTag',
      doc: '<div>Hello world</div>',
      expected: `${marker}<div>Hello world</div>`,
      pos: 19, // over /div
      tagName: 'TagName'
    },
    {
      name: 'cursor at end of element content',
      doc: '<div>Hello world</div>',
      expected: `<div>Hello world${marker}</div>`,
      pos: 16, // end of "Hello world"
      tagName: 'Text'
    },
    {
      name: 'cursor at tag boundary before open tag',
      doc: '<div><span>text</span></div>',
      pos: 5, // right before <span>
      expected: `<div>${marker}<span>text</span></div>`
    },
     {
      name: 'span into span',
      doc: '<p><span> an text of</span></p>',
      expected: `<p><span> a${marker}n text of</span></p>`,
      pos: 11, // over a|n
    },
    {
      name: 'cursor between open and close tags',
      doc: '<div><span>text</span></div>',
      expected: `<div><span>text</span>${marker}</div>`,
      pos: 22, // between </span><
    },
    {
      name: 'cursor inside comment (should skip)',
      doc: '<div> test <!-- comment --></div>',
      expected: `<div> test ${marker}<!-- comment --></div>`,
      pos: 14,
    },
    {
      name: 'cursor inside tag name (should skip)',
      doc: '<div><he></he></div>',
      expected: `<div>${marker}<he></he></div>`,
      pos: 6, // inside <he>
      tagName: 'StartTag'
    },
     {
      name: 'cursor inside tag name (should skip)',
      doc: '<div><he></he></div>',
      expected: `<div>${marker}<he></he></div>`,
      pos: 7, // inside <he>
      tagName: 'TagName'
    },
    {
      name: 'cursor inside attribute (should skip)',
      doc: '<div class="abc"></div>',
      expected: `${marker}<div class="abc"></div>`,
      pos: 10,
      tagName: 'AttributeName'
    },
    {
      name: 'cursor inside attribute (should skip)',
      doc: '<div class="abc"></div>',
      expected: `${marker}<div class="abc"></div>`,
      pos: 12,
      tagName: 'AttributeValue'
    },
    {
      name: 'cursor inside attribute (embeded)',
      doc: '<div>as <p class="abc">text</p></div>',
      expected: `<div>as ${marker}<p class="abc">text</p></div>`,
      pos: 18,
      tagName: 'AttributeValue'
    },
    {
      name: 'cursor inside <script> (should skip)',
      doc: '<div></div>\n<script>var x = 5;</script>',
      expected: `<div></div>\n${marker}<script>var x = 5;</script>`,
      pos: 23,
    },
    {
      name: 'cursor at <script> (should skip)',
      doc: '<div></div>\n<script>var x = 5;</script>',
      expected: `<div></div>\n${marker}<script>var x = 5;</script>`,
      pos: 15,
    },
    {
      name: 'cursor inside <style> (should skip)',
      doc: '<style>.x { color: red; }</style>\n<p>first <b>bold</b><br/></p>',
      expected: `${marker}<style>.x { color: red; }</style>\n<p>first <b>bold</b><br/></p>`,
      pos: 10,
    },
    {
      name: 'cursor just before closing tag',
      doc: '<div><b>Bold</b></div>',
      expected: `<div><b>Bold${marker}</b></div>`,
      pos: 14, // right before </b>
      tagName: 'StartCloseTag'
    },
     // Additional tests for disallowed span containers
    {
      name: 'cursor inside <svg> (should skip)',
      doc: '<div><svg><circle cx="50" cy="50" r="40" /></svg></div>',
      expected: `<div>${marker}<svg><circle cx="50" cy="50" r="40" /></svg></div>`,
      pos: 15
    },
    {
      name: 'cursor inside <math> (should skip)',
      doc: '<div><math><mi>x</mi></math></div>',
      expected: `<div>${marker}<math><mi>x</mi></math></div>`,
      pos: 12
    },
    {
      name: 'inside nested valid tag but wrapped in <title> (should skip 1)',
      doc: '<title><div><p>text</p></div></title>',
      expected: `${marker}<title><div><p>text</p></div></title>`,
      pos: 18
    },
     {
      name: 'inside nested valid tag but wrapped in <title> (should skip 2)',
      doc: '<title><div><p>text</p></div></title>',
      expected: `${marker}<title><div><p>text</p></div></title>`,
      pos: 20
    },
    {
      name: 'deep inside nested <script> (should skip)',
      doc: '<div><p><script>var x = 1;</script></p></div>',
      expected: `<div><p>${marker}<script>var x = 1;</script></p></div>`,
      pos: 20
    },
    {
      name: 'fallback to before <script> tag',
      doc: '<div>abc<script>console.log("x")</script></div>',
      expected: `<div>abc${marker}<script>console.log("x")</script></div>`,
      pos: 10
    },
    {
      name: 'cursor in safe tag but within attribute (should fallback)',
      doc: '<div><p class="x">test</p></div>',
      expected: `<div>${marker}<p class="x">test</p></div>`,
      pos: 12
    }
  ];

  tests.forEach(({ name, doc, pos, posPresent, expected, tagName }) => {
    it(`should ${posPresent >= 0? '' : 'not '}insert marker: ${name}`, () => {
      const editor = createEditor(doc, pos);
      const html = editor.getValue(CodeProEditor.MarkerType.atElement);
      if (tagName) {
        expect(editor._getCurrentNodeType()).toBe(tagName);
      }
      if (expected) {
        posPresent = expected.indexOf(marker);
      }
      expectMarker(html, posPresent, expected, tagName);
    });
  });
});
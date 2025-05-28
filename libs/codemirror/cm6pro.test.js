/**
 * @jest-environment jsdom
 */
import CodeProEditor from './cm6pro.mjs';

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

    const htmlWithMarker = editor.getValue(CodeProEditor.Marker.atCursor);
    expect(htmlWithMarker).toContain('\u0000');
    expect(htmlWithMarker).toBe('<div>\u0000Test</div>');
    editor.destroy();
  });

  it('should insert marker at closest element to cursor 1', () => {
    const editor = new CodeProEditor(container, {
      doc: '<p><span>batch</span> is a nice element</p>',
      commands
    });

    // Move cursor inside the <span>Text</span>
    editor.setSelection({ anchor: 25 });

    let htmlWithMarker = editor.getValue(CodeProEditor.Marker.atCursor);
    expect(htmlWithMarker).toBe('<p><span>batch</span> is \u0000a nice element</p>',);
    htmlWithMarker = editor.getValue(CodeProEditor.Marker.atElement);

    // Should insert NULL marker before a tag, likely <span>
    expect(htmlWithMarker.indexOf('\u0000')).toBeGreaterThan(-1);
    expect(htmlWithMarker).toBe("<p>\u0000<span>batch</span> is a nice element</p>");
    editor.destroy();
  });

  it('should insert marker at closest element to cursor 2', () => {
    const editor = new CodeProEditor(container, {
      doc: '<section><div><span>Text</span></div></section>',
      commands
    });

    // Move cursor inside the <span>Text</span>
    editor.setSelection({ anchor: 25 });

    let htmlWithMarker = editor.getValue(CodeProEditor.Marker.atCursor);
    expect(htmlWithMarker).toBe("<section><div><span>Text<\u0000/span></div></section>");
    htmlWithMarker = editor.getValue(CodeProEditor.Marker.atElement);

    // Should insert NULL marker before a tag, likely <span>
    expect(htmlWithMarker.indexOf('\u0000')).toBeGreaterThan(-1);
    expect(htmlWithMarker).toBe("<section><div>\u0000<span>Text</span></div></section>");
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
    const marker = '\u0000';
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
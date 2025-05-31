/**
 * @jest-environment jsdom
 */

import { ViewManager } from '../../amd/src/viewmanager';
import CodeProEditor from './cm6pro';

// Mock preferences, options, and common
jest.mock('../../amd/src/preferences', () => ({
  setPref: jest.fn(),
  getPref: jest.fn((key, fallback) => fallback),
  savePrefs: jest.fn()
}));

jest.mock('../../amd/src/options', () => ({
  isSyncCaret: jest.fn(() => true),
  isAutoFormatHTML: jest.fn(() => false)
}));

jest.mock('../../amd/src/common', () => ({
  CM_MARKER: '@',
  TINY_MARKER_CLASS: 'tiny_codepro-marker'
}));

// Patch the global `require` used inside viewmanager.js
window.require = (deps, callback, errback) => {
  if (Array.isArray(deps) && deps.includes('tiny_codepro/cm6pro-lazy')) {
    // Simulate async resolution
    callback(CodeProEditor);
  } else if (Array.isArray(deps) && deps.includes('tiny_html/beautify/beautify-html')) {
    callback({ html_beautify: (html) => html });
  } else if (Array.isArray(deps) && deps.includes('tiny_codepro/htmlfy-lazy')) {
    callback((html) => html);
  } else {
    if (errback) {
      errback(new Error('Module not found'));
    }
  }
};

describe('ViewManager.create', () => {
  let viewManager, mockTiny, container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockTiny = {
      id: 'editor-id',
      container,
      contentWindow: {
        scrollY: 0,
        scrollTo: jest.fn()
      },
      dom: {
        select: jest.fn(() => [])
      },
      getContent: jest.fn(() => '<p>Hello</p>'),
      selection: {
        getStart: jest.fn(() => document.createElement('div'))
      }
    };

    viewManager = new ViewManager(mockTiny, { autosave: false });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create a CodeProEditor instance and attach it to the DOM', async () => {
    expect(container.querySelector('.cm-editor')).toBeNull(); // Before creation

    await viewManager.attachCodeEditor(container);

    expect(viewManager.codeEditor).toBeInstanceOf(CodeProEditor);
    expect(container.querySelector('.cm-editor')).not.toBeNull(); // Editor attached
  });
});

describe('ViewManager.accept', () => {
  let viewManager, mockTiny;
  const editorContainer = document.createElement("DIV");
  beforeEach(() => {
    document.body.innerHTML = '<iframe></iframe>';
    mockTiny = {
      id: 'editor-id',
      container: document.body,
      contentWindow: {
        scrollY: 0,
        scrollTo: jest.fn()
      },
      dom: {
        select: jest.fn(() => [])
      },
      getContent: jest.fn(() => '<div>hi<span class="tiny_codepro-marker">&#xfeff;</span> there</div>'),
      setContent: jest.fn(),
      focus: jest.fn(),
      undoManager: {
        transact: jest.fn(fn => fn())
      },
      selection: {
        getStart: jest.fn(() => document.createElement('div')),
        setCursorLocation: jest.fn(),
        collapse: jest.fn()
      },
      execCommand: jest.fn(),
      nodeChanged: jest.fn()
    };

    viewManager = new ViewManager(mockTiny, {});
    viewManager._tClose = jest.fn();
  });

  it('should replace CM_MARKER and call editor.setContent()', async() => {
    await viewManager.attachCodeEditor(editorContainer);
    const result = viewManager.accept();
    expect(result).toBe(true);
    expect(viewManager._tClose).toHaveBeenCalled();
    expect(mockTiny.setContent).toHaveBeenCalledWith(
      '<div>hi<span class="tiny_codepro-marker">&#xfeff;</span> there</div>'
    );
  });

  it('Move to the begining of document', async() => {
    await viewManager.attachCodeEditor(editorContainer);
    viewManager.codeEditor.setSelection({ anchor: 0 });
    const result = viewManager.accept();
    expect(result).toBe(true);
    expect(viewManager._tClose).toHaveBeenCalled();
    expect(mockTiny.setContent).toHaveBeenCalledWith(
      '<span class="tiny_codepro-marker">&#xfeff;</span><div>hi there</div>'
    );
  });
});


describe('ViewManager.attachCodeEditor', () => {
  let viewManager, mockTiny, container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockTiny = {
      id: 'editor-id',
      container,
      contentWindow: { scrollY: 0, scrollTo: jest.fn() },
      dom: { select: jest.fn(() => []) },
      getContent: jest.fn(() => '<p>Hello</p>'),
      selection: {
        getStart: jest.fn(() => document.createElement('div'))
      }
    };

    viewManager = new ViewManager(mockTiny, { autosave: false });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize a real CodeProEditor instance', async () => {
    await viewManager.attachCodeEditor(container);

    expect(viewManager.codeEditor).toBeInstanceOf(CodeProEditor);
    expect(container.querySelector('.cm-editor')).not.toBeNull();
  });
});
/**
 * @jest-environment jsdom
 */
jest.useFakeTimers();

import { ViewManager } from '../../amd/src/viewmanager';
import CodeProEditor from './cm6pro';
CodeProEditor.MARKER = '@';

// Mock preferences, options, and common
jest.mock('../../amd/src/preferences', () => ({
  setPref: jest.fn(),
  getPref: jest.fn((key, fallback) => fallback),
  savePrefs: jest.fn()
}));

jest.mock('../../amd/src/options', () => ({
  getSyncCaret: jest.fn(() => 'both'),
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
  let viewManager, mockTiny, tinyContainer, cm6Container;

  beforeEach(async() => {
    cm6Container = document.createElement('DIV');
    document.body.appendChild(cm6Container);
    tinyContainer = document.createElement('DIV');
    document.body.appendChild(tinyContainer);

    tinyContainer.innerHTML = "<p>Sample text</p>";
    const range = document.createRange();
    const textNode = tinyContainer.querySelector("p").firstChild;
    range.setStart(textNode, 3); // Position after "Sam"
    range.setEnd(textNode, 3);   // Start == End --> collapsed range
    const mockSelection = {
      getRng: jest.fn(() => range),
      setRng: jest.fn(),
      setCursorLocation: jest.fn(),
      collapse: jest.fn(),
      getNode: jest.fn(() => tinyContainer.querySelector('p'))
    };

    mockTiny = {
      id: 'editor-id',
      container: tinyContainer,
      contentWindow: {
        scrollY: 0,
        scrollTo: jest.fn()
      },
      getDoc: jest.fn(() => document),
      getWin: jest.fn(() => window),
      focus: jest.fn(),
      dom: {
        select: jest.fn((q) => tinyContainer.querySelectorAll(q)),
        create: jest.fn((tag, opts, html) => {
          const elem = document.createElement(tag.toUpperCase())
          if (opts) {
            Object.keys(opts).forEach(k => elem.setAttribute(k, opts[k]));
          }
          if (html) {
            elem.innerHTML = html;
          }
          return elem;
        }),
        remove: jest.fn(() => {}),
        getParent: jest.fn().mockImplementation((currentNode, tags) => {
          console.log(currentNode);
          return currentNode.closest(tags);
        }),
      },
      getContent: jest.fn(() => tinyContainer.innerHTML),
      setContent: jest.fn((t) => tinyContainer.innerHTML = t),
      selection: mockSelection,
      undoManager: {
        transact: jest.fn((f) => f()),
        ignore: jest.fn((f) => f()),
      },
      nodeChanged: jest.fn(),
    };

    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

    viewManager = new ViewManager(mockTiny, { autosave: false });
    viewManager._tClose = jest.fn();
    viewManager._tCreate = jest.fn();
    viewManager._tShow = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('should create a CodeProEditor instance and attach it to the DOM', async () => {
    expect(cm6Container.querySelector('.cm-editor')).toBeNull(); // Before creation
    const docHead = await viewManager.loadDocInfo();
    await viewManager.attachCodeEditor(cm6Container, docHead);
    expect(viewManager.codeEditor).toBeInstanceOf(CodeProEditor);
    expect(cm6Container.querySelector('.cm-editor')).not.toBeNull(); // Editor attached
    // expect that the head of the cmEditor to be in the right place
    const state = viewManager.codeEditor.editorView.state;
    expect(viewManager.codeEditor.getValue()).toBe('<p>Sample text</p>');
    expect(state.selection.main.head).toBe(6);
  });

});

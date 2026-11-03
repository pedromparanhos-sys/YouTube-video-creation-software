import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--ground)', color: '#d6d9df', fontSize: '12.5px', height: '100%' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
    '.cm-content': { caretColor: '#b4a9ff', padding: '10px 0' },
    '.cm-cursor': { borderLeftColor: '#b4a9ff', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: 'var(--ground)', color: '#4a4f5a', border: 'none', paddingLeft: '6px' },
    '.cm-activeLine': { backgroundColor: 'rgba(139,124,246,0.06)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#a3a8b3' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(139,124,246,0.28) !important' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(94,163,255,0.18)', outline: 'none' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: '#5d6370', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.operatorKeyword, tags.controlKeyword, tags.definitionKeyword], color: '#b4a9ff' },
  { tag: [tags.string, tags.special(tags.string)], color: '#7ee2b8' },
  { tag: [tags.number, tags.bool, tags.null], color: '#f5c26b' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#8cc0ff' },
  { tag: tags.propertyName, color: '#d6d9df' },
  { tag: tags.variableName, color: '#e6e8ec' },
  { tag: [tags.operator, tags.punctuation], color: '#8a909c' },
]);

export const editorTheme = [theme, syntaxHighlighting(highlight)];

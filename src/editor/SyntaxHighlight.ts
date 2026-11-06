import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';
import type { IDETheme } from '../types';

export function createSyntaxHighlightExtension(theme: IDETheme): Extension {
  const e = theme.editor;
  const style = HighlightStyle.define([
    { tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.moduleKeyword], color: e.keyword, fontWeight: '500' },
    { tag: [tags.string, tags.special(tags.string), tags.character], color: e.string },
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null], color: e.number },
    { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: e.comment, fontStyle: 'italic' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.standard(tags.name)], color: e.function },
    { tag: [tags.variableName, tags.definition(tags.variableName), tags.propertyName], color: e.variable },
    { tag: [tags.typeName, tags.className, tags.namespace, tags.macroName], color: e.type },
    { tag: [tags.operator, tags.arithmeticOperator, tags.logicOperator, tags.compareOperator], color: e.operator },
    { tag: [tags.tagName, tags.angleBracket], color: e.tag },
    { tag: [tags.attributeName], color: e.attribute },
    { tag: [tags.attributeValue], color: e.string },
    { tag: [tags.punctuation, tags.bracket, tags.brace, tags.paren, tags.separator], color: e.punctuation },
    { tag: tags.heading, color: e.function, fontWeight: '700' },
    { tag: tags.link, color: e.type, textDecoration: 'underline' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
  ]);

  return syntaxHighlighting(style);
}
